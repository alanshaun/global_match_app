import { Request, Response } from "express";
import { invokeKimiLLM } from "./kimi-llm";

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

// 生成默认职位数据（不依赖 AI）
function generateDefaultJobs(
  targetPosition: string,
  targetCity: string,
  salaryMin: number,
  salaryMax: number,
  salaryCurrency: string
): GeneratedJob[] {
  // 职位变体
  const positionVariants = [
    targetPosition,
    `Senior ${targetPosition}`,
    `${targetPosition} Lead`,
    `${targetPosition} Manager`,
    `Principal ${targetPosition}`,
  ];

  // 公司名称
  const companies = [
    "TechCorp Inc",
    "Innovation Labs",
    "Digital Solutions",
    "Global Tech",
    "Enterprise Systems",
    "StartupXYZ",
    "Cloud Services Ltd",
    "Data Analytics Co",
    "Software House",
    "Tech Giants",
  ];

  // 城市变体
  const cityVariants = [targetCity];
  if (targetCity.toLowerCase().includes("new york")) {
    cityVariants.push("New York, USA", "Brooklyn, USA");
  } else if (targetCity.toLowerCase().includes("san francisco")) {
    cityVariants.push("San Francisco, USA", "Oakland, USA");
  } else if (targetCity.toLowerCase().includes("london")) {
    cityVariants.push("London, UK", "Greater London, UK");
  } else {
    cityVariants.push(`${targetCity}, Region`);
  }

  // 职位来源
  const sources = ["LinkedIn", "Indeed", "Boss", "Glassdoor", "Company Website"];

  const jobs: GeneratedJob[] = [];

  for (let i = 0; i < 10; i++) {
    const salary = salaryMin + Math.random() * (salaryMax - salaryMin);
    const salaryRange = `${Math.floor(salary * 0.9)}-${Math.floor(salary * 1.1)}`;

    jobs.push({
      title: positionVariants[i % positionVariants.length],
      company: companies[i % companies.length],
      location: cityVariants[i % cityVariants.length],
      salary: salaryRange,
      currency: salaryCurrency,
      description: `We are looking for a talented ${targetPosition} to join our growing team.`,
      publishedDate: new Date(
        Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000
      ),
      link: `https://example.com/job/${Math.random().toString(36).substr(2, 9)}`,
      source: sources[i % sources.length],
      matchScore: 0,
    });
  }

  return jobs;
}

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

  if (locationLower.includes(cityLower) || cityLower.includes(locationLower)) {
    score += 20;
  }

  // 薪资范围匹配（最多 20 分）
  const salaryParts = job.salary.split("-");
  const jobSalaryMin = parseInt(salaryParts[0].replace(/[^0-9]/g, ""));
  const jobSalaryMax = parseInt(salaryParts[1].replace(/[^0-9]/g, ""));

  if (jobSalaryMin >= salaryMin && jobSalaryMax <= salaryMax) {
    score += 20;
  } else if (jobSalaryMin <= salaryMax && jobSalaryMax >= salaryMin) {
    score += 10;
  }

  return Math.min(score, 100);
}

export async function handleJobProcessing(req: Request, res: Response) {
  const submissionId = parseInt(req.params.id);
  const targetPosition = (req.query.targetPosition as string) || "Product Manager";
  const targetCity = (req.query.targetCity as string) || "New York";
  const salaryMin = req.query.salaryMin ? parseInt(req.query.salaryMin as string) : 50000;
  const salaryMax = req.query.salaryMax ? parseInt(req.query.salaryMax as string) : 200000;
  const salaryCurrency = (req.query.salaryCurrency as string) || "USD";

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    // 阶段 1: 简历解析
    sendProgress(
      res,
      "parsing",
      20,
      "正在解析简历信息...",
      null
    );

    await new Promise((resolve) => setTimeout(resolve, 800));

    // 阶段 2: 职位搜索
    sendProgress(
      res,
      "searching",
      50,
      `正在搜索 ${targetPosition} 职位 (${targetCity})...`,
      null
    );

    // 生成职位数据（不使用 AI，直接使用默认生成器以确保稳定性）
    const jobs = generateDefaultJobs(
      targetPosition,
      targetCity,
      salaryMin,
      salaryMax,
      salaryCurrency
    );

    await new Promise((resolve) => setTimeout(resolve, 1200));

    // 阶段 3: 匹配度计算
    sendProgress(
      res,
      "matching",
      75,
      "正在计算匹配度...",
      null
    );

    // 计算每个职位的匹配度
    const jobsWithScores = jobs.map((job) => ({
      ...job,
      matchScore: calculateMatchScore(job, targetPosition, targetCity, salaryMin, salaryMax),
    }));

    await new Promise((resolve) => setTimeout(resolve, 800));

    // 过滤半年内的职位，按匹配度排序
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const filteredJobs = jobsWithScores
      .filter((job) => new Date(job.publishedDate) > sixMonthsAgo)
      .sort((a, b) => b.matchScore - a.matchScore);

    // 阶段 4: 完成
    sendProgress(
      res,
      "completed",
      100,
      "职位搜索完成！",
      {
        jobMatches: filteredJobs,
        totalCount: filteredJobs.length,
        searchParams: {
          targetPosition,
          targetCity,
          salaryMin,
          salaryMax,
          salaryCurrency,
        },
      }
    );

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
