import { eq, desc, gte, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users,
  productSubmissions,
  companyMatches,
  coldEmails,
  resumeUploads,
  jobMatches,
  InsertProductSubmission,
  InsertCompanyMatch,
  InsertColdEmail,
  InsertResumeUpload,
  InsertJobMatch,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * 功能一：产品匹配相关查询
 */
export async function createProductSubmission(userId: number, data: Omit<InsertProductSubmission, 'userId'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(productSubmissions).values({
    userId,
    ...data,
  } as InsertProductSubmission);
  
  return result;
}

export async function getProductSubmissionById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select()
    .from(productSubmissions)
    .where(eq(productSubmissions.id, id))
    .limit(1);
  
  return result[0];
}

export async function updateProductSubmissionStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(productSubmissions)
    .set({ status: status as any, updatedAt: new Date() })
    .where(eq(productSubmissions.id, id));
}

export async function createCompanyMatch(data: InsertCompanyMatch) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(companyMatches).values(data);
  return result;
}

export async function getCompanyMatchesByProductId(productSubmissionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db
    .select()
    .from(companyMatches)
    .where(eq(companyMatches.productSubmissionId, productSubmissionId))
    .orderBy(desc(companyMatches.matchScore));
}

export async function createColdEmail(data: InsertColdEmail) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(coldEmails).values(data);
  return result;
}

export async function getColdEmailByCompanyMatchId(companyMatchId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select()
    .from(coldEmails)
    .where(eq(coldEmails.companyMatchId, companyMatchId))
    .limit(1);
  
  return result[0];
}

/**
 * 功能二：简历职位相关查询
 */
export async function createResumeUpload(userId: number, data: Omit<InsertResumeUpload, 'userId'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(resumeUploads).values({
    userId,
    ...data,
  } as InsertResumeUpload);
  
  return result;
}

export async function getResumeUploadById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select()
    .from(resumeUploads)
    .where(eq(resumeUploads.id, id))
    .limit(1);
  
  return result[0];
}

export async function updateResumeUploadStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(resumeUploads)
    .set({ status: status as any, updatedAt: new Date() })
    .where(eq(resumeUploads.id, id));
}

export async function createJobMatch(data: InsertJobMatch) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(jobMatches).values(data);
  return result;
}

export async function getJobMatchesByResumeId(resumeUploadId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  return await db
    .select()
    .from(jobMatches)
    .where(
      and(
        eq(jobMatches.resumeUploadId, resumeUploadId),
        eq(jobMatches.isActive, true),
        gte(jobMatches.publishedDate, sixMonthsAgo)
      )
    )
    .orderBy(desc(jobMatches.matchScore));
}

// TODO: add more feature queries here as your schema grows
