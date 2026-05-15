import { Check, X } from "lucide-react";
import type { ApprovalDecision, TimelineItem } from "../runtime/types";

interface ApprovalCardProps {
  item: TimelineItem;
  onDecision(approvalId: string, decision: ApprovalDecision): void;
}

export function ApprovalCard({ item, onDecision }: ApprovalCardProps) {
  const approval = item.approval;
  if (!approval) {
    return null;
  }

  return (
    <article className="timeline-card approval-card" data-testid="approval-card">
      <div className="card-heading">
        <span className="card-kind">Approval</span>
        <span className={`status-pill status-${item.status}`}>{item.status}</span>
      </div>
      <h3>{approval.title}</h3>
      <dl className="approval-grid">
        <div>
          <dt>Tool</dt>
          <dd>{approval.toolName}</dd>
        </div>
        <div>
          <dt>Action</dt>
          <dd>{approval.actionType}</dd>
        </div>
        <div>
          <dt>Cwd</dt>
          <dd>{approval.cwd}</dd>
        </div>
        <div>
          <dt>Effect</dt>
          <dd>{approval.expectedSideEffect}</dd>
        </div>
      </dl>
      {approval.command ? <pre className="command-preview">{approval.command}</pre> : null}
      {approval.decision ? (
        <p className="decision-copy">Decision: {approval.decision}</p>
      ) : (
        <div className="approval-actions">
          <button className="secondary-button" type="button" onClick={() => onDecision(approval.approvalId, "deny")}>
            <X size={16} aria-hidden="true" />
            Deny
          </button>
          <button className="primary-button" type="button" onClick={() => onDecision(approval.approvalId, "allow")}>
            <Check size={16} aria-hidden="true" />
            Allow
          </button>
        </div>
      )}
    </article>
  );
}

