import { Gauge } from "lucide-react";
import { formatUsage } from "../runtime/usage";
import type { UsageAggregation } from "../runtime/types";

interface UsageFooterProps {
  usage?: UsageAggregation;
}

export function UsageFooter({ usage }: UsageFooterProps) {
  return (
    <footer className="usage-footer">
      <Gauge size={16} aria-hidden="true" />
      <span>{formatUsage(usage)}</span>
    </footer>
  );
}

