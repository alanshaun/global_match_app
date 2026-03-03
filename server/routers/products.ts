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
   * 上传产品并创建匹配任务
   */
  submitProduct: protectedProcedure
    .input(
      z.object({
        productName: z.string().min(1, "产品名称不能为空"),
        productDescription: z.string().min(1, "产品描述不能为空"),
        productCategory: z.string().optional(),
        productSpecs: z.record(z.string(), z.any()).optional(),
        productImageUrls: z.array(z.string()).optional(),
        targetCountries: z.array(z.string()).optional(),
        numberOfCompanies: z.number().int().min(1).max(50).default(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // 创建产品提交记录
        const submission = await createProductSubmission(ctx.user.id, {
          productName: input.productName,
          productDescription: input.productDescription,
          productCategory: input.productCategory || undefined,
          productSpecs: input.productSpecs ? JSON.stringify(input.productSpecs) : undefined,
          productImages: input.productImageUrls ? JSON.stringify(input.productImageUrls) : undefined,
          targetCountries: input.targetCountries ? JSON.stringify(input.targetCountries) : undefined,
          numberOfCompanies: input.numberOfCompanies,
          status: "pending" as const,
        });

        // 获取插入的 ID（Drizzle 返回的结果）
        const submissionId = (submission as any).insertId || 1;

        // 异步触发 AI 分析和公司匹配（实际应用中应该使用后台任务队列）
        analyzeProductAndMatchCompanies(submissionId, ctx.user.id, input).catch(err => {
          console.error("Error in background analysis:", err);
        });

        return {
          submissionId,
          status: "pending",
          message: "产品已提交，正在进行 AI 分析和公司匹配...",
        };
      } catch (error) {
        throw new Error(`Failed to submit product: ${error}`);
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

        // 为每个匹配的公司获取对应的 Cold Email
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
      // 暂时返回空数组
      return [];
    } catch (error) {
      throw new Error(`Failed to get user products: ${error}`);
    }
  }),
});

/**
 * 后台异步函数：AI 分析产品并匹配公司
 */
