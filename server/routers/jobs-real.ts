import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { aggregateJobs } from "../scrapers/jobScraper";

export const jobsRealRouter = router({
  /**
   * 搜索真实职位数据
   */
  searchJobs: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1, "职位关键词不能为空"),
        location: z.string().min(1, "位置不能为空"),
        country: z.enum(["US", "CN"]).default("US"),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      try {
        const jobs = await aggregateJobs(
          input.query,
          input.location,
          input.country,
          input.limit
        );

        return {
          success: true,
          jobs,
          total: jobs.length,
          query: input.query,
          location: input.location,
        };
      } catch (error) {
        console.error("Job search error:", error);
        return {
          success: false,
          jobs: [],
          total: 0,
          error: "搜索职位数据失败",
        };
      }
    }),

  /**
   * 获取特定城市的职位
   */
  getJobsByCity: protectedProcedure
    .input(
      z.object({
        city: z.string(),
        country: z.enum(["US", "CN"]).default("US"),
        limit: z.number().default(10),
      })
    )
    .query(async ({ input }) => {
      try {
        // 获取通用职位
        const jobs = await aggregateJobs(
          "jobs",
          input.city,
          input.country,
          input.limit
        );

        return {
          success: true,
          jobs,
          city: input.city,
          country: input.country,
        };
      } catch (error) {
        console.error("City job search error:", error);
        return {
          success: false,
          jobs: [],
          error: "获取城市职位数据失败",
        };
      }
    }),

  /**
   * 按职位类型搜索
   */
  searchByJobType: protectedProcedure
    .input(
      z.object({
        jobType: z.string(),
        location: z.string(),
        country: z.enum(["US", "CN"]).default("US"),
        limit: z.number().default(15),
      })
    )
    .query(async ({ input }) => {
      try {
        const jobs = await aggregateJobs(
          input.jobType,
          input.location,
          input.country,
          input.limit
        );

        return {
          success: true,
          jobs,
          jobType: input.jobType,
          location: input.location,
        };
      } catch (error) {
        console.error("Job type search error:", error);
        return {
          success: false,
          jobs: [],
          error: "按职位类型搜索失败",
        };
      }
    }),
});
