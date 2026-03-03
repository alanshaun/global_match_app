import { describe, it, expect } from "vitest";
import { validateKimiConnection, invokeKimiLLM, extractKimiContent } from "./kimi-llm";

describe("Kimi LLM Integration", () => {
  it("should validate Kimi API connection", async () => {
    const isConnected = await validateKimiConnection();
    expect(isConnected).toBe(true);
  }, { timeout: 30000 });

  it("should invoke Kimi API and get a response", async () => {
    const response = await invokeKimiLLM([
      {
        role: "user",
        content: "What is 2+2?",
      },
    ]);

    expect(response).toBeDefined();
    expect(response.choices).toBeDefined();
    expect(response.choices.length).toBeGreaterThan(0);
    expect(response.choices[0].message.content).toBeDefined();
  }, { timeout: 30000 });

  it("should extract content from Kimi response", async () => {
    const response = await invokeKimiLLM([
      {
        role: "user",
        content: "Say 'test'",
      },
    ]);

    const content = extractKimiContent(response);
    expect(content).toBeDefined();
    expect(content.length).toBeGreaterThan(0);
  }, { timeout: 30000 });

  it("should handle system messages", async () => {
    const response = await invokeKimiLLM([
      {
        role: "system",
        content: "You are a helpful assistant.",
      },
      {
        role: "user",
        content: "Hello",
      },
    ]);

    expect(response.choices).toBeDefined();
    expect(response.choices.length).toBeGreaterThan(0);
  }, { timeout: 30000 });
});