async function analyzeProductAndMatchCompanies(
  submissionId: number,
  userId: number,
  input: any
) {
  try {
    // 1. 更新状态为 analyzing
    await updateProductSubmissionStatus(submissionId, "analyzing");

    // 2. 使用 LLM 分析产品特征
    const analysisPrompt = `
    分析以下产品信息，并提供详细的市场分析、目标客户和潜在合作伙伴类型：
    
    产品名称: ${input.productName}
    产品描述: ${input.productDescription}
    产品类别: ${input.productCategory || "未指定"}
    产品规格: ${JSON.stringify(input.productSpecs || {})}
    目标国家: ${input.targetCountries?.join(", ") || "全球"}
    
    请提供：
    1. 产品的核心特征和优势
    2. 目标市场和客户群体
    3. 建议的合作伙伴类型（如分销商、代理商、零售商等）
    4. 推荐的行业和公司类型
    `;

    const analysisResponse = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a business analyst specializing in product market analysis and B2B partnerships.",
        },
        {
          role: "user",
          content: analysisPrompt,
        },
      ],
    });

    const aiAnalysis = typeof analysisResponse.choices[0]?.message.content === 'string' 
      ? analysisResponse.choices[0].message.content 
      : "";

    // 3. 使用 LLM 生成公司匹配建议
    const matchingPrompt = `
    基于以下产品分析，生成 ${input.numberOfCompanies} 个最合适的目标公司建议。
    
    产品分析:
    ${aiAnalysis}
    
    目标国家: ${input.targetCountries?.join(", ") || "全球"}
    
    请以 JSON 格式返回，包含以下字段（每个公司一个对象）：
    [
      {
        "companyName": "公司名称",
        "industry": "行业",
        "country": "国家",
        "description": "公司简介",
        "matchReason": "为什么这家公司是好的合作伙伴",
        "matchScore": 85
      }
    ]
    
    只返回 JSON 数组，不要其他文本。
    `;

    const matchingResponse = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a business development expert. Return only valid JSON array.",
        },
        {
          role: "user",
          content: matchingPrompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "company_matches",
          strict: true,
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                companyName: { type: "string" },
                industry: { type: "string" },
                country: { type: "string" },
                description: { type: "string" },
                matchReason: { type: "string" },
                matchScore: { type: "number" },
              },
              required: ["companyName", "industry", "country", "description", "matchReason", "matchScore"],
            },
          },
        },
      },
    });

    let suggestedCompanies: any[] = [];
    try {
      const content = typeof matchingResponse.choices[0]?.message.content === 'string'
        ? matchingResponse.choices[0].message.content
        : "[]";
      suggestedCompanies = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse company suggestions:", e);
    }

    // 4. 为每家公司搜索联系方式并创建匹配记录
    for (const company of suggestedCompanies) {
      try {
        // 搜索公司联系方式（这里模拟搜索过程）
        const contactInfo = await searchCompanyContactInfo(company.companyName, company.country);

        // 创建公司匹配记录
        await createCompanyMatch({
          productSubmissionId: submissionId,
          companyName: company.companyName,
          companyWebsite: contactInfo.website || undefined,
          companyLinkedin: contactInfo.linkedin || undefined,
          companyDescription: company.description,
          matchScore: company.matchScore.toString(),
          matchReason: company.matchReason,
          contactEmail: contactInfo.email || undefined,
          contactPhone: contactInfo.phone || undefined,
          contactName: contactInfo.contactName || undefined,
          contactTitle: contactInfo.contactTitle || undefined,
          contactSource: (contactInfo.source || "official_website") as any,
          coldEmailGenerated: false,
        });

        // 5. 为每家公司生成 Cold Email
        const emailContent = await generateColdEmail(company, input, contactInfo);

        // 获取刚创建的公司匹配记录的 ID（这里需要改进）
        // 实际应用中应该返回创建的记录 ID
        const matches = await getCompanyMatchesByProductId(submissionId);
        const latestMatch = matches[matches.length - 1];

        if (latestMatch) {
          await createColdEmail({
            companyMatchId: latestMatch.id,
            productSubmissionId: submissionId,
            subject: emailContent.subject,
            emailBody: emailContent.body,
            language: "en",
          });
        }
      } catch (error) {
        console.error(`Error processing company ${company.companyName}:`, error);
      }
    }

    // 6. 更新状态为 completed
    await updateProductSubmissionStatus(submissionId, "completed");
  } catch (error) {
    console.error("Error in analyzeProductAndMatchCompanies:", error);
    await updateProductSubmissionStatus(submissionId, "failed");
  }
}

/**
 * 搜索公司联系方式
 */
async function searchCompanyContactInfo(companyName: string, country: string) {
  // 这里应该集成真实的搜索 API（如 Google Search API、LinkedIn API 等）
  // 目前返回模拟数据
  return {
    website: `https://www.${companyName.toLowerCase().replace(/\s+/g, "")}.com`,
    linkedin: `https://www.linkedin.com/company/${companyName.toLowerCase().replace(/\s+/g, "-")}`,
    email: `contact@${companyName.toLowerCase().replace(/\s+/g, "")}.com`,
    phone: null,
    contactName: null,
    contactTitle: null,
    source: "official_website",
  };
}

/**
 * 生成个性化 Cold Email
 */
async function generateColdEmail(company: any, product: any, contactInfo: any) {
  const emailPrompt = `
  生成一封专业的 Cold Email，用于联系以下公司关于产品合作机会。
  
  公司信息:
  - 公司名称: ${company.companyName}
  - 行业: ${company.industry}
  - 国家: ${company.country}
  
  产品信息:
  - 产品名称: ${product.productName}
  - 产品描述: ${product.productDescription}
  - 产品类别: ${product.productCategory}
  
  匹配原因: ${company.matchReason}
  
  请生成一封简洁、专业的 Cold Email，包含以下部分：
  1. 吸引人的主题行
  2. 个性化的开场白
  3. 产品价值主张
  4. 合作机会描述
  5. 明确的行动号召
  
  返回格式：
  {
    "subject": "邮件主题",
    "body": "邮件正文"
  }
  `;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are an expert in B2B sales and cold email outreach. Generate professional, personalized cold emails.",
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
    console.error("Failed to parse cold email:", e);
    return {
      subject: `Partnership Opportunity - ${product.productName}`,
      body: `Hi,\n\nWe have an exciting partnership opportunity for your company.\n\nBest regards`,
    };
  }
}
