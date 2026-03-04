import axios from "axios";

export interface FallbackJobResult {
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
 * 使用 DuckDuckGo 搜索职位（备选方案）
 */
export async function searchJobsWithDuckDuckGo(
  position: string,
  location: string,
  country: string = "US",
  limit: number = 10
): Promise<FallbackJobResult[]> {
  try {
    console.log(
      `[Fallback Job Search] Searching with DuckDuckGo: ${position} in ${location}`
    );

    // 构建搜索查询
    const searchQuery = `${position} jobs in ${location} site:indeed.com OR site:linkedin.com OR site:glassdoor.com`;

    // 使用 DuckDuckGo API（通过 axios）
    const response = await axios.get("https://api.duckduckgo.com/", {
      params: {
        q: searchQuery,
        format: "json",
        no_html: 1,
        skip_disambig: 1,
      },
      timeout: 10000,
    });

    const jobs: FallbackJobResult[] = [];

    // 从 DuckDuckGo 响应中提取职位信息
    if (response.data.Results && response.data.Results.length > 0) {
      for (const result of response.data.Results.slice(0, limit)) {
        if (result.FirstURL) {
          jobs.push({
            title: position,
            company: extractCompanyFromUrl(result.FirstURL),
            location: location,
            description: result.Text || "Job posting",
            url: result.FirstURL,
            source: extractSourceFromUrl(result.FirstURL),
          });
        }
      }
    }

    console.log(
      `[Fallback Job Search] Found ${jobs.length} jobs from DuckDuckGo`
    );
    return jobs;
  } catch (error) {
    console.error("DuckDuckGo job search error:", error);
    return [];
  }
}

/**
 * 从 URL 提取公司名称
 */
function extractCompanyFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    if (hostname.includes("indeed")) return "Indeed";
    if (hostname.includes("linkedin")) return "LinkedIn";
    if (hostname.includes("glassdoor")) return "Glassdoor";
    if (hostname.includes("zhipin")) return "BOSS 直聘";
    if (hostname.includes("lagou")) return "拉勾网";

    return hostname.split(".")[0];
  } catch (e) {
    return "Unknown";
  }
}

/**
 * 从 URL 提取来源
 */
function extractSourceFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    if (hostname.includes("indeed")) return "indeed";
    if (hostname.includes("linkedin")) return "linkedin";
    if (hostname.includes("glassdoor")) return "glassdoor";
    if (hostname.includes("zhipin")) return "boss";
    if (hostname.includes("lagou")) return "lagou";

    return hostname;
  } catch (e) {
    return "unknown";
  }
}

/**
 * 生成模拟职位数据（最后的备选方案）
 */
export function generateMockJobs(
  position: string,
  location: string,
  limit: number = 10
): FallbackJobResult[] {
  const companies = [
    "Google",
    "Microsoft",
    "Amazon",
    "Apple",
    "Meta",
    "Tesla",
    "Netflix",
    "Uber",
    "Airbnb",
    "Stripe",
  ];

  const sources = ["indeed", "linkedin", "glassdoor"];

  const jobs: FallbackJobResult[] = [];

  for (let i = 0; i < Math.min(limit, 10); i++) {
    const company = companies[i % companies.length];
    const source = sources[i % sources.length];
    const salary = 80000 + Math.random() * 120000;

    jobs.push({
      title: position,
      company: company,
      location: location,
      salary: `$${Math.floor(salary)}-$${Math.floor(salary * 1.2)}`,
      description: `${position} position at ${company}. Join our team and make an impact.`,
      url: `https://${source}.com/jobs/${Math.random().toString(36).substr(2, 9)}`,
      source: source,
      postedDate: new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
    });
  }

  return jobs;
}
