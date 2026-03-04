import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users, productSubmissions, resumeUploads, propertySubmissions, emailSubscriptions } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const adminRouter = router({
  /**
   * Get dashboard statistics
   */
  getStats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const totalUsers = await db.select().from(users);
    const totalProducts = await db.select().from(productSubmissions);
    const totalResumes = await db.select().from(resumeUploads);
    const totalProperties = await db.select().from(propertySubmissions);
    const totalSubscriptions = await db.select().from(emailSubscriptions).where(eq(emailSubscriptions.isActive, true));

    return {
      totalUsers: totalUsers.length,
      totalProducts: totalProducts.length,
      totalResumes: totalResumes.length,
      totalProperties: totalProperties.length,
      activeSubscriptions: totalSubscriptions.length,
    };
  }),

  /**
   * Get all users with pagination
   */
  getAllUsers: adminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const offset = (input.page - 1) * input.limit;
      const allUsers = await db
        .select()
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(input.limit)
        .offset(offset);

      const totalCount = await db.select().from(users);

      return {
        users: allUsers,
        total: totalCount.length,
        page: input.page,
        limit: input.limit,
      };
    }),

  /**
   * Get all product submissions
   */
  getAllProductSubmissions: adminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const offset = (input.page - 1) * input.limit;
      const submissions = await db
        .select()
        .from(productSubmissions)
        .orderBy(desc(productSubmissions.createdAt))
        .limit(input.limit)
        .offset(offset);

      const totalCount = await db.select().from(productSubmissions);

      return {
        submissions,
        total: totalCount.length,
        page: input.page,
        limit: input.limit,
      };
    }),

  /**
   * Get all resume uploads
   */
  getAllResumeUploads: adminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const offset = (input.page - 1) * input.limit;
      const uploads = await db
        .select()
        .from(resumeUploads)
        .orderBy(desc(resumeUploads.createdAt))
        .limit(input.limit)
        .offset(offset);

      const totalCount = await db.select().from(resumeUploads);

      return {
        uploads,
        total: totalCount.length,
        page: input.page,
        limit: input.limit,
      };
    }),

  /**
   * Get all property submissions
   */
  getAllPropertySubmissions: adminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const offset = (input.page - 1) * input.limit;
      const submissions = await db
        .select()
        .from(propertySubmissions)
        .orderBy(desc(propertySubmissions.createdAt))
        .limit(input.limit)
        .offset(offset);

      const totalCount = await db.select().from(propertySubmissions);

      return {
        submissions,
        total: totalCount.length,
        page: input.page,
        limit: input.limit,
      };
    }),

  /**
   * Get all email subscriptions
   */
  getAllSubscriptions: adminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const offset = (input.page - 1) * input.limit;
      const subscriptions = await db
        .select()
        .from(emailSubscriptions)
        .orderBy(desc(emailSubscriptions.createdAt))
        .limit(input.limit)
        .offset(offset);

      const totalCount = await db.select().from(emailSubscriptions);

      return {
        subscriptions,
        total: totalCount.length,
        page: input.page,
        limit: input.limit,
      };
    }),

  /**
   * Promote user to admin
   */
  promoteUserToAdmin: adminProcedure
    .input(
      z.object({
        userId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(users)
        .set({ role: "admin" })
        .where(eq(users.id, input.userId));

      return {
        success: true,
        message: "User promoted to admin",
      };
    }),

  /**
   * Demote admin to user
   */
  demoteAdminToUser: adminProcedure
    .input(
      z.object({
        userId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(users)
        .set({ role: "user" })
        .where(eq(users.id, input.userId));

      return {
        success: true,
        message: "Admin demoted to user",
      };
    }),

  /**
   * Delete user and their data
   */
  deleteUser: adminProcedure
    .input(
      z.object({
        userId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Delete related data
      await db.delete(productSubmissions).where(eq(productSubmissions.userId, input.userId));
      await db.delete(resumeUploads).where(eq(resumeUploads.userId, input.userId));
      await db.delete(propertySubmissions).where(eq(propertySubmissions.userId, input.userId));
      await db.delete(emailSubscriptions).where(eq(emailSubscriptions.userId, input.userId));

      // Delete user
      await db.delete(users).where(eq(users.id, input.userId));

      return {
        success: true,
        message: "User and their data deleted",
      };
    }),
});
