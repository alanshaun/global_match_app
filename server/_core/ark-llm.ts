/**
 * 火山引擎 Ark API 客户端（豆包/DeepSeek 模型）
 * 文档：https://www.volcengine.com/docs/82379/1099475
 * 端点格式：和 OpenAI 完全兼容
 */
import axios from 'axios';

const ARK_BASE_URL = process.env.BUILT_IN_FORGE_API_URL || 'https://ark.cn-beijing.volces.com/api/v3';
const ARK_API_KEY  = process.env.BUILT_IN_FORGE_API_KEY  || '';
// 端点 ID 即 model ID（在火山引擎控制台创建的 endpoint uuid）
const ARK_MODEL    = ARK_API_KEY;

export interface ArkMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * 基础文本生成调用（无工具）
 */
export async function invokeArk(
  messages: ArkMessage[],
  options?: { temperature?: number; max_tokens?: number }
): Promise<string> {
  if (!ARK_API_KEY) throw new Error('BUILT_IN_FORGE_API_KEY not set');

  const resp = await axios.post(
    `${ARK_BASE_URL}/chat/completions`,
    {
      model: ARK_MODEL,
      messages,
      temperature: options?.temperature ?? 0.2,
      max_tokens:  options?.max_tokens  ?? 2000,
    },
    {
      headers: {
        Authorization: `Bearer ${ARK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  );

  return resp.data?.choices?.[0]?.message?.content || '';
}

/**
 * 带联网搜索的生成调用
 * 火山引擎支持通过 tools 传入 web_search 插件（需要 endpoint 开启搜索能力）
 * 若 endpoint 不支持，自动降级为普通生成
 */
export async function invokeArkWithWebSearch(
  messages: ArkMessage[],
  options?: { temperature?: number; max_tokens?: number }
): Promise<string> {
  if (!ARK_API_KEY) throw new Error('BUILT_IN_FORGE_API_KEY not set');

  const webSearchTool = {
    type: 'function',
    function: {
      name: 'web_search',
      description: '搜索互联网上的最新信息',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: '搜索关键词' } },
        required: ['query'],
      },
    },
  };

  try {
    const history: any[] = messages.map(m => ({ role: m.role, content: m.content }));

    for (let round = 0; round < 6; round++) {
      const resp = await axios.post(
        `${ARK_BASE_URL}/chat/completions`,
        {
          model: ARK_MODEL,
          messages: history,
          tools: [webSearchTool],
          tool_choice: 'auto',
          temperature: options?.temperature ?? 0.2,
          max_tokens:  options?.max_tokens  ?? 2000,
        },
        {
          headers: {
            Authorization: `Bearer ${ARK_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

      const choice = resp.data?.choices?.[0];
      if (!choice) break;

      if (choice.finish_reason === 'stop' || !choice.message?.tool_calls?.length) {
        return choice.message?.content || '';
      }

      // 有 tool_call → 回传空结果（服务器端实际执行搜索）
      history.push({ role: 'assistant', content: choice.message.content || null, tool_calls: choice.message.tool_calls });
      for (const tc of choice.message.tool_calls) {
        history.push({
          role: 'tool',
          tool_call_id: tc.id,
          name: tc.function?.name,
          content: JSON.stringify({ results: [] }), // placeholder，让模型继续
        });
      }
    }
  } catch (e: any) {
    // 不支持 tools 时降级为普通调用
    if (e?.response?.status === 400 || e?.response?.status === 422) {
      console.warn('[Ark] web_search not supported, falling back to plain invoke');
      return invokeArk(messages, options);
    }
    throw e;
  }

  return '';
}
