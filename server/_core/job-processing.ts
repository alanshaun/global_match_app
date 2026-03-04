import { Request, Response } from "express";
import { getDb } from "../db";
import { invokeKimiLLM } from "./kimi-llm";

interface JobSearchProgress {
  stage: string;
  progress: number;
  message: string;
  data?: any;
}

// 模拟职位数据库 - 按国家/城市分类
const JOB_DATABASE: Record<string, any[]> = {
  "USA-New York": [
    {
      title: "Senior Product Manager",
      company: "TechCorp Inc",
      location: "New York, USA",
      salary: "$120,000 - $160,000",
      currency: "USD",
      description: "Looking for experienced PM with SaaS background",
      publishedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      link: "https://example.com/job/1",
      source: "LinkedIn",
    },
    {
      title: "Product Manager",
      company: "StartupXYZ",
      location: "New York, USA",
      salary: "$100,000 - $140,000",
      currency: "USD",
      description: "Join our growing team as Product Manager",
      publishedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      link: "https://example.com/job/2",
      source: "Indeed",
    },
    {
      title: "Product Strategy Lead",
      company: "Enterprise Solutions",
      location: "New York, USA",
      salary: "$130,000 - $170,000",
      currency: "USD",
      description: "Lead product strategy for enterprise clients",
      publishedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      link: "https://example.com/job/3",
      source: "LinkedIn",
    },
  ],
  "USA-San Francisco": [
    {
      title: "Senior Product Manager",
      company: "Tech Giants Inc",
      location: "San Francisco, USA",
      salary: "$140,000 - $180,000",
      currency: "USD",
      description: "Lead product vision for AI products",
      publishedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      link: "https://example.com/job/4",
      source: "LinkedIn",
    },
    {
      title: "Product Manager - Mobile",
      company: "Innovation Labs",
      location: "San Francisco, USA",
      salary: "$110,000 - $150,000",
      currency: "USD",
      description: "Mobile product management role",
      publishedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      link: "https://example.com/job/5",
      source: "Indeed",
    },
  ],
  "Europe-London": [
    {
      title: "Product Manager",
      company: "European Tech Ltd",
      location: "London, UK",
      salary: "£80,000 - £120,000",
      currency: "GBP",
      description: "Product management role in fintech",
      publishedDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
      link: "https://example.com/job/6",
      source: "LinkedIn",
    },
    {
      title: "Senior PM - Platform",
      company: "Global Solutions",
      location: "London, UK",
      salary: "£100,000 - £140,000",
      currency: "GBP",
      description: "Platform product management",
      publishedDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
      link: "https://example.com/job/7",
      source: "Indeed",
    },
  ],
  "Asia-Singapore": [
    {
      title: "Product Manager",
      company: "Asia Tech Hub",
      location: "Singapore",
      salary: "SGD 120,000 - 160,000",
      currency: "SGD",
      description: "Product management for regional expansion",
      publishedDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
      link: "https://example.com/job/8",
      source: "LinkedIn",
    },
    {
      title: "Senior Product Manager",
      company: "Regional Growth Inc",
      location: "Singapore",
      salary: "SGD 140,000 - 180,000",
      currency: "SGD",
      description: "Lead product strategy for Asia",
      publishedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      link: "https://example.com/job/9",
      source: "Indeed",
    },
  ],
};

function sendProgress(
  res: Response,
  stage: string,
  progress: number,
  message: string,
  data?: any
) {
  const progressUpdate: JobSearchProgress = {
    stage,
    progress,
    message,
    data,
  };
  res.write(`data: ${JSON.stringify(progressUpdate)}\n\n`);
}

export async function handleJobProcessing(req: Request, res: Response) {
  const submissionId = parseInt(req.params.id);
  const targetPosition = req.query.targetPosition as string;
  const targetCity = req.query.targetCity as string;
  const salaryMin = req.query.salaryMin ? parseInt(req.query.salaryMin as string) : 0;
  const salaryMax = req.query.salaryMax ? parseInt(req.query.salaryMax as string) : 999999;
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

    // 模拟简历解析延迟
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 阶段 2: 职位搜索
    sendProgress(
      res,
      "searching",
      50,
      `正在搜索 ${targetPosition} 职位 (${targetCity})...`,
      null
    );

    // 模拟搜索延迟
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // 生成搜索关键词
    const searchKey = `${targetCity}-${targetPosition}`;
    let matchedJobs = JOB_DATABASE[searchKey] || [];

    // 如果没有精确匹配，尝试模糊匹配
    if (matchedJobs.length === 0) {
      // 尝试按城市搜索
      for (const key in JOB_DATABASE) {
        if (key.includes(targetCity)) {
          matchedJobs = matchedJobs.concat(JOB_DATABASE[key]);
        }
      }
    }

    // 如果仍然没有结果，返回所有职位
    if (matchedJobs.length === 0) {
      for (const key in JOB_DATABASE) {
        matchedJobs = matchedJobs.concat(JOB_DATABASE[key]);
      }
    }

    // 阶段 3: 匹配度计算
    sendProgress(
      res,
      "matching",
      75,
      "正在计算匹配度...",
      null
    );

    // 模拟匹配计算延迟
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 计算每个职位的匹配度
    const jobsWithScores = matchedJobs.map((job) => {
      let score = 50; // 基础分数

      // 根据职位名称匹配
      if (job.title.toLowerCase().includes(targetPosition.toLowerCase())) {
        score += 30;
      }

      // 根据薪资范围匹配
      const jobSalaryMin = parseInt(job.salary.split("-")[0].replace(/[^0-9]/g, ""));
      const jobSalaryMax = parseInt(job.salary.split("-")[1].replace(/[^0-9]/g, ""));
      if (jobSalaryMin >= salaryMin && jobSalaryMax <= salaryMax) {
        score += 20;
      }

      return {
        ...job,
        matchScore: Math.min(score, 100),
      };
    });

    // 按匹配度排序，过滤半年内的职位
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const filteredJobs = jobsWithScores
      .filter((job) => new Date(job.publishedDate) > sixMonthsAgo)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 20); // 限制返回 20 个结果

    // 阶段 4: 完成
    sendProgress(
      res,
      "completed",
      100,
      "职位搜索完成！",
      {
        jobMatches: filteredJobs,
        totalCount: filteredJobs.length,
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
