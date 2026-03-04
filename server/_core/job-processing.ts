import { Request, Response } from "express";
import { searchJobsUnified } from "../ai-job-search-unified";

interface JobSearchProgress {
  stage: string;
  progress: number;
  message: string;
  data?: any;
}

interface GeneratedJob {
  title: string;
  company: string;
  location: string;
  salary: string;
  currency: string;
  description: string;
  publishedDate: Date;
  link: string;
  source: string;
  matchScore: number;
}

function sendProgress(
  res: Response,
  stage: string,
  progress: number,
  message: string,
  data?: any
) {
  try {
    const progressUpdate: JobSearchProgress = {
      stage,
      progress,
      message,
      data,
    };
    res.write(`data: ${JSON.stringify(progressUpdate)}\n\n`);
  } catch (error) {
    console.error("Error sending progress:", error);
  }
}

/**
 * 使用统一 AI 搜索真实职位（优先 Gemini，备选 Kimi）
 */
async function searchRealJobs(
  targetPosition: string,
  targetCity: string,
  jobCount: number,
  targetCountry: string = "US"
): Promise<GeneratedJob[]> {
  try {
    console.log(
      `[Job Processing] Searching for ${targetPosition} in ${targetCity}, ${targetCountry}`
    );

    // 使用统一 AI 搜索真实职位
    const unifiedJobs = await searchJobsUnified(
      targetPosition,
      targetCity,
      targetCountry,
      jobCount
    );

    console.log(
      `[Job Processing] Found ${unifiedJobs.length} real jobs from AI`
    );

    // 转换格式
    return unifiedJobs.map((job) => ({
      title: job.title,
      company: job.company,
      location: job.location,
      salary: job.salary || "未公开",
      currency: targetCountry === "CN" ? "CNY" : "USD",
      description: job.description,
      publishedDate: job.postedDate ? new Date(job.postedDate) : new Date(),
      link: job.url, // 真实链接
      source: job.source,
      matchScore: 0, // 稍后计算
    }));
  } catch (error) {
    console.error("Error searching real jobs:", error);
    return [];
  }
}

/**
 * 计算职位匹配度
 */
function calculateMatchScore(
  job: GeneratedJob,
  targetPosition: string,
  targetCity: string,
  salaryMin: number,
  salaryMax: number
): number {
  let score = 50;

  // 职位名称匹配（最多 30 分）
  const titleLower = job.title.toLowerCase();
  const positionLower = targetPosition.toLowerCase();

  if (titleLower.includes(positionLower) || positionLower.includes(titleLower)) {
    score += 30;
  } else if (
    titleLower.includes(positionLower.split(" ")[0]) ||
    positionLower.includes(titleLower.split(" ")[0])
  ) {
    score += 15;
  }

  // 地点匹配（最多 20 分）
  const locationLower = job.location.toLowerCase();
  const cityLower = targetCity.toLowerCase();

  if (
    locationLower.includes(cityLower) ||
    cityLower.includes(locationLower)
  ) {
    score += 20;
  }

  // 薪资范围匹配（最多 20 分）
  if (job.salary && job.salary !== "未公开") {
    try {
      const salaryParts = job.salary.split(/[-~]/);
      if (salaryParts.length >= 2) {
        const jobSalaryMin = parseInt(
          salaryParts[0].replace(/[^0-9]/g, "")
        );
        const jobSalaryMax = parseInt(
          salaryParts[1].replace(/[^0-9]/g, "")
        );

        if (
          jobSalaryMin >= salaryMin &&
          jobSalaryMax <= salaryMax
        ) {
          score += 20;
        } else if (
          jobSalaryMin <= salaryMax &&
          jobSalaryMax >= salaryMin
        ) {
          score += 10;
        }
      }
    } catch (e) {
      // 薪资解析失败，跳过薪资匹配
    }
  }

  return Math.min(score, 100);
}

export async function handleJobProcessing(req: Request, res: Response) {
  const submissionId = parseInt(req.params.id);
  const targetPosition = (req.query.targetPosition as string) || "Product Manager";
  const targetCity = (req.query.targetCity as string) || "New York";
  const targetCountry = (req.query.targetCountry as string) || "US";
  const salaryMin = req.query.salaryMin
    ? parseInt(req.query.salaryMin as string)
    : 50000;
  const salaryMax = req.query.salaryMax
    ? parseInt(req.query.salaryMax as string)
    : 200000;
  const salaryCurrency = (req.query.salaryCurrency as string) || "USD";
  const jobCount = req.query.jobCount
    ? parseInt(req.query.jobCount as string)
    : 10;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    // 阶段 1: 简历解析
    sendProgress(res, "parsing", 20, "正在解析简历信息...", null);

    await new Promise((resolve) => setTimeout(resolve, 800));

    // 阶段 2: 职位搜索（使用 Kimi AI）
    sendProgress(
      res,
      "searching",
      50,
      `正在使用 AI 搜索 ${targetPosition} 职位 (${targetCity})...`,
      null
    );

    // 使用 Kimi AI 搜索真实职位
    const jobs = await searchRealJobs(
      targetPosition,
      targetCity,
      jobCount,
      targetCountry
    );

    console.log(`[Job Processing] Got ${jobs.length} jobs from Kimi AI`);

    await new Promise((resolve) => setTimeout(resolve, 1200));

    // 阶段 3: 匹配度计算
    sendProgress(res, "matching", 75, "正在计算匹配度...", null);

    // 计算每个职位的匹配度
    const jobsWithScores = jobs.map((job) => ({
      ...job,
      matchScore: calculateMatchScore(
        job,
        targetPosition,
        targetCity,
        salaryMin,
        salaryMax
      ),
    }));

    await new Promise((resolve) => setTimeout(resolve, 800));

    // 按匹配度排序，限制数量（移除时间限制，接受所有职位）
    console.log(
      `[Job Processing] Before filtering: ${jobsWithScores.length} jobs with scores`
    );
    
    const filteredJobs = jobsWithScores
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, jobCount);

    console.log(
      `[Job Processing] After filtering: ${filteredJobs.length} jobs returned`
    );
    
    // 如果没有职位，添加调试信息
    if (filteredJobs.length === 0) {
      console.warn(
        `[Job Processing] WARNING: No jobs returned! Original count: ${jobsWithScores.length}`
      );
    }

    // 阶段 4: 完成
    sendProgress(res, "completed", 100, "职位搜索完成！", {
      jobMatches: filteredJobs,
      totalCount: filteredJobs.length,
      searchParams: {
        targetPosition,
        targetCity,
        targetCountry,
        salaryMin,
        salaryMax,
        salaryCurrency,
      },
    });

    res.end();
  } catch (error) {
    console.error("Job processing error:", error);
    sendProgress(
      res,
      "error",
      0,
      `错误: ${error instanceof Error ? error.message : "未知错误"}`,
      null
    );
    res.end();
  }
}
