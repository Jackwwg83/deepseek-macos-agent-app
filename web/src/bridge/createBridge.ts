import type { AgentBridge } from "./AgentBridge";
import { FakeAgentBridge } from "./FakeAgentBridge";
import { WebViewAgentBridge } from "./WebViewAgentBridge";

export function createAgentBridge(): AgentBridge {
  if (WebViewAgentBridge.isAvailable()) {
    return new WebViewAgentBridge();
  }
  return new FakeAgentBridge();
}

