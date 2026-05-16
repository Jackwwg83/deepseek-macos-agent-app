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
  UsageAggregation,
  UsageQuery,
} from "../runtime/types";

type NativeMethod =
  | "getRuntimeSettings"
  | "saveRuntimeSettings"
  | "clearAPIKey"
  | "useDemoRuntime"
  | "health"
  | "runtimeInfo"
  | "listThreads"
  | "createThread"
  | "getThread"
  | "startTurn"
  | "interruptTurn"
  | "steerTurn"
  | "respondApproval"
  | "getUsage"
  | "subscribeEvents"
  | "unsubscribeEvents";

interface NativeEnvelope<TPayload> {
  id: string;
  method: NativeMethod;
  payload: TPayload;
}

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
};

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
    deepseekAgent?: {
          postMessage(message: NativeEnvelope<unknown>): void | Promise<unknown>;
        };
      };
    };
    deepseekAgentBridgeResolve?: (id: string, result: unknown, error?: string) => void;
    deepseekAgentBridgeEvent?: (threadId: string, event: RuntimeEvent) => void;
  }
}

export class WebViewAgentBridge implements AgentBridge {
  private pending = new Map<string, PendingRequest>();
  private eventSubscribers = new Map<string, Set<(event: RuntimeEvent) => void>>();

  constructor() {
    window.deepseekAgentBridgeResolve = (id, result, error) => {
      const pending = this.pending.get(id);
      if (!pending) {
        return;
      }
      this.pending.delete(id);
      if (error) {
        pending.reject(new Error(error));
      } else {
        pending.resolve(result);
      }
    };

    window.deepseekAgentBridgeEvent = (threadId, event) => {
      this.eventSubscribers.get(threadId)?.forEach((subscriber) => subscriber(event));
    };
  }

  static isAvailable(): boolean {
    return Boolean(window.webkit?.messageHandlers?.deepseekAgent);
  }

  getRuntimeSettings(): Promise<RuntimeSettingsSnapshot> {
    return this.request("getRuntimeSettings", {});
  }

  saveRuntimeSettings(req: SaveRuntimeSettingsRequest): Promise<RuntimeSettingsSnapshot> {
    return this.request("saveRuntimeSettings", req);
  }

  clearAPIKey(): Promise<RuntimeSettingsSnapshot> {
    return this.request("clearAPIKey", {});
  }

  useDemoRuntime(): Promise<RuntimeSettingsSnapshot> {
    return this.request("useDemoRuntime", {});
  }

  health(): Promise<RuntimeHealth> {
    return this.request("health", {});
  }

  runtimeInfo(): Promise<RuntimeInfo> {
    return this.request("runtimeInfo", {});
  }

  listThreads(query: ListThreadsQuery = {}): Promise<RuntimeThread[]> {
    return this.request("listThreads", query);
  }

  createThread(req: CreateThreadRequest): Promise<RuntimeThread> {
    return this.request("createThread", req);
  }

  getThread(id: string): Promise<ThreadDetail> {
    return this.request("getThread", { id });
  }

  startTurn(threadId: string, req: StartTurnRequest): Promise<StartTurnResponse> {
    return this.request("startTurn", { threadId, request: req });
  }

  interruptTurn(threadId: string, turnId: string): Promise<RuntimeTurn> {
    return this.request("interruptTurn", { threadId, turnId });
  }

  steerTurn(threadId: string, turnId: string, message: string): Promise<RuntimeTurn> {
    return this.request("steerTurn", { threadId, turnId, message });
  }

  respondApproval(approvalId: string, decision: ApprovalDecision): Promise<ApprovalResponse> {
    return this.request("respondApproval", { approvalId, decision });
  }

  getUsage(query: UsageQuery = {}): Promise<UsageAggregation> {
    return this.request("getUsage", query);
  }

  subscribeEvents(threadId: string, sinceSeq: number | undefined, onEvent: (event: RuntimeEvent) => void): () => void {
    const subscribers = this.eventSubscribers.get(threadId) ?? new Set<(event: RuntimeEvent) => void>();
    subscribers.add(onEvent);
    this.eventSubscribers.set(threadId, subscribers);
    void this.request("subscribeEvents", { threadId, sinceSeq });

    return () => {
      subscribers.delete(onEvent);
      void this.request("unsubscribeEvents", { threadId });
    };
  }

  private request<TResult>(method: NativeMethod, payload: unknown): Promise<TResult> {
    const handler = window.webkit?.messageHandlers?.deepseekAgent;
    if (!handler) {
      return Promise.reject(new Error("Native DeepSeek bridge is not available"));
    }

    const id = globalThis.crypto.randomUUID();
    const envelope: NativeEnvelope<unknown> = { id, method, payload };

    return new Promise<TResult>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value: unknown) => resolve(value as TResult),
        reject,
      });
      try {
        const reply = handler.postMessage(envelope);
        if (reply && typeof (reply as Promise<unknown>).then === "function") {
          this.pending.delete(id);
          (reply as Promise<unknown>).then(
            (value) => resolve(value as TResult),
            (error: unknown) => reject(error instanceof Error ? error : new Error(String(error))),
          );
        }
      } catch (error) {
        this.pending.delete(id);
        reject(error instanceof Error ? error : new Error("Native DeepSeek bridge request failed"));
      }
    });
  }
}
