import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createResumeUpload,
  getResumeUploadById,
  updateResumeUploadStatus,
  createJobMatch,
  getJobMatchesByResumeId,
} from "../db";
import { invokeLLM } from "../_core/llm";
import { storagePut } from "../storage";

/**
 * 职位匹配 API 路由
 */
export const jobsRouter = router({
  /**
   * 上传简历并创建职位搜索任务
   */
  submitResume: protectedProcedure
    .input(
      z.object({
        resumeFileUrl: z.string().url(),
        resumeFileKey: z.string(),
        targetPosition: z.string().min(1, "目标岗位不能为空"),
        targetCity: z.string().min(1, "目标城市不能为空"),
        targetCountry: z.string().optional(),
        salaryMin: z.number().int().optional(),
        salaryMax: z.number().int().optional(),
        salaryCurrency: z.string().default("USD"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // 创建简历上传记录
        const submission = await createResumeUpload(ctx.user.id, {
          resumeFileName: `resume-${Date.now()}`,
          resumeFileUrl: input.resumeFileUrl,
          resumeFileKey: input.resumeFileKey,
          targetPosition: input.targetPosition,
          targetCity: input.targetCity,
          targetCountry: input.targetCountry || undefined,
          salaryMin: input.salaryMin || undefined,
          salaryMax: input.salaryMax || undefined,
          salaryCurrency: input.salaryCurrency,
          status: "pending" as const,
        });

        // 获取插入的 ID
        const resumeId = (submission as any).insertId || 1;

        // 异步触发简历解析和职位搜索
        parseResumeAndSearchJobs(resumeId, ctx.user.id, input).catch(err => {
          console.error("Error in background job search:", err);
        });

        return {
          resumeId,
          status: "pending",
          message: "简历已提交，正在进行职位搜索...",
        };
      } catch (error) {
        throw new Error(`Failed to submit resume: ${error}`);
      }
    }),

  /**
   * 获取职位匹配结果
   */
  getJobMatches: protectedProcedure
    .input(z.object({ resumeId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const resume = await getResumeUploadById(input.resumeId);

        if (!resume || resume.userId !== ctx.user.id) {
          throw new Error("Resume not found or unauthorized");
        }

        const matches = await getJobMatchesByResumeId(input.resumeId);

        return {
          resume,
          matches,
        };
      } catch (error) {
        throw new Error(`Failed to get job matches: ${error}`);
      }
    }),

  /**
   * 获取用户的所有简历提交
   */
  getUserResumes: protectedProcedure.query(async ({ ctx }) => {
    try {
      // 这个功能需要在 db.ts 中添加对应的查询函数
      return [];
    } catch (error) {
      throw new Error(`Failed to get user resumes: ${error}`);
    }
  }),
});

/**
 * 后台异步函数：解析简历并搜索职位
 */
async function parseResumeAndSearchJobs(
  resumeId: number,
  userId: number,
  input: any
) {
  try {
    // 1. 更新状态为 parsing
    await updateResumeUploadStatus(resumeId, "parsing");

    // 2. 从 S3 获取简历内容并使用 LLM 解析
    const resumeText = await fetchResumeContent(input.resumeFileUrl);

    const parsePrompt = `
    请解析以下简历内容，提取关键信息：
    
    简历内容：
    ${resumeText}
    
    请返回 JSON 格式的结果，包含以下字段：
    {
      "name": "姓名",
      "email": "邮箱",
      "phone": "电话",
      "skills": ["技能1", "技能2", ...],
      "experience": "工作经验总结",
      "education": "教育背景",
      "languages": ["语言1", "语言2"],
      "yearsOfExperience": 5,
      "keyAchievements": ["成就1", "成就2"]
    }
    `;

    const parseResponse = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a resume parser. Extract key information from resumes and return valid JSON.",
        },
        {
          role: "user",
          content: parsePrompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "resume_data",
          strict: true,
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              email: { type: "string" },
              phone: { type: "string" },
              skills: { type: "array", items: { type: "string" } },
              experience: { type: "string" },
              education: { type: "string" },
              languages: { type: "array", items: { type: "string" } },
              yearsOfExperience: { type: "number" },
              keyAchievements: { type: "array", items: { type: "string" } },
            },
            required: ["skills", "experience", "education"],
          },
        },
      },
    });

    let parsedData: any = {};
    try {
      const content = typeof parseResponse.choices[0]?.message.content === 'string'
        ? parseResponse.choices[0].message.content
        : "{}";
      parsedData = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse resume:", e);
    }

    // 3. 使用 LLM 生成职位搜索关键词
    const searchKeywordsPrompt = `
    基于以下简历信息和职位要求，生成最合适的职位搜索关键词和条件：
    
    简历信息：
    - 技能: ${parsedData.skills?.join(", ") || "未指定"}
    - 工作经验: ${parsedData.experience || "未指定"}
    - 教育背景: ${parsedData.education || "未指定"}
    - 工作年限: ${parsedData.yearsOfExperience || "未指定"}
    
    职位要求：
    - 目标岗位: ${input.targetPosition}
    - 目标城市: ${input.targetCity}
    - 目标国家: ${input.targetCountry || "全球"}
    - 期望薪资: ${input.salaryMin || "0"}-${input.salaryMax || "无上限"} ${input.salaryCurrency}
    
    请返回 JSON 格式，包含：
    {
      "searchKeywords": ["关键词1", "关键词2", ...],
      "jobTitles": ["职位1", "职位2", ...],
      "industries": ["行业1", "行业2"],
      "requiredSkills": ["技能1", "技能2"],
      "preferredSkills": ["技能1", "技能2"],
      "seniority": "junior|mid|senior"
    }
    `;

    const keywordsResponse = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a job search expert. Generate relevant search keywords and job criteria.",
        },
        {
          role: "user",
          content: searchKeywordsPrompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "search_keywords",
          strict: true,
          schema: {
            type: "object",
            properties: {
              searchKeywords: { type: "array", items: { type: "string" } },
              jobTitles: { type: "array", items: { type: "string" } },
              industries: { type: "array", items: { type: "string" } },
              requiredSkills: { type: "array", items: { type: "string" } },
              preferredSkills: { type: "array", items: { type: "string" } },
              seniority: { type: "string" },
            },
            required: ["searchKeywords", "jobTitles"],
          },
        },
      },
    });

    let searchKeywords: any = {};
    try {
      const content = typeof keywordsResponse.choices[0]?.message.content === 'string'
        ? keywordsResponse.choices[0].message.content
        : "{}";
      searchKeywords = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse search keywords:", e);
    }

    // 4. 从各大平台搜索职位（模拟实现）
    const jobListings = await searchJobsFromMultiplePlatforms(
      input.targetPosition,
      input.targetCity,
      input.targetCountry,
      searchKeywords
    );

    // 5. 计算匹配度并创建职位匹配记录
    for (const job of jobListings) {
      try {
        const matchScore = await calculateJobMatchScore(job, parsedData, input);

        // 仅保存匹配度 > 60 的职位
        if (matchScore >= 60) {
          await createJobMatch({
            resumeUploadId: resumeId,
            jobTitle: job.title,
            companyName: job.company,
            companyWebsite: job.companyWebsite || undefined,
            jobLocation: job.location,
            jobCity: job.city || undefined,
            jobCountry: job.country || undefined,
            salaryMin: job.salaryMin || undefined,
            salaryMax: job.salaryMax || undefined,
            salaryCurrency: job.salaryCurrency || "USD",
            jobDescription: job.description || undefined,
            jobRequirements: job.requirements || undefined,
            matchScore: matchScore.toString(),
            matchReason: generateMatchReason(job, parsedData),
            jobSource: (job.source || "other") as any,
            jobUrl: job.url,
            publishedDate: job.publishedDate || undefined,
            expiryDate: job.expiryDate || undefined,
            isActive: true,
          });
        }
      } catch (error) {
        console.error(`Error processing job ${job.title}:`, error);
      }
    }

    // 6. 更新状态为 completed
    await updateResumeUploadStatus(resumeId, "completed");
  } catch (error) {
    console.error("Error in parseResumeAndSearchJobs:", error);
    await updateResumeUploadStatus(resumeId, "failed");
  }
}

