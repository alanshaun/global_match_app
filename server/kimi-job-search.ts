import { invokeLLM } from "./_core/llm";

export interface KimiJobResult {
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  url: string;
  source: string;
  postedDate?: string;
}

/**
 * 使用 Kimi AI 搜索真实职位
 */
export async function searchJobsWithKimi(
  position: string,
  location: string,
  country: string = "US",
  limit: number = 10
): Promise<KimiJobResult[]> {
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

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a professional job search expert. Your task is to find real job postings with real URLs from major job boards like Indeed, LinkedIn, Glassdoor, BOSS 直聘, etc. Always return valid JSON with real, clickable links. Never return example.com or fake URLs.",
        },
        {
          role: "user",
          content: searchPrompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "kimi_job_search_results",
          strict: false,
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                company: { type: "string" },
                location: { type: "string" },
                salary: { type: "string" },
                description: { type: "string" },
                url: { type: "string" },
                source: { type: "string" },
                postedDate: { type: "string" },
              },
              required: ["title", "company", "location", "url"],
            },
          },
        },
      },
    });

    try {
      const content =
        typeof response.choices[0]?.message.content === "string"
          ? response.choices[0].message.content
          : "[]";

      console.log(
        `[Kimi Job Search] Raw response length: ${content.length} chars`
      );

      let jobs: KimiJobResult[] = [];

      try {
        jobs = JSON.parse(content);
        console.log(
          `[Kimi Job Search] Successfully parsed ${jobs.length} jobs from JSON`
        );
      } catch (e) {
        console.log(
          `[Kimi Job Search] Direct JSON parse failed, trying to extract array...`
        );
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            jobs = JSON.parse(jsonMatch[0]);
            console.log(
              `[Kimi Job Search] Extracted and parsed ${jobs.length} jobs from content`
            );
          } catch (e2) {
            console.error(
              `[Kimi Job Search] Failed to parse extracted JSON:`,
              e2
            );
          }
        } else {
          console.warn(`[Kimi Job Search] No JSON array found in response`);
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
        `[Kimi Job Search] Found ${validJobs.length} valid jobs out of ${jobs.length}`
      );

      if (validJobs.length === 0 && jobs.length > 0) {
        console.warn(
          `[Kimi Job Search] WARNING: All ${jobs.length} jobs were filtered out. First job:`,
          JSON.stringify(jobs[0], null, 2)
        );
      }

      return validJobs.slice(0, limit);
    } catch (e) {
      console.error("Failed to parse Kimi job search results:", e);
      return [];
    }
  } catch (error) {
    console.error("Error in Kimi job search:", error);
    return [];
  }
}

/**
 * 验证 Kimi API 连接
 */
export async function validateKimiConnection(): Promise<boolean> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "user",
          content: "Say 'OK'",
        },
      ],
    });

    const content =
      typeof response.choices[0]?.message.content === "string"
        ? response.choices[0].message.content
        : "";

    return content.includes("OK");
  } catch (error) {
    console.error("Kimi API validation failed:", error);
    return false;
  }
}
