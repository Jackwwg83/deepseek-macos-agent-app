import type {
  ApprovalDecision,
  ApprovalResponse,
  CreateThreadRequest,
  ListThreadsQuery,
  RuntimeEvent,
  RuntimeHealth,
  RuntimeInfo,
  RuntimeThread,
  RuntimeTurn,
  StartTurnRequest,
  StartTurnResponse,
  ThreadDetail,
  UsageAggregation,
  UsageQuery,
} from "../runtime/types";

export interface AgentBridge {
  health(): Promise<RuntimeHealth>;
  runtimeInfo(): Promise<RuntimeInfo>;
  listThreads(query?: ListThreadsQuery): Promise<RuntimeThread[]>;
  createThread(req: CreateThreadRequest): Promise<RuntimeThread>;
  getThread(id: string): Promise<ThreadDetail>;
  startTurn(threadId: string, req: StartTurnRequest): Promise<StartTurnResponse>;
  interruptTurn(threadId: string, turnId: string): Promise<RuntimeTurn>;
  steerTurn(threadId: string, turnId: string, message: string): Promise<RuntimeTurn>;
  respondApproval(approvalId: string, decision: ApprovalDecision): Promise<ApprovalResponse>;
  getUsage(query?: UsageQuery): Promise<UsageAggregation>;
  subscribeEvents(threadId: string, sinceSeq: number | undefined, onEvent: (event: RuntimeEvent) => void): () => void;
}

