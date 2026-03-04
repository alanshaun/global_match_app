import { invokeLLM } from "./_core/llm";

export interface KimiJobResult {
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  url: string; // 真实链接
  source: string; // indeed, linkedin, google_jobs, boss, lagou 等
  postedDate?: string;
}

/**
 * 使用 Kimi AI 搜索真实职位
 * AI 会实时搜索并返回真实的职位链接
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
      const content = typeof response.choices[0]?.message.content === "string"
        ? response.choices[0].message.content
        : "[]";

      let jobs: KimiJobResult[] = [];

      // 首先尝试直接解析
      try {
        jobs = JSON.parse(content);
      } catch (e) {
        // 如果直接解析失败，尝试提取 JSON 数组
        const jsonMatch = content.match(/\[[\s\S]*\]/);
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
        `[Kimi Job Search] Found ${validJobs.length} valid jobs out of ${jobs.length}`
      );
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
 * 使用 Kimi AI 搜索特定公司的职位
 */
export async function searchJobsByCompanyWithKimi(
  company: string,
  location: string
): Promise<KimiJobResult[]> {
  try {
    const searchPrompt = `
请帮我搜索 ${company} 公司在 ${location} 地区的所有开放职位。

请返回该公司的真实招聘页面链接或职位列表链接。

返回 JSON 格式：
[
  {
    "title": "职位名称",
    "company": "${company}",
    "location": "${location}",
    "salary": "薪资范围",
    "description": "职位描述",
    "url": "真实链接",
    "source": "来源"
  }
]

重要：URL 必须是真实可点击的链接，可以是公司官网招聘页面或职位网站上的链接。
    `;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a job search expert. Find real job postings with real URLs from company career pages or job boards.",
        },
        {
          role: "user",
          content: searchPrompt,
        },
      ],
    });

    try {
      const content = typeof response.choices[0]?.message.content === "string"
        ? response.choices[0].message.content
        : "[]";

      let jobs: KimiJobResult[] = [];

      try {
        jobs = JSON.parse(content);
      } catch (e) {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          jobs = JSON.parse(jsonMatch[0]);
        }
      }

      return jobs.filter(
        (job) =>
          job.url &&
          job.url.startsWith("http") &&
          !job.url.includes("example.com")
      );
    } catch (e) {
      console.error("Failed to parse company job search results:", e);
      return [];
    }
  } catch (error) {
    console.error("Error in company job search:", error);
    return [];
  }
}

/**
 * 使用 Kimi AI 验证职位链接是否有效
 */
export async function verifyJobLinkWithKimi(url: string): Promise<boolean> {
  try {
    if (!url || !url.startsWith("http")) return false;
    if (url.includes("example.com")) return false;

    // 检查是否来自已知的真实职位网站
    const validDomains = [
      "indeed.com",
      "linkedin.com",
      "glassdoor.com",
      "zhipin.com",
      "lagou.com",
      "boss.com",
      "51job.com",
      "adzuna.com",
      "google.com/jobs",
      "careers.",
      "jobs.",
    ];

    return validDomains.some((domain) => url.includes(domain));
  } catch (error) {
    console.error("Error verifying job link:", error);
    return false;
  }
}

/**
 * 使用 Kimi AI 从简历生成最佳职位搜索关键词
 */
export async function generateJobSearchKeywordsWithKimi(
  resumeText: string
): Promise<string[]> {
  try {
    const prompt = `
基于以下简历内容，生成最相关的职位搜索关键词（职位名称）。

简历内容：
${resumeText}

请返回 JSON 格式的职位关键词列表：
{
  "keywords": ["职位1", "职位2", "职位3", ...]
}

返回 5-10 个最相关的职位关键词。
    `;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a career expert. Generate relevant job search keywords based on resume content.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "job_keywords",
          strict: true,
          schema: {
            type: "object",
            properties: {
              keywords: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["keywords"],
          },
        },
      },
    });

    try {
      const content = typeof response.choices[0]?.message.content === "string"
        ? response.choices[0].message.content
        : "{}";
      const result = JSON.parse(content);
      return result.keywords || [];
    } catch (e) {
      console.error("Failed to parse job keywords:", e);
      return [];
    }
  } catch (error) {
    console.error("Error generating job search keywords:", error);
    return [];
  }
}

/**
 * 聚合多个搜索关键词的职位结果
 */
export async function aggregateJobsByKeywordsWithKimi(
  keywords: string[],
  location: string,
  country: string = "US",
  limit: number = 20
): Promise<KimiJobResult[]> {
  const allJobs: KimiJobResult[] = [];
  const urlSet = new Set<string>(); // 用于去重

  try {
    // 为每个关键词搜索职位
    for (const keyword of keywords.slice(0, 3)) {
      // 最多搜索 3 个关键词
      console.log(`[Kimi Job Search] Searching for keyword: ${keyword}`);
      const jobs = await searchJobsWithKimi(
        keyword,
        location,
        country,
        Math.ceil(limit / keywords.length)
      );

      // 添加到结果，并去重
      for (const job of jobs) {
        if (!urlSet.has(job.url)) {
          allJobs.push(job);
          urlSet.add(job.url);
        }
      }

      if (allJobs.length >= limit) {
        break;
      }
    }

    console.log(
      `[Kimi Job Search] Aggregated ${allJobs.length} unique jobs from ${keywords.length} keywords`
    );
    return allJobs.slice(0, limit);
  } catch (error) {
    console.error("Error in aggregateJobsByKeywordsWithKimi:", error);
    return allJobs;
  }
}
