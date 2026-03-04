import { invokeLLM } from "./_core/llm";

export interface JobListing {
  id: string;
  title: string;
  company: string;
  companySize: "startup" | "small" | "medium" | "large";
  location: string;
  salary?: {
    min: number;
    max: number;
    currency: string;
  };
  description: string;
  requirements: string[];
  postedDate: Date;
  source:
    | "indeed"
    | "handshake"
    | "linkedin"
    | "angellist"
    | "builtin"
    | "wellfound"
    | "blind"
    | "leetcode"
    | "glassdoor"
    | "other";
  sourceUrl: string;
  jobType: "internship" | "entry-level" | "junior" | "mid" | "senior";
  isStartup: boolean;
  fundingStage?: string;
  technicalSkills: string[];
  yearsOfExperience: number;
}

/**
 * 从多个源聚合职位数据（扩展版本）
 * 支持 10+ 个职位网站
 * 只返回 2025年9月以后发布的职位
 */
export async function aggregateJobsFromExtendedSources(
  searchQuery: string,
  location: string,
  jobType: "internship" | "entry-level" = "entry-level"
): Promise<JobListing[]> {
  try {
    console.log(
      `[Extended Job Aggregator] Searching for ${jobType} positions: ${searchQuery} in ${location}`
    );

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a comprehensive job search aggregator that searches multiple job boards.
Your task is to find real job listings from these sources:
1. Indeed (indeed.com)
2. LinkedIn (linkedin.com/jobs)
3. Handshake (handshake.com)
4. AngelList (wellfound.com - formerly angellist)
5. Built.in (builtin.com)
6. Wellfound (wellfound.com)
7. Blind (blind.com/jobs)
8. LeetCode (leetcode.com/jobs)
9. Glassdoor (glassdoor.com)
10. Y Combinator Jobs (ycombinator.com/jobs)

CRITICAL REQUIREMENTS:
1. ONLY return jobs posted AFTER September 1, 2025 (2025-09-01 or later)
2. Filter out large corporations (>5000 employees) - prioritize startups and small companies
3. Include only REAL, verified job listings from actual job boards
4. Extract REAL source URLs that actually point to the job posting
5. For each job, identify the company size and funding stage if available
6. Use CORRECT posting dates - NOT 1970 or other historical dates
7. Distribute results across multiple sources (not just LinkedIn/Indeed)
8. Return jobs in JSON format

Return a JSON array of job listings with this structure:
[
  {
    "id": "unique_id",
    "title": "Job Title",
    "company": "Company Name",
    "companySize": "startup|small|medium|large",
    "location": "City, State/Country",
    "salary": {"min": number, "max": number, "currency": "USD"},
    "description": "Full job description",
    "requirements": ["requirement1", "requirement2"],
    "postedDate": "2025-09-15",
    "source": "indeed|handshake|linkedin|angellist|builtin|wellfound|blind|leetcode|glassdoor|other",
    "sourceUrl": "https://actual-job-url.com",
    "jobType": "internship|entry-level|junior",
    "isStartup": true/false,
    "fundingStage": "Seed|Series A|Series B|etc",
    "technicalSkills": ["Python", "JavaScript", "React"],
    "yearsOfExperience": 0
  }
]`,
        },
        {
          role: "user",
          content: `Search for ${jobType} ${searchQuery} positions in ${location}. 
Return only jobs posted AFTER September 1, 2025 (use correct dates, not 1970).
Prioritize startups and small companies (avoid Fortune 500 companies).
Include real source URLs from Indeed, LinkedIn, Handshake, AngelList, Built.in, Wellfound, Blind, LeetCode, Glassdoor, and Y Combinator.
Distribute results across multiple sources (aim for 2-3 jobs from each source).
Return at least 20-30 real job listings in JSON format with correct posting dates.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "job_listings",
          strict: false,
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                title: { type: "string" },
                company: { type: "string" },
                companySize: {
                  type: "string",
                  enum: ["startup", "small", "medium", "large"],
                },
                location: { type: "string" },
                salary: {
                  type: "object",
                  properties: {
                    min: { type: "number" },
                    max: { type: "number" },
                    currency: { type: "string" },
                  },
                },
                description: { type: "string" },
                requirements: { type: "array", items: { type: "string" } },
                postedDate: { type: "string" },
                source: { type: "string" },
                sourceUrl: { type: "string" },
                jobType: { type: "string" },
                isStartup: { type: "boolean" },
                fundingStage: { type: "string" },
                technicalSkills: { type: "array", items: { type: "string" } },
                yearsOfExperience: { type: "number" },
              },
            },
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    if (typeof content !== "string") {
      throw new Error("Invalid response format");
    }

    let jobsData = JSON.parse(content);
    if (!Array.isArray(jobsData)) {
      jobsData = [jobsData];
    }

    // 过滤和转换职位数据
    const jobs: JobListing[] = jobsData
      .filter((job: any) => {
        // 验证发布时间 - 必须是 2025年9月以后
        const postedDate = new Date(job.postedDate);
        const cutoffDate = new Date("2025-09-01");

        // 检查是否是有效的日期
        if (isNaN(postedDate.getTime())) {
          console.warn(
            `[Extended Job Aggregator] Invalid date for job ${job.title}: ${job.postedDate}`
          );
          return false;
        }

        // 检查是否是 1970 年或其他历史日期
        if (postedDate.getFullYear() < 2025) {
          console.warn(
            `[Extended Job Aggregator] Job ${job.title} has historical date: ${job.postedDate}`
          );
          return false;
        }

        return postedDate >= cutoffDate;
      })
      .filter((job: any) => {
        // 过滤掉大公司
        return job.companySize !== "large";
      })
      .map((job: any) => ({
        id: job.id || `${job.company}-${Date.now()}`,
        title: job.title,
        company: job.company,
        companySize: job.companySize || "small",
        location: job.location,
        salary: job.salary,
        description: job.description,
        requirements: job.requirements || [],
        postedDate: new Date(job.postedDate),
        source: job.source || "other",
        sourceUrl: job.sourceUrl,
        jobType: job.jobType || "entry-level",
        isStartup: job.isStartup || job.companySize === "startup",
        fundingStage: job.fundingStage,
        technicalSkills: job.technicalSkills || [],
        yearsOfExperience: job.yearsOfExperience || 0,
      }));

    // 统计数据源分布
    const sourceDistribution: Record<string, number> = {};
    jobs.forEach((job) => {
      sourceDistribution[job.source] = (sourceDistribution[job.source] || 0) + 1;
    });

    console.log(
      `[Extended Job Aggregator] Found ${jobs.length} jobs after filtering (posted after 2025-09-01, excluding large companies)`
    );
    console.log(
      `[Extended Job Aggregator] Source distribution:`,
      sourceDistribution
    );

    return jobs;
  } catch (error) {
    console.error("[Extended Job Aggregator] Error aggregating jobs:", error);
    throw error;
  }
}

