import type { AgentBridge, RuntimeSettingsSnapshot, SaveRuntimeSettingsRequest } from "./AgentBridge";
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
  TimelineItem,
  UsageAggregation,
  UsageQuery,
} from "../runtime/types";

type Subscriber = (event: RuntimeEvent) => void;

interface FakeThreadRecord {
  thread: RuntimeThread;
  items: TimelineItem[];
  events: RuntimeEvent[];
}

export class FakeAgentBridge implements AgentBridge {
  private threads: FakeThreadRecord[];
  private seq = 0;
  private subscribers = new Map<string, Set<Subscriber>>();
  private completedTurns = 0;
  private settings: RuntimeSettingsSnapshot = {
    baseURL: "https://api.deepseek.com/beta",
    model: "deepseek-v4-flash",
    sidecarPath: "",
    hasAPIKey: false,
  };

  constructor(projectPath = "~/Projects") {
    const now = new Date().toISOString();
    this.threads = [
      {
        thread: {
          id: "thread-welcome",
          title: "Explore DeepSeek Agent",
          projectPath,
          updatedAt: now,
        },
        items: [
          {
            id: "welcome-user",
            kind: "user",
            title: "You",
            content:
              "Inspect this workspace and show how setup, review, approvals, and local verification will work for a tester.",
            status: "completed",
          },
          {
            id: "welcome",
            kind: "assistant",
            title: "DeepSeek Agent",
            content:
              "Demo Mode is connected. I can show the local setup flow, review workspace, terminal evidence, and approval handling without requiring an API key.",
            status: "completed",
          },
        ],
        events: [],
      },
    ];
  }

  async getRuntimeSettings(): Promise<RuntimeSettingsSnapshot> {
    return { ...this.settings };
  }

  async saveRuntimeSettings(req: SaveRuntimeSettingsRequest): Promise<RuntimeSettingsSnapshot> {
    this.settings = {
      baseURL: req.baseURL,
      model: req.model,
      sidecarPath: req.sidecarPath ?? this.settings.sidecarPath,
      hasAPIKey: this.settings.hasAPIKey || Boolean(req.apiKey?.trim()),
    };
    return { ...this.settings };
  }

  async clearAPIKey(): Promise<RuntimeSettingsSnapshot> {
    this.settings = { ...this.settings, hasAPIKey: false };
    return { ...this.settings };
  }

  async useDemoRuntime(): Promise<RuntimeSettingsSnapshot> {
    return this.getRuntimeSettings();
  }

  async health(): Promise<RuntimeHealth> {
    return { status: "ok", mode: "fake", message: "Demo runtime connected" };
  }

  async runtimeInfo(): Promise<RuntimeInfo> {
    return {
      appVersion: "0.1.0",
      runtimeVersion: "demo-runtime",
      authRequired: false,
      mode: "fake",
      capabilities: ["threads", "turns", "events", "approvals", "usage"],
    };
  }

  async listThreads(query: ListThreadsQuery = {}): Promise<RuntimeThread[]> {
    const limit = query.limit ?? this.threads.length;
    return this.threads
      .filter((record) => query.includeArchived || !record.thread.archived)
      .slice(0, limit)
      .map((record) => record.thread);
  }

  async createThread(req: CreateThreadRequest): Promise<RuntimeThread> {
    const thread: RuntimeThread = {
      id: `thread-${this.threads.length + 1}`,
      title: req.title?.trim() || "New chat",
      projectPath: req.projectPath,
      updatedAt: new Date().toISOString(),
    };
    this.threads.unshift({ thread, items: [], events: [] });
    this.emit(thread.id, "thread.started", { thread });
    return thread;
  }

  async getThread(id: string): Promise<ThreadDetail> {
    const record = this.requireThread(id);
    return {
      thread: record.thread,
      items: record.items,
      lastSeq: record.events.at(-1)?.seq ?? 0,
    };
  }

