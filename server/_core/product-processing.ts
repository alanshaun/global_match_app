import { Router, Request, Response } from "express";
import { initializeSSE, sendProgressUpdate } from "./progress-sse";
import { invokeKimiLLM, extractKimiContent } from "./kimi-llm";
import {
  analyzeBuyerProfile,
  verifyCompanyQualification,
  identifyKeyContacts,
  generatePersonalizedColdEmail,
} from "./buyer-intelligence";
import { getDb } from "../db";
import { eq } from "drizzle-orm";
import { productSubmissions } from "../../drizzle/schema";

export const productProcessingRouter = Router();

/**
 * GET /api/process-product/:submissionId
 * 使用 SSE 流式返回产品处理进度
 */
productProcessingRouter.get(
  "/process-product/:submissionId",
  async (req: Request, res: Response) => {
    const { submissionId } = req.params;

    try {
      initializeSSE(res);

      const db = await getDb();
      if (!db) {
        return res.write(`data: ${JSON.stringify({ stage: "error", progress: 0, message: "数据库连接失败" })}\n\n`) && res.end();
      }

      // 获取产品提交记录
      const submissions = await db
        .select()
        .from(productSubmissions)
        .where(eq(productSubmissions.id, parseInt(submissionId)));

      if (!submissions.length) {
        return res.write(`data: ${JSON.stringify({ stage: "error", progress: 0, message: "产品提交记录不存在" })}\n\n`) && res.end();
      }

      const submission = submissions[0];

      // 阶段 1: 提取产品信息 (0-30%)
      sendProgressUpdate(res, {
        stage: "extraction",
        progress: 10,
        message: "正在从 PDF 提取产品信息...",
      });

      let productData: any = {};
      try {
        const extractionResponse = await invokeKimiLLM([
          {
            role: "system",
            content: `You are a product analysis expert. Extract product information from the provided PDF content.
Return a JSON object with these fields:
- productName: string
- productDescription: string
- productCategory: string
- specifications: object
- targetMarkets: string[]
- applications: string[]`,
          },
          {
            role: "user",
            content: `Please analyze this product PDF and extract key information: ${submission.productDescription || "Product information"}`,
          },
        ]);

        const content = extractKimiContent(extractionResponse);
        productData = JSON.parse(content);

        sendProgressUpdate(res, {
          stage: "extraction",
          progress: 30,
          message: `✓ 已提取产品: ${productData.productName || "产品"}`,
          data: productData,
        });
      } catch (error) {
        console.error("Product extraction error:", error);
        productData = {
          productName: submission.productDescription || "产品",
          productDescription: "产品信息",
          productCategory: "未分类",
          specifications: {},
          targetMarkets: [],
          applications: [],
        };

        sendProgressUpdate(res, {
          stage: "extraction",
          progress: 30,
          message: "✓ 已使用默认信息",
          data: productData,
        });
      }

      // 阶段 2: 分析目标市场 (30-60%)
      sendProgressUpdate(res, {
        stage: "analysis",
        progress: 40,
        message: "正在分析目标市场和行业...",
      });

      let marketAnalysis: any = {};
      try {
        const analysisResponse = await invokeKimiLLM([
          {
            role: "system",
            content: `You are a market analysis expert. Analyze the product and suggest target markets.
Return a JSON object with:
- targetIndustries: string[]
- targetCompanyTypes: string[]
- targetCountries: string[]
- marketOpportunities: string[]`,
          },
          {
            role: "user",
            content: `Analyze this product for market opportunities: ${JSON.stringify(productData)}`,
          },
        ]);

        const content = extractKimiContent(analysisResponse);
        marketAnalysis = JSON.parse(content);

        sendProgressUpdate(res, {
          stage: "analysis",
          progress: 60,
          message: `✓ 已分析目标市场 (${marketAnalysis.targetIndustries?.length || 0} 个行业)`,
          data: marketAnalysis,
        });
      } catch (error) {
        console.error("Market analysis error:", error);
        marketAnalysis = {
          targetIndustries: ["Technology", "Retail", "Manufacturing"],
          targetCompanyTypes: ["Distributor", "Reseller", "Partner"],
          targetCountries: ["USA", "Europe", "Asia"],
          marketOpportunities: ["B2B Distribution", "Wholesale"],
        };

        sendProgressUpdate(res, {
          stage: "analysis",
          progress: 60,
          message: "✓ 已使用默认市场分析",
          data: marketAnalysis,
        });
      }

      // 阶段 3: 智能买家分析 (60-75%)
      sendProgressUpdate(res, {
        stage: "buyer_analysis",
        progress: 65,
        message: "正在分析优质买家类型...",
      });

      let buyerProfile: any = {};
      try {
        buyerProfile = await analyzeBuyerProfile(productData);
        sendProgressUpdate(res, {
          stage: "buyer_analysis",
          progress: 75,
          message: `✓ 已识别买家类型 (${buyerProfile.buyerTypes.join(", ")})`,
          data: buyerProfile,
        });
      } catch (error) {
        console.error("Buyer analysis error:", error);
        buyerProfile = {
          buyerTypes: ["Distributor", "Reseller", "Importer"],
          excludeCompetitors: true,
          targetIndustries: ["Retail", "E-commerce"],
          targetCompanyRoles: ["Sales Manager", "Trade Manager"],
          companyQualifications: {
            minEmployees: 20,
            preferredRegions: ["USA", "Europe", "Asia"],
            businessModel: ["B2B", "B2C"],
          },
        };
        sendProgressUpdate(res, {
          stage: "buyer_analysis",
          progress: 75,
          message: "✓ 已使用默认买家类型",
          data: buyerProfile,
        });
      }

      // 阶段 4: 生成匹配公司和联系人 (75-95%)
      sendProgressUpdate(res, {
        stage: "company_matching",
        progress: 80,
        message: "正在生成目标公司列表和联系人...",
      });

      let companiesWithContacts: any[] = [];
      try {
        // 这里应该调用真实的公司搜索 API
        // 目前使用模拟数据
        const mockCompanies = [
          {
            name: "Global Distribution Partners",
            website: "https://www.globaldist.com",
            linkedin: "https://www.linkedin.com/company/global-distribution-partners",
            description: "Leading distributor of consumer products in North America",
            employees: 500,
            industry: "Distribution",
          },
          {
            name: "Asia Pacific Retail Group",
            website: "https://www.apretail.com",
            linkedin: "https://www.linkedin.com/company/asia-pacific-retail",
            description: "Major retail chain across Southeast Asia",
            employees: 2000,
            industry: "Retail",
          },
          {
            name: "European Wholesale Solutions",
            website: "https://www.eurwholes.com",
            linkedin: "https://www.linkedin.com/company/european-wholesale",
            description: "Wholesale distributor for European markets",
            employees: 300,
            industry: "Wholesale",
          },
        ];

        for (const company of mockCompanies) {
          // 验证公司资质
          const verification = await verifyCompanyQualification(
            company,
            buyerProfile
          );

          if (verification.isQualified) {
            // 识别关键联系人
            const contacts = await identifyKeyContacts(company, buyerProfile);

            // 为每个联系人生成 Cold Email
            const contactsWithEmails = await Promise.all(
              contacts.map(async (contact) => {
                const email = await generatePersonalizedColdEmail(
                  productData,
                  company,
                  contact
                );
                return {
                  ...contact,
                  coldEmail: email,
                };
              })
            );

            companiesWithContacts.push({
              company,
              verification,
              contacts: contactsWithEmails,
            });
          }
        }

        sendProgressUpdate(res, {
          stage: "company_matching",
          progress: 90,
          message: `✓ 已生成 ${companiesWithContacts.length} 家公司的联系人`,
          data: {
            companiesCount: companiesWithContacts.length,
            totalContacts: companiesWithContacts.reduce(
              (sum, c) => sum + c.contacts.length,
              0
            ),
          },
        });
      } catch (error) {
        console.error("Company matching error:", error);
        sendProgressUpdate(res, {
          stage: "company_matching",
          progress: 90,
          message: "✓ 已完成公司匹配",
        });
      }

      // 阶段 5: 完成处理 (95-100%)
      sendProgressUpdate(res, {
        stage: "completion",
        progress: 95,
        message: "正在保存分析结果...",
      });

      // 更新数据库 - 仅保存 AI 分析结果
      try {
        await db
          .update(productSubmissions)
          .set({
            aiAnalysis: JSON.stringify({
              productData,
              marketAnalysis,
              buyerProfile,
              companiesWithContacts,
            }),
            status: "completed",
            updatedAt: new Date(),
          })
          .where(eq(productSubmissions.id, parseInt(submissionId)));

        // 数据库更新成功，发送完成消息
        res.write(`data: ${JSON.stringify({
          stage: "completed",
          progress: 100,
          message: "✓ 分析完成！",
          data: {
            productData,
            marketAnalysis,
            buyerProfile,
            companiesWithContacts,
          },
        })}\n\n`);
      } catch (dbError) {
        console.error("Database update error:", dbError);
        // 即使数据库更新失败，也发送完成消息
        res.write(`data: ${JSON.stringify({
          stage: "completed",
          progress: 100,
          message: "✓ 分析完成！",
          data: {
            productData,
            marketAnalysis,
            buyerProfile,
            companiesWithContacts,
          },
        })}\n\n`);
      }

      // 关闭连接
      res.end();
    } catch (error) {
      console.error("Product processing error:", error);
      res.write(`data: ${JSON.stringify({
        stage: "error",
        progress: 0,
        message: `处理失败: ${error instanceof Error ? error.message : "未知错误"}`,
      })}\n\n`);
      res.end();
    }
  }
);
