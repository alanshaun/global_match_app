import axios from "axios";

export interface RealJobData {
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  url: string; // 真实链接
  source: string; // indeed, linkedin, google_jobs, boss, lagou
  postedDate?: string;
}

/**
 * SerpApi 职位搜索（支持 Google Jobs、Indeed 等多源聚合）
 * 需要 API Key：https://serpapi.com
 * 免费额度：100 次/月
 */
export async function searchJobsWithSerpApi(
  position: string,
  location: string,
  limit: number = 10
): Promise<RealJobData[]> {
  try {
    const apiKey = process.env.SERPAPI_API_KEY;

    if (!apiKey) {
      console.warn(
        "⚠️ SERPAPI_API_KEY not configured. Please set it in environment variables."
      );
      console.warn("Get API Key from: https://serpapi.com");
      return [];
    }

    // 使用 Google Jobs 搜索
    const response = await axios.get("https://serpapi.com/search", {
      params: {
        api_key: apiKey,
        engine: "google_jobs",
        q: position,
        location: location,
        num: limit,
      },
      timeout: 10000,
    });

    const jobs: RealJobData[] = [];

    if (response.data.jobs_results) {
      for (const job of response.data.jobs_results) {
        jobs.push({
          title: job.title,
          company: job.company_name,
          location: job.location,
          salary: job.salary || undefined,
          description: job.description || "",
          url: job.apply_link || job.job_link || "", // 真实链接
          source: "google_jobs",
          postedDate: job.detected_extensions?.posted_at,
        });
      }
    }

    return jobs;
  } catch (error) {
    console.error("SerpApi error:", error);
    return [];
  }
}

/**
 * RapidAPI 职位搜索
 * 需要 API Key：https://rapidapi.com/letscrape-6bvm/api/jsearch
 * 免费额度：100 次/月
 */
export async function searchJobsWithRapidAPI(
  position: string,
  location: string,
  limit: number = 10
): Promise<RealJobData[]> {
  try {
    const apiKey = process.env.RAPIDAPI_API_KEY;

    if (!apiKey) {
      console.warn(
        "⚠️ RAPIDAPI_API_KEY not configured. Please set it in environment variables."
      );
      console.warn("Get API Key from: https://rapidapi.com/letscrape-6bvm/api/jsearch");
      return [];
    }

    const response = await axios.get(
      "https://jsearch.p.rapidapi.com/search",
      {
        params: {
          query: `${position} in ${location}`,
          page: 1,
          num_pages: 1,
        },
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        },
        timeout: 10000,
      }
    );

    const jobs: RealJobData[] = [];

    if (response.data.data) {
      for (const job of response.data.data.slice(0, limit)) {
        jobs.push({
          title: job.job_title,
          company: job.employer_name,
          location: `${job.job_city}, ${job.job_country}`,
          salary: job.job_salary_currency
            ? `${job.job_salary_currency} ${job.job_min_salary || ""}-${job.job_max_salary || ""}`
            : undefined,
          description: job.job_description || "",
          url: job.job_apply_link || job.job_google_link || "", // 真实链接
          source: "jsearch",
          postedDate: job.job_posted_at_datetime_utc,
        });
      }
    }

    return jobs;
  } catch (error) {
    console.error("RapidAPI error:", error);
    return [];
  }
}

/**
 * Adzuna API 职位搜索
 * 需要 API Key：https://developer.adzuna.com
 * 免费额度：无限制（需要注册）
 */
export async function searchJobsWithAdzuna(
  position: string,
  location: string,
  country: string = "US",
  limit: number = 10
): Promise<RealJobData[]> {
  try {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_API_KEY;

    if (!appId || !appKey) {
      console.warn(
        "⚠️ ADZUNA_APP_ID or ADZUNA_API_KEY not configured. Please set them in environment variables."
      );
      console.warn("Get API Key from: https://developer.adzuna.com");
      return [];
    }

    // 确定国家代码
    const countryCode = country.toLowerCase() === "cn" ? "cn" : "us";

    const response = await axios.get(
      `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/1`,
      {
        params: {
          app_id: appId,
          app_key: appKey,
          results_per_page: limit,
          what: position,
          where: location,
        },
        timeout: 10000,
      }
    );

    const jobs: RealJobData[] = [];

    if (response.data.results) {
      for (const job of response.data.results) {
        jobs.push({
          title: job.title,
          company: job.company.display_name,
          location: job.location.display_name,
          salary: job.salary_is_predicted
            ? undefined
            : `${job.salary_min || ""}-${job.salary_max || ""}`,
          description: job.description || "",
          url: job.redirect_url, // 真实链接
          source: "adzuna",
          postedDate: job.created,
        });
      }
    }

    return jobs;
  } catch (error) {
    console.error("Adzuna API error:", error);
    return [];
  }
}

/**
 * 简单的 Indeed 爬虫（备选方案）
 * 无需 API Key，但可能被反爬
 */