  async startTurn(threadId: string, req: StartTurnRequest): Promise<StartTurnResponse> {
    const turnId = `turn-${Date.now()}`;
    const userItemId = `${turnId}-user`;
    const assistantItemId = `${turnId}-assistant`;
    const toolItemId = `${turnId}-tool`;
    const approvalItemId = `${turnId}-approval`;
    const approvalId = `${turnId}-approval-id`;

    this.emit(threadId, "turn.started", { turnId }, turnId);
    this.emit(threadId, "item.started", { itemId: userItemId, kind: "user", title: "You", content: req.input }, turnId);
    this.emit(threadId, "item.completed", { itemId: userItemId }, turnId);

    const record = this.requireThread(threadId);
    const schedule = [
      () => this.emit(threadId, "item.started", { itemId: assistantItemId, kind: "assistant", title: "DeepSeek" }, turnId),
      () => this.emit(threadId, "item.delta", { itemId: assistantItemId, delta: "I inspected the local project context. " }, turnId),
      () => this.emit(threadId, "item.delta", { itemId: assistantItemId, delta: "The MVP path is native shell, typed bridge, and sidecar runtime. " }, turnId),
      () =>
        this.emit(
          threadId,
          "item.started",
          { itemId: toolItemId, kind: "tool", title: "Command preview", content: "bash scripts/dev/check.sh" },
          turnId,
        ),
      () => this.emit(threadId, "item.completed", { itemId: toolItemId }, turnId),
      () =>
        this.emit(
          threadId,
          "approval.required",
          {
            itemId: approvalItemId,
            approvalId,
            title: "Run local verification",
            toolName: "shell",
            actionType: "command",
            cwd: record.thread.projectPath,
            command: "bash scripts/dev/check.sh",
            expectedSideEffect: "Runs local build and unit checks without modifying project files.",
          },
          turnId,
        ),
    ];

    schedule.forEach((step, index) => setTimeout(step, 120 * (index + 1)));
    return { turnId, accepted: true };
  }

  async interruptTurn(threadId: string, turnId: string): Promise<RuntimeTurn> {
    this.emit(threadId, "turn.interrupt_requested", { turnId }, turnId);
    this.emit(threadId, "item.failed", { itemId: `${turnId}-approval`, message: "Task stopped before approval." }, turnId);
    this.emit(threadId, "item.delta", {
      itemId: `${turnId}-assistant`,
      delta: "Task stopped before running the command.",
    }, turnId);
    this.emit(threadId, "item.completed", { itemId: `${turnId}-assistant` }, turnId);
    this.emit(threadId, "turn.completed", { turnId }, turnId);
    return { id: turnId, threadId, status: "interrupted" };
  }

  async steerTurn(threadId: string, turnId: string, message: string): Promise<RuntimeTurn> {
    this.emit(threadId, "item.started", {
      itemId: `${turnId}-steer`,
      kind: "status",
      title: "Steer",
      content: message,
    }, turnId);
    this.emit(threadId, "item.completed", { itemId: `${turnId}-steer` }, turnId);
    return { id: turnId, threadId, status: "running" };
  }

  async respondApproval(approvalId: string, decision: ApprovalDecision): Promise<ApprovalResponse> {
    const record = this.threads.find((candidate) =>
      candidate.events.some((event) => event.event === "approval.required" && "approvalId" in event.payload && event.payload.approvalId === approvalId),
    );
    if (!record) {
      throw new Error(`Unknown approval ${approvalId}`);
    }

    const turnId = approvalId.replace("-approval-id", "");
    const assistantItemId = `${turnId}-assistant`;
    this.emit(record.thread.id, "approval.decided", { approvalId, decision }, turnId);
    this.emit(record.thread.id, "item.delta", {
      itemId: assistantItemId,
      delta: decision === "allow" ? "Approval granted. The demo check completed cleanly." : "Approval denied. I stopped before running the command.",
    }, turnId);
    this.emit(record.thread.id, "item.completed", { itemId: assistantItemId }, turnId);
    this.emit(record.thread.id, "turn.completed", { turnId }, turnId);
    this.completedTurns += 1;

    return { approvalId, decision, accepted: true };
  }

