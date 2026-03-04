import { searchJobsWithKimi } from "./kimi-job-search";
import { searchJobsWithGemini, validateGeminiConnection } from "./_core/gemini-llm";

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
 * 统一的职位搜索函数 - 自动选择最佳 AI 模型
 * 优先使用 Gemini，备选 Kimi
 */
export async function searchJobsUnified(
  position: string,
  location: string,
  country: string = "US",
  limit: number = 10
): Promise<JobSearchResult[]> {
  try {
    // 检查 Gemini 是否可用
    const geminiAvailable = await validateGeminiConnection();

    if (geminiAvailable) {
      console.log("[Unified Job Search] Using Gemini API");
      try {
        const jobs = await searchJobsWithGemini(position, location, country, limit);
        if (jobs.length > 0) {
          return jobs;
        }
      } catch (error) {
        console.warn("[Unified Job Search] Gemini failed, falling back to Kimi", error);
      }
    }

    // 备选方案：使用 Kimi
    console.log("[Unified Job Search] Using Kimi API");
    const jobs = await searchJobsWithKimi(position, location, country, limit);
    return jobs;
  } catch (error) {
    console.error("[Unified Job Search] Error:", error);
    return [];
  }
}

/**
 * 获取当前使用的 AI 模型信息
 */
export async function getActiveAIModel(): Promise<{
  model: "gemini" | "kimi";
  available: boolean;
}> {
  try {
    const geminiAvailable = await validateGeminiConnection();
    return {
      model: geminiAvailable ? "gemini" : "kimi",
      available: true,
    };
  } catch (error) {
    return {
      model: "kimi",
      available: true,
    };
  }
}
