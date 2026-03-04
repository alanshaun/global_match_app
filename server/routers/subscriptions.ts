import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  getUserEmailSubscription,
  createEmailSubscription,
  updateEmailSubscription,
  unsubscribeByToken,
} from "../db";

export const subscriptionsRouter = router({
  /**
   * Get current user's email subscription
   */
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const subscription = await getUserEmailSubscription(ctx.user.id);
    return subscription || null;
  }),

  /**
   * Subscribe to email updates (only for authenticated users)
   */
  subscribe: protectedProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
        subscriptionType: z.enum(["job_alerts", "product_matches", "property_updates", "all"]).default("all"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user already has a subscription
      const existingSubscription = await getUserEmailSubscription(ctx.user.id);

      if (existingSubscription) {
        // Update existing subscription
        await updateEmailSubscription(ctx.user.id, input.subscriptionType, true);
        return {
          success: true,
          message: "Subscription updated successfully",
          subscriptionType: input.subscriptionType,
        };
      } else {
        // Create new subscription
        await createEmailSubscription(ctx.user.id, input.email, input.subscriptionType);
        return {
          success: true,
          message: "Subscribed successfully",
          subscriptionType: input.subscriptionType,
        };
      }
    }),

  /**
   * Update subscription preferences
   */
  updateSubscription: protectedProcedure
    .input(
      z.object({
        subscriptionType: z.enum(["job_alerts", "product_matches", "property_updates", "all"]),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await updateEmailSubscription(ctx.user.id, input.subscriptionType, input.isActive);
      return {
        success: true,
        message: "Subscription preferences updated",
      };
    }),

  /**
   * Unsubscribe using token (public endpoint for email unsubscribe links)
   */
  unsubscribe: publicProcedure
    .input(
      z.object({
        token: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await unsubscribeByToken(input.token);
      return {
        success: true,
        message: "You have been unsubscribed",
      };
    }),
});
