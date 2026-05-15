export type RuntimeMode = "fake" | "real";

export interface RuntimeHealth {
  status: "ok" | "degraded" | "offline";
  mode: RuntimeMode;
  message?: string;
}

export interface RuntimeInfo {
  appVersion: string;
  runtimeVersion: string;
  authRequired: boolean;
  mode: RuntimeMode;
  capabilities: string[];
}

export interface RuntimeThread {
  id: string;
  title: string;
  projectPath: string;
  updatedAt: string;
  archived?: boolean;
}

export interface ThreadDetail {
  thread: RuntimeThread;
  items: TimelineItem[];
  lastSeq: number;
}

export interface ListThreadsQuery {
  limit?: number;
  includeArchived?: boolean;
}

export interface CreateThreadRequest {
  title?: string;
  projectPath: string;
}

export interface StartTurnRequest {
  input: string;
}

export interface StartTurnResponse {
  turnId: string;
  accepted: boolean;
}

export interface RuntimeTurn {
  id: string;
  threadId: string;
  status: "running" | "completed" | "failed" | "interrupted";
}

export type ApprovalDecision = "allow" | "deny";

export interface ApprovalRequest {
  approvalId: string;
  title: string;
  toolName: string;
  actionType: string;
  cwd: string;
  command?: string;
  path?: string;
  expectedSideEffect: string;
}

export interface ApprovalResponse {
  approvalId: string;
  decision: ApprovalDecision;
  accepted: boolean;
}

export interface UsageQuery {
  groupBy?: "day" | "model" | "provider" | "thread";
}

export interface UsageAggregation {
  currency: "USD";
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  completedTurns: number;
}

export type RuntimeEventName =
  | "thread.started"
  | "turn.started"
  | "turn.completed"
  | "turn.interrupt_requested"
  | "item.started"
  | "item.delta"
  | "item.completed"
  | "item.failed"
  | "approval.required"
  | "approval.decided";

export interface RuntimeEvent<TPayload = RuntimeEventPayload> {
  seq: number;
  event: RuntimeEventName;
  threadId: string;
  turnId?: string;
  payload: TPayload;
  createdAt: string;
}

export type RuntimeEventPayload =
  | ThreadStartedPayload
  | TurnStartedPayload
  | TurnCompletedPayload
  | TurnInterruptPayload
  | ItemStartedPayload
  | ItemDeltaPayload
  | ItemCompletedPayload
  | ItemFailedPayload
  | ApprovalRequiredPayload
  | ApprovalDecidedPayload;

export interface ThreadStartedPayload {
  thread: RuntimeThread;
}

export interface TurnStartedPayload {
  turnId: string;
}

export interface TurnCompletedPayload {
  turnId: string;
}

export interface TurnInterruptPayload {
  turnId: string;
}

export interface ItemStartedPayload {
  itemId: string;
  kind: TimelineItemKind;
  title: string;
  content?: string;
}

export interface ItemDeltaPayload {
  itemId: string;
  delta: string;
}

export interface ItemCompletedPayload {
  itemId: string;
  content?: string;
}

export interface ItemFailedPayload {
  itemId: string;
  message: string;
}

export interface ApprovalRequiredPayload extends ApprovalRequest {
  itemId: string;
}

export interface ApprovalDecidedPayload {
  approvalId: string;
  decision: ApprovalDecision;
}

export type TimelineItemKind = "user" | "assistant" | "tool" | "approval" | "status";
export type TimelineItemStatus = "queued" | "running" | "waiting" | "completed" | "failed";

export interface TimelineItem {
  id: string;
  kind: TimelineItemKind;
  title: string;
  content: string;
  status: TimelineItemStatus;
  approval?: ApprovalRequest & { decision?: ApprovalDecision };
}

