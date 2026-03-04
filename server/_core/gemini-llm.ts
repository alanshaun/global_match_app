import axios from "axios";

export interface GeminiMessage {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
}

/**
 * 调用 Google Gemini API
 */
export async function invokeGemini(messages: GeminiMessage[]): Promise<string> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        contents: messages,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      },
      {
        timeout: 30000,
      }
    );

    if (
      response.data.candidates &&
      response.data.candidates[0]?.content?.parts?.[0]?.text
    ) {
      return response.data.candidates[0].content.parts[0].text;
    }

    throw new Error("No response from Gemini API");
  } catch (error) {
    console.error("Gemini API error:", error);
    throw error;
  }
}

/**
 * 使用 Gemini 搜索真实职位
 */
export async function searchJobsWithGemini(
  position: string,
  location: string,
  country: string = "US",
  limit: number = 10
): Promise<any[]> {
  try {
    const searchPrompt = `
你是一个专业的职位搜索助手。请帮我搜索真实的职位信息。

搜索条件：
- 职位名称: ${position}
- 位置: ${location}
- 国家: ${country}
- 需要返回数量: ${limit}

请从以下真实职位网站搜索并返回真实的职位链接：
${country.toUpperCase() === "CN" ? `
- BOSS 直聘 (https://www.zhipin.com)
- 拉勾网 (https://www.lagou.com)
- 前程无忧 (https://www.51job.com)
` : `
- Indeed (https://www.indeed.com)
- LinkedIn Jobs (https://www.linkedin.com/jobs)
- Glassdoor (https://www.glassdoor.com)
- Google Jobs (https://www.google.com/jobs)
`}

请返回 JSON 格式的结果，包含以下字段：
[
  {
    "title": "职位名称",
    "company": "公司名称",
    "location": "${location}",
    "salary": "薪资范围（如果有）",
    "description": "职位描述摘要（2-3 句话）",
    "url": "真实的职位链接（必须是真实网站的链接，不能是 example.com）",
    "source": "来源网站（indeed/linkedin/boss/lagou/glassdoor 等）",
    "postedDate": "发布日期（如果有）"
  }
]

重要要求：
1. 返回的 URL 必须是真实可点击的链接
2. 不能返回 example.com 或其他虚假链接
3. 链接必须来自真实的职位网站
4. 每个职位必须包含真实的职位描述
5. 如果找不到真实链接，返回空数组
6. 返回有效的 JSON 格式
7. 确保返回 ${limit} 个职位（如果可能）
    `;

    const messages: GeminiMessage[] = [
      {
        role: "user",
        parts: [{ text: searchPrompt }],
      },
    ];

    const response = await invokeGemini(messages);

    try {
      // 尝试解析 JSON
      let jobs: any[] = [];

      try {
        jobs = JSON.parse(response);
      } catch (e) {
        // 如果直接解析失败，尝试提取 JSON 数组
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          jobs = JSON.parse(jsonMatch[0]);
        }
      }

      // 验证链接有效性
      const validJobs = jobs.filter(
        (job) =>
          job.url &&
          job.url.startsWith("http") &&
          !job.url.includes("example.com") &&
          job.title &&
          job.company
      );

      console.log(
        `[Gemini Job Search] Found ${validJobs.length} valid jobs out of ${jobs.length}`
      );
      return validJobs.slice(0, limit);
    } catch (e) {
      console.error("Failed to parse Gemini job search results:", e);
      return [];
    }
  } catch (error) {
    console.error("Error in Gemini job search:", error);
    return [];
  }
}

/**
 * 验证 Gemini API 连接
 */
export async function validateGeminiConnection(): Promise<boolean> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn("GEMINI_API_KEY not configured");
      return false;
    }

    const messages: GeminiMessage[] = [
      {
        role: "user",
        parts: [{ text: "Say 'OK'" }],
      },
    ];

    const response = await invokeGemini(messages);
    return response.includes("OK");
  } catch (error) {
    console.error("Gemini API validation failed:", error);
    return false;
  }
}
