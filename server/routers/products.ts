import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { 
  createProductSubmission, 
  getProductSubmissionById,
  updateProductSubmissionStatus,
  createCompanyMatch,
  getCompanyMatchesByProductId,
  createColdEmail,
  getColdEmailByCompanyMatchId,
} from "../db";
import { invokeLLM } from "../_core/llm";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";

/**
 * 产品匹配 API 路由
 */
export const productsRouter = router({
  /**
   * 上传产品 PDF 并自动提取信息
   */
  submitProductPDF: protectedProcedure
    .input(
      z.object({
        productPdfUrl: z.string().url("产品 PDF URL 无效"),
        productPdfKey: z.string(),
        targetCountries: z.array(z.string()).optional(),
        numberOfCompanies: z.number().int().min(1).max(50).default(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // 创建产品提交记录（初始状态为 analyzing）
        const submission = await createProductSubmission(ctx.user.id, {
          productName: "Processing PDF...",
          productDescription: "Extracting information from PDF...",
          targetCountries: input.targetCountries ? JSON.stringify(input.targetCountries) : undefined,
          numberOfCompanies: input.numberOfCompanies,
          status: "analyzing" as const,
        });

        const submissionId = (submission as any).insertId || 1;

        // 异步执行 PDF 提取和产品分析
        extractProductFromPDFAndAnalyze(submissionId, ctx.user.id, input).catch(err => {
          console.error("Error in PDF extraction:", err);
          updateProductSubmissionStatus(submissionId, "failed");
        });

        return {
          submissionId,
          status: "analyzing",
          message: "产品 PDF 已提交，正在提取信息...",
        };
      } catch (error) {
        throw new Error(`Failed to submit product PDF: ${error}`);
      }
    }),

  /**
   * 获取产品匹配结果
   */
  getProductMatches: protectedProcedure
    .input(z.object({ submissionId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const submission = await getProductSubmissionById(input.submissionId);

        if (!submission || submission.userId !== ctx.user.id) {
          throw new Error("Product submission not found or unauthorized");
        }

        const matches = await getCompanyMatchesByProductId(input.submissionId);

        // 获取每个匹配的 Cold Email
        const matchesWithEmails = await Promise.all(
          matches.map(async (match) => {
            const email = await getColdEmailByCompanyMatchId(match.id);
            return {
              ...match,
              coldEmail: email,
            };
          })
        );

        return {
          submission,
          matches: matchesWithEmails,
        };
      } catch (error) {
        throw new Error(`Failed to get product matches: ${error}`);
      }
    }),

  /**
   * 获取用户的所有产品提交
   */
  getUserProducts: protectedProcedure.query(async ({ ctx }) => {
    try {
      // 这个功能需要在 db.ts 中添加对应的查询函数
      return [];
    } catch (error) {
      throw new Error(`Failed to get user products: ${error}`);
    }
  }),
});

/**
 * 后台异步函数：从 PDF 提取产品信息并进行 AI 分析
 */
async function extractProductFromPDFAndAnalyze(
  submissionId: number,
  userId: number,
  input: any
) {
  try {
    // 1. 从 PDF 提取内容（使用 LLM Vision API）
    const pdfExtractionPrompt = `
    请从以下产品 PDF 中提取所有信息，包括：
    - 产品名称
    - 产品描述/说明
    - 产品规格和参数
    - 产品特性和优势
    - 应用场景
    - 任何其他相关信息
    
    请返回 JSON 格式的结果。
    `;

    const extractionResponse = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a product information extractor. Extract all relevant product information from PDFs and return structured JSON.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: pdfExtractionPrompt,
            },
            {
              type: "file_url",
              file_url: {
                url: input.productPdfUrl,
                mime_type: "application/pdf",
              },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "product_info",
          strict: true,
          schema: {
            type: "object",
            properties: {
              productName: { type: "string", description: "Product name" },
              productDescription: { type: "string", description: "Product description" },
              productCategory: { type: "string", description: "Product category" },
              productSpecs: { 
                type: "object",
                description: "Product specifications",
                additionalProperties: { type: "string" }
              },
              productFeatures: { type: "array", items: { type: "string" } },
              applications: { type: "array", items: { type: "string" } },
              targetMarkets: { type: "array", items: { type: "string" } },
            },
            required: ["productName", "productDescription"],
          },
        },
      },
    });

    let extractedData: any = {};
    try {
      const content = typeof extractionResponse.choices[0]?.message.content === 'string'
        ? extractionResponse.choices[0].message.content
        : "{}";
      extractedData = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse extraction response:", e);
      throw new Error("Failed to extract product information from PDF");
    }

    // 2. 更新产品提交记录
    await updateProductSubmissionStatus(submissionId, "analyzing");

    // 3. 使用 LLM 生成公司匹配建议
    const targetCountries = input.targetCountries || [];
    const matchingPrompt = `
    基于以下产品信息，请推荐最合适的目标公司类型和行业：
    
    产品名称: ${extractedData.productName}
    产品描述: ${extractedData.productDescription}
    产品类别: ${extractedData.productCategory || "未指定"}
    产品特性: ${extractedData.productFeatures?.join(", ") || "未指定"}
    应用场景: ${extractedData.applications?.join(", ") || "未指定"}
    目标市场: ${extractedData.targetMarkets?.join(", ") || "未指定"}
    目标国家: ${targetCountries.join(", ") || "全球"}
    
    请返回 JSON 格式，包含：
    {
      "targetCompanyTypes": ["类型1", "类型2", ...],
      "targetIndustries": ["行业1", "行业2", ...],
      "matchingCriteria": "匹配标准说明",
      "searchKeywords": ["关键词1", "关键词2", ...],
      "estimatedMarketSize": "市场规模估计"
    }
    `;

    const matchingResponse = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a business development expert. Recommend target companies and industries based on product information.",
        },
        {
          role: "user",
          content: matchingPrompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "company_matching",
          strict: true,
          schema: {
            type: "object",
            properties: {
              targetCompanyTypes: { type: "array", items: { type: "string" } },
              targetIndustries: { type: "array", items: { type: "string" } },
              matchingCriteria: { type: "string" },
              searchKeywords: { type: "array", items: { type: "string" } },
              estimatedMarketSize: { type: "string" },
            },
            required: ["targetCompanyTypes", "targetIndustries"],
          },
        },
      },
    });

    let matchingData: any = {};
    try {
      const content = typeof matchingResponse.choices[0]?.message.content === 'string'
        ? matchingResponse.choices[0].message.content
        : "{}";
      matchingData = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse matching response:", e);
    }

    // 4. 模拟搜索公司并创建匹配记录
    const mockCompanies = generateMockCompanies(
      extractedData.productName,
      matchingData.targetCompanyTypes || [],
      targetCountries,
      input.numberOfCompanies
    );

    for (const company of mockCompanies) {
      try {
        // 计算匹配度
        const matchScore = calculateMatchScore(company, extractedData, matchingData);

        // 创建公司匹配记录
        const companyMatch = await createCompanyMatch({
          productSubmissionId: submissionId,
          companyName: company.name,
          companyDescription: company.description,
          companyWebsite: company.website,
          companyLinkedin: company.linkedin,
          contactEmail: company.email,
          contactPhone: company.phone,
          contactSource: company.contactSource as any,
          matchScore: matchScore.toString(),
          matchReason: generateMatchReason(company, extractedData),
        });

        // 为每个公司生成 Cold Email
        const emailContent = await generateColdEmail(
          extractedData,
          company,
          matchScore
        );

        const companyMatchId = (companyMatch as any).insertId || 1;

        await createColdEmail({
          productSubmissionId: submissionId,
          companyMatchId,
          subject: emailContent.subject,
          emailBody: emailContent.body,
          language: "zh",
        });
      } catch (error) {
        console.error(`Error processing company ${company.name}:`, error);
      }
    }

    // 5. 更新状态为 completed
    await updateProductSubmissionStatus(submissionId, "completed");
  } catch (error) {
    console.error("Error in extractProductFromPDFAndAnalyze:", error);
    await updateProductSubmissionStatus(submissionId, "failed");
    throw error;
  }
}

