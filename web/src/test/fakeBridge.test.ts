import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeAgentBridge } from "../bridge/FakeAgentBridge";
import type { RuntimeEvent } from "../runtime/types";

describe("FakeAgentBridge", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("lists a demo thread and returns runtime info", async () => {
    const bridge = new FakeAgentBridge();

    await expect(bridge.health()).resolves.toMatchObject({ status: "ok", mode: "fake" });
    await expect(bridge.runtimeInfo()).resolves.toMatchObject({ mode: "fake", authRequired: false });
    await expect(bridge.listThreads()).resolves.toHaveLength(1);
  });

  it("streams turn events with increasing seq and resolves approval", async () => {
    const bridge = new FakeAgentBridge();
    const [thread] = await bridge.listThreads();
    const events: RuntimeEvent[] = [];

    const unsubscribe = bridge.subscribeEvents(thread.id, 0, (runtimeEvent) => events.push(runtimeEvent));
    const response = await bridge.startTurn(thread.id, { input: "Explain this project" });
    await vi.runAllTimersAsync();

    expect(response.accepted).toBe(true);
    expect(events.map((runtimeEvent) => runtimeEvent.event)).toContain("approval.required");
    expect(events.every((runtimeEvent, index) => index === 0 || runtimeEvent.seq > events[index - 1].seq)).toBe(true);

    const approval = events.find((runtimeEvent) => runtimeEvent.event === "approval.required");
    if (!approval || !("approvalId" in approval.payload)) {
      throw new Error("approval.required was not emitted");
    }

    await expect(bridge.respondApproval(approval.payload.approvalId, "allow")).resolves.toMatchObject({ accepted: true });
    expect(events.map((runtimeEvent) => runtimeEvent.event)).toContain("turn.completed");
    await expect(bridge.getUsage()).resolves.toMatchObject({ completedTurns: 1 });

    unsubscribe();
  });

  it("replays events after since_seq", async () => {
    const bridge = new FakeAgentBridge();
    const [thread] = await bridge.listThreads();
    await bridge.startTurn(thread.id, { input: "Replay" });
    await vi.runAllTimersAsync();

    const replayed: RuntimeEvent[] = [];
    bridge.subscribeEvents(thread.id, 3, (runtimeEvent) => replayed.push(runtimeEvent));
    await vi.runAllTicks();

    expect(replayed.length).toBeGreaterThan(0);
    expect(replayed.every((runtimeEvent) => runtimeEvent.seq > 3)).toBe(true);
  });
});

