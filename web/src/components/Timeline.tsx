import { CheckCircle2, CircleDashed, Terminal, UserRound } from "lucide-react";
import { ApprovalCard } from "./ApprovalCard";
import type { ApprovalDecision, TimelineItem } from "../runtime/types";

interface TimelineProps {
  items: TimelineItem[];
  onApprovalDecision(approvalId: string, decision: ApprovalDecision): void;
}

export function Timeline({ items, onApprovalDecision }: TimelineProps) {
  if (items.length === 0) {
    return <div className="empty-state">No messages yet.</div>;
  }

  return (
    <div className="timeline" aria-label="Active thread timeline">
      {items.map((item) =>
        item.kind === "approval" ? (
          <ApprovalCard key={item.id} item={item} onDecision={onApprovalDecision} />
        ) : (
          <TimelineCard key={item.id} item={item} />
        ),
      )}
    </div>
  );
}

function TimelineCard({ item }: { item: TimelineItem }) {
  const icon = item.kind === "tool" ? <Terminal size={17} aria-hidden="true" /> : item.kind === "user" ? <UserRound size={17} aria-hidden="true" /> : null;
  return (
    <article className={`timeline-card ${item.kind}-card`}>
      <div className="card-heading">
        <span className="card-kind">
          {icon}
          {item.title}
        </span>
        <span className={`status-pill status-${item.status}`}>
          {item.status === "completed" ? <CheckCircle2 size={14} aria-hidden="true" /> : <CircleDashed size={14} aria-hidden="true" />}
          {item.status}
        </span>
      </div>
      {item.kind === "tool" ? <pre className="command-preview">{item.content}</pre> : <p>{item.content}</p>}
    </article>
  );
}