/**
 * 生成模拟公司列表
 */
function generateMockCompanies(
  productName: string,
  companyTypes: string[],
  countries: string[],
  count: number
): any[] {
  const mockCompanies = [
    {
      name: "Global Tech Solutions Inc.",
      description: "Leading technology distributor",
      website: "https://globaltechsolutions.com",
      linkedin: "https://linkedin.com/company/global-tech-solutions",
      email: "sales@globaltechsolutions.com",
      phone: "+1-555-0101",
      contactSource: "website" as const,
    },
    {
      name: "International Trade Partners Ltd.",
      description: "Global import/export specialist",
      website: "https://intltradepartners.com",
      linkedin: "https://linkedin.com/company/intl-trade-partners",
      email: "partnerships@intltradepartners.com",
      phone: "+44-20-7946-0958",
      contactSource: "linkedin" as const,
    },
    {
      name: "Asia Pacific Distribution Group",
      description: "Regional distribution network",
      website: "https://apd-group.com",
      linkedin: "https://linkedin.com/company/asia-pacific-distribution",
      email: "business@apd-group.com",
      phone: "+65-6789-0123",
      contactSource: "website" as const,
    },
    {
      name: "European Market Expansion Corp",
      description: "EU market entry specialist",
      website: "https://eumarketexpansion.eu",
      linkedin: "https://linkedin.com/company/eu-market-expansion",
      email: "contact@eumarketexpansion.eu",
      phone: "+49-30-12345678",
      contactSource: "website" as const,
    },
    {
      name: "Americas Trading Consortium",
      description: "North and South America trade",
      website: "https://americastrading.com",
      linkedin: "https://linkedin.com/company/americas-trading",
      email: "info@americastrading.com",
      phone: "+1-212-555-0123",
      contactSource: "linkedin" as const,
    },
  ];

  return mockCompanies.slice(0, count);
}