/**
 * 获取简历内容
 */
async function fetchResumeContent(fileUrl: string): Promise<string> {
  try {
    const response = await fetch(fileUrl);
    const text = await response.text();
    return text;
  } catch (error) {
    console.error("Failed to fetch resume content:", error);
    return "";
  }
}

/**
 * 从多个平台搜索职位
 */
async function searchJobsFromMultiplePlatforms(
  position: string,
  city: string,
  country: string,
  searchKeywords: any
): Promise<any[]> {
  try {
    // 使用 Kimi AI 搜索真实职位
    const { searchJobsWithKimi } = await import("../kimi-job-search");

    // 确定国家代码
    const countryCode = country?.toUpperCase() === "CN" ? "CN" : "US";

    // 使用 Kimi AI 搜索职位
    console.log(`[Kimi Job Search] Searching for ${position} in ${city}, ${country}`);
    const kimiJobs = await searchJobsWithKimi(
      position,
      city,
      countryCode,
      20 // 获取 20 个职位
    );

    console.log(`[Kimi Job Search] Found ${kimiJobs.length} jobs`);

    // 转换数据格式
    return kimiJobs.map((job: any) => ({
      title: job.title,
      company: job.company,
      location: `${city}, ${country}`,
      city,
      country,
      description: job.description,
      requirements: job.description, // 使用描述作为要求
      salaryMin: extractSalaryMin(job.salary),
      salaryMax: extractSalaryMax(job.salary),
      salaryCurrency: country?.toUpperCase() === "CN" ? "CNY" : "USD",
      url: job.url, // 真实链接（来自 Kimi AI 搜索）
      source: job.source,
      publishedDate: job.postedDate ? new Date(job.postedDate) : new Date(),
      companyWebsite: extractWebsite(job.company),
    }));
  } catch (error) {
    console.error("Error searching jobs from platforms:", error);
    return [];
  }
}

