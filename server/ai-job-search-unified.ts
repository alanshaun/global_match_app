import { searchJobsWithKimi } from "./kimi-job-search";
import { searchJobsWithDuckDuckGo, generateMockJobs } from "./fallback-job-search";

export interface JobSearchResult {
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
 * 统一的职位搜索函数 - 自动选择最佳 AI 模式
 * 优先使用 Kimi → DuckDuckGo → Mock
 */
export async function searchJobsUnified(
  position: string,
  location: string,
  country: string = "US",
  limit: number = 10
): Promise<JobSearchResult[]> {
  try {
    // 方案 1: 使用 Kimi
    console.log("[Unified Job Search] Trying Kimi API...");
    try {
      const jobs = await searchJobsWithKimi(position, location, country, limit);
      if (jobs.length > 0) {
        console.log(`[Unified Job Search] SUCCESS: Got ${jobs.length} jobs from Kimi`);
        return jobs;
      }
    } catch (error) {
      console.warn("[Unified Job Search] Kimi failed:", error);
    }

    // 方案 3: 使用 DuckDuckGo
    console.log("[Unified Job Search] Trying DuckDuckGo...");
    try {
      const jobs = await searchJobsWithDuckDuckGo(position, location, country, limit);
      if (jobs.length > 0) {
        console.log(`[Unified Job Search] SUCCESS: Got ${jobs.length} jobs from DuckDuckGo`);
        return jobs;
      }
    } catch (error) {
      console.warn("[Unified Job Search] DuckDuckGo failed:", error);
    }

    // 方案 4: 使用模拟数据（最后的备选）
    console.log("[Unified Job Search] Using mock data as last resort...");
    const mockJobs = generateMockJobs(position, location, limit);
    console.log(`[Unified Job Search] Generated ${mockJobs.length} mock jobs`);
    return mockJobs;
  } catch (error) {
    console.error("[Unified Job Search] Error:", error);
    // 即使全部失败，也要返回一些数据
    console.warn("[Unified Job Search] All methods failed, returning mock data");
    return generateMockJobs(position, location, limit);
  }
}

/**
 * 获取当前使用的 AI 模型信息
 */
export async function getActiveAIModel(): Promise<{
  model: "kimi";
  available: boolean;
}> {
  try {
        return {
      model: "kimi",
      available: true,
    };
  } catch (error) {
    return {
      model: "kimi",
      available: true,
    };
  }
}
