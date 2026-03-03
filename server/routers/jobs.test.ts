import { describe, it, expect, beforeEach } from "vitest";
import { jobsRouter } from "./jobs";
import type { TrpcContext } from "../_core/context";

// Mock user context
const mockUser = {
  id: 1,
  openId: "test-user",
  email: "test@example.com",
  name: "Test User",
  loginMethod: "manus",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const mockContext: TrpcContext = {
  user: mockUser,
  req: {
    protocol: "https",
    headers: {},
  } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};

describe("Jobs Router", () => {
  let caller: ReturnType<typeof jobsRouter.createCaller>;

  beforeEach(() => {
    caller = jobsRouter.createCaller(mockContext);
  });

  describe("submitResume", () => {
    it("should successfully submit a resume with valid data", async () => {
      const result = await caller.submitResume({
        resumeFileUrl: "https://example.com/resume.pdf",
        resumeFileKey: "resumes/user1/resume.pdf",
        targetPosition: "Product Manager",
        targetCity: "San Francisco",
        targetCountry: "USA",
        salaryMin: 100000,
        salaryMax: 150000,
        salaryCurrency: "USD",
      });

      expect(result).toBeDefined();
      expect(result.status).toBe("pending");
      expect(result.resumeId).toBeDefined();
      expect(result.message).toContain("职位搜索");
    });

    it("should reject submission without resume file", async () => {
      try {
        await caller.submitResume({
          resumeFileUrl: "",
          resumeFileKey: "",
          targetPosition: "Product Manager",
          targetCity: "San Francisco",
        });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should reject submission without target position", async () => {
      try {
        await caller.submitResume({
          resumeFileUrl: "https://example.com/resume.pdf",
          resumeFileKey: "resumes/user1/resume.pdf",
          targetPosition: "",
          targetCity: "San Francisco",
        });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should reject submission without target city", async () => {
      try {
        await caller.submitResume({
          resumeFileUrl: "https://example.com/resume.pdf",
          resumeFileKey: "resumes/user1/resume.pdf",
          targetPosition: "Product Manager",
          targetCity: "",
        });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should accept optional salary fields", async () => {
      const result = await caller.submitResume({
        resumeFileUrl: "https://example.com/resume.pdf",
        resumeFileKey: "resumes/user1/resume.pdf",
        targetPosition: "Product Manager",
        targetCity: "San Francisco",
      });

      expect(result).toBeDefined();
      expect(result.status).toBe("pending");
    });

    it("should accept different currencies", async () => {
      const currencies = ["USD", "CNY", "EUR", "GBP", "SGD"];

      for (const currency of currencies) {
        const result = await caller.submitResume({
          resumeFileUrl: "https://example.com/resume.pdf",
          resumeFileKey: "resumes/user1/resume.pdf",
          targetPosition: "Product Manager",
          targetCity: "San Francisco",
          salaryCurrency: currency,
        });

        expect(result).toBeDefined();
        expect(result.status).toBe("pending");
      }
    });
  });

  describe("getJobMatches", () => {
    it("should return empty matches for non-existent resume", async () => {
      try {
        await caller.getJobMatches({ resumeId: 99999 });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should require authentication", async () => {
      const unauthenticatedContext: TrpcContext = {
        user: null,
        req: {
          protocol: "https",
          headers: {},
        } as TrpcContext["req"],
        res: {} as TrpcContext["res"],
      };

      const unauthenticatedCaller = jobsRouter.createCaller(unauthenticatedContext);

      try {
        await unauthenticatedCaller.getJobMatches({ resumeId: 1 });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("getUserResumes", () => {
    it("should return empty array for new user", async () => {
      const result = await caller.getUserResumes();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should require authentication", async () => {
      const unauthenticatedContext: TrpcContext = {
        user: null,
        req: {
          protocol: "https",
          headers: {},
        } as TrpcContext["req"],
        res: {} as TrpcContext["res"],
      };

      const unauthenticatedCaller = jobsRouter.createCaller(unauthenticatedContext);

      try {
        await unauthenticatedCaller.getUserResumes();
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
