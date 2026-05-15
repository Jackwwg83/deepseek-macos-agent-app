import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bot,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Code2,
  FileCode2,
  Folder,
  Gauge,
  KeyRound,
  Layers3,
  Link2,
  LockKeyhole,
  MoreHorizontal,
  PanelLeft,
  Plus,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Square,
  TestTube2,
  X,
  Zap,
} from "lucide-react";
import { createAgentBridge } from "../../bridge/createBridge";
import { applyRuntimeEvent, createInitialThreadState, eventSeqForReconnect, type ThreadViewState } from "../../runtime/reducer";
import { formatUsage } from "../../runtime/usage";
import type { ApprovalDecision, RuntimeHealth, RuntimeInfo, RuntimeThread, TimelineItem, UsageAggregation } from "../../runtime/types";

type AppView = "setup" | "project" | "thread" | "review" | "settings";
type NativeCommand = "newThread" | "commandPalette" | "settings" | "review" | "stopTurn" | "demoRuntime";

const previewViews = new Set<AppView>(["setup", "project", "thread", "review", "settings"]);

function initialPreviewView(): AppView {
  const value = new URLSearchParams(window.location.search).get("view") as AppView | null;
  return value && previewViews.has(value) ? value : "setup";
}

const demoProjects = [
  { name: "Demo workspace", folders: ["src", "tests", "docs", "scripts"] },
];

const changedFiles = [
  { path: "src/agent/RuntimeBridge.ts", additions: 38, deletions: 4, status: "selected" },
  { path: "src/ui/SetupFlow.tsx", additions: 64, deletions: 6, status: "selected" },
  { path: "src/ui/ReviewPanel.tsx", additions: 41, deletions: 3, status: "review" },
  { path: "tests/runtime-bridge.test.ts", additions: 27, deletions: 0, status: "reviewed" },
  { path: "docs/test-plan.md", additions: 22, deletions: 0, status: "reviewed" },
];

const recentRuns = [
  ["Run #04", "Inspect workspace and summarize launch risks", "21.6s", "Completed"],
  ["Run #03", "Prepare focused verification checklist", "18.9s", "Completed"],
  ["Run #02", "Review runtime setup flow", "24.1s", "Completed"],
  ["Run #01", "Create first local agent thread", "12.4s", "Completed"],
];

const suggestedPrompts = [
  ["Inspect this workspace", "Summarize structure, risks, and next useful commands"],
  ["Plan a focused cleanup", "Create a small implementation plan with verification steps"],
  ["Review pending changes", "Explain changed files and likely test coverage gaps"],
  ["Prepare a tester handoff", "Draft concise install and smoke-test instructions"],
];

const setupDefaults = {
  url: "https://api.deepseek.com/beta",
  model: "deepseek-v4-flash",
  workspace: "~/DeepSeekAgent",
};

function workspaceNameFromPath(path: string): string {
  const trimmed = path.trim().replace(/\/+$/, "");
  if (!trimmed) {
    return "Workspace";
  }
  const parts = trimmed.split(/[\\/]/).filter(Boolean);
  const lastPart = parts[parts.length - 1] ?? trimmed;
  return lastPart === "~" ? "Home" : lastPart;
}

function isDemoRuntime(info?: RuntimeInfo): boolean {
  return info?.mode !== "real";
}

