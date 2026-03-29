/**
 * 买家聊天搜索 SSE 端点
 * POST /api/buyer-chat-search  → 返回 SSE 流
 */
import { Router, Request, Response } from 'express';
import { initializeSSE, sendProgressUpdate, sendSSEError } from './progress-sse';
import { analyzeUserInput, runBuyerSearch, ChatInput } from '../buyer-search-v2';
import { enrichContacts } from '../contact-enrichment';

export const buyerChatRouter = Router();

buyerChatRouter.post('/buyer-chat-search', async (req: Request, res: Response) => {
  initializeSSE(res);

  const { message, pdfText, linkUrl } = req.body as ChatInput;

  if (!message || message.trim().length < 3) {
    sendSSEError(res, '请输入产品描述（至少3个字）');
    return;
  }

  try {
    // Step 1: Kimi 分析
    sendProgressUpdate(res, {
      stage: 'analyzing',
      progress: 5,
      message: '🧠 Kimi AI 正在分析您的产品...'
    });

    const analysis = await analyzeUserInput({ message, pdfText, linkUrl });

    sendProgressUpdate(res, {
      stage: 'analyzed',
      progress: 18,
      message: `✅ 产品分析完成：${analysis.productName}`,
      data: {
        productName: analysis.productName,
        productType: analysis.productType,
        buyerTypes: analysis.buyerTypes,
        targetCountries: analysis.targetCountries,
        requestedCount: analysis.requestedCount,
        keywords: analysis.searchKeywords.map(k => ({
          country: k.country,
          language: k.language,
          sample: k.localKeywords[0]
        }))
      }
    });

    // Step 2: 多源搜索（带进度回调）
    const companies = await runBuyerSearch(analysis, (progress) => {
      sendProgressUpdate(res, progress);
    });

    // Step 3: 联系方式富化（官网爬取 + Serper定向 + Kimi AI）
    sendProgressUpdate(res, {
      stage: 'enriching',
      progress: 82,
      message: `📋 正在获取 ${companies.length} 家公司联系方式（邮箱/电话/WhatsApp/LinkedIn/Facebook）...`
    });

    const enriched = await enrichContacts(companies, (msg, done, total) => {
      const pct = 82 + Math.round((done / total) * 16);
      sendProgressUpdate(res, { stage: 'enriching', progress: Math.min(pct, 98), message: `📋 ${msg}` });
    });

    // Step 4: 返回最终结果
    sendProgressUpdate(res, {
      stage: 'completed',
      progress: 100,
      message: `🎉 搜索完成！共找到 ${enriched.length} 家匹配买家`,
      data: {
        companies: enriched,
        analysis: {
          productName: analysis.productName,
          productType: analysis.productType,
          targetCountries: analysis.targetCountries,
          buyerTypes: analysis.buyerTypes,
          searchKeywords: analysis.searchKeywords
        }
      }
    });

    res.end();
  } catch (error) {
    console.error('买家搜索错误:', error);
    sendSSEError(res, `搜索失败: ${error instanceof Error ? error.message : String(error)}`);
  }
});
