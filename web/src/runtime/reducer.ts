import type {
  ApprovalDecidedPayload,
  ApprovalRequiredPayload,
  ItemCompletedPayload,
  ItemDeltaPayload,
  ItemFailedPayload,
  ItemStartedPayload,
  RuntimeEvent,
  RuntimeThread,
  ThreadStartedPayload,
  TimelineItem,
  TurnCompletedPayload,
  TurnInterruptPayload,
  TurnStartedPayload,
} from "./types";

export interface ThreadViewState {
  thread?: RuntimeThread;
  items: TimelineItem[];
  lastSeq: number;
  activeTurnId?: string;
  interruptedTurnId?: string;
}

export function createInitialThreadState(thread?: RuntimeThread, items: TimelineItem[] = [], lastSeq = 0): ThreadViewState {
  return {
    thread,
    items,
    lastSeq,
  };
}

export function eventSeqForReconnect(state: ThreadViewState): number {
  return state.lastSeq;
}

export function applyRuntimeEvent(state: ThreadViewState, runtimeEvent: RuntimeEvent): ThreadViewState {
  if (runtimeEvent.seq <= state.lastSeq) {
    return state;
  }

  const base = { ...state, lastSeq: runtimeEvent.seq };

  switch (runtimeEvent.event) {
    case "thread.started": {
      const payload = runtimeEvent.payload as ThreadStartedPayload;
      return { ...base, thread: payload.thread };
    }
    case "turn.started": {
      const payload = runtimeEvent.payload as TurnStartedPayload;
      return { ...base, activeTurnId: payload.turnId, interruptedTurnId: undefined };
    }
    case "turn.completed": {
      const payload = runtimeEvent.payload as TurnCompletedPayload;
      return base.activeTurnId === payload.turnId ? { ...base, activeTurnId: undefined } : base;
    }
    case "turn.interrupt_requested": {
      const payload = runtimeEvent.payload as TurnInterruptPayload;
      return { ...base, interruptedTurnId: payload.turnId };
    }
    case "item.started": {
      const payload = runtimeEvent.payload as ItemStartedPayload;
      return upsertItem(base, {
        id: payload.itemId,
        kind: payload.kind,
        title: payload.title,
        content: payload.content ?? "",
        status: payload.kind === "approval" ? "waiting" : "running",
      });
    }
    case "item.delta": {
      const payload = runtimeEvent.payload as ItemDeltaPayload;
      return updateItem(base, payload.itemId, (item) => ({
        ...item,
        content: `${item.content}${payload.delta}`,
        status: "running",
      }));
    }
    case "item.completed": {
      const payload = runtimeEvent.payload as ItemCompletedPayload;
      return updateItem(base, payload.itemId, (item) => ({
        ...item,
        content: payload.content ?? item.content,
        status: "completed",
      }));
    }
    case "item.failed": {
      const payload = runtimeEvent.payload as ItemFailedPayload;
      return updateItem(base, payload.itemId, (item) => ({
        ...item,
        content: payload.message,
        status: "failed",
      }));
    }
    case "approval.required": {
      const payload = runtimeEvent.payload as ApprovalRequiredPayload;
      return upsertItem(base, {
        id: payload.itemId,
        kind: "approval",
        title: payload.title,
        content: payload.expectedSideEffect,
        status: "waiting",
        approval: {
          approvalId: payload.approvalId,
          title: payload.title,
          toolName: payload.toolName,
          actionType: payload.actionType,
          cwd: payload.cwd,
          command: payload.command,
          path: payload.path,
          expectedSideEffect: payload.expectedSideEffect,
        },
      });
    }
    case "approval.decided": {
      const payload = runtimeEvent.payload as ApprovalDecidedPayload;
      return {
        ...base,
        items: base.items.map((item) => {
          if (item.approval?.approvalId !== payload.approvalId) {
            return item;
          }
          return {
            ...item,
            status: "completed",
            approval: { ...item.approval, decision: payload.decision },
          };
        }),
      };
    }
    default:
      return base;
  }
}

function upsertItem(state: ThreadViewState, nextItem: TimelineItem): ThreadViewState {
  const exists = state.items.some((item) => item.id === nextItem.id);
  if (!exists) {
    return { ...state, items: [...state.items, nextItem] };
  }
  return {
    ...state,
    items: state.items.map((item) => (item.id === nextItem.id ? { ...item, ...nextItem } : item)),
  };
}

function updateItem(state: ThreadViewState, id: string, update: (item: TimelineItem) => TimelineItem): ThreadViewState {
  return {
    ...state,
    items: state.items.map((item) => (item.id === id ? update(item) : item)),
  };
}

