import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  createJobSearchSubscription,
  getUserJobSearchSubscriptions,
  updateJobSearchSubscription,
  deleteJobSearchSubscription,
  hasJobSearchSubscription,
} from "../db-job-subscriptions";

export const jobSubscriptionsRouter = router({
  /**
   * 创建职位搜索订阅
   */
  createSubscription: protectedProcedure
    .input(
      z.object({
        searchName: z.string().min(1, "搜索名称不能为空"),
        targetPosition: z.string().min(1, "职位名称不能为空"),
        targetCity: z.string().min(1, "城市不能为空"),
        targetCountry: z.string().default("US"),
        salaryMin: z.number().optional(),
        salaryMax: z.number().optional(),
        salaryCurrency: z.string().default("USD"),
        minMatchScore: z.number().min(0).max(100).default(70),
        notificationFrequency: z
          .enum(["daily", "weekly", "immediately"])
          .default("daily"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // 检查是否已存在相同的订阅
        const existing = await hasJobSearchSubscription(
          ctx.user.id,
          input.targetPosition,
          input.targetCity,
          input.targetCountry
        );

        if (existing) {
          return {
            success: false,
            message: "您已订阅过此搜索条件",
            subscription: existing,
          };
        }

        // 创建新订阅
        await createJobSearchSubscription(
          ctx.user.id,
          input.searchName,
          input.targetPosition,
          input.targetCity,
          input.targetCountry,
          input.salaryMin,
          input.salaryMax,
          input.salaryCurrency,
          input.minMatchScore,
          input.notificationFrequency
        );

        return {
          success: true,
          message: `已成功订阅"${input.searchName}"，当有新职位时将通过邮件通知您`,
        };
      } catch (error) {
        console.error("Error creating job search subscription:", error);
        return {
          success: false,
          message: "创建订阅失败，请稍后重试",
        };
      }
    }),

  /**
   * 获取用户的所有职位搜索订阅
   */
  getSubscriptions: protectedProcedure.query(async ({ ctx }) => {
    try {
      const subscriptions = await getUserJobSearchSubscriptions(ctx.user.id);
      return {
        success: true,
        subscriptions,
      };
    } catch (error) {
      console.error("Error fetching job search subscriptions:", error);
      return {
        success: false,
        subscriptions: [],
      };
    }
  }),

  /**
   * 更新职位搜索订阅
   */
  updateSubscription: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.number(),
        searchName: z.string().optional(),
        minMatchScore: z.number().min(0).max(100).optional(),
        notificationFrequency: z
          .enum(["daily", "weekly", "immediately"])
          .optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { subscriptionId, ...updates } = input;
        await updateJobSearchSubscription(subscriptionId, updates);

        return {
          success: true,
          message: "订阅已更新",
        };
      } catch (error) {
        console.error("Error updating job search subscription:", error);
        return {
          success: false,
          message: "更新订阅失败，请稍后重试",
        };
      }
    }),

  /**
   * 删除职位搜索订阅
   */
  deleteSubscription: protectedProcedure
    .input(z.object({ subscriptionId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        await deleteJobSearchSubscription(input.subscriptionId);

        return {
          success: true,
          message: "订阅已取消",
        };
      } catch (error) {
        console.error("Error deleting job search subscription:", error);
        return {
          success: false,
          message: "取消订阅失败，请稍后重试",
        };
      }
    }),

  /**
   * 检查用户是否已订阅特定搜索
   */
  checkSubscription: protectedProcedure
    .input(
      z.object({
        targetPosition: z.string(),
        targetCity: z.string(),
        targetCountry: z.string().default("US"),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const subscription = await hasJobSearchSubscription(
          ctx.user.id,
          input.targetPosition,
          input.targetCity,
          input.targetCountry
        );

        return {
          isSubscribed: !!subscription,
          subscription: subscription || null,
        };
      } catch (error) {
        console.error("Error checking job search subscription:", error);
        return {
          isSubscribed: false,
          subscription: null,
        };
      }
    }),
});
