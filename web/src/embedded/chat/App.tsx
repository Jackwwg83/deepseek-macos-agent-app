import { useEffect, useMemo, useState } from "react";
import { Composer } from "../../components/Composer";
import { SidecarStatus } from "../../components/SidecarStatus";
import { ThreadList } from "../../components/ThreadList";
import { Timeline } from "../../components/Timeline";
import { UsageFooter } from "../../components/UsageFooter";
import { createAgentBridge } from "../../bridge/createBridge";
import { applyRuntimeEvent, createInitialThreadState, eventSeqForReconnect, type ThreadViewState } from "../../runtime/reducer";
import type { ApprovalDecision, RuntimeHealth, RuntimeInfo, RuntimeThread, UsageAggregation } from "../../runtime/types";

const defaultProjectPath = "/Users/local/demo-project";

export function App() {
  const bridge = useMemo(() => createAgentBridge(), []);
  const [health, setHealth] = useState<RuntimeHealth>();
  const [info, setInfo] = useState<RuntimeInfo>();
  const [threads, setThreads] = useState<RuntimeThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string>();
  const [projectPath, setProjectPath] = useState(defaultProjectPath);
  const [threadState, setThreadState] = useState<ThreadViewState>(createInitialThreadState());
  const [usage, setUsage] = useState<UsageAggregation>();
  const [prompt, setPrompt] = useState("Explain this project and show the approval flow.");
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const [nextHealth, nextInfo, nextThreads, nextUsage] = await Promise.all([
          bridge.health(),
          bridge.runtimeInfo(),
          bridge.listThreads({ limit: 20 }),
          bridge.getUsage(),
        ]);
        if (cancelled) {
          return;
        }
        setHealth(nextHealth);
        setInfo(nextInfo);
        setThreads(nextThreads);
        setUsage(nextUsage);
        setSelectedThreadId(nextThreads[0]?.id);
      } catch (bootError) {
        if (!cancelled) {
          setError(bootError instanceof Error ? bootError.message : "Failed to boot runtime");
        }
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [bridge]);

  useEffect(() => {
    if (!selectedThreadId) {
      return;
    }

    const threadId = selectedThreadId;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function loadThread() {
      try {
        const detail = await bridge.getThread(threadId);
        if (cancelled) {
          return;
        }
        const nextState = createInitialThreadState(detail.thread, detail.items, detail.lastSeq);
        setThreadState(nextState);
        unsubscribe = bridge.subscribeEvents(threadId, eventSeqForReconnect(nextState), (event) => {
          setThreadState((current) => applyRuntimeEvent(current, event));
        });
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load thread");
        }
      }
    }

    void loadThread();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [bridge, selectedThreadId]);

  async function refreshUsage() {
    setUsage(await bridge.getUsage());
  }

  async function createThread() {
    const thread = await bridge.createThread({ title: "New project chat", projectPath });
    setThreads(await bridge.listThreads({ limit: 20 }));
    setSelectedThreadId(thread.id);
  }

  async function sendPrompt() {
    if (!selectedThreadId || prompt.trim().length === 0) {
      return;
    }
    const sent = prompt.trim();
    setPrompt("");
    await bridge.startTurn(selectedThreadId, { input: sent });
  }

  async function interruptTurn() {
    if (!selectedThreadId || !threadState.activeTurnId) {
      return;
    }
    await bridge.interruptTurn(selectedThreadId, threadState.activeTurnId);
  }

  async function decideApproval(approvalId: string, decision: ApprovalDecision) {
    await bridge.respondApproval(approvalId, decision);
    await refreshUsage();
  }

  return (
    <main className="app-shell">
      <ThreadList
        projectPath={projectPath}
        threads={threads}
        selectedThreadId={selectedThreadId}
        onProjectPathChange={setProjectPath}
        onSelectThread={setSelectedThreadId}
        onCreateThread={() => {
          void createThread();
        }}
      />
      <section className="chat-pane">
        <header className="chat-header">
          <div>
            <p className="eyebrow">Active chat</p>
            <h2>{threadState.thread?.title ?? "Loading thread"}</h2>
          </div>
          <span className="runtime-mode">{info?.mode ?? "booting"}</span>
        </header>
        {error ? <div className="error-banner">{error}</div> : null}
        <Timeline items={threadState.items} onApprovalDecision={(approvalId, decision) => void decideApproval(approvalId, decision)} />
        <Composer
          value={prompt}
          disabled={!selectedThreadId}
          activeTurnId={threadState.activeTurnId}
          onChange={setPrompt}
          onSubmit={() => {
            void sendPrompt();
          }}
          onInterrupt={() => {
            void interruptTurn();
          }}
        />
      </section>
      <section className="right-rail">
        <SidecarStatus health={health} info={info} error={error} />
        <UsageFooter usage={usage} />
      </section>
    </main>
  );
}