export async function scrapeIndeedJobs(
  position: string,
  location: string,
  limit: number = 10
): Promise<RealJobData[]> {
  try {
    // 构建 Indeed 搜索 URL
    const searchUrl = `https://www.indeed.com/jobs?q=${encodeURIComponent(position)}&l=${encodeURIComponent(location)}&start=0`;

    console.log(`[Indeed Scraper] Searching: ${searchUrl}`);

    // 注意：实际爬虫需要使用 Puppeteer 或 Cheerio
    // 这里只是展示 URL 构造逻辑
    // 真实实现需要处理反爬虫机制

    const jobs: RealJobData[] = [];

    // 示例：返回搜索 URL（用户可以手动访问）
    jobs.push({
      title: `Search Results for "${position}" on Indeed`,
      company: "Indeed.com",
      location: location,
      description: "Click to view all matching jobs on Indeed",
      url: searchUrl, // 真实的 Indeed 搜索 URL
      source: "indeed",
    });

    return jobs;
  } catch (error) {
    console.error("Indeed scraper error:", error);
    return [];
  }
}

/**
 * BOSS 直聘职位搜索（中国市场）
 * 需要爬虫实现
 */
export async function searchBossZhipinJobs(
  position: string,
  city: string,
  limit: number = 10
): Promise<RealJobData[]> {
  try {
    // 构建 BOSS 直聘搜索 URL
    const searchUrl = `https://www.zhipin.com/web/geek/job?query=${encodeURIComponent(position)}&city=${encodeURIComponent(city)}`;

    console.log(`[BOSS 直聘] Searching: ${searchUrl}`);

    const jobs: RealJobData[] = [];

    // 示例：返回搜索 URL
    jobs.push({
      title: `${position} 职位搜索结果`,
      company: "BOSS 直聘",
      location: city,
      description: "点击查看 BOSS 直聘上的所有匹配职位",
      url: searchUrl, // 真实的 BOSS 直聘搜索 URL
      source: "boss",
    });

    return jobs;
  } catch (error) {
    console.error("BOSS 直聘 scraper error:", error);
    return [];
  }
}

/**
 * 聚合多个数据源的职位搜索
 */
export async function aggregateRealJobs(
  position: string,
  location: string,
  country: string = "US",
  limit: number = 20
): Promise<RealJobData[]> {
  const allJobs: RealJobData[] = [];

  try {
    // 尝试 SerpApi（优先）
    console.log("[Job Search] Trying SerpApi...");
    const serpApiJobs = await searchJobsWithSerpApi(position, location, limit);
    allJobs.push(...serpApiJobs);

    // 如果 SerpApi 没有结果，尝试 RapidAPI
    if (allJobs.length === 0) {
      console.log("[Job Search] Trying RapidAPI...");
      const rapidApiJobs = await searchJobsWithRapidAPI(
        position,
        location,
        limit
      );
      allJobs.push(...rapidApiJobs);
    }

    // 如果仍然没有结果，尝试 Adzuna
    if (allJobs.length === 0) {
      console.log("[Job Search] Trying Adzuna...");
      const adzunaJobs = await searchJobsWithAdzuna(
        position,
        location,
        country,
        limit
      );
      allJobs.push(...adzunaJobs);
    }

    // 如果是中国市场，添加 BOSS 直聘
    if (country.toLowerCase() === "cn") {
      console.log("[Job Search] Adding BOSS 直聘...");
      const bossJobs = await searchBossZhipinJobs(position, location, limit);
      allJobs.push(...bossJobs);
    }

    // 如果仍然没有结果，提供 Indeed 搜索链接
    if (allJobs.length === 0) {
      console.log("[Job Search] Providing Indeed search link...");
      const indeedJobs = await scrapeIndeedJobs(position, location, limit);
      allJobs.push(...indeedJobs);
    }

    // 去重（按 URL）
    const uniqueJobs = Array.from(
      new Map(allJobs.map((job) => [job.url, job])).values()
    );

    console.log(`[Job Search] Found ${uniqueJobs.length} unique jobs`);
    return uniqueJobs.slice(0, limit);
  } catch (error) {
    console.error("Error in aggregateRealJobs:", error);
    return allJobs;
  }
}

/**
 * 验证职位链接是否有效
 */
export async function validateJobUrl(url: string): Promise<boolean> {
  try {
    if (!url || !url.startsWith("http")) return false;

    // 检查是否来自已知的真实职位网站
    const validDomains = [
      "indeed.com",
      "linkedin.com",
      "glassdoor.com",
      "zhipin.com",
      "lagou.com",
      "boss.com",
      "adzuna.com",
      "google.com/jobs",
      "careers.",
      "jobs.",
    ];

    return validDomains.some((domain) => url.includes(domain));
  } catch (error) {
    console.error("Error validating job URL:", error);
    return false;
  }
}