  async getUsage(_query: UsageQuery = {}): Promise<UsageAggregation> {
    return {
      currency: "USD",
      totalCost: 0.0024 + this.completedTurns * 0.0007,
      inputTokens: 1820 + this.completedTurns * 250,
      outputTokens: 940 + this.completedTurns * 190,
      completedTurns: this.completedTurns,
    };
  }

  subscribeEvents(threadId: string, sinceSeq: number | undefined, onEvent: Subscriber): () => void {
    const record = this.requireThread(threadId);
    const replayEvents = record.events.filter((event) => event.seq > (sinceSeq ?? 0));
    queueMicrotask(() => {
      replayEvents.forEach(onEvent);
    });

    const subscribers = this.subscribers.get(threadId) ?? new Set<Subscriber>();
    subscribers.add(onEvent);
    this.subscribers.set(threadId, subscribers);

    return () => {
      subscribers.delete(onEvent);
    };
  }

  private emit(threadId: string, event: RuntimeEvent["event"], payload: RuntimeEvent["payload"], turnId?: string): RuntimeEvent {
    const record = this.requireThread(threadId);
    const runtimeEvent: RuntimeEvent = {
      seq: ++this.seq,
      event,
      threadId,
      turnId,
      payload,
      createdAt: new Date().toISOString(),
    };

    record.events.push(runtimeEvent);
    record.items = materializeItems(record.items, runtimeEvent);
    record.thread.updatedAt = runtimeEvent.createdAt;
    this.subscribers.get(threadId)?.forEach((subscriber) => subscriber(runtimeEvent));
    return runtimeEvent;
  }

  private requireThread(id: string): FakeThreadRecord {
    const record = this.threads.find((thread) => thread.thread.id === id);
    if (!record) {
      throw new Error(`Unknown thread ${id}`);
    }
    return record;
  }
}

function materializeItems(items: TimelineItem[], event: RuntimeEvent): TimelineItem[] {
  switch (event.event) {
    case "item.started": {
      const payload = event.payload as Extract<RuntimeEvent["payload"], { kind: string }>;
      return [
        ...items,
        {
          id: payload.itemId,
          kind: payload.kind,
          title: payload.title,
          content: payload.content ?? "",
          status: payload.kind === "approval" ? "waiting" : "running",
        },
      ];
    }
    case "item.delta": {
      const payload = event.payload as Extract<RuntimeEvent["payload"], { delta: string }>;
      return items.map((item) => (item.id === payload.itemId ? { ...item, content: `${item.content}${payload.delta}` } : item));
    }
    case "item.completed": {
      const payload = event.payload as Extract<RuntimeEvent["payload"], { itemId: string }>;
      return items.map((item) => (item.id === payload.itemId ? { ...item, status: "completed" } : item));
    }
    case "item.failed": {
      const payload = event.payload as Extract<RuntimeEvent["payload"], { itemId: string; message: string }>;
      return items.map((item) => (item.id === payload.itemId ? { ...item, content: payload.message, status: "failed" } : item));
    }
    case "approval.required": {
      const payload = event.payload as Extract<RuntimeEvent["payload"], { expectedSideEffect: string }>;
      return [
        ...items,
        {
          id: payload.itemId,
          kind: "approval",
          title: payload.title,
          content: payload.expectedSideEffect,
          status: "waiting",
          approval: payload,
        },
      ];
    }
    case "approval.decided": {
      const payload = event.payload as Extract<RuntimeEvent["payload"], { decision: ApprovalDecision }>;
      return items.map((item) =>
        item.approval?.approvalId === payload.approvalId
          ? { ...item, status: "completed", approval: { ...item.approval, decision: payload.decision } }
          : item,
      );
    }
    default:
      return items;
  }
}
