import axios from "axios";

const KIMI_API_URL = "https://api.moonshot.cn/v1/chat/completions";
const KIMI_API_KEY = process.env.KIMI_API_KEY;

// 统一使用 kimi-k2.5（支持联网 $web_search，比 moonshot-v1 系列更强）
const DEFAULT_MODEL = "kimi-k2.5";

export interface KimiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ToolCall {
  id: string;
  type: string;
  function: { name: string; arguments: string };
}

interface RawChoice {
  index: number;
  message: {
    role: string;
    content: string | null;
    reasoning_content?: string | null;  // kimi-k2.5 推理模型会带此字段
    tool_calls?: ToolCall[];
  };
  finish_reason: string;
}

export interface KimiResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/** kimi-k2.5 推理模型：content 是最终答案，reasoning_content 是思考过程。取 content。*/
function extractContent(choice: RawChoice): string {
  return (choice.message.content || "").trim();
}

/**
 * 基础文本生成（无工具）—— 统一走 kimi-k2.5
 */
export async function invokeKimiLLM(
  messages: KimiMessage[],
  options?: { temperature?: number; max_tokens?: number; model?: string }
): Promise<KimiResponse> {
  if (!KIMI_API_KEY) throw new Error("KIMI_API_KEY environment variable is not set");

  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.post<KimiResponse>(
        KIMI_API_URL,
        {
          model: options?.model || DEFAULT_MODEL,
          messages,
          temperature: 1,          // kimi-k2.5 只允许 temperature=1
          max_tokens:  options?.max_tokens  ?? 4096,
        },
        {
          headers: { Authorization: `Bearer ${KIMI_API_KEY}`, "Content-Type": "application/json" },
          timeout: 120000,
        }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        // 502/503/504 是服务端临时抖动，重试
        if ((status === 502 || status === 503 || status === 504) && attempt < MAX_RETRIES) {
          console.warn(`Kimi API ${status}，第 ${attempt + 1} 次重试...`);
          await new Promise(r => setTimeout(r, 1200 * (attempt + 1)));
          continue;
        }
        console.error("Kimi API Error:", { status, data: error.response?.data });
        throw new Error(`Kimi API failed: ${error.response?.data?.error?.message || error.message}`);
      }
      throw error;
    }
  }
  throw new Error("Kimi API failed after retries");
}

/** 从 KimiResponse 中提取文本内容 */
export function extractKimiContent(response: KimiResponse): string {
  if (!response.choices?.length) throw new Error("No choices in Kimi response");
  return response.choices[0].message.content;
}

/**
 * 使用 kimi-k2.5 联网搜索（$web_search 内置工具）
 * 自动处理 tool_calls 循环，直到 finish_reason = "stop"
 */
export async function invokeKimiWithWebSearch(
  messages: KimiMessage[],
  options?: { temperature?: number; max_tokens?: number; model?: string }
): Promise<string> {
  if (!KIMI_API_KEY) throw new Error("KIMI_API_KEY environment variable is not set");

  const model = options?.model || DEFAULT_MODEL;
  const tools = [{ type: "builtin_function", function: { name: "$web_search" } }];
  const history: any[] = messages.map((m) => ({ role: m.role, content: m.content }));

  for (let round = 0; round < 8; round++) {
    const resp = await axios.post<{ choices: RawChoice[] }>(
      KIMI_API_URL,
      {
        model,
        messages: history,
        tools,
        temperature: 1,          // kimi-k2.5 只允许 temperature=1
        max_tokens:  options?.max_tokens  ?? 4000,
      },
      {
        headers: { Authorization: `Bearer ${KIMI_API_KEY}`, "Content-Type": "application/json" },
        timeout: 90000,
      }
    );

    const choice = resp.data.choices[0];
    if (!choice) throw new Error("Kimi returned no choices");

    // finish_reason=stop 或无工具调用 → 返回最终内容
    if (choice.finish_reason === "stop" || !choice.message.tool_calls?.length) {
      return extractContent(choice);
    }

    // 有 tool_call → 追加到 history（kimi-k2.5 thinking model 要求带 reasoning_content）
    history.push({
      role: "assistant",
      content: choice.message.content || null,
      reasoning_content: (choice.message as any).reasoning_content ?? "",
      tool_calls: choice.message.tool_calls,
    });

    for (const tc of choice.message.tool_calls!) {
      history.push({
        role: "tool",
        tool_call_id: tc.id,
        name: tc.function.name,
        content: "",   // builtin function — Moonshot API 内部处理搜索结果
      });
    }
  }
  throw new Error("Kimi web search exceeded max rounds");
}
