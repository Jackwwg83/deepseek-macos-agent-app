import { describe, expect, it } from "vitest";
import { applyRuntimeEvent, createInitialThreadState, eventSeqForReconnect } from "../runtime/reducer";
import type { RuntimeEvent } from "../runtime/types";

describe("runtime event reducer", () => {
  it("streams item deltas and completes a card", () => {
    const threadId = "thread-test";
    const started = event(1, threadId, "item.started", {
      itemId: "assistant-1",
      kind: "assistant",
      title: "DeepSeek",
    });
    const delta = event(2, threadId, "item.delta", {
      itemId: "assistant-1",
      delta: "hello",
    });
    const completed = event(3, threadId, "item.completed", {
      itemId: "assistant-1",
    });

    const state = [started, delta, completed].reduce(applyRuntimeEvent, createInitialThreadState());

    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toMatchObject({
      id: "assistant-1",
      content: "hello",
      status: "completed",
    });
    expect(state.lastSeq).toBe(3);
  });

  it("ignores duplicate sequence numbers", () => {
    const first = event(4, "thread-test", "item.started", {
      itemId: "tool-1",
      kind: "tool",
      title: "Command preview",
      content: "pwd",
    });
    const duplicate = event(4, "thread-test", "item.delta", {
      itemId: "tool-1",
      delta: "ignored",
    });

    const state = [first, duplicate].reduce(applyRuntimeEvent, createInitialThreadState());

    expect(state.items[0].content).toBe("pwd");
    expect(eventSeqForReconnect(state)).toBe(4);
  });

  it("marks approval decisions without removing the approval card", () => {
    const required = event(5, "thread-test", "approval.required", {
      itemId: "approval-card",
      approvalId: "approval-1",
      title: "Run command",
      toolName: "shell",
      actionType: "command",
      cwd: "/tmp/project",
      command: "npm test",
      expectedSideEffect: "Runs tests",
    });
    const decided = event(6, "thread-test", "approval.decided", {
      approvalId: "approval-1",
      decision: "allow",
    });

    const state = [required, decided].reduce(applyRuntimeEvent, createInitialThreadState());

    expect(state.items[0].approval?.decision).toBe("allow");
    expect(state.items[0].status).toBe("completed");
  });
});

function event(seq: number, threadId: string, runtimeEvent: RuntimeEvent["event"], payload: RuntimeEvent["payload"]): RuntimeEvent {
  return {
    seq,
    event: runtimeEvent,
    threadId,
    payload,
    createdAt: "2026-05-15T00:00:00.000Z",
  };
}

