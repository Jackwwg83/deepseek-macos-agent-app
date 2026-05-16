// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { WebViewAgentBridge } from "../bridge/WebViewAgentBridge";

afterEach(() => {
  delete window.webkit;
  delete window.deepseekAgentBridgeResolve;
  delete window.deepseekAgentBridgeEvent;
});

describe("WebViewAgentBridge", () => {
  it("sends a standard WKWebView request only once before resolving by callback", async () => {
    const calls: unknown[] = [];
    window.webkit = {
      messageHandlers: {
        deepseekAgent: {
          postMessage(message: unknown) {
            calls.push(message);
          },
        },
      },
    };

    const bridge = new WebViewAgentBridge();
    const response = bridge.health();

    expect(calls).toHaveLength(1);
    const envelope = calls[0] as { id: string; method: string };
    expect(envelope.method).toBe("health");

    window.deepseekAgentBridgeResolve?.(envelope.id, { status: "ok", mode: "fake", message: "Demo runtime connected" });
    await expect(response).resolves.toEqual({ status: "ok", mode: "fake", message: "Demo runtime connected" });
  });

  it("supports promise-returning WKWebView request handlers without double posting", async () => {
    const postMessage = vi.fn().mockResolvedValue({ status: "ok", mode: "fake", message: "Demo runtime connected" });
    window.webkit = {
      messageHandlers: {
        deepseekAgent: { postMessage },
      },
    };

    const bridge = new WebViewAgentBridge();
    await expect(bridge.health()).resolves.toEqual({ status: "ok", mode: "fake", message: "Demo runtime connected" });

    expect(postMessage).toHaveBeenCalledTimes(1);
  });
});
