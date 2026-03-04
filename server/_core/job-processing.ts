import { Request, Response } from "express";
import { searchJobsUnified } from "../ai-job-search-unified";
import { analyzeResume, calculateMatchScore } from "../resume-analyzer";

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
  postedDate?: string;
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
      link: job.url,
      source: job.source,
      matchScore: 0,
      postedDate: job.postedDate,
    }));
  } catch (error) {
    console.error("Error searching real jobs:", error);
    return [];
  }
}

export async function handleJobProcessing(req: Request, res: Response) {
  const submissionId = parseInt(req.params.id);
  const resumeText = (req.query.resumeText as string) || "";
  const targetPosition = (req.query.targetPosition as string) || undefined;
  const targetCity = (req.query.targetCity as string) || undefined;
  const targetCountry = (req.query.targetCountry as string) || "US";
  const salaryMin = req.query.salaryMin
    ? parseInt(req.query.salaryMin as string)
    : undefined;
  const salaryMax = req.query.salaryMax
    ? parseInt(req.query.salaryMax as string)
    : undefined;
  const salaryCurrency = (req.query.salaryCurrency as string) || "USD";
  const jobCount = req.query.jobCount
    ? parseInt(req.query.jobCount as string)
    : 10;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    // 阶段 1: 使用 AI 分析简历
    sendProgress(
      res,
      "parsing",
      20,
      "正在使用 AI 分析简历信息...",
      null
    );

    const resumeAnalysis = await analyzeResume(
      resumeText,
      targetPosition,
      targetCity,
      targetCountry,
      salaryMin,
      salaryMax,
      salaryCurrency
    );

    console.log(
      `[Job Processing] Resume analysis complete:`,
      {
        position: resumeAnalysis.targetPosition,
        location: resumeAnalysis.targetLocation,
        skills: resumeAnalysis.skills.length,
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 800));

    // 阶段 2: 根据简历分析结果搜索职位
    sendProgress(
      res,
      "searching",
      50,
      `正在根据简历搜索 ${resumeAnalysis.targetPosition} 职位 (${resumeAnalysis.targetLocation})...`,
      null
    );

    // 使用简历分析结果搜索真实职位
    const jobs = await searchRealJobs(
      resumeAnalysis.targetPosition,
      resumeAnalysis.targetLocation,
      jobCount,
      resumeAnalysis.targetCountry
    );

    console.log(`[Job Processing] Got ${jobs.length} jobs from search`);

    await new Promise((resolve) => setTimeout(resolve, 1200));

    // 阶段 3: 使用 AI 计算真实匹配度
    sendProgress(res, "matching", 75, "正在使用 AI 计算匹配度...", null);

    // 使用 AI 计算每个职位的真实匹配度
    const jobsWithScores = await Promise.all(
      jobs.map(async (job) => ({
        ...job,
        matchScore: await calculateMatchScore(
          resumeAnalysis,
          job.title,
          job.description,
          job.location
        ),
      }))
    );

    await new Promise((resolve) => setTimeout(resolve, 800));

    // 按匹配度排序，限制数量（移除时间过滤，因为职位可能没有正确的日期）
    console.log(
      `[Job Processing] Before sorting: ${jobsWithScores.length} jobs with scores`
    );

    const filteredJobs = jobsWithScores
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, jobCount);

    console.log(
      `[Job Processing] After sorting and limiting: ${filteredJobs.length} jobs returned`
    );

    // 如果没有职位，添加调试信息
    if (filteredJobs.length === 0) {
      console.warn(
        `[Job Processing] WARNING: No jobs found! Original count: ${jobsWithScores.length}`
      );
    }

    // 阶段 4: 完成
    sendProgress(res, "completed", 100, "职位搜索完成！", {
      jobMatches: filteredJobs,
      totalCount: filteredJobs.length,
      resumeAnalysis: {
        position: resumeAnalysis.targetPosition,
        location: resumeAnalysis.targetLocation,
        skills: resumeAnalysis.skills,
        yearsOfExperience: resumeAnalysis.yearsOfExperience,
      },
      searchParams: {
        targetCountry,
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