/**
 * 计算匹配度
 */
function calculateMatchScore(company: any, productData: any, matchingData: any): number {
  let score = 50; // 基础分

  // 公司类型匹配
  if (matchingData.targetCompanyTypes && matchingData.targetCompanyTypes.length > 0) {
    score += 20;
  }

  // 行业匹配
  if (matchingData.targetIndustries && matchingData.targetIndustries.length > 0) {
    score += 15;
  }

  // 联系方式完整性
  if (company.email && company.phone) {
    score += 10;
  } else if (company.email || company.phone) {
    score += 5;
  }

  // 网站可用性
  if (company.website) {
    score += 5;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * 生成匹配原因
 */
function generateMatchReason(company: any, productData: any): string {
  const reasons = [];

  if (company.description) {
    reasons.push("公司业务与产品匹配度高");
  }

  if (company.website) {
    reasons.push("公司信息完整");
  }

  if (company.email && company.phone) {
    reasons.push("联系方式齐全");
  }

  return reasons.join("，") || "符合目标公司标准";
}

/**
 * 生成 Cold Email
 */
async function generateColdEmail(
  productData: any,
  company: any,
  matchScore: number
): Promise<{ subject: string; body: string }> {
  const emailPrompt = `
  请为以下产品和公司生成一封专业的 Cold Email：
  
  产品: ${productData.productName}
  产品描述: ${productData.productDescription}
  产品特性: ${productData.productFeatures?.join(", ") || ""}
  
  目标公司: ${company.name}
  公司描述: ${company.description}
  
  匹配度: ${matchScore}%
  
  请生成一封专业、简洁、有说服力的 Cold Email，包括：
  - 主题行（Subject）
  - 邮件正文
  
  返回 JSON 格式：
  {
    "subject": "邮件主题",
    "body": "邮件正文"
  }
  `;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are an expert at writing persuasive cold emails for B2B sales. Write professional, concise emails that highlight value propositions.",
      },
      {
        role: "user",
        content: emailPrompt,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "cold_email",
        strict: true,
        schema: {
          type: "object",
          properties: {
            subject: { type: "string" },
            body: { type: "string" },
          },
          required: ["subject", "body"],
        },
      },
    },
  });

  try {
    const content = typeof response.choices[0]?.message.content === 'string'
      ? response.choices[0].message.content
      : "{}";
    return JSON.parse(content);
  } catch (e) {
    console.error("Failed to generate cold email:", e);
    return {
      subject: `Partnership Opportunity - ${productData.productName}`,
      body: `Dear ${company.name},\n\nWe have an exciting product opportunity that could benefit your business.\n\nBest regards`,
    };
  }
}
