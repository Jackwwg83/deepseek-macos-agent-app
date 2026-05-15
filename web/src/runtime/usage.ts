import type { UsageAggregation } from "./types";

export function formatUsage(usage?: UsageAggregation): string {
  if (!usage) {
    return "Usage unavailable";
  }

  const cost = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: usage.currency,
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(usage.totalCost);

  return `${cost} / ${usage.inputTokens.toLocaleString()} in / ${usage.outputTokens.toLocaleString()} out / ${usage.completedTurns} turns`;
}

