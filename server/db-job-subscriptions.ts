import { getDb } from "./db";
import { jobSearchSubscriptions } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * 创建职位搜索订阅
 */
export async function createJobSearchSubscription(
  userId: number,
  searchName: string,
  targetPosition: string,
  targetCity: string,
  targetCountry: string = "US",
  salaryMin?: number,
  salaryMax?: number,
  salaryCurrency: string = "USD",
  minMatchScore: number = 70,
  notificationFrequency: "daily" | "weekly" | "immediately" = "daily"
) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");
    const result = await db.insert(jobSearchSubscriptions).values({
      userId,
      searchName,
      targetPosition,
      targetCity,
      targetCountry,
      salaryMin,
      salaryMax,
      salaryCurrency,
      minMatchScore,
      notificationFrequency,
      isActive: true,
    });

    console.log(
      `[Job Subscription] Created subscription for user ${userId}: ${searchName}`
    );
    return result;
  } catch (error) {
    console.error("Error creating job search subscription:", error);
    throw error;
  }
}

/**
 * 获取用户的所有职位搜索订阅
 */
export async function getUserJobSearchSubscriptions(userId: number) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");
    const subscriptions = await db
      .select()
      .from(jobSearchSubscriptions)
      .where(eq(jobSearchSubscriptions.userId, userId));

    console.log(
      `[Job Subscription] Found ${subscriptions.length} subscriptions for user ${userId}`
    );
    return subscriptions;
  } catch (error) {
    console.error("Error fetching job search subscriptions:", error);
    throw error;
  }
}

/**
 * 更新职位搜索订阅
 */
export async function updateJobSearchSubscription(
  subscriptionId: number,
  updates: Partial<{
    searchName: string;
    minMatchScore: number;
    notificationFrequency: "daily" | "weekly" | "immediately";
    isActive: boolean;
  }>
) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");
    const result = await db
      .update(jobSearchSubscriptions)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(jobSearchSubscriptions.id, subscriptionId));

    console.log(
      `[Job Subscription] Updated subscription ${subscriptionId}`
    );
    return result;
  } catch (error) {
    console.error("Error updating job search subscription:", error);
    throw error;
  }
}

/**
 * 删除职位搜索订阅
 */
export async function deleteJobSearchSubscription(subscriptionId: number) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");
    const result = await db
      .delete(jobSearchSubscriptions)
      .where(eq(jobSearchSubscriptions.id, subscriptionId));

    console.log(
      `[Job Subscription] Deleted subscription ${subscriptionId}`
    );
    return result;
  } catch (error) {
    console.error("Error deleting job search subscription:", error);
    throw error;
  }
}

/**
 * 检查用户是否已订阅特定搜索
 */
export async function hasJobSearchSubscription(
  userId: number,
  targetPosition: string,
  targetCity: string,
  targetCountry: string = "US"
) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");
    const subscription = await db
      .select()
      .from(jobSearchSubscriptions)
      .where(
        and(
          eq(jobSearchSubscriptions.userId, userId),
          eq(jobSearchSubscriptions.targetPosition, targetPosition),
          eq(jobSearchSubscriptions.targetCity, targetCity),
          eq(jobSearchSubscriptions.targetCountry, targetCountry),
          eq(jobSearchSubscriptions.isActive, true)
        )
      )
      .limit(1);

    return subscription.length > 0 ? subscription[0] : null;
  } catch (error) {
    console.error("Error checking job search subscription:", error);
    return null;
  }
}

/**
 * 更新最后通知时间
 */
export async function updateLastNotificationTime(subscriptionId: number) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");
    const result = await db
      .update(jobSearchSubscriptions)
      .set({
        lastNotificationSent: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(jobSearchSubscriptions.id, subscriptionId));

    console.log(
      `[Job Subscription] Updated last notification time for subscription ${subscriptionId}`
    );
    return result;
  } catch (error) {
    console.error("Error updating last notification time:", error);
    throw error;
  }
}
