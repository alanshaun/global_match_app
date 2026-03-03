import axios from "axios";

const KIMI_API_URL = "https://api.moonshot.cn/v1/chat/completions";
const KIMI_API_KEY = process.env.KIMI_API_KEY;

export interface KimiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface KimiResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 调用 Kimi 2.5 API 进行文本分析
 */
export async function invokeKimiLLM(
  messages: KimiMessage[],
  options?: {
    temperature?: number;
    max_tokens?: number;
    model?: string;
  }
): Promise<KimiResponse> {
  if (!KIMI_API_KEY) {
    throw new Error("KIMI_API_KEY environment variable is not set");
  }

  try {
    const response = await axios.post<KimiResponse>(
      KIMI_API_URL,
      {
        model: options?.model || "moonshot-v1-32k",
        messages,
        temperature: options?.temperature || 0.3,
        max_tokens: options?.max_tokens || 4096,
      },
      {
        headers: {
          Authorization: `Bearer ${KIMI_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 120000, // 2 minutes timeout
      }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Kimi API Error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      throw new Error(
        `Kimi API failed: ${error.response?.data?.error?.message || error.message}`
      );
    }
    throw error;
  }
}

/**
 * 从 Kimi 响应中提取文本内容
 */
export function extractKimiContent(response: KimiResponse): string {
  if (!response.choices || response.choices.length === 0) {
    throw new Error("No choices in Kimi response");
  }
  return response.choices[0].message.content;
}

/**
 * 验证 Kimi API 连接
 */
export async function validateKimiConnection(): Promise<boolean> {
  try {
    const response = await invokeKimiLLM([
      {
        role: "user",
        content: "Hello, are you working?",
      },
    ]);

    return response.choices && response.choices.length > 0;
  } catch (error) {
    console.error("Kimi API validation failed:", error);
    return false;
  }
}