/**
 * 按数据源搜索职位
 */
export async function searchJobsBySource(
  sources: string[],
  searchQuery: string,
  location: string
): Promise<JobListing[]> {
  try {
    console.log(
      `[Extended Job Aggregator] Searching sources [${sources.join(", ")}] for: ${searchQuery} in ${location}`
    );

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are searching specific job boards for positions.
Target sources: ${sources.join(", ")}
Only include jobs posted after September 2025.
Prioritize startups and small companies.
Return results in JSON format with correct posting dates.`,
        },
        {
          role: "user",
          content: `Search these job boards [${sources.join(", ")}] for ${searchQuery} positions in ${location}.
Return only jobs posted after September 1, 2025 (use correct dates).
Include real source URLs.
Return at least 10-15 real job listings in JSON format.`,
        },
      ],
    });

    const content = response.choices[0].message.content;
    if (typeof content !== "string") {
      throw new Error("Invalid response format");
    }

    let jobsData = JSON.parse(content);
    if (!Array.isArray(jobsData)) {
      jobsData = [jobsData];
    }

    return jobsData
      .filter((job: any) => {
        const postedDate = new Date(job.postedDate);
        return postedDate.getFullYear() >= 2025;
      })
      .map((job: any) => ({
        id: job.id || `${job.company}-${Date.now()}`,
        title: job.title,
        company: job.company,
        companySize: job.companySize || "small",
        location: job.location,
        salary: job.salary,
        description: job.description,
        requirements: job.requirements || [],
        postedDate: new Date(job.postedDate),
        source: job.source || "other",
        sourceUrl: job.sourceUrl,
        jobType: job.jobType || "entry-level",
        isStartup: job.isStartup || false,
        fundingStage: job.fundingStage,
        technicalSkills: job.technicalSkills || [],
        yearsOfExperience: job.yearsOfExperience || 0,
      }));
  } catch (error) {
    console.error("[Extended Job Aggregator] Error searching by source:", error);
    throw error;
  }
}
