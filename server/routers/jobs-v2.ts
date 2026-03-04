import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createResumeUpload,
  getResumeUploadById,
  updateResumeUploadStatus,
  createJobMatch,
  getJobMatchesByResumeId,
} from "../db";
import { storagePut } from "../storage";
import { analyzeResumeDeep, calculateResumeScore } from "../resume-deep-analysis";
import { aggregateJobsFromExtendedSources } from "../job-aggregator-extended";
import { calculateBatchJobMatches } from "../job-matching-engine";

/**
 * 职位匹配 API 路由 - 新版本
 */
export const jobsRouterV2 = router({
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

        const resumeId = (submission as any).insertId || 1;

        // 异步触发简历解析和职位搜索
        parseResumeAndSearchJobsV2(resumeId, ctx.user.id, input, input.resumeFileUrl).catch(err => {
          console.error("Error in background job search:", err);
        });

        return {
          resumeId,
          status: "pending",
          message: "简历已提交，正在进行多维度职位匹配...",
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
        const sorted = matches.sort((a: any, b: any) => {
          const scoreA = a.matchScore || 0;
          const scoreB = b.matchScore || 0;
          return scoreB - scoreA;
        });

        return {
          resume,
          matches: sorted,
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
      return [];
    } catch (error) {
      throw new Error(`Failed to get user resumes: ${error}`);
    }
  }),
});

/**
 * 新版本：深度分析简历并搜索职位
 */
async function parseResumeAndSearchJobsV2(
  resumeId: number,
  userId: number,
  input: any,
  resumeFileUrl: string
) {
  try {
    await updateResumeUploadStatus(resumeId, "parsing");

    console.log(`[Job Search V2] Fetching resume content from ${resumeFileUrl}`);
    const resumeText = await fetch(resumeFileUrl).then(r => r.text());

    // 使用 AI 深度分析简历
    console.log(`[Job Search V2] Performing deep resume analysis...`);
    const resumeAnalysis = await analyzeResumeDeep(resumeText);
    const resumeScore = calculateResumeScore(resumeAnalysis);
    
    console.log(`[Job Search V2] Resume analysis complete:`, {
      score: resumeScore,
      seniority: resumeAnalysis.seniority,
      skills: resumeAnalysis.technicalSkills.length,
      internships: resumeAnalysis.internshipCount,
      school: resumeAnalysis.school.name,
    });

    // 从多个源聚合职位数据
    console.log(`[Job Search V2] Aggregating jobs from multiple sources...`);
    const jobs = await aggregateJobsFromExtendedSources(
      input.targetPosition,
      input.targetCity,
      "entry-level"
    );

    console.log(`[Job Search V2] Found ${jobs.length} jobs, calculating multi-dimensional matches...`);

    // 计算多维度匹配度
    const matchedJobs = await calculateBatchJobMatches(resumeAnalysis, jobs, 20);

    console.log(`[Job Search V2] Matched ${matchedJobs.length} jobs with scores`);

    // 保存匹配结果
    for (const match of matchedJobs) {
      await createJobMatch({
        resumeUploadId: resumeId,
        jobTitle: match.title,
        companyName: match.company,
        jobLocation: match.location,
        jobUrl: match.sourceUrl,
        matchScore: String(match.matchScore.overallScore),
        matchReason: match.matchScore.details,
        jobSource: match.source as any,
      });
    }

    await updateResumeUploadStatus(resumeId, "completed");
    console.log(`[Job Search V2] Job search completed for resume ${resumeId}`);

  } catch (error) {
    console.error("[Job Search V2] Error:", error);
    await updateResumeUploadStatus(resumeId, "error");
  }
}
