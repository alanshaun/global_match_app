import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 功能一：产品上传表
 * 存储用户上传的产品信息
 */
export const productSubmissions = mysqlTable("product_submissions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  productDescription: text("productDescription").notNull(),
  productCategory: varchar("productCategory", { length: 100 }),
  productSpecs: json("productSpecs"), // JSON 格式存储产品规格
  productImages: json("productImages"), // JSON 数组存储图片 S3 URL
  targetCountries: json("targetCountries"), // JSON 数组存储目标国家
  numberOfCompanies: int("numberOfCompanies").default(10), // 用户要求的公司数量
  aiAnalysis: text("aiAnalysis"), // AI 分析结果（产品特征、市场定位等）
  status: mysqlEnum("status", ["pending", "analyzing", "completed", "failed"]).default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductSubmission = typeof productSubmissions.$inferSelect;
export type InsertProductSubmission = typeof productSubmissions.$inferInsert;

/**
 * 功能一：公司匹配结果表
 * 存储 AI 匹配的目标公司信息
 */
export const companyMatches = mysqlTable("company_matches", {
  id: int("id").autoincrement().primaryKey(),
  productSubmissionId: int("productSubmissionId").notNull(),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  companyWebsite: varchar("companyWebsite", { length: 500 }),
  companyLinkedin: varchar("companyLinkedin", { length: 500 }),
  companyDescription: text("companyDescription"),
  matchScore: decimal("matchScore", { precision: 5, scale: 2 }), // 0-100 匹配度评分
  matchReason: text("matchReason"), // 为什么匹配的原因
  contactEmail: varchar("contactEmail", { length: 255 }),
  contactPhone: varchar("contactPhone", { length: 20 }),
  contactName: varchar("contactName", { length: 255 }),
  contactTitle: varchar("contactTitle", { length: 100 }),
  contactSource: mysqlEnum("contactSource", ["official_website", "linkedin", "other"]).default("official_website"),
  coldEmailGenerated: boolean("coldEmailGenerated").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CompanyMatch = typeof companyMatches.$inferSelect;
export type InsertCompanyMatch = typeof companyMatches.$inferInsert;

/**
 * 功能一：Cold Email 模板表
 * 存储为每家公司生成的个性化 Cold Email
 */
export const coldEmails = mysqlTable("cold_emails", {
  id: int("id").autoincrement().primaryKey(),
  companyMatchId: int("companyMatchId").notNull(),
  productSubmissionId: int("productSubmissionId").notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  emailBody: text("emailBody").notNull(),
  language: varchar("language", { length: 10 }).default("en"), // 邮件语言
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ColdEmail = typeof coldEmails.$inferSelect;
export type InsertColdEmail = typeof coldEmails.$inferInsert;

/**
 * 功能二：简历上传表
 * 存储用户上传的简历文件和解析信息
 */
export const resumeUploads = mysqlTable("resume_uploads", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  resumeFileName: varchar("resumeFileName", { length: 255 }).notNull(),
  resumeFileUrl: varchar("resumeFileUrl", { length: 500 }).notNull(), // S3 URL
  resumeFileKey: varchar("resumeFileKey", { length: 500 }).notNull(), // S3 key
  resumeText: text("resumeText"), // 简历文本内容（OCR 或 PDF 解析结果）
  parsedData: json("parsedData"), // JSON 格式存储解析的关键信息（技能、经验、教育等）
  targetPosition: varchar("targetPosition", { length: 255 }).notNull(),
  targetCity: varchar("targetCity", { length: 100 }).notNull(),
  targetCountry: varchar("targetCountry", { length: 100 }),
  salaryMin: int("salaryMin"), // 期望薪资最低
  salaryMax: int("salaryMax"), // 期望薪资最高
  salaryCurrency: varchar("salaryCurrency", { length: 10 }).default("USD"),
  status: mysqlEnum("status", ["pending", "parsing", "completed", "failed"]).default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ResumeUpload = typeof resumeUploads.$inferSelect;
export type InsertResumeUpload = typeof resumeUploads.$inferInsert;

/**
 * 功能二：职位匹配结果表
 * 存储从各大招聘平台搜索到的职位信息
 */
export const jobMatches = mysqlTable("job_matches", {
  id: int("id").autoincrement().primaryKey(),
  resumeUploadId: int("resumeUploadId").notNull(),
  jobTitle: varchar("jobTitle", { length: 255 }).notNull(),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  companyWebsite: varchar("companyWebsite", { length: 500 }),
  jobLocation: varchar("jobLocation", { length: 255 }).notNull(),
  jobCity: varchar("jobCity", { length: 100 }),
  jobCountry: varchar("jobCountry", { length: 100 }),
  salaryMin: int("salaryMin"),
  salaryMax: int("salaryMax"),
  salaryCurrency: varchar("salaryCurrency", { length: 10 }).default("USD"),
  jobDescription: text("jobDescription"),
  jobRequirements: text("jobRequirements"),
  matchScore: decimal("matchScore", { precision: 5, scale: 2 }), // 0-100 匹配度评分
  matchReason: text("matchReason"),
  jobSource: mysqlEnum("jobSource", ["indeed", "linkedin", "boss", "other"]).notNull(),
  jobUrl: varchar("jobUrl", { length: 500 }).notNull(),
  publishedDate: timestamp("publishedDate"), // 职位发布时间
  expiryDate: timestamp("expiryDate"), // 职位过期时间
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type JobMatch = typeof jobMatches.$inferSelect;
export type InsertJobMatch = typeof jobMatches.$inferInsert;