/**
 * 从薪资字符串提取最小值
 */
function extractSalaryMin(salary: string | undefined): number | undefined {
  if (!salary) return undefined;
  const match = salary.match(/\d+/);
  return match ? parseInt(match[0]) * 1000 : undefined; // 假设单位是 K
}

/**
 * 从薪资字符串提取最大值
 */
function extractSalaryMax(salary: string | undefined): number | undefined {
  if (!salary) return undefined;
  const parts = salary.split(/[-~]/); // 分割范围
  if (parts.length > 1) {
    const match = parts[1].match(/\d+/);
    return match ? parseInt(match[0]) * 1000 : undefined;
  }
  return undefined;
}

/**
 * 从公司名称提取网站
 */
function extractWebsite(company: string): string | undefined {
  // 尝试从公司名称构建网站 URL
  if (!company) return undefined;
  const domain = company
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
  return domain ? `https://${domain}.com` : undefined;
}

/**
 * 计算职位匹配度（使用 AI）
 */
async function calculateJobMatchScore(job: any, resumeData: any, input: any): Promise<number> {
  try {
    // 使用 AI 计算真实匹配度
    const matchPrompt = `
    基于以下简历和职位信息，计算匹配度（0-100）：
    
    简历信息：
    - 技能: ${resumeData.skills?.join(", ") || "未指定"}
    - 工作经验: ${resumeData.experience || "未指定"}
    - 教育背景: ${resumeData.education || "未指定"}
    - 工作年限: ${resumeData.yearsOfExperience || "未指定"}
    - 成就: ${resumeData.keyAchievements?.join(", ") || "未指定"}
    
    职位信息：
    - 职位名称: ${job.title}
    - 公司: ${job.company}
    - 职位描述: ${job.description}
    - 职位要求: ${job.requirements}
    - 薪资范围: ${job.salaryMin}-${job.salaryMax} ${job.salaryCurrency}
    
    用户期望：
    - 目标岗位: ${input.targetPosition}
    - 期望薪资: ${input.salaryMin}-${input.salaryMax} ${input.salaryCurrency}
    
    请返回 JSON 格式：
    {
      "matchScore": 75,
      "reason": "匹配原因说明"
    }
    
    匹配度计算考虑因素：
    1. 技能匹配度（40%）
    2. 工作经验匹配度（30%）
    3. 薪资匹配度（20%）
    4. 职位类型匹配度（10%）
    `;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a job matching expert. Calculate match score between resume and job posting. Return valid JSON.",
        },
        {
          role: "user",
          content: matchPrompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "job_match_score",
          strict: true,
          schema: {
            type: "object",
            properties: {
              matchScore: { type: "number", minimum: 0, maximum: 100 },
              reason: { type: "string" },
            },
            required: ["matchScore", "reason"],
          },
        },
      },
    });

    try {
      const content = typeof response.choices[0]?.message.content === "string"
        ? response.choices[0].message.content
        : "{}";
      const result = JSON.parse(content);
      return Math.min(100, Math.max(0, result.matchScore || 50));
    } catch (e) {
      console.error("Failed to parse match score:", e);
      return 50; // 默认分数
    }
  } catch (error) {
    console.error("Error calculating match score:", error);
    return 50; // 默认分数
  }
}

/**
 * 生成匹配原因
 */
function generateMatchReason(job: any, resumeData: any): string {
  // 这个函数现在由 AI 在 calculateJobMatchScore 中生成
  return "基于 AI 分析的匹配原因";
}

/**
 * 生成简单的匹配原因（备用）
 */
function generateSimpleMatchReason(job: any, resumeData: any): string {
  const skills = resumeData.skills || [];
  const jobDesc = job.requirements || "";
  const matchedCount = skills.filter((s: string) => jobDesc.toLowerCase().includes(s.toLowerCase())).length;
  return `匹配 ${matchedCount}/${skills.length} 个技能要求`;
}


