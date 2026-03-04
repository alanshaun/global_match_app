import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { aggregateProperties } from "../scrapers/propertyScraper";

export const propertiesRealRouter = router({
  /**
   * 搜索真实房产数据
   */
  searchProperties: protectedProcedure
    .input(
      z.object({
        location: z.string().min(1, "位置不能为空"),
        country: z.enum(["US", "CN"]).default("US"),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      try {
        const properties = await aggregateProperties(
          input.location,
          input.country,
          input.limit
        );

        return {
          success: true,
          properties,
          total: properties.length,
        };
      } catch (error) {
        console.error("Property search error:", error);
        return {
          success: false,
          properties: [],
          total: 0,
          error: "搜索房产数据失败",
        };
      }
    }),

  /**
   * 获取特定城市的房产
   */
  getPropertiesByCity: protectedProcedure
    .input(
      z.object({
        city: z.string(),
        country: z.enum(["US", "CN"]).default("US"),
        limit: z.number().default(10),
      })
    )
    .query(async ({ input }) => {
      try {
        const properties = await aggregateProperties(
          input.city,
          input.country,
          input.limit
        );

        return {
          success: true,
          properties,
          city: input.city,
          country: input.country,
        };
      } catch (error) {
        console.error("City property search error:", error);
        return {
          success: false,
          properties: [],
          error: "获取城市房产数据失败",
        };
      }
    }),
});
