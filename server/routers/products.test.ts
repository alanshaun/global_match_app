import { describe, it, expect, beforeEach, vi } from "vitest";
import { productsRouter } from "./products";
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

describe("Products Router", () => {
  let caller: ReturnType<typeof productsRouter.createCaller>;

  beforeEach(() => {
    caller = productsRouter.createCaller(mockContext);
  });

  describe("submitProduct", () => {
    it("should successfully submit a product with valid data", async () => {
      const result = await caller.submitProduct({
        productName: "Test Product",
        productDescription: "A test product description",
        productCategory: "Electronics",
        numberOfCompanies: 10,
      });

      expect(result).toBeDefined();
      expect(result.status).toBe("pending");
      expect(result.submissionId).toBeDefined();
      expect(result.message).toContain("AI 分析");
    });

    it("should reject submission without product name", async () => {
      try {
        await caller.submitProduct({
          productName: "",
          productDescription: "A test product description",
        });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should reject submission without product description", async () => {
      try {
        await caller.submitProduct({
          productName: "Test Product",
          productDescription: "",
        });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should accept optional fields", async () => {
      const result = await caller.submitProduct({
        productName: "Test Product",
        productDescription: "A test product description",
        productCategory: "Electronics",
        productImageUrls: ["https://example.com/image.jpg"],
        targetCountries: ["USA", "UK"],
        numberOfCompanies: 5,
      });

      expect(result).toBeDefined();
      expect(result.status).toBe("pending");
    });

    it("should respect numberOfCompanies range", async () => {
      // Test minimum
      const minResult = await caller.submitProduct({
        productName: "Test",
        productDescription: "Test",
        numberOfCompanies: 1,
      });
      expect(minResult).toBeDefined();

      // Test maximum
      const maxResult = await caller.submitProduct({
        productName: "Test",
        productDescription: "Test",
        numberOfCompanies: 50,
      });
      expect(maxResult).toBeDefined();
    });
  });

  describe("getProductMatches", () => {
    it("should return empty matches for non-existent submission", async () => {
      try {
        await caller.getProductMatches({ submissionId: 99999 });
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

      const unauthenticatedCaller = productsRouter.createCaller(unauthenticatedContext);

      try {
        await unauthenticatedCaller.getProductMatches({ submissionId: 1 });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("getUserProducts", () => {
    it("should return empty array for new user", async () => {
      const result = await caller.getUserProducts();
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

      const unauthenticatedCaller = productsRouter.createCaller(unauthenticatedContext);

      try {
        await unauthenticatedCaller.getUserProducts();
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
