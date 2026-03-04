import axios from "axios";
import * as cheerio from "cheerio";

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  url: string;
  source: "indeed" | "duckduckgo" | "google" | "boss" | "lagou";
  postedDate?: string;
  jobType?: string;
}

/**
 * DuckDuckGo 职位搜索爬虫
 */
export async function scrapeJobsFromDuckDuckGo(
  query: string,
  location: string,
  limit: number = 10
): Promise<JobListing[]> {
  try {
    const searchQuery = `${query} jobs in ${location} site:indeed.com OR site:linkedin.com`;
    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;

    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const jobs: JobListing[] = [];

    $(".result").each((i, elem) => {
      if (i >= limit) return;

      const title = $(elem).find(".result__title").text().trim();
      const url = $(elem).find(".result__url").attr("href") || "";
      const snippet = $(elem).find(".result__snippet").text().trim();

      if (title && url) {
        jobs.push({
          id: `duckduckgo-${Date.now()}-${i}`,
          title,
          company: extractCompanyFromSnippet(snippet),
          location,
          description: snippet,
          url,
          source: "duckduckgo",
        });
      }
    });

    return jobs;
  } catch (error) {
    console.error("DuckDuckGo scraping error:", error);
    return [];
  }
}

/**
 * Indeed 职位搜索爬虫（基于 Google 搜索）
 */
export async function scrapeJobsFromIndeed(
  query: string,
  location: string,
  limit: number = 10
): Promise<JobListing[]> {
  try {
    const searchQuery = `${query} jobs in ${location}`;
    const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}`;

    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const jobs: JobListing[] = [];

    $("div.job_seen_beacon").each((i, elem) => {
      if (i >= limit) return;

      const titleElem = $(elem).find("h2 a");
      const title = titleElem.attr("aria-label") || titleElem.text().trim();
      const url = titleElem.attr("href") || "";
      const company = $(elem).find("[data-company-name]").text().trim();
      const location = $(elem).find(".companyLocation").text().trim();
      const salary = $(elem).find(".salary-snippet").text().trim();
      const snippet = $(elem).find(".job-snippet").text().trim();

      if (title && url) {
        jobs.push({
          id: `indeed-${Date.now()}-${i}`,
          title,
          company,
          location,
          salary,
          description: snippet,
          url: `https://www.indeed.com${url}`,
          source: "indeed",
        });
      }
    });

    return jobs;
  } catch (error) {
    console.error("Indeed scraping error:", error);
    return [];
  }
}

/**
 * BOSS 直聘职位爬虫
 */
export async function scrapeJobsFromBoss(
  query: string,
  city: string,
  limit: number = 10
): Promise<JobListing[]> {
  try {
    // BOSS 直聘 API 端点
    const cityCode = getCityCodeForBoss(city);
    const url = `https://www.zhipin.com/wapi/zpgeek/search/joblist`;

    const response = await axios.post(
      url,
      {
        query: query,
        city: cityCode,
        pageNo: 1,
        pageSize: limit,
      },
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    const jobs: JobListing[] = [];

    if (response.data?.data?.jobList) {
      response.data.data.jobList.forEach((job: any, i: number) => {
        if (i >= limit) return;

        jobs.push({
          id: `boss-${job.positionId}`,
          title: job.positionName,
          company: job.companyFullName,
          location: `${job.city}, China`,
          salary: `${job.salary}`,
          description: job.positionAdvantage || "",
          url: `https://www.zhipin.com/job_detail/${job.positionId}.html`,
          source: "boss",
          postedDate: job.createTime,
          jobType: job.jobNature,
        });
      });
    }

    return jobs;
  } catch (error) {
    console.error("BOSS 直聘 scraping error:", error);
    return [];
  }
}

/**
 * 拉勾网职位爬虫
 */
export async function scrapeJobsFromLagou(
  query: string,
  city: string,
  limit: number = 10
): Promise<JobListing[]> {
  try {
    const url = `https://www.lagou.com/jobs/list_${query}`;

    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://www.lagou.com/jobs/list_",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const jobs: JobListing[] = [];

    $(".item_con_list li").each((i, elem) => {
      if (i >= limit) return;

      const titleElem = $(elem).find(".position_link");
      const title = titleElem.text().trim();
      const url = titleElem.attr("href") || "";
      const company = $(elem).find(".company_link").text().trim();
      const salary = $(elem).find(".salary").text().trim();
      const location = $(elem).find(".city").text().trim();

      if (title && url) {
        jobs.push({
          id: `lagou-${Date.now()}-${i}`,
          title,
          company,
          location,
          salary,
          description: "",
          url,
          source: "lagou",
        });
      }
    });

    return jobs;
  } catch (error) {
    console.error("拉勾网 scraping error:", error);
    return [];
  }
}

/**
 * 聚合多个数据源的职位
 */
export async function aggregateJobs(
  query: string,
  location: string,
  country: "US" | "CN" = "US",
  limit: number = 20
): Promise<JobListing[]> {
  const allJobs: JobListing[] = [];

  try {
    if (country === "US") {
      // 美国职位来源
      const [indeedJobs, duckJobs] = await Promise.all([
        scrapeJobsFromIndeed(query, location, limit / 2),
        scrapeJobsFromDuckDuckGo(query, location, limit / 2),
      ]);

      allJobs.push(...indeedJobs, ...duckJobs);
    } else if (country === "CN") {
      // 中国职位来源
      const [bossJobs, lagouJobs] = await Promise.all([
        scrapeJobsFromBoss(query, location, limit / 2),
        scrapeJobsFromLagou(query, location, limit / 2),
      ]);

      allJobs.push(...bossJobs, ...lagouJobs);
    }
  } catch (error) {
    console.error("Job aggregation error:", error);
  }

  // 去重和排序
  return deduplicateJobs(allJobs).slice(0, limit);
}

/**
 * 去重职位列表
 */
function deduplicateJobs(jobs: JobListing[]): JobListing[] {
  const seen = new Set<string>();
  return jobs.filter((job) => {
    const key = `${job.title}-${job.company}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * 从摘要中提取公司名称
 */
function extractCompanyFromSnippet(snippet: string): string {
  const match = snippet.match(/(?:at|by|from)\s+([A-Z][A-Za-z\s]+?)(?:\.|,|$)/);
  return match ? match[1].trim() : "Unknown";
}

/**
 * 获取 BOSS 直聘的城市代码
 */
function getCityCodeForBoss(city: string): string {
  const cityMap: Record<string, string> = {
    beijing: "101010100",
    shanghai: "101020100",
    shenzhen: "101280100",
    guangzhou: "101280600",
    hangzhou: "101210100",
    chengdu: "101270100",
    wuhan: "101200100",
    xian: "101110100",
    nanjing: "101190100",
    suzhou: "101190400",
  };

  return cityMap[city.toLowerCase()] || "101010100"; // 默认北京
}