export function App() {
  const bridge = useMemo(() => createAgentBridge(), []);
  const initialView = useMemo(() => initialPreviewView(), []);
  const [health, setHealth] = useState<RuntimeHealth>();
  const [info, setInfo] = useState<RuntimeInfo>();
  const [threads, setThreads] = useState<RuntimeThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string>();
  const [projectPath, setProjectPath] = useState(setupDefaults.workspace);
  const [threadState, setThreadState] = useState<ThreadViewState>(createInitialThreadState());
  const [usage, setUsage] = useState<UsageAggregation>();
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string>();
  const [view, setView] = useState<AppView>(initialView);
  const [setupComplete, setSetupComplete] = useState(initialView !== "setup");
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [baseURL, setBaseURL] = useState(setupDefaults.url);
  const [model, setModel] = useState(setupDefaults.model);
  const [workspace, setWorkspace] = useState(setupDefaults.workspace);
  const [demoMode, setDemoMode] = useState(true);
  const [reviewMode, setReviewMode] = useState<"split" | "unified">("split");
  const [reviewedFiles, setReviewedFiles] = useState(new Set(["tests/runtime-bridge.test.ts", "docs/test-plan.md"]));
  const [actionNote, setActionNote] = useState<string>();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const [runtimeSettings, nextHealth, nextInfo, nextThreads, nextUsage] = await Promise.all([
          bridge.getRuntimeSettings(),
          bridge.health(),
          bridge.runtimeInfo(),
          bridge.listThreads({ limit: 20 }),
          bridge.getUsage(),
        ]);
        if (cancelled) {
          return;
        }
        if (runtimeSettings.baseURL) {
          setBaseURL(runtimeSettings.baseURL);
        }
        if (runtimeSettings.model) {
          setModel(runtimeSettings.model);
        }
        setHealth(nextHealth);
        setInfo(nextInfo);
        setThreads(nextThreads);
        setUsage(nextUsage);
        setSelectedThreadId(nextThreads[0]?.id);
        if (nextInfo.mode === "real") {
          setSetupComplete(true);
          setView("project");
        }
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
    const thread = await bridge.createThread({ title: "New chat", projectPath });
    setThreads(await bridge.listThreads({ limit: 20 }));
    setSelectedThreadId(thread.id);
    setSetupComplete(true);
    setView("thread");
  }

  async function completeSetup() {
    try {
      if (demoMode) {
        await bridge.useDemoRuntime();
      } else {
        await bridge.saveRuntimeSettings({
          baseURL,
          model,
          apiKey: apiKeyDraft.trim() || undefined,
        });
      }
      setApiKeyDraft("");
      setSetupComplete(true);
      setProjectPath(workspace);
      setView("project");
      setActionNote(demoMode ? "Demo Mode is ready without an API key." : "Settings saved to native storage. DeepSeek runtime is starting.");
    } catch (setupError) {
      setError(setupError instanceof Error ? setupError.message : "Failed to save runtime settings");
    }
  }

  function selectThread(id: string) {
    setSelectedThreadId(id);
    setSetupComplete(true);
    setView("thread");
  }

  async function sendPrompt() {
    if (prompt.trim().length === 0) {
      return;
    }
    let threadId = selectedThreadId;
    if (!threadId) {
      const thread = await bridge.createThread({ title: prompt.trim().slice(0, 64), projectPath });
      threadId = thread.id;
      setSelectedThreadId(thread.id);
      setThreads(await bridge.listThreads({ limit: 20 }));
    }
    const sent = prompt.trim();
    setPrompt("");
    setView("thread");
    await bridge.startTurn(threadId, { input: sent });
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

  function markReviewed(path: string) {
    setReviewedFiles((current) => {
      const next = new Set(current);
      next.add(path);
      return next;
    });
  }

  function runAppCommand(command: NativeCommand) {
    switch (command) {
      case "newThread":
        if (setupComplete) {
          void createThread();
        } else {
          setActionNote("Complete setup before creating a thread.");
        }
        break;
      case "commandPalette":
        setCommandPaletteOpen(true);
        break;
      case "settings":
        setSetupComplete(true);
        setView("settings");
        break;
      case "review":
        setSetupComplete(true);
        setView("review");
        break;
      case "stopTurn":
        void interruptTurn();
        setActionNote("Stop requested for the current turn.");
        break;
      case "demoRuntime":
        void bridge.useDemoRuntime()
          .then(() => {
            setSetupComplete(true);
            setView("project");
            setActionNote("Demo Mode is ready without an API key.");
          })
          .catch((demoError: unknown) => {
            setError(demoError instanceof Error ? demoError.message : "Failed to switch to Demo Mode");
          });
        break;
    }
  }

  useEffect(() => {
    function handleNativeCommand(event: Event) {
      const command = (event as CustomEvent<{ command?: NativeCommand }>).detail?.command;
      if (command) {
        runAppCommand(command);
      }
    }

    window.addEventListener("deepseek:native-command", handleNativeCommand);
    return () => window.removeEventListener("deepseek:native-command", handleNativeCommand);
  });

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      if (!event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return;
      }
      const key = event.key.toLowerCase();
      const shortcutMap: Record<string, NativeCommand> = {
        ",": "settings",
        ".": "stopTurn",
        k: "commandPalette",
        n: "newThread",
        r: "review",
      };
      const command = shortcutMap[key];
      if (!command) {
        return;
      }
      event.preventDefault();
      runAppCommand(command);
    }

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  });

  const demoRuntime = isDemoRuntime(info);
  const runtimeModeLabel = info?.mode === "fake" ? "demo" : (info?.mode ?? "booting");
  const workspaceName = demoRuntime ? "Demo workspace" : workspaceNameFromPath(projectPath);
  const projectTree = demoRuntime ? demoProjects : [{ name: workspaceName, folders: [] }];
  const activeThreadTitle = threadState.thread?.title ?? (demoRuntime ? "Explore DeepSeek Agent" : "New thread");

  return (
    <div className="deepseek-wallpaper">
      <main className={view === "setup" && !setupComplete ? "deepseek-window setup-window" : "deepseek-window app-shell"} data-view={view}>
        {view === "setup" && !setupComplete ? (
          <SetupScreen
            apiKeyDraft={apiKeyDraft}
            baseURL={baseURL}
            demoMode={demoMode}
            error={error}
            health={health}
            model={model}
            workspace={workspace}
            onAPIKeyChange={setApiKeyDraft}
            onBaseURLChange={setBaseURL}
            onDemoModeChange={setDemoMode}
            onModelChange={setModel}
            onWorkspaceChange={setWorkspace}
            onComplete={() => void completeSetup()}
          />
        ) : (
          <>
            <LeftNavigation
              threads={threads}
              activeProjectName={workspaceName}
              selectedThreadId={selectedThreadId}
              currentView={view}
              projects={projectTree}
              onCreateThread={() => void createThread()}
              onSelectThread={selectThread}
              onShowProject={() => setView("project")}
              onShowSettings={() => setView("settings")}
              onShowReview={() => setView("review")}
            />
            <section className="main-surface">
              {error ? <div className="error-banner">{error}</div> : null}
              {actionNote ? (
                <div className="notice-banner">
                  <CheckCircle2 size={16} aria-hidden="true" />
                  {actionNote}
                  <button type="button" onClick={() => setActionNote(undefined)} aria-label="Dismiss notice">
                    <X size={14} aria-hidden="true" />
                  </button>
                </div>
              ) : null}
              {view === "project" ? (
                <ProjectCommandCenter isDemo={demoRuntime} model={model} projectName={workspaceName} onCreateThread={() => void createThread()} onShowReview={() => setView("review")} />
              ) : null}
              {view === "thread" ? (
                <ActiveThread
                  activeTurnId={threadState.activeTurnId}
                  isDemo={demoRuntime}
                  model={model}
                  prompt={prompt}
                  runtimeModeLabel={runtimeModeLabel}
                  threadTitle={activeThreadTitle}
                  timelineItems={threadState.items}
                  onApprovalDecision={(approvalId, decision) => void decideApproval(approvalId, decision)}
                  onInterrupt={() => void interruptTurn()}
                  onPromptChange={setPrompt}
                  onSend={() => void sendPrompt()}
                  onShowReview={() => setView("review")}
                />
              ) : null}
              {view === "review" ? (
                <ReviewChanges
                  isDemo={demoRuntime}
                  mode={reviewMode}
                  reviewedFiles={reviewedFiles}
                  threadTitle={activeThreadTitle}
                  onModeChange={setReviewMode}
                  onMarkReviewed={markReviewed}
                  onAction={setActionNote}
                />
              ) : null}
              {view === "settings" ? (
                <SettingsUsage
                  apiKeyDraft={apiKeyDraft}
                  baseURL={baseURL}
                  health={health}
                  info={info}
                  model={model}
                  usage={usage}
                  onAPIKeyChange={setApiKeyDraft}
                  onModelChange={setModel}
                  onAction={setActionNote}
                />
              ) : null}
            </section>
            <RightInspector
              view={view}
              isDemo={demoRuntime}
              health={health}
              info={info}
              usage={usage}
              model={model}
              reviewedFiles={reviewedFiles}
              onShowReview={() => setView("review")}
              onCreateThread={() => void createThread()}
              onAction={setActionNote}
            />
          </>
        )}
      </main>
      {commandPaletteOpen ? (
        <CommandPalette
          onClose={() => setCommandPaletteOpen(false)}
          onRun={(command) => {
            setCommandPaletteOpen(false);
            runAppCommand(command);
          }}
        />
      ) : null}
    </div>
  );
}

