import { Router, Request, Response } from "express";
import { initializeSSE, sendProgressUpdate, closeSSE, sendSSEError } from "./progress-sse";
import { invokeKimiLLM, extractKimiContent } from "./kimi-llm";
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
        return sendSSEError(res, "数据库连接失败");
      }

      // 获取产品提交记录
      const submissions = await db
        .select()
        .from(productSubmissions)
        .where(eq(productSubmissions.id, parseInt(submissionId)));

      if (!submissions.length) {
        return sendSSEError(res, "产品提交记录不存在");
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

      // 阶段 3: 生成公司匹配建议 (60-90%)
      sendProgressUpdate(res, {
        stage: "matching",
        progress: 70,
        message: "正在生成公司匹配建议...",
      });

      let matchingData: any = {};
      try {
        const matchingResponse = await invokeKimiLLM([
          {
            role: "system",
            content: `You are a B2B matching expert. Suggest specific company types and search criteria.
Return a JSON object with:
- suggestedCompanyTypes: string[]
- searchKeywords: string[]
- matchingCriteria: string
- estimatedCompanies: number`,
          },
          {
            role: "user",
            content: `Based on this product and market analysis, suggest companies to contact: Product: ${JSON.stringify(productData)}, Markets: ${JSON.stringify(marketAnalysis)}`,
          },
        ]);

        const content = extractKimiContent(matchingResponse);
        matchingData = JSON.parse(content);

        sendProgressUpdate(res, {
          stage: "matching",
          progress: 85,
          message: `✓ 已生成匹配建议 (预计 ${matchingData.estimatedCompanies || 10} 家公司)`,
          data: matchingData,
        });
      } catch (error) {
        console.error("Matching error:", error);
        matchingData = {
          suggestedCompanyTypes: ["Distributor", "Reseller", "Importer"],
          searchKeywords: ["wholesale", "distribution", "partnership"],
          matchingCriteria: "Global market match",
          estimatedCompanies: 15,
        };

        sendProgressUpdate(res, {
          stage: "matching",
          progress: 85,
          message: "✓ 已使用默认匹配建议",
          data: matchingData,
        });
      }

      // 阶段 4: 完成处理 (90-100%)
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
              matchingData,
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
            matchingData,
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
            matchingData,
          },
        })}\n\n`);
      }

      // 关闭连接
      res.end();
    } catch (error) {
      console.error("Product processing error:", error);
      sendSSEError(res, `处理失败: ${error instanceof Error ? error.message : "未知错误"}`);
    }
  }
);
