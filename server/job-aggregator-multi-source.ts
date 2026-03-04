import { invokeLLM } from "./_core/llm";

export interface JobListing {
  id: string;
  title: string;
  company: string;
  companySize: "startup" | "small" | "medium" | "large"; // 公司规模
  location: string;
  salary?: {
    min: number;
    max: number;
    currency: string;
  };
  description: string;
  requirements: string[];
  postedDate: Date;
  source: "indeed" | "handshake" | "linkedin" | "angellist" | "builtin" | "other";
  sourceUrl: string;
  jobType: "internship" | "entry-level" | "junior" | "mid" | "senior";
  isStartup: boolean; // 是否初创公司
  fundingStage?: string; // 融资阶段（Seed, Series A, B, C等）
  technicalSkills: string[]; // 所需技术栈
  yearsOfExperience: number; // 所需工作经验年数
}

/**
 * 从多个源聚合职位数据
 * 只返回 2025年9月以后发布的职位
 */
export async function aggregateJobsFromMultipleSources(
  searchQuery: string,
  location: string,
  jobType: "internship" | "entry-level" = "entry-level"
): Promise<JobListing[]> {
  try {
    console.log(
      `[Job Aggregator] Searching for ${jobType} positions: ${searchQuery} in ${location}`
    );

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a job search aggregator that searches multiple job boards including Indeed, Handshake, LinkedIn, AngelList, Built.in, and others.
Your task is to find real job listings that match the search criteria.

IMPORTANT REQUIREMENTS:
1. Only return jobs posted after September 2025 (2025-09-01 or later)
2. Filter out large corporations (>5000 employees) - prioritize startups and small companies
3. Include only real, verified job listings from actual job boards
4. Extract real source URLs that actually point to the job posting
5. For each job, identify the company size and funding stage if available
6. Return jobs in JSON format

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
    "source": "indeed|handshake|linkedin|angellist|builtin|other",
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
Return only jobs posted after September 2025.
Prioritize startups and small companies (avoid Fortune 500 companies).
Include real source URLs from Indeed, Handshake, LinkedIn, AngelList, and Built.in.
Return at least 10-15 real job listings in JSON format.`,
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
                companySize: { type: "string", enum: ["startup", "small", "medium", "large"] },
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
        // 只保留 2025年9月以后的职位
        const postedDate = new Date(job.postedDate);
        const cutoffDate = new Date("2025-09-01");
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

    console.log(
      `[Job Aggregator] Found ${jobs.length} jobs after filtering (posted after 2025-09-01, excluding large companies)`
    );

    return jobs;
  } catch (error) {
    console.error("[Job Aggregator] Error aggregating jobs:", error);
    throw error;
  }
}

/**
 * 从特定源搜索职位
 */
export async function searchJobsFromSource(
  source: "indeed" | "handshake" | "linkedin" | "angellist",
  searchQuery: string,
  location: string
): Promise<JobListing[]> {
  try {
    console.log(`[Job Aggregator] Searching ${source} for: ${searchQuery} in ${location}`);

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are searching the ${source} job board for specific positions.
Return only real job listings from ${source} that match the search criteria.
Only include jobs posted after September 2025.
Prioritize startups and small companies.
Return results in JSON format.`,
        },
        {
          role: "user",
          content: `Search ${source} for "${searchQuery}" positions in ${location}.
Return real job listings posted after September 2025.
Include the actual ${source} job URL for each listing.`,
        },
      ],
    });

    const content = response.choices[0].message.content;
    if (typeof content !== "string") {
      throw new Error("Invalid response format");
    }

    // 解析响应并转换为 JobListing 格式
    // 这里简化处理，实际应该有更完善的解析逻辑
    console.log(`[Job Aggregator] Fetched jobs from ${source}`);

    return [];
  } catch (error) {
    console.error(`[Job Aggregator] Error searching ${source}:`, error);
    return [];
  }
}
