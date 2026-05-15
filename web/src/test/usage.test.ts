import { describe, expect, it } from "vitest";
import { formatUsage } from "../runtime/usage";

describe("formatUsage", () => {
  it("formats missing usage", () => {
    expect(formatUsage()).toBe("Usage unavailable");
  });

  it("formats present usage with cost and tokens", () => {
    expect(
      formatUsage({
        currency: "USD",
        totalCost: 0.01234,
        inputTokens: 1200,
        outputTokens: 345,
        completedTurns: 2,
      }),
    ).toBe("$0.0123 / 1,200 in / 345 out / 2 turns");
  });
});

