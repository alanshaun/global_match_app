import { router, publicProcedure } from '../_core/trpc';
import { z } from 'zod';
import { invokeLLM } from '../_core/llm';
import { searchBuyers } from '../buyer-search-engine';

export const supplyChainRouter = router({
  /**
   * 分析用户意图 - 使用 Kimi AI 理解用户输入
   */
  analyzeIntent: publicProcedure
    .input(
      z.object({
        userInput: z.string(),
        previousContext: z.array(z.object({ role: z.string(), content: z.string() })).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const systemPrompt = `你是一个供应链匹配助手。分析用户的输入，提取以下信息：
1. 产品描述（如果有的话）
2. 目标国家/地区（如果有的话）
3. 想要找的买家数量（默认 10）
4. 买家类型（分销商、进口商、零售商、代理商、批发商、OEM/ODM、电商平台等）
5. 产品类别（工业品、消费品、原材料、配件等）

如果信息不完整，询问用户缺少的信息。
如果信息完整，返回 JSON 格式的搜索意图。

返回格式：
{
  "isComplete": boolean,
  "message": "你的回复",
  "intent": {
    "productDescription": "产品描述",
    "targetCountries": ["国家1", "国家2"],
    "buyerCount": 数字,
    "buyerTypes": ["类型1", "类型2"],
    "productCategory": "产品类别"
  }
}`;

        const messages = [
          { role: 'system' as const, content: systemPrompt },
          ...(input.previousContext || []).map((msg) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          })),
          { role: 'user' as const, content: input.userInput },
        ];

        const response = await invokeLLM({ messages });

        const content = typeof response.choices?.[0]?.message?.content === 'string'
          ? response.choices[0].message.content
          : '';

        // 尝试从响应中提取 JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            message: parsed.message || '理解您的需求，准备开始搜索...',
            isComplete: parsed.isComplete || false,
            intent: parsed.intent || null,
          };
        }

        return {
          message: content,
          isComplete: false,
          intent: null,
        };
      } catch (error) {
        console.error('❌ 意图分析错误:', error);
        return {
          message: '抱歉，我无法理解您的输入。请重新描述您的需求。',
          isComplete: false,
          intent: null,
        };
      }
    }),

  /**
   * 搜索买家 - 使用多个数据源
   */
  searchBuyers: publicProcedure
    .input(
      z.object({
        productDescription: z.string(),
        targetCountries: z.array(z.string()),
        buyerCount: z.number().default(10),
        buyerTypes: z.array(z.string()),
        productCategory: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const buyers = await searchBuyers({
          productName: input.productDescription,
          productCategory: input.productCategory,
          targetCountries: input.targetCountries,
          buyerTypes: input.buyerTypes,
          keywords: [input.productDescription],
        });

        // 限制返回的买家数量
        const limitedBuyers = buyers.slice(0, input.buyerCount);
        return limitedBuyers.map((buyer: any) => ({
          id: `${buyer.name}-${buyer.country}`,
          name: buyer.name,
          country: buyer.country,
          website: buyer.website || '',
          phone: buyer.phone || '',
          email: buyer.email || '',
          description: buyer.description || '',
          source: buyer.source,
          matchingScore: Math.floor(Math.random() * 40 + 60),
        }));
      } catch (error) {
        console.error('❌ 买家搜索错误:', error);
        throw new Error('搜索买家失败，请重试');
      }
    }),

  /**
   * 分析产品 - 详细的产品分析
   */
  analyzeProduct: publicProcedure
    .input(
      z.object({
        productDescription: z.string(),
        productCategory: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const systemPrompt = `你是一个产品分析专家。分析产品并返回以下信息（JSON 格式）：
{
  "productType": "工业品/消费品/原材料/配件/其他",
  "typicalBuyerTypes": ["分销商", "进口商", "零售商", ...],
  "purchasingScenarios": ["场景1", "场景2", ...],
  "keyFeatures": ["特性1", "特性2", ...],
  "targetMarkets": ["市场1", "市场2", ...],
  "competitiveAdvantages": ["优势1", "优势2", ...]
}`;

        const response = await invokeLLM({
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `分析这个产品：${input.productDescription}`,
            },
          ],
        });

        const content = typeof response.choices?.[0]?.message?.content === 'string'
          ? response.choices[0].message.content
          : '{}';

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }

        return {
          productType: '未知',
          typicalBuyerTypes: [],
          purchasingScenarios: [],
          keyFeatures: [],
          targetMarkets: [],
          competitiveAdvantages: [],
        };
      } catch (error) {
        console.error('❌ 产品分析错误:', error);
        throw new Error('产品分析失败');
      }
    }),

  /**
   * 生成多语言搜索关键词
   */
  generateKeywords: publicProcedure
    .input(
      z.object({
        productDescription: z.string(),
        targetCountries: z.array(z.string()),
        buyerTypes: z.array(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const systemPrompt = `你是一个多语言搜索专家。为每个国家生成本地化的搜索关键词。
返回 JSON 格式：
{
  "keywords": {
    "US": { "english": ["keyword1", "keyword2"], "local": [] },
    "DE": { "english": ["keyword1"], "local": ["德语关键词1"] },
    ...
  }
}`;

        const response = await invokeLLM({
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `产品：${input.productDescription}\n国家：${input.targetCountries.join(', ')}\n买家类型：${input.buyerTypes.join(', ')}`,
            },
          ],
        });

        const content = typeof response.choices?.[0]?.message?.content === 'string'
          ? response.choices[0].message.content
          : '{}';

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }

        return { keywords: {} };
      } catch (error) {
        console.error('❌ 关键词生成错误:', error);
        throw new Error('关键词生成失败');
      }
    }),
});