function CommandPalette({ onClose, onRun }: { onClose(): void; onRun(command: NativeCommand): void }) {
  const commands: Array<{ command: NativeCommand; key: string; title: string; description: string }> = [
    { command: "newThread", key: "⌘N", title: "New thread", description: "Start a fresh DeepSeek Agent task." },
    { command: "review", key: "⌘R", title: "Review changes", description: "Open the diff and approval workspace." },
    { command: "settings", key: "⌘,", title: "Settings & Usage", description: "Adjust model defaults and account state." },
    { command: "stopTurn", key: "⌘.", title: "Stop current turn", description: "Interrupt the active agent run." },
    { command: "demoRuntime", key: "", title: "Use Demo Runtime", description: "Explore without a DeepSeek API key." },
  ];

  return (
    <div className="command-palette-backdrop" role="presentation" onClick={onClose}>
      <section className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette" onClick={(event) => event.stopPropagation()}>
        <div className="command-palette-header">
          <Sparkles size={18} aria-hidden="true" />
          <div>
            <p>Command Palette</p>
            <span>Run common DeepSeek Agent actions</span>
          </div>
          <button type="button" aria-label="Close command palette" onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="command-palette-list">
          {commands.map((item) => (
            <button key={item.command} type="button" onClick={() => onRun(item.command)}>
              <span>
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </span>
              {item.key ? <kbd>{item.key}</kbd> : null}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

interface SetupScreenProps {
  apiKeyDraft: string;
  baseURL: string;
  demoMode: boolean;
  error?: string;
  health?: RuntimeHealth;
  model: string;
  workspace: string;
  onAPIKeyChange(value: string): void;
  onBaseURLChange(value: string): void;
  onDemoModeChange(value: boolean): void;
  onModelChange(value: string): void;
  onWorkspaceChange(value: string): void;
  onComplete(): void;
}

function SetupScreen({
  apiKeyDraft,
  baseURL,
  demoMode,
  error,
  health,
  model,
  workspace,
  onAPIKeyChange,
  onBaseURLChange,
  onDemoModeChange,
  onModelChange,
  onWorkspaceChange,
  onComplete,
}: SetupScreenProps) {
  return (
    <div className="setup-layout">
      <div className="setup-rail">
        <TrafficLights />
        <div className="setup-logo">
          <Bot size={40} aria-hidden="true" />
        </div>
        <h1>Welcome to DeepSeek Agent</h1>
        <p>Your local AI engineering companion. DeepSeek Agent runs securely on your Mac and connects to DeepSeek to help you build, test, and ship faster.</p>
        <FeatureBlurb icon={<ShieldCheck size={18} />} title="Built for developers" text="Plan, code, test, and refactor with DeepSeek by your side." />
        <FeatureBlurb icon={<LockKeyhole size={18} />} title="Private by default" text="Your code stays on your Mac. Only requests you approve are sent to DeepSeek." />
        <FeatureBlurb icon={<Zap size={18} />} title="Fast, reliable, smart" text="Powered by DeepSeek models for high-quality local workflows." />
        <div className="setup-footnote">
          <LockKeyhole size={16} aria-hidden="true" />
          Secure <span /> Local-first <span /> macOS-native
        </div>
      </div>
      <section className="setup-card">
        <div className="setup-topbar">
          <BrandTitle />
          <button className="text-button" type="button">
            Need help?
          </button>
        </div>
        <div className="setup-heading">
          <h2>First Run Setup</h2>
          <p>Let's get DeepSeek Agent ready on your Mac.</p>
        </div>
        {error ? <div className="error-banner">{error}</div> : null}
        <SetupRow index="1" icon={<Link2 size={21} />} title="Connect to DeepSeek" description="Use a DeepSeek-compatible endpoint. HTTPS is recommended; private HTTP endpoints are allowed by the native runtime.">
          <input className="field-input" value={baseURL} onChange={(event) => onBaseURLChange(event.target.value)} />
        </SetupRow>
        <SetupRow index="2" icon={<KeyRound size={21} />} title="Enter your DeepSeek API key" description="The key is never written to WebView localStorage. Native builds store it in macOS Keychain.">
          <input
            className="field-input"
            type="password"
            value={apiKeyDraft}
            placeholder={demoMode ? "Not required for Demo Mode" : "Paste API key"}
            onChange={(event) => onAPIKeyChange(event.target.value)}
          />
        </SetupRow>
        <SetupRow index="3" icon={<Layers3 size={21} />} title="Choose a model" description="DeepSeek-only model defaults for new agent threads.">
          <select className="field-input" value={model} onChange={(event) => onModelChange(event.target.value)}>
            <option value="deepseek-v4-flash">deepseek-v4-flash</option>
            <option value="deepseek-v4-pro">deepseek-v4-pro</option>
          </select>
        </SetupRow>
        <SetupRow index="4" icon={<Folder size={21} />} title="Choose workspace folder" description="This is where your projects and agent data will live.">
          <input className="field-input" value={workspace} onChange={(event) => onWorkspaceChange(event.target.value)} />
        </SetupRow>
        <SetupRow index="5" icon={<Sparkles size={21} />} title="Enable Demo Mode" description="Explore the app with a local demo runtime and no API key.">
          <button className={demoMode ? "toggle on" : "toggle"} type="button" onClick={() => onDemoModeChange(!demoMode)} aria-pressed={demoMode}>
            <span />
          </button>
        </SetupRow>
        <div className="setup-status-card">
          <StatusMini label="Sidecar ready" value={health?.status === "ok" ? "Runtime bridge is responding." : "Waiting for runtime health."} />
          <StatusMini label="Key storage" value={apiKeyDraft || demoMode ? "Ready for secure native storage." : "API key needed for real mode."} />
          <StatusMini label="Runtime compatible" value="DeepSeek-TUI Runtime API mapped." />
        </div>
        <div className="setup-actions">
          <button className="primary-button" type="button" onClick={onComplete}>
            Complete Setup
            <Send size={16} aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}

function LeftNavigation({
  activeProjectName,
  currentView,
  onCreateThread,
  onSelectThread,
  onShowProject,
  onShowReview,
  onShowSettings,
  projects,
  selectedThreadId,
  threads,
}: {
  activeProjectName: string;
  currentView: AppView;
  onCreateThread(): void;
  onSelectThread(id: string): void;
  onShowProject(): void;
  onShowReview(): void;
  onShowSettings(): void;
  projects: Array<{ name: string; folders: string[] }>;
  selectedThreadId?: string;
  threads: RuntimeThread[];
}) {
  return (
    <aside className="left-nav">
      <div className="window-chrome">
        <TrafficLights />
        <BrandTitle />
      </div>
      <button className="new-thread-button" type="button" onClick={onCreateThread}>
        <Plus size={18} aria-hidden="true" />
        New thread
        <kbd>⌘ N</kbd>
      </button>
      <nav className="primary-nav" aria-label="Primary navigation">
        <NavButton icon={<Sparkles size={17} />} label="Automations" />
        <NavButton icon={<Layers3 size={17} />} label="Skills" />
        <NavButton active={currentView === "review"} icon={<FileCode2 size={17} />} label="Review changes" onClick={onShowReview} />
      </nav>
      <div className="sidebar-section">
        <p className="sidebar-label">Recent threads</p>
        <div className="thread-list">
          {threads.length > 0 ? (
            threads.map((thread, index) => (
              <button key={thread.id} className={thread.id === selectedThreadId && currentView === "thread" ? "thread-button active" : "thread-button"} type="button" onClick={() => onSelectThread(thread.id)}>
                <span>{thread.title}</span>
                <time>{index === 0 ? "now" : `${index}d`}</time>
              </button>
            ))
          ) : (
            <p className="empty-state compact">No recent threads yet.</p>
          )}
        </div>
      </div>
      <div className="sidebar-section projects-section">
        <div className="section-heading">
          <p className="sidebar-label">Projects</p>
          <button type="button" aria-label="Add project">
            <Plus size={15} aria-hidden="true" />
          </button>
        </div>
        <div className="project-tree">
          {projects.map((project) => (
            <div key={project.name}>
              <button className={project.name === activeProjectName ? "project-button active" : "project-button"} type="button" onClick={onShowProject}>
                <Folder size={16} aria-hidden="true" />
                {project.name}
              </button>
              {project.folders.map((folder) => (
                <button key={folder} className="folder-button" type="button">
                  <Folder size={14} aria-hidden="true" />
                  {folder}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="account-row">
        <button className="account-button" type="button" onClick={onShowSettings}>
          <span className="avatar">DS</span>
          DeepSeek
          <ChevronDown size={14} aria-hidden="true" />
        </button>
        <button className="settings-button" type="button" onClick={onShowSettings} aria-label="Settings">
          <Settings size={17} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}

function ProjectCommandCenter({
  isDemo,
  model,
  onCreateThread,
  onShowReview,
  projectName,
}: {
  isDemo: boolean;
  model: string;
  onCreateThread(): void;
  onShowReview(): void;
  projectName: string;
}) {
  return (
    <div className="page project-page">
      <PageHeader eyebrow="Project" title="Project Command Center" subtitle={projectName}>
        <button className="secondary-button" type="button">
          <Code2 size={16} aria-hidden="true" />
          Open in IDE
        </button>
        <button className="icon-only" type="button" aria-label="More project actions">
          <MoreHorizontal size={18} aria-hidden="true" />
        </button>
      </PageHeader>
      <Card className="overview-card">
        <div>
          <h3>Overview</h3>
          <p>{isDemo ? "Demo Mode uses local sample activity so testers can explore without an API key." : "Start a thread to inspect, edit, test, and review this workspace."}</p>
        </div>
        <div className="stats-row">
          <Metric icon={<Clock3 size={17} />} label="Active tasks" value={isDemo ? "2" : "0"} />
          <Metric icon={<Bot size={17} />} label="Agent runs" value={isDemo ? "4" : "0"} />
          <Metric icon={<TestTube2 size={17} />} label="Checks" value={isDemo ? "Ready" : "Not run"} />
          <Metric icon={<Gauge size={17} />} label="Review queue" value={isDemo ? "5 files" : "Empty"} />
          <Metric icon={<Activity size={17} />} label="Last sync" value={isDemo ? "now" : "waiting"} />
        </div>
      </Card>
      <div className="dashboard-grid">
        <Card title="Active tasks">
          <TaskList isDemo={isDemo} />
          {isDemo ? <CardLink label="View all tasks" /> : null}
        </Card>
        <Card title="Suggested prompts">
          <PromptList onCreateThread={onCreateThread} />
          <CardLink label="See more prompts" />
        </Card>
        <Card title="Recent agent runs">
          {isDemo ? (
            <>
              <table className="runs-table">
                <tbody>
                  {recentRuns.map(([run, summary, duration, status]) => (
                    <tr key={run}>
                      <td>{run}</td>
                      <td>{summary}</td>
                      <td>{duration}</td>
                      <td className="positive">{status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <CardLink label="View all runs" />
            </>
          ) : (
            <p className="empty-state">No agent runs yet.</p>
          )}
        </Card>
        <Card title="Repository activity">
          <ActivityList isDemo={isDemo} />
          {isDemo ? <CardLink label="View full activity" onClick={onShowReview} /> : null}
        </Card>
      </div>
      <div className="model-chip">
        <span className="status-dot ok" />
        Default model
        <strong>{model}</strong>
      </div>
    </div>
  );
}

function ActiveThread({
  activeTurnId,
  isDemo,
  model,
  onApprovalDecision,
  onInterrupt,
  onPromptChange,
  onSend,
  onShowReview,
  prompt,
  runtimeModeLabel,
  threadTitle,
  timelineItems,
}: {
  activeTurnId?: string;
  isDemo: boolean;
  model: string;
  onApprovalDecision(approvalId: string, decision: ApprovalDecision): void;
  onInterrupt(): void;
  onPromptChange(value: string): void;
  onSend(): void;
  onShowReview(): void;
  prompt: string;
  runtimeModeLabel: string;
  threadTitle: string;
  timelineItems: TimelineItem[];
}) {
  const items = timelineItems.length > 0 ? timelineItems : (isDemo ? fallbackTimeline : []);
  return (
    <div className="page thread-page">
      <PageHeader eyebrow="Active thread" title={threadTitle}>
        <span className="runtime-badge">{runtimeModeLabel}</span>
        <button className="icon-only" type="button" aria-label="More thread actions">
          <MoreHorizontal size={18} aria-hidden="true" />
        </button>
      </PageHeader>
      <div className="timeline-v2">
        {items.length > 0 ? (
          items.map((item) => (
            <TimelineCard key={item.id} item={item} onApprovalDecision={onApprovalDecision} />
          ))
        ) : (
          <Card className="timeline-card-v2">
            <p className="empty-state">No messages yet. Ask DeepSeek to inspect, explain, or plan against this workspace.</p>
          </Card>
        )}
        {isDemo ? <FilesChangedCard onOpenReview={onShowReview} /> : null}
        {isDemo ? <TerminalEvidenceCard /> : null}
      </div>
      <ComposerV2 activeTurnId={activeTurnId} model={model} prompt={prompt} onChange={onPromptChange} onInterrupt={onInterrupt} onSend={onSend} />
    </div>
  );
}

function ReviewChanges({
  isDemo,
  mode,
  onAction,
  onMarkReviewed,
  onModeChange,
  reviewedFiles,
  threadTitle,
}: {
  isDemo: boolean;
  mode: "split" | "unified";
  onAction(message: string): void;
  onMarkReviewed(path: string): void;
  onModeChange(mode: "split" | "unified"): void;
  reviewedFiles: Set<string>;
  threadTitle: string;
}) {
  return (
    <div className="page review-page">
      <PageHeader eyebrow="Active thread" title={threadTitle}>
        <span className="runtime-badge review">review</span>
        <button className="icon-only" type="button" aria-label="More review actions">
          <MoreHorizontal size={18} aria-hidden="true" />
        </button>
      </PageHeader>
      <Card className="diff-card">
        <div className="diff-header">
          <div>
            <h3>{isDemo ? "src/ui/SetupFlow.tsx" : "No file selected"}</h3>
            <p>{isDemo ? <><span className="positive">+64 additions</span> <span className="negative">-6 deletions</span> 5 files changed</> : "Start an agent turn to populate the review queue."}</p>
          </div>
          <div className="segmented">
            <button className={mode === "split" ? "active" : ""} type="button" onClick={() => onModeChange("split")}>Split</button>
            <button className={mode === "unified" ? "active" : ""} type="button" onClick={() => onModeChange("unified")}>Unified</button>
          </div>
        </div>
        <div className="diff-body" data-mode={mode}>
          {isDemo ? (
            <>
              <div className="code-line muted"><span>42</span><span>function completeSetup(settings: RuntimeSettings) &#123;</span></div>
              <div className="code-line delete"><span>43</span><span>- return startRuntime(settings);</span></div>
              <div className="code-line add"><span>43</span><span>+ const checked = validateEndpoint(settings.baseURL);</span></div>
              <div className="code-line add"><span>44</span><span>+ return startRuntime(&#123; ...settings, baseURL: checked &#125;);</span></div>
              <div className="code-line muted"><span>45</span><span>&#125;</span></div>
            </>
          ) : (
            <p className="empty-state">No generated diff is available yet.</p>
          )}
        </div>
        <div className="diff-related">
          {isDemo ? <FilesChangedTable reviewedFiles={reviewedFiles} onMarkReviewed={onMarkReviewed} /> : <p className="empty-state">No changed files yet.</p>}
          <Card className="impact-card">
            <dl>
              <div><dt>Change type</dt><dd>{isDemo ? "Runtime setup" : "None"}</dd></div>
              <div><dt>Risk level</dt><dd><span className="pill low">{isDemo ? "Low" : "None"}</span></dd></div>
              <div><dt>Estimated impact</dt><dd>{isDemo ? "Local setup only" : "Waiting for changes"}</dd></div>
            </dl>
            <p>{isDemo ? "Demo review data shows how approvals, diffs, and verification evidence will appear." : "Start a DeepSeek turn to review generated changes."}</p>
          </Card>
        </div>
      </Card>
      <div className="review-bottom-grid">
        {isDemo ? <TerminalEvidenceCard compact /> : <Card><p className="empty-state">No terminal evidence yet.</p></Card>}
        <Card title="DeepSeek Agent">
          <p>{isDemo ? "The selected setup change validates the endpoint before starting the runtime and keeps the API key in native storage." : "No review summary is available until DeepSeek produces changes."}</p>
          <ul className="check-list">
            <li>Consistent with local runtime flow</li>
            <li>No workspace files changed in Demo Mode</li>
            <li>Ready for tester smoke checks</li>
          </ul>
        </Card>
      </div>
      <ComposerV2 model="deepseek-v4-flash" prompt="" onChange={() => {}} onInterrupt={() => {}} onSend={() => onAction("Requested more tests for the selected change.")} placeholder="Ask DeepSeek about this change..." />
    </div>
  );
}

function SettingsUsage({
  apiKeyDraft,
  baseURL,
  health,
  info,
  model,
  onAPIKeyChange,
  onAction,
  onModelChange,
  usage,
}: {
  apiKeyDraft: string;
  baseURL: string;
  health?: RuntimeHealth;
  info?: RuntimeInfo;
  model: string;
  onAPIKeyChange(value: string): void;
  onAction(message: string): void;
  onModelChange(value: string): void;
  usage?: UsageAggregation;
}) {
  return (
    <div className="page settings-page">
      <PageHeader title="Settings & Usage" />
      <Card className="settings-card">
        <h3>DeepSeek Account</h3>
        <div className="settings-account-row">
          <span className="avatar">DS</span>
          <div>
            <strong>DeepSeek</strong>
            <p>{info?.mode === "real" ? "Connected endpoint" : "Demo Mode"}</p>
            <small>{baseURL}</small>
          </div>
          <button className="secondary-button" type="button" onClick={() => onAction("Account management is ready for native settings wiring.")}>Manage account</button>
        </div>
      </Card>
      <Card className="settings-card">
        <div className="settings-card-heading">
          <KeyRound size={18} aria-hidden="true" />
          <div>
            <h3>API Key & Storage</h3>
            <p>Your DeepSeek API key is securely encrypted and stored only in macOS Keychain.</p>
          </div>
        </div>
        <div className="settings-key-row">
          <input className="field-input" type="password" value={apiKeyDraft} placeholder="sk-..." onChange={(event) => onAPIKeyChange(event.target.value)} />
          <button className="secondary-button" type="button" onClick={() => onAction("API key rotation is ready for native Keychain wiring.")}>Rotate key</button>
          <button className="icon-only" type="button" aria-label="More API key actions"><MoreHorizontal size={17} aria-hidden="true" /></button>
        </div>
      </Card>
      <Card className="settings-card">
        <div className="settings-card-heading">
          <Layers3 size={18} aria-hidden="true" />
          <div>
            <h3>Model Defaults</h3>
            <p>Only DeepSeek models are available in this app.</p>
          </div>
        </div>
        <select className="field-input" value={model} onChange={(event) => onModelChange(event.target.value)}>
          <option value="deepseek-v4-flash">deepseek-v4-flash</option>
          <option value="deepseek-v4-pro">deepseek-v4-pro</option>
        </select>
        <div className="settings-model-row">
          <FieldLabel label="Temperature" value="0.2" />
          <FieldLabel label="Reasoning effort" value="High" />
          <FieldLabel label="Max output tokens" value="4096" />
        </div>
      </Card>
      <Card className="settings-card">
        <div className="settings-card-heading">
          <Folder size={18} aria-hidden="true" />
          <div>
            <h3>Workspace Preferences</h3>
            <p>Default local folder and terminal behavior.</p>
          </div>
        </div>
        <ToggleRows />
      </Card>
      <Card className="settings-card">
        <div className="settings-card-heading">
          <Sparkles size={18} aria-hidden="true" />
          <div>
            <h3>App Appearance</h3>
          </div>
        </div>
        <div className="appearance-row">
          <div className="segmented full">
            <button className="active" type="button">Light</button>
            <button type="button">Dark</button>
          </div>
          <div className="appearance-swatches" aria-label="Accent colors">
            <span /><span /><span /><span /><span /><span />
          </div>
        </div>
      </Card>
      <Card className="settings-card">
        <div className="settings-card-heading">
          <Gauge size={18} aria-hidden="true" />
          <div>
            <h3>Usage & Cost</h3>
            <p>{usage ? formatUsage(usage) : "Usage unavailable"}</p>
          </div>
        </div>
        <div className="usage-tabs">
          <button className="active" type="button">Overview</button>
          <button type="button">Token usage</button>
          <button type="button">Recent runs</button>
          <button type="button">Current model</button>
          <button type="button">Cache</button>
        </div>
        <div className="usage-metrics">
          <MetricSmall label="Total tokens" value={((usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0)).toLocaleString()} delta="current runtime" />
          <MetricSmall label="Input tokens" value={(usage?.inputTokens ?? 0).toLocaleString()} delta="current runtime" />
          <MetricSmall label="Output tokens" value={(usage?.outputTokens ?? 0).toLocaleString()} delta="current runtime" />
          <MetricSmall label="Completed turns" value={(usage?.completedTurns ?? 0).toLocaleString()} delta="current runtime" />
        </div>
        <UsageChart />
      </Card>
      <div className="model-chip">
        <span className={`status-dot ${health?.status === "ok" ? "ok" : "offline"}`} />
        Runtime
        <strong>{info?.runtimeVersion ?? "not probed"}</strong>
      </div>
    </div>
  );
}

function RightInspector({
  health,
  info,
  isDemo,
  model,
  onAction,
  onCreateThread,
  onShowReview,
  reviewedFiles,
  usage,
  view,
}: {
  health?: RuntimeHealth;
  info?: RuntimeInfo;
  isDemo: boolean;
  model: string;
  onAction(message: string): void;
  onCreateThread(): void;
  onShowReview(): void;
  reviewedFiles: Set<string>;
  usage?: UsageAggregation;
  view: AppView;
}) {
  if (view === "settings") {
    return (
      <aside className="right-inspector">
        <InspectorHeader title="Account & Status" />
        <InspectorCard title="DeepSeek Plan"><StatusValue label="Active" tone="ok" /></InspectorCard>
        <RuntimeCard health={health} info={info} model={model} />
        <InspectorCard title="Connection"><StatusValue label={health?.status === "ok" ? "Healthy" : "Needs attention"} tone={health?.status === "ok" ? "ok" : "danger"} /></InspectorCard>
        <InspectorCard title="Cost summary">
          <dl className="cost-list">
            <div><dt>Total spend</dt><dd>{usage ? `$${usage.totalCost.toFixed(4)}` : "$0.0000"}</dd></div>
            <div><dt>Input tokens</dt><dd>{usage?.inputTokens.toLocaleString() ?? "0"}</dd></div>
            <div><dt>Output tokens</dt><dd>{usage?.outputTokens.toLocaleString() ?? "0"}</dd></div>
          </dl>
        </InspectorCard>
      </aside>
    );
  }

  if (view === "review") {
    const totalFiles = isDemo ? changedFiles.length : 0;
    const reviewed = isDemo ? Math.min(reviewedFiles.size, totalFiles) : 0;
    return (
      <aside className="right-inspector">
        <InspectorHeader title="Review" />
        <div className="segmented full">
          <button className="active" type="button">Review</button>
          <button type="button">Details</button>
        </div>
        <InspectorCard title="Review queue">
          <p>{reviewed} of {totalFiles} files reviewed</p>
          <div className="progress"><span style={{ width: `${totalFiles === 0 ? 0 : Math.min(100, (reviewed / totalFiles) * 100)}%` }} /></div>
          <div className="change-total"><span className="positive">+{isDemo ? 192 : 0} additions</span><span className="negative">-{isDemo ? 13 : 0} deletions</span></div>
        </InspectorCard>
        {isDemo ? <FileQueue reviewedFiles={reviewedFiles} /> : <InspectorCard><p className="empty-state">No changed files yet.</p></InspectorCard>}
        <InspectorCard title="Review actions">
          <ActionButton label="Open in editor" onClick={() => onAction("Opening selected file in editor is queued.")} />
          <ActionButton label="Apply selected" onClick={() => onAction(isDemo ? "Applied selected review changes in Demo Mode." : "No selected changes to apply.")} />
          <ActionButton label="Reject selected" onClick={() => onAction(isDemo ? "Rejected selected review changes in Demo Mode." : "No selected changes to reject.")} />
          <ActionButton label="Request more tests" onClick={() => onAction("Requested more tests for selected files.")} />
        </InspectorCard>
        <InspectorCard title="Commit">
          <input className="field-input" value={isDemo ? "Prepare local setup cleanup" : ""} placeholder="Commit message" readOnly />
          <button className="primary-button full-width" type="button" onClick={() => onAction(isDemo ? "Commit preview is ready in Demo Mode." : "No changes are ready to commit.")}>Commit {isDemo ? reviewed : 0} files</button>
        </InspectorCard>
      </aside>
    );
  }

  if (view === "project") {
    return (
      <aside className="right-inspector">
        <InspectorHeader title="Project" />
        <RuntimeCard health={health} info={info} model={model} />
        <InspectorCard title="Quick actions">
          <ActionButton label="New thread" onClick={onCreateThread} />
          <ActionButton label="Run tests" onClick={() => onAction(isDemo ? "Queued Demo Mode test run." : "Create a thread before running agent checks.")} />
          <ActionButton label="View diffs" onClick={onShowReview} />
          <ActionButton label="Open in IDE" onClick={() => onAction("Opening project in IDE is queued.")} />
        </InspectorCard>
        <InspectorCard title="Top changed files">
          {isDemo ? <FileQueue reviewedFiles={reviewedFiles} compact /> : <p className="empty-state">No changed files yet.</p>}
        </InspectorCard>
        <InspectorCard title="Last commit">
          <p>{isDemo ? "Demo workspace checkpoint" : "No commit data loaded."}</p>
          <dl className="runtime-list">
            <div><dt>Branch</dt><dd>{isDemo ? "demo" : "unknown"}</dd></div>
            <div><dt>Checks</dt><dd><span className={isDemo ? "positive" : ""}>{isDemo ? "Ready" : "Not run"}</span></dd></div>
          </dl>
        </InspectorCard>
      </aside>
    );
  }

  return (
    <aside className="right-inspector">
      <InspectorHeader title="Review" />
      <div className="segmented full">
        <button className="active" type="button">Summary</button>
        <button type="button">Details</button>
      </div>
      <InspectorCard>
        <p>{isDemo ? "DeepSeek prepared a local setup preview with review and verification evidence." : "Start a thread to generate a summary for this workspace."}</p>
      </InspectorCard>
      <InspectorCard title="Changes">
        <div className="change-total"><span className="positive">+{isDemo ? 192 : 0} additions</span><span className="negative">-{isDemo ? 13 : 0} deletions</span></div>
      </InspectorCard>
      <InspectorCard title={`Changed files (${isDemo ? changedFiles.length : 0})`}>{isDemo ? <FileQueue reviewedFiles={reviewedFiles} compact /> : <p className="empty-state">No changed files yet.</p>}</InspectorCard>
      <InspectorCard title="Quick actions">
        <ActionButton label="Open diff" onClick={onShowReview} />
        <ActionButton label="Apply changes" onClick={() => onAction(isDemo ? "Applied changes in Demo Mode." : "No changes are available to apply.")} />
        <ActionButton label="Request tests" onClick={() => onAction(isDemo ? "Requested tests in Demo Mode." : "No active changes need tests yet.")} />
      </InspectorCard>
      <RuntimeCard health={health} info={info} model={model} />
    </aside>
  );
}

function TimelineCard({ item, onApprovalDecision }: { item: TimelineItem; onApprovalDecision(approvalId: string, decision: ApprovalDecision): void }) {
  if (item.kind === "approval" && item.approval) {
    return (
      <Card className="timeline-card-v2 approval">
        <div className="timeline-card-heading"><span>Approval required</span><StatusPill status={item.status} /></div>
        <h3>{item.approval.title}</h3>
        <p>{item.approval.expectedSideEffect}</p>
        {item.approval.command ? <pre className="command-preview">{item.approval.command}</pre> : null}
        <div className="approval-actions">
          <button className="secondary-button" type="button" onClick={() => onApprovalDecision(item.approval!.approvalId, "deny")}>Deny</button>
          <button className="primary-button" type="button" onClick={() => onApprovalDecision(item.approval!.approvalId, "allow")}>Allow</button>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`timeline-card-v2 ${item.kind}`}>
      <div className="timeline-card-heading">
        <span>{item.kind === "user" ? "You" : item.title}</span>
        <StatusPill status={item.status} />
      </div>
      <p>{item.content}</p>
    </Card>
  );
}

function FilesChangedCard({ onOpenReview }: { onOpenReview(): void }) {
  const additions = changedFiles.reduce((total, file) => total + file.additions, 0);
  const deletions = changedFiles.reduce((total, file) => total + file.deletions, 0);
  return (
    <Card className="files-card">
      <div className="card-title-row">
        <h3>Files changed</h3>
        <span>{changedFiles.length} files <span className="positive">+{additions}</span> <span className="negative">-{deletions}</span></span>
      </div>
      <FilesChangedTable reviewedFiles={new Set()} onMarkReviewed={() => {}} />
      <button className="text-button" type="button" onClick={onOpenReview}>Open review</button>
    </Card>
  );
}

function TerminalEvidenceCard({ compact = false }: { compact?: boolean }) {
  return (
    <Card className={compact ? "terminal-card compact" : "terminal-card"}>
      <div className="card-title-row">
        <h3>Terminal</h3>
        <span className="positive">All tests passed</span>
        {!compact ? <span>21.6s</span> : null}
      </div>
      <pre className="terminal-output">{`> npm test
	PASS tests/runtime-bridge.test.ts
	PASS tests/setup-flow.test.ts
	PASS tests/review-panel.test.ts

	Test Suites: 3 passed, 3 total
	Tests:       18 passed, 18 total
	Time:        21.6s`}</pre>
    </Card>
  );
}

function ComposerV2({
  activeTurnId,
  model,
  onChange,
  onInterrupt,
  onSend,
  placeholder = "Ask DeepSeek anything...",
  prompt,
}: {
  activeTurnId?: string;
  model: string;
  onChange(value: string): void;
  onInterrupt(): void;
  onSend(): void;
  placeholder?: string;
  prompt: string;
}) {
  return (
    <form className="composer-v2" onSubmit={(event) => { event.preventDefault(); onSend(); }}>
      <textarea aria-label="Prompt" value={prompt} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      <div className="composer-meta">
        <span>{model}</span>
        <button className="icon-only" type="button" aria-label="Attach file"><Link2 size={16} aria-hidden="true" /></button>
        <span className="composer-spacer" />
        {activeTurnId ? (
          <button className="secondary-button" type="button" onClick={onInterrupt}>
            <Square size={15} aria-hidden="true" />
            Stop
          </button>
        ) : null}
        <button className="send-button" type="submit" aria-label="Send prompt" disabled={!prompt.trim()}>
          <Send size={18} aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}

function PageHeader({ children, eyebrow, subtitle, title }: { children?: React.ReactNode; eyebrow?: string; subtitle?: string; title: string }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {subtitle ? <p className="subtitle">{subtitle}</p> : null}
      </div>
      {children ? <div className="page-actions">{children}</div> : null}
    </header>
  );
}

function Card({ children, className = "", title }: { children: React.ReactNode; className?: string; title?: string }) {
  return <section className={`deepseek-card ${className}`}>{title ? <h3>{title}</h3> : null}{children}</section>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="metric">{icon}<span>{label}</span><strong>{value}</strong></div>;
}

function TaskList({ isDemo }: { isDemo: boolean }) {
  if (!isDemo) {
    return <p className="empty-state">No active tasks yet. Start a thread to create one.</p>;
  }

  return (
    <div className="task-list">
      {[
        ["Validate runtime setup", "Confirm endpoint, model, and key storage before launch.", "In progress"],
        ["Review generated changes", "Inspect diffs, terminal evidence, and approval state.", "Ready"],
        ["Prepare tester handoff", "Summarize install notes and smoke checks.", "Queued"],
      ].map(([title, body, status]) => (
        <article key={title} className="task-item"><strong>{title}</strong><p>{body}</p><span>{status}</span></article>
      ))}
    </div>
  );
}

function PromptList({ onCreateThread }: { onCreateThread(): void }) {
  return <div className="prompt-list">{suggestedPrompts.map(([title, body]) => <button key={title} type="button" onClick={onCreateThread}><Sparkles size={16} aria-hidden="true" /><span><strong>{title}</strong><small>{body}</small></span></button>)}</div>;
}

function ActivityList({ isDemo }: { isDemo: boolean }) {
  if (!isDemo) {
    return <p className="empty-state">No repository activity loaded yet.</p>;
  }

  return <div className="activity-list">{["Checked runtime bridge contract", "Prepared setup flow review", "Collected terminal evidence", "Queued tester handoff"].map((item, index) => <article key={item}><span className="activity-dot" /><div><strong>{item}</strong><p>DeepSeek Agent</p></div><time>{index === 0 ? "now" : `${index}h ago`}</time></article>)}</div>;
}

function FilesChangedTable({ onMarkReviewed, reviewedFiles }: { onMarkReviewed(path: string): void; reviewedFiles: Set<string> }) {
  return (
    <div className="changed-table">
      {changedFiles.map((file) => (
        <button key={file.path} type="button" onClick={() => onMarkReviewed(file.path)}>
          <FileCode2 size={15} aria-hidden="true" />
          <span>{file.path}</span>
          <strong className="positive">+{file.additions}</strong>
          <strong className="negative">-{file.deletions}</strong>
          {reviewedFiles.has(file.path) ? <CheckCircle2 size={15} aria-hidden="true" /> : null}
        </button>
      ))}
    </div>
  );
}

function FileQueue({ compact = false, reviewedFiles }: { compact?: boolean; reviewedFiles: Set<string> }) {
  return <div className={compact ? "file-queue compact" : "file-queue"}>{changedFiles.map((file) => <div key={file.path}><span className={reviewedFiles.has(file.path) ? "queue-dot done" : "queue-dot"} /><span>{file.path}</span><strong className="positive">+{file.additions}</strong><strong className="negative">-{file.deletions}</strong></div>)}</div>;
}

function RuntimeCard({ health, info, model }: { health?: RuntimeHealth; info?: RuntimeInfo; model: string }) {
  return (
    <InspectorCard title="Runtime">
      <div className="runtime-line"><span className={`status-dot ${health?.status === "ok" ? "ok" : "offline"}`} /> deepseek-runtime-api</div>
      <dl className="runtime-list">
        <div><dt>Mode</dt><dd>{info?.mode === "fake" ? "demo" : info?.mode ?? "unknown"}</dd></div>
        <div><dt>Runtime</dt><dd>{info?.runtimeVersion ?? "not probed"}</dd></div>
        <div><dt>API key</dt><dd>{info?.authRequired ? "Required" : "Not required"}</dd></div>
        <div><dt>Model</dt><dd>{model}</dd></div>
      </dl>
    </InspectorCard>
  );
}

function InspectorCard({ children, title }: { children?: React.ReactNode; title?: string }) {
  return <section className="inspector-card">{title ? <h3>{title}</h3> : null}{children}</section>;
}

function InspectorHeader({ title }: { title: string }) {
  return <header className="inspector-header"><h2>{title}</h2><button className="icon-only" type="button"><X size={16} aria-hidden="true" /></button></header>;
}

function ActionButton({ label, onClick }: { label: string; onClick(): void }) {
  return <button className="action-button" type="button" onClick={onClick}>{label}</button>;
}

function StatusValue({ label, tone }: { label: string; tone: "ok" | "danger" }) {
  return <p className={tone === "ok" ? "status-value ok" : "status-value danger"}><span className={`status-dot ${tone}`} />{label}</p>;
}

function FeatureBlurb({ icon, text, title }: { icon: React.ReactNode; text: string; title: string }) {
  return <div className="feature-blurb"><span>{icon}</span><div><strong>{title}</strong><p>{text}</p></div></div>;
}

function SetupRow({ children, description, icon, index, title }: { children: React.ReactNode; description: string; icon: React.ReactNode; index: string; title: string }) {
  return <div className="setup-row"><span className="step-index">{index}</span><span className="row-icon">{icon}</span><div><strong>{title}</strong><p>{description}</p></div><div className="row-control">{children}</div></div>;
}

function StatusMini({ label, value }: { label: string; value: string }) {
  return <div className="status-mini"><span className="status-dot ok" /><div><strong>{label}</strong><p>{value}</p></div></div>;
}

function BrandTitle() {
  return <div className="brand-title"><PanelLeft size={18} aria-hidden="true" /><strong>DeepSeek Agent</strong><ChevronDown size={14} aria-hidden="true" /></div>;
}

function TrafficLights() {
  return <div className="traffic-lights" aria-hidden="true"><span /><span /><span /></div>;
}

function NavButton({ active = false, icon, label, onClick }: { active?: boolean; icon: React.ReactNode; label: string; onClick?: () => void }) {
  return <button className={active ? "nav-button active" : "nav-button"} type="button" onClick={onClick}>{icon}{label}</button>;
}

function CardLink({ label, onClick }: { label: string; onClick?: () => void }) {
  return <button className="card-link" type="button" onClick={onClick}>{label}<Send size={14} aria-hidden="true" /></button>;
}

function StatusPill({ status }: { status: TimelineItem["status"] }) {
  return <span className={`status-pill status-${status}`}>{status === "completed" ? <CheckCircle2 size={14} aria-hidden="true" /> : <Clock3 size={14} aria-hidden="true" />}{status}</span>;
}

function FieldLabel({ label, value }: { label: string; value: string }) {
  return <label className="field-label"><span>{label}</span><input value={value} readOnly /></label>;
}

function MetricSmall({ delta, label, value }: { delta: string; label: string; value: string }) {
  return <div className="usage-metric"><span>{label}</span><strong>{value}</strong><small>{delta}</small></div>;
}

function ToggleRows() {
  return <div className="toggle-rows">{["Auto-apply safe edits", "Confirm destructive actions", "Code suggestions"].map((label) => <div key={label}><span>{label}</span><button className="toggle on" type="button" aria-pressed="true"><span /></button></div>)}</div>;
}

function UsageChart() {
  return <div className="usage-chart"><svg viewBox="0 0 600 140" role="img" aria-label="Usage trend"><path d="M0 90 C80 30 120 120 200 70 S340 65 420 86 520 45 600 72" fill="none" stroke="#3366FF" strokeWidth="4" /><path d="M0 100 C80 80 120 92 200 88 S340 95 420 90 520 76 600 82" fill="none" stroke="#7FA8FF" strokeWidth="3" /></svg></div>;
}

const fallbackTimeline: TimelineItem[] = [
  {
    id: "fallback-user",
    kind: "user",
    title: "You",
    content: "Inspect this workspace and show how setup, review, approvals, and local verification will work for a tester.",
    status: "completed",
  },
  {
    id: "fallback-agent",
    kind: "assistant",
    title: "DeepSeek Agent",
    content: "Demo Mode is connected. I can show the local setup flow, review workspace, terminal evidence, and approval handling without requiring an API key.",
    status: "completed",
  },
];
