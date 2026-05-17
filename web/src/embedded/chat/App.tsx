import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Folder,
  Gauge,
  KeyRound,
  Layers3,
  Link2,
  LockKeyhole,
  PanelLeft,
  Plus,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Square,
  Terminal,
  X,
} from "lucide-react";
import { createAgentBridge } from "../../bridge/createBridge";
import { applyRuntimeEvent, createInitialThreadState, eventSeqForReconnect, type ThreadViewState } from "../../runtime/reducer";
import type { ApprovalDecision, ApprovalRequest, RuntimeHealth, RuntimeInfo, RuntimeThread, TimelineItem, UsageAggregation } from "../../runtime/types";

type AppView = "setup" | "thread" | "settings";
type NativeCommand = "newThread" | "commandPalette" | "settings" | "stopTurn" | "demoRuntime";
type SettingsSheet = "rotateKey" | null;
type TuiMode = "Plan" | "Agent" | "YOLO";
type ApprovalPolicy = "suggest" | "auto" | "never";

const previewViews = new Set<AppView>(["setup", "thread", "settings"]);
const deepSeekModels = ["deepseek-v4-flash", "deepseek-v4-pro"];

const setupDefaults = {
  url: "https://api.deepseek.com/beta",
  model: "deepseek-v4-flash",
  workspace: "~/DeepSeekAgent",
};

const suggestedPrompts = [
  ["Explain this project", "Summarize structure, risks, and the next useful commands"],
  ["Inspect safely", "Use Plan mode style investigation before changing files"],
  ["Run a check", "Ask DeepSeek to request approval before shell execution"],
  ["Plan a refactor", "Create a small implementation plan with verification steps"],
];

const modeDescriptions: Record<TuiMode, { summary: string; detail: string; tone: "ok" | "warn" | "danger" }> = {
  Plan: {
    summary: "Read-only investigation",
    detail: "Shell and patch execution stay off. Use this for design, review, and planning.",
    tone: "ok",
  },
  Agent: {
    summary: "Tool use with approvals",
    detail: "DeepSeek can call tools, while shell and risky actions wait for your approval.",
    tone: "warn",
  },
  YOLO: {
    summary: "Trusted auto-approval",
    detail: "Enables trust-style operation. Use only inside repos you fully trust.",
    tone: "danger",
  },
};

const policyDescriptions: Record<ApprovalPolicy, string> = {
  suggest: "Uses the current TUI mode rules and asks before risky tools.",
  auto: "Auto-approves tools without forcing YOLO mode.",
  never: "Blocks tools that are not safe or read-only.",
};

function initialPreviewView(): AppView {
  const value = new URLSearchParams(window.location.search).get("view") as AppView | null;
  return value && previewViews.has(value) ? value : "setup";
}

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

function approvalRule(approval: ApprovalRequest): string {
  return `${approval.toolName}: ${approval.command ?? approval.actionType}`;
}

function remoteHttpWarning(baseURL: string): string | undefined {
  try {
    const url = new URL(baseURL.trim());
    const host = url.hostname.toLowerCase();
    const isLoopback = host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
    return url.protocol === "http:" && !isLoopback ? "HTTP endpoint is not encrypted. Use it only on a trusted self-hosted network." : undefined;
  } catch {
    return undefined;
  }
}

export function runtimeAPIKeyStatusLabel(info: RuntimeInfo | undefined, hasAPIKey: boolean): string {
  if (!info) {
    return hasAPIKey ? "Configured" : "Unknown";
  }
  if (info.mode === "fake") {
    return hasAPIKey ? "Configured; not required" : "Not required";
  }
  if (hasAPIKey) {
    return "Configured";
  }
  return info.authRequired ? "Required" : "Not required";
}

function loadPreference(key: string, fallback: string): string {
  try {
    const value = globalThis.window?.localStorage?.getItem(key);
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function savePreference(key: string, value: string) {
  try {
    globalThis.window?.localStorage?.setItem(key, value);
  } catch {
    // Local storage can be unavailable in tests or locked-down WebViews.
  }
}

export function App() {
  const bridge = useMemo(() => createAgentBridge(), []);
  const initialView = useMemo(() => initialPreviewView(), []);
  const autoApprovalInFlight = useRef(new Set<string>());
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
  const [hasAPIKey, setHasAPIKey] = useState(false);
  const [baseURL, setBaseURL] = useState(setupDefaults.url);
  const [model, setModel] = useState(setupDefaults.model);
  const [workspace, setWorkspace] = useState(setupDefaults.workspace);
  const [demoMode, setDemoMode] = useState(false);
  const [actionNote, setActionNote] = useState<string>();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [settingsSheet, setSettingsSheet] = useState<SettingsSheet>(null);
  const [diagnosticsResult, setDiagnosticsResult] = useState<string>();
  const [tuiMode, setTuiMode] = useState<TuiMode>(() => loadPreference("deepseek-agent.tuiMode", "Agent") as TuiMode);
  const [approvalPolicy, setApprovalPolicy] = useState<ApprovalPolicy>(() => loadPreference("deepseek-agent.approvalPolicy", "suggest") as ApprovalPolicy);
  const [autoAllowRules, setAutoAllowRules] = useState<string[]>(() => {
    const saved = loadPreference("deepseek-agent.autoAllowRules", "");
    return saved ? saved.split("\n").filter(Boolean) : [];
  });

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
        setBaseURL(runtimeSettings.baseURL || setupDefaults.url);
        setModel(runtimeSettings.model || setupDefaults.model);
        setHasAPIKey(runtimeSettings.hasAPIKey);
        setHealth(nextHealth);
        setInfo(nextInfo);
        setThreads(nextThreads);
        setUsage(nextUsage);
        setSelectedThreadId(nextThreads[0]?.id);
        if (nextInfo.mode === "real") {
          setSetupComplete(true);
          setView("thread");
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
    if (!selectedThreadId || view !== "thread") {
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
  }, [bridge, selectedThreadId, view]);

  useEffect(() => {
    if (!selectedThreadId || view !== "thread") {
      return;
    }
    const threadId = selectedThreadId;
    const hasActiveItems = threadState.items.some((item) => item.status === "running" || item.status === "waiting");
    const intervalMs = info?.mode === "fake" || hasActiveItems ? 700 : 2500;
    const interval = window.setInterval(() => {
      void refreshThreadDetail(threadId);
    }, intervalMs);
    return () => window.clearInterval(interval);
  }, [info?.mode, selectedThreadId, threadState.items, view]);

  useEffect(() => {
    if (!selectedThreadId || view !== "thread") {
      return;
    }

    const pending = threadState.items.find((item) => item.kind === "approval" && item.status === "waiting" && item.approval && !item.approval.decision);
    const approval = pending?.approval;
    if (!approval) {
      return;
    }

    const rule = approvalRule(approval);
    let decision: ApprovalDecision | undefined;
    let note: string | undefined;
    if (tuiMode === "Plan") {
      decision = "deny";
      note = "Blocked by Plan mode.";
    } else if (approvalPolicy === "never") {
      decision = "deny";
      note = "Blocked by approval policy.";
    } else if (tuiMode === "YOLO") {
      decision = "allow";
      note = "Auto-approved in YOLO mode.";
    } else if (approvalPolicy === "auto") {
      decision = "allow";
      note = "Auto-approved by approval policy.";
    } else if (autoAllowRules.includes(rule)) {
      decision = "allow";
      note = "Auto-approved by saved workspace rule.";
    }

    if (!decision || autoApprovalInFlight.current.has(approval.approvalId)) {
      return;
    }

    autoApprovalInFlight.current.add(approval.approvalId);
    setActionNote(note);
    void bridge.respondApproval(approval.approvalId, decision)
      .then(async () => {
        await refreshThreadDetail(selectedThreadId);
        await refreshRuntime();
      })
      .catch((approvalError) => {
        setError(approvalError instanceof Error ? approvalError.message : "Failed to apply approval policy");
      })
      .finally(() => {
        autoApprovalInFlight.current.delete(approval.approvalId);
      });
  }, [approvalPolicy, autoAllowRules, bridge, selectedThreadId, threadState.items, tuiMode, view]);

  async function refreshRuntime() {
    const [nextHealth, nextInfo, nextUsage] = await Promise.all([bridge.health(), bridge.runtimeInfo(), bridge.getUsage()]);
    setHealth(nextHealth);
    setInfo(nextInfo);
    setUsage(nextUsage);
  }

  async function refreshThreadDetail(threadId: string) {
    const detail = await bridge.getThread(threadId);
    setThreadState(createInitialThreadState(detail.thread, detail.items, detail.lastSeq));
  }

  async function refreshThreads(selectFirst = false) {
    const nextThreads = await bridge.listThreads({ limit: 20 });
    setThreads(nextThreads);
    if (selectFirst && nextThreads[0]) {
      setSelectedThreadId(nextThreads[0].id);
    }
    return nextThreads;
  }

  async function createThread() {
    const thread = await bridge.createThread({ title: "New chat", projectPath });
    await refreshThreads();
    setSelectedThreadId(thread.id);
    setThreadState(createInitialThreadState(thread));
    setSetupComplete(true);
    setView("thread");
  }

  async function completeSetup() {
    try {
      if (!demoMode && !apiKeyDraft.trim() && !hasAPIKey) {
        setError("Enter a DeepSeek API key or enable Demo Mode before completing setup.");
        return;
      }
      if (demoMode) {
        const snapshot = await bridge.useDemoRuntime();
        setHasAPIKey(snapshot.hasAPIKey);
      } else {
        const snapshot = await bridge.saveRuntimeSettings({
          baseURL,
          model,
          apiKey: apiKeyDraft.trim() || undefined,
          startRuntime: true,
        });
        setHasAPIKey(snapshot.hasAPIKey);
      }
      setApiKeyDraft("");
      setError(undefined);
      setSetupComplete(true);
      setProjectPath(workspace);
      const nextThreads = await refreshThreads(true);
      if (nextThreads.length === 0) {
        await createThread();
      } else {
        setView("thread");
      }
      await refreshRuntime();
      setActionNote(demoMode ? "Demo Mode is ready without an API key." : "Settings saved to native storage. DeepSeek runtime is starting.");
    } catch (setupError) {
      setError(setupError instanceof Error ? setupError.message : "Failed to save runtime settings");
    }
  }

  async function browseWorkspaceFolder() {
    try {
      const result = await bridge.chooseWorkspaceFolder(workspace);
      if (result.path) {
        setWorkspace(result.path);
        setActionNote("Workspace folder selected.");
      }
    } catch (browseError) {
      setError(browseError instanceof Error ? browseError.message : "Failed to choose workspace folder");
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
      await refreshThreads();
    }
    const sent = prompt.trim();
    setPrompt("");
    setView("thread");
    window.setTimeout(() => void refreshThreadDetail(threadId), 900);
    window.setTimeout(() => void refreshThreadDetail(threadId), 1600);
    try {
      await bridge.startTurn(threadId, { input: sent });
    } catch (turnError) {
      setError(turnError instanceof Error ? turnError.message : "Failed to start DeepSeek turn");
    }
  }

  async function interruptTurn() {
    const pendingApprovalTurnId = threadState.items
      .find((item) => item.kind === "approval" && item.status === "waiting" && item.approval)
      ?.approval?.approvalId.replace(/-approval-id$/, "");
    const turnId = threadState.activeTurnId ?? pendingApprovalTurnId;
    if (!selectedThreadId || !turnId) {
      return;
    }
    await bridge.interruptTurn(selectedThreadId, turnId);
    await refreshThreadDetail(selectedThreadId);
  }

  async function decideApproval(approvalId: string, decision: ApprovalDecision) {
    await bridge.respondApproval(approvalId, decision);
    if (selectedThreadId) {
      await refreshThreadDetail(selectedThreadId);
    }
    await refreshRuntime();
  }

  async function alwaysAllow(approval: ApprovalRequest) {
    const rule = approvalRule(approval);
    autoApprovalInFlight.current.add(approval.approvalId);
    try {
      setAutoAllowRules((current) => {
        const next = current.includes(rule) ? current : [...current, rule];
        savePreference("deepseek-agent.autoAllowRules", next.join("\n"));
        return next;
      });
      setActionNote("Always allow rule saved.");
      await decideApproval(approval.approvalId, "allow");
    } finally {
      autoApprovalInFlight.current.delete(approval.approvalId);
    }
  }

  function clearAutoAllowRules() {
    setAutoAllowRules([]);
    savePreference("deepseek-agent.autoAllowRules", "");
    setActionNote("Auto-allow rules cleared.");
  }

  async function persistRuntimePreference(next: { baseURL?: string; model?: string; apiKey?: string; startRuntime?: boolean }) {
    const snapshot = await bridge.saveRuntimeSettings({
      baseURL: next.baseURL ?? baseURL,
      model: next.model ?? model,
      apiKey: next.apiKey,
      startRuntime: next.startRuntime ?? false,
    });
    setBaseURL(snapshot.baseURL || next.baseURL || baseURL);
    setModel(snapshot.model || next.model || model);
    setHasAPIKey(snapshot.hasAPIKey);
    return snapshot;
  }

  async function updateModelPreference(nextModel: string) {
    setModel(nextModel);
    try {
      await persistRuntimePreference({ model: nextModel, startRuntime: false });
      setActionNote(`Model preference saved: ${nextModel}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save model preference");
    }
  }

  function updateTuiMode(nextMode: TuiMode) {
    setTuiMode(nextMode);
    savePreference("deepseek-agent.tuiMode", nextMode);
    setActionNote(`TUI mode set to ${nextMode}.`);
  }

  function updateApprovalPolicy(nextPolicy: ApprovalPolicy) {
    setApprovalPolicy(nextPolicy);
    savePreference("deepseek-agent.approvalPolicy", nextPolicy);
    setActionNote(`Approval policy set to ${nextPolicy}.`);
  }

  async function runDiagnostics() {
    try {
      const [nextHealth, nextInfo] = await Promise.all([bridge.health(), bridge.runtimeInfo()]);
      setHealth(nextHealth);
      setInfo(nextInfo);
      setDiagnosticsResult(`Diagnostics: ${nextHealth.status}; mode ${nextInfo.mode}; runtime ${nextInfo.runtimeVersion}.`);
      setActionNote("Diagnostics completed.");
    } catch (diagnosticsError) {
      setDiagnosticsResult(`Diagnostics failed: ${diagnosticsError instanceof Error ? diagnosticsError.message : "unknown error"}`);
    }
  }

  async function saveRotatedKey() {
    try {
      const snapshot = await persistRuntimePreference({ apiKey: apiKeyDraft.trim(), startRuntime: false });
      setHasAPIKey(snapshot.hasAPIKey);
      setApiKeyDraft("");
      setSettingsSheet(null);
      setActionNote("API key saved to native Keychain storage.");
    } catch (keyError) {
      setError(keyError instanceof Error ? keyError.message : "Failed to rotate API key");
    }
  }

  async function deleteAPIKey() {
    try {
      const snapshot = await bridge.clearAPIKey();
      setHasAPIKey(snapshot.hasAPIKey);
      setApiKeyDraft("");
      setActionNote("API key deleted. Real runtime now requires a new key.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete API key");
    }
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
      case "stopTurn":
        void interruptTurn();
        setActionNote("Stop requested for the current turn.");
        break;
      case "demoRuntime":
        void bridge.useDemoRuntime()
          .then(async (snapshot) => {
            setHasAPIKey(snapshot.hasAPIKey);
            setSetupComplete(true);
            await refreshThreads(true);
            setView("thread");
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
      const shortcutMap: Record<string, NativeCommand> = {
        ",": "settings",
        ".": "stopTurn",
        k: "commandPalette",
        n: "newThread",
      };
      const command = shortcutMap[event.key.toLowerCase()];
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
  const activeThreadTitle = threadState.thread?.title ?? "New chat";
  const pendingApproval = threadState.items.find((item) => item.kind === "approval" && item.status === "waiting");

  return (
    <div className="deepseek-wallpaper" data-appearance="light">
      <main className={view === "setup" && !setupComplete ? "deepseek-window setup-window" : "deepseek-window app-shell"} data-view={view}>
        {view === "setup" && !setupComplete ? (
          <SetupScreen
            apiKeyDraft={apiKeyDraft}
            baseURL={baseURL}
            demoMode={demoMode}
            error={error}
            hasAPIKey={hasAPIKey}
            health={health}
            model={model}
            workspace={workspace}
            onAPIKeyChange={setApiKeyDraft}
            onBaseURLChange={setBaseURL}
            onDemoModeChange={(nextDemoMode) => {
              setDemoMode(nextDemoMode);
              if (nextDemoMode) {
                setError(undefined);
              }
            }}
            onModelChange={setModel}
            onWorkspaceChange={setWorkspace}
            onBrowseWorkspace={() => void browseWorkspaceFolder()}
            onComplete={() => void completeSetup()}
          />
        ) : (
          <>
            <LeftNavigation
              activeProjectName={workspaceName}
              currentView={view}
              selectedThreadId={selectedThreadId}
              threads={threads}
              onCreateThread={() => void createThread()}
              onSelectThread={selectThread}
              onShowSettings={() => setView("settings")}
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
              {view === "thread" ? (
                <ThreadWorkbench
                  activeTurnId={threadState.activeTurnId}
                  approvalPolicy={approvalPolicy}
                  model={model}
                  onAlwaysAllow={(approval) => void alwaysAllow(approval)}
                  onApprovalDecision={(approvalId, decision) => void decideApproval(approvalId, decision)}
                  onInterrupt={() => void interruptTurn()}
                  onModeChange={updateTuiMode}
                  onModelChange={(nextModel) => void updateModelPreference(nextModel)}
                  onPolicyChange={updateApprovalPolicy}
                  onPromptChange={setPrompt}
                  onSend={() => void sendPrompt()}
                  prompt={prompt}
                  runtimeModeLabel={runtimeModeLabel}
                  threadTitle={activeThreadTitle}
                  timelineItems={threadState.items}
                  tuiMode={tuiMode}
                />
              ) : null}
              {view === "settings" ? (
                <RuntimeSettings
                  apiKeyDraft={apiKeyDraft}
                  approvalPolicy={approvalPolicy}
                  autoAllowRules={autoAllowRules}
                  baseURL={baseURL}
                  diagnosticsResult={diagnosticsResult}
                  hasAPIKey={hasAPIKey}
                  health={health}
                  info={info}
                  model={model}
                  onAPIKeyChange={setApiKeyDraft}
                  onApprovalPolicyChange={updateApprovalPolicy}
                  onBaseURLChange={setBaseURL}
                  onClearAutoAllowRules={clearAutoAllowRules}
                  onDeleteKey={() => void deleteAPIKey()}
                  onModelChange={setModel}
                  onPersistEndpoint={(nextBaseURL) => void persistRuntimePreference({ baseURL: nextBaseURL, startRuntime: false }).then(() => setActionNote("Endpoint preference saved."))}
                  onPersistModel={(nextModel) => void updateModelPreference(nextModel)}
                  onRotateKey={() => setSettingsSheet("rotateKey")}
                  onRunDiagnostics={() => void runDiagnostics()}
                  onTuiModeChange={updateTuiMode}
                  tuiMode={tuiMode}
                  usage={usage}
                  workspace={projectPath}
                />
              ) : null}
            </section>
            <RuntimeInspector
              approvalPolicy={approvalPolicy}
              autoAllowRules={autoAllowRules}
              capabilities={info?.capabilities ?? []}
              hasAPIKey={hasAPIKey}
              health={health}
              info={info}
              model={model}
              onClearAutoAllowRules={clearAutoAllowRules}
              pendingApproval={pendingApproval}
              tuiMode={tuiMode}
              usage={usage}
              workspace={projectPath}
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
      {settingsSheet ? (
        <SettingsModal
          apiKeyDraft={apiKeyDraft}
          hasAPIKey={hasAPIKey}
          onAPIKeyChange={setApiKeyDraft}
          onClose={() => setSettingsSheet(null)}
          onDeleteKey={() => void deleteAPIKey()}
          onSaveKey={() => void saveRotatedKey()}
        />
      ) : null}
    </div>
  );
}

function SetupScreen({
  apiKeyDraft,
  baseURL,
  demoMode,
  error,
  hasAPIKey,
  health,
  model,
  workspace,
  onAPIKeyChange,
  onBaseURLChange,
  onDemoModeChange,
  onModelChange,
  onWorkspaceChange,
  onBrowseWorkspace,
  onComplete,
}: {
  apiKeyDraft: string;
  baseURL: string;
  demoMode: boolean;
  error?: string;
  hasAPIKey: boolean;
  health?: RuntimeHealth;
  model: string;
  workspace: string;
  onAPIKeyChange(value: string): void;
  onBaseURLChange(value: string): void;
  onDemoModeChange(value: boolean): void;
  onModelChange(value: string): void;
  onWorkspaceChange(value: string): void;
  onBrowseWorkspace(): void;
  onComplete(): void;
}) {
  const canCompleteSetup = demoMode || apiKeyDraft.trim().length > 0 || hasAPIKey;
  const endpointWarning = remoteHttpWarning(baseURL);

  return (
    <div className="setup-layout">
      <div className="setup-rail">
        <div className="setup-logo">
          <Bot size={40} aria-hidden="true" />
        </div>
        <h1>Welcome to DeepSeek Agent</h1>
        <p>A native macOS shell for DeepSeek-TUI threads, tools, approvals, and local runtime status.</p>
        <FeatureBlurb icon={<ShieldCheck size={18} />} title="TUI-aligned" text="The GUI follows Plan, Agent, YOLO, approvals, and workspace boundaries." />
        <FeatureBlurb icon={<LockKeyhole size={18} />} title="Local first" text="Runtime APIs bind locally and secrets stay in native storage." />
        <FeatureBlurb icon={<Terminal size={18} />} title="Tool driven" text="Commands, tests, diffs, and commits appear as model tool calls." />
      </div>
      <section className="setup-card">
        <div className="setup-topbar">
          <BrandTitle />
        </div>
        <div className="setup-heading">
          <h2>First Run Setup</h2>
          <p>Configure a DeepSeek-compatible endpoint and local workspace.</p>
        </div>
        {error ? <div className="error-banner">{error}</div> : null}
        <SetupRow index="1" icon={<Link2 size={21} />} title="Connect to DeepSeek" description="HTTPS is recommended. Self-hosted HTTP endpoints are allowed for private deployments.">
          <div className="field-stack">
            <input aria-label="DeepSeek URL" className="field-input" value={baseURL} onChange={(event) => onBaseURLChange(event.target.value)} />
            {endpointWarning ? <p className="field-warning">{endpointWarning}</p> : null}
          </div>
        </SetupRow>
        <SetupRow index="2" icon={<KeyRound size={21} />} title="Enter your DeepSeek API key" description="Native builds store the key in macOS Keychain. Demo Mode does not require a key.">
          <input
            className="field-input"
            type="password"
            aria-label="DeepSeek API key"
            value={apiKeyDraft}
            placeholder={demoMode ? "Not required for Demo Mode" : "Paste API key"}
            onChange={(event) => onAPIKeyChange(event.target.value)}
          />
        </SetupRow>
        <SetupRow index="3" icon={<Layers3 size={21} />} title="Choose a model" description="DeepSeek-only model defaults for new threads.">
          <select aria-label="Setup model" className="field-input" value={model} onChange={(event) => onModelChange(event.target.value)}>
            {deepSeekModels.map((modelName) => <option key={modelName} value={modelName}>{modelName}</option>)}
          </select>
        </SetupRow>
        <SetupRow index="4" icon={<Folder size={21} />} title="Choose workspace folder" description="File tools are scoped to this workspace unless trust mode is enabled by the runtime.">
          <div className="workspace-picker-row">
            <input aria-label="Workspace folder" className="field-input" value={workspace} onChange={(event) => onWorkspaceChange(event.target.value)} />
            <button className="secondary-button" type="button" onClick={onBrowseWorkspace}>Browse</button>
          </div>
        </SetupRow>
        <SetupRow index="5" icon={<Sparkles size={21} />} title="Enable Demo Mode" description="Run a local simulation of the TUI thread/tool/approval flow with no API key.">
          <button className={demoMode ? "toggle on" : "toggle"} type="button" onClick={() => onDemoModeChange(!demoMode)} aria-label="Enable Demo Mode" aria-pressed={demoMode}>
            <span />
          </button>
        </SetupRow>
        <div className="setup-status-card">
          <StatusMini label="Runtime bridge" value={health?.status === "ok" ? "Responding." : "Waiting for health."} />
          <StatusMini label="Key storage" value={apiKeyDraft || hasAPIKey ? "Ready for native storage." : demoMode ? "Not required in Demo Mode." : "API key needed for real mode."} />
          <StatusMini label="Runtime model" value="DeepSeek-TUI thread and approval API." />
        </div>
        <div className="setup-actions">
          <button className="primary-button" type="button" onClick={onComplete} disabled={!canCompleteSetup} title={canCompleteSetup ? "Complete setup" : "Enter an API key or enable Demo Mode."}>
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
  onShowSettings,
  selectedThreadId,
  threads,
}: {
  activeProjectName: string;
  currentView: AppView;
  onCreateThread(): void;
  onSelectThread(id: string): void;
  onShowSettings(): void;
  selectedThreadId?: string;
  threads: RuntimeThread[];
}) {
  return (
    <aside className="left-nav">
      <div className="window-chrome">
        <BrandTitle />
      </div>
      <button className="new-thread-button" type="button" onClick={onCreateThread}>
        <Plus size={18} aria-hidden="true" />
        New thread
        <kbd>Cmd N</kbd>
      </button>
      <div className="sidebar-section projects-section">
        <p className="sidebar-label">Workspace</p>
        <div className="project-tree">
          <div className="workspace-label active">
            <Folder size={16} aria-hidden="true" />
            {activeProjectName}
          </div>
        </div>
      </div>
      <div className="sidebar-section">
        <p className="sidebar-label">Threads</p>
        <div className="thread-list">
          {threads.length > 0 ? (
            threads.map((thread, index) => (
              <button key={thread.id} className={thread.id === selectedThreadId && currentView === "thread" ? "thread-button active" : "thread-button"} type="button" onClick={() => onSelectThread(thread.id)}>
                <span>{thread.title}</span>
                <time>{index === 0 ? "now" : `${index}d`}</time>
              </button>
            ))
          ) : (
            <p className="empty-state compact">No threads yet.</p>
          )}
        </div>
      </div>
      <div className="account-row">
        <button className="account-button" type="button" onClick={onShowSettings}>
          <span className="avatar">DS</span>
          Runtime
          <ChevronDown size={14} aria-hidden="true" />
        </button>
        <button className="settings-button" type="button" onClick={onShowSettings} aria-label="Settings">
          <Settings size={17} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}

function ThreadWorkbench({
  activeTurnId,
  approvalPolicy,
  model,
  onAlwaysAllow,
  onApprovalDecision,
  onInterrupt,
  onModeChange,
  onModelChange,
  onPolicyChange,
  onPromptChange,
  onSend,
  prompt,
  runtimeModeLabel,
  threadTitle,
  timelineItems,
  tuiMode,
}: {
  activeTurnId?: string;
  approvalPolicy: ApprovalPolicy;
  model: string;
  onAlwaysAllow(approval: ApprovalRequest): void;
  onApprovalDecision(approvalId: string, decision: ApprovalDecision): void;
  onInterrupt(): void;
  onModeChange(value: TuiMode): void;
  onModelChange(value: string): void;
  onPolicyChange(value: ApprovalPolicy): void;
  onPromptChange(value: string): void;
  onSend(): void;
  prompt: string;
  runtimeModeLabel: string;
  threadTitle: string;
  timelineItems: TimelineItem[];
  tuiMode: TuiMode;
}) {
  return (
    <div className="page thread-page">
      <PageHeader eyebrow="DeepSeek-TUI client" title="Thread Workbench" subtitle={threadTitle}>
        <span className="runtime-badge">{runtimeModeLabel}</span>
      </PageHeader>
      <ModePolicyStrip tuiMode={tuiMode} approvalPolicy={approvalPolicy} onModeChange={onModeChange} onPolicyChange={onPolicyChange} />
      <div className="timeline-v2">
        {timelineItems.length > 0 ? (
          timelineItems.map((item) => (
            <TimelineCard key={item.id} item={item} onAlwaysAllow={onAlwaysAllow} onApprovalDecision={onApprovalDecision} onStopTask={onInterrupt} />
          ))
        ) : (
          <StarterCanvas onChoosePrompt={onPromptChange} />
        )}
      </div>
      <ComposerV2 activeTurnId={activeTurnId} model={model} prompt={prompt} onChange={onPromptChange} onInterrupt={onInterrupt} onModelChange={onModelChange} onSend={onSend} />
    </div>
  );
}

function ModePolicyStrip({
  approvalPolicy,
  onModeChange,
  onPolicyChange,
  tuiMode,
}: {
  approvalPolicy: ApprovalPolicy;
  onModeChange(value: TuiMode): void;
  onPolicyChange(value: ApprovalPolicy): void;
  tuiMode: TuiMode;
}) {
  const modeInfo = modeDescriptions[tuiMode];
  return (
    <Card className="mode-strip">
      <div className={`mode-summary ${modeInfo.tone}`}>
        {modeInfo.tone === "danger" ? <ShieldAlert size={18} aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="true" />}
        <div>
          <strong>{tuiMode}</strong>
          <p>{modeInfo.summary}. {modeInfo.detail}</p>
        </div>
      </div>
      <div className="settings-model-row">
        <label>
          <span>TUI mode</span>
          <select aria-label="Thread TUI mode" className="field-input" value={tuiMode} onChange={(event) => onModeChange(event.target.value as TuiMode)}>
            {(["Plan", "Agent", "YOLO"] as const).map((modeName) => <option key={modeName} value={modeName}>{modeName}</option>)}
          </select>
        </label>
        <label>
          <span>Approval policy</span>
          <select aria-label="Thread approval policy" className="field-input" value={approvalPolicy} onChange={(event) => onPolicyChange(event.target.value as ApprovalPolicy)}>
            {(["suggest", "auto", "never"] as const).map((policy) => <option key={policy} value={policy}>{policy}</option>)}
          </select>
        </label>
        <div>
          <span>Workspace boundary</span>
          <strong>workspace-write</strong>
        </div>
      </div>
    </Card>
  );
}

function TimelineCard({
  item,
  onAlwaysAllow,
  onApprovalDecision,
  onStopTask,
}: {
  item: TimelineItem;
  onAlwaysAllow(approval: ApprovalRequest): void;
  onApprovalDecision(approvalId: string, decision: ApprovalDecision): void;
  onStopTask(): void;
}) {
  if (item.kind === "approval" && item.approval) {
    const isWaitingForDecision = item.status === "waiting" && !item.approval.decision;
    const decisionLabel = item.status === "failed" ? "Stopped" : item.approval.decision === "allow" ? "Approved" : item.approval.decision === "deny" ? "Denied" : undefined;
    return (
      <Card className="timeline-card-v2 approval">
        <div className="timeline-card-heading"><span>Approval required</span><StatusPill status={item.status} /></div>
        <h3>{item.approval.title}</h3>
        <p>{item.approval.expectedSideEffect}</p>
        <dl className="approval-meta">
          <div><dt>Action</dt><dd>{item.approval.actionType}</dd></div>
          <div><dt>Tool</dt><dd>{item.approval.toolName}</dd></div>
          <div><dt>Target</dt><dd>{item.approval.cwd ?? "Current workspace"}</dd></div>
          <div><dt>Risk</dt><dd>Medium; requires explicit approval</dd></div>
        </dl>
        {item.approval.command ? <pre className="command-preview">{item.approval.command}</pre> : null}
        {isWaitingForDecision ? (
          <div className="approval-actions">
            <button className="secondary-button danger" type="button" onClick={onStopTask}>Stop</button>
            <button className="secondary-button" type="button" onClick={() => onApprovalDecision(item.approval!.approvalId, "deny")}>Deny</button>
            <button className="secondary-button" type="button" onClick={() => onAlwaysAllow(item.approval!)}>Always allow in this workspace</button>
            <button className="primary-button" type="button" onClick={() => onApprovalDecision(item.approval!.approvalId, "allow")}>Allow once</button>
          </div>
        ) : (
          <p className="approval-decision">{decisionLabel ?? "Decision recorded"}</p>
        )}
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

function RuntimeSettings({
  apiKeyDraft,
  approvalPolicy,
  autoAllowRules,
  baseURL,
  diagnosticsResult,
  hasAPIKey,
  health,
  info,
  model,
  onAPIKeyChange,
  onApprovalPolicyChange,
  onBaseURLChange,
  onClearAutoAllowRules,
  onDeleteKey,
  onModelChange,
  onPersistEndpoint,
  onPersistModel,
  onRotateKey,
  onRunDiagnostics,
  onTuiModeChange,
  tuiMode,
  usage,
  workspace,
}: {
  apiKeyDraft: string;
  approvalPolicy: ApprovalPolicy;
  autoAllowRules: string[];
  baseURL: string;
  diagnosticsResult?: string;
  hasAPIKey: boolean;
  health?: RuntimeHealth;
  info?: RuntimeInfo;
  model: string;
  onAPIKeyChange(value: string): void;
  onApprovalPolicyChange(value: ApprovalPolicy): void;
  onBaseURLChange(value: string): void;
  onClearAutoAllowRules(): void;
  onDeleteKey(): void;
  onModelChange(value: string): void;
  onPersistEndpoint(value: string): void;
  onPersistModel(value: string): void;
  onRotateKey(): void;
  onRunDiagnostics(): void;
  onTuiModeChange(value: TuiMode): void;
  tuiMode: TuiMode;
  usage?: UsageAggregation;
  workspace: string;
}) {
  const apiKeyLabel = info?.mode === "fake" ? (hasAPIKey ? "Configured; not required in Demo Mode" : "Not required in Demo Mode") : (hasAPIKey ? "Configured" : "Required");
  const endpointWarning = remoteHttpWarning(baseURL);
  return (
    <div className="page settings-page">
      <PageHeader title="Runtime Settings" subtitle="DeepSeek-TUI mode, approval policy, endpoint, and diagnostics" />
      <Card className="settings-card">
        <div className="settings-card-heading">
          <ShieldCheck size={18} aria-hidden="true" />
          <div>
            <h3>TUI Mode & Approval Policy</h3>
            <p>{modeDescriptions[tuiMode].summary}. {policyDescriptions[approvalPolicy]}</p>
          </div>
        </div>
        <div className="settings-model-row">
          <label>
            <span>TUI mode</span>
            <select aria-label="TUI mode" className="field-input" value={tuiMode} onChange={(event) => onTuiModeChange(event.target.value as TuiMode)}>
              {(["Plan", "Agent", "YOLO"] as const).map((modeName) => <option key={modeName} value={modeName}>{modeName}</option>)}
            </select>
          </label>
          <label>
            <span>Approval policy</span>
            <select aria-label="Approval policy" className="field-input" value={approvalPolicy} onChange={(event) => onApprovalPolicyChange(event.target.value as ApprovalPolicy)}>
              {(["suggest", "auto", "never"] as const).map((policy) => <option key={policy} value={policy}>{policy}</option>)}
            </select>
          </label>
          <div>
            <span>Sandbox</span>
            <strong>workspace-write</strong>
          </div>
        </div>
      </Card>
      <Card className="settings-card">
        <div className="settings-card-heading">
          <KeyRound size={18} aria-hidden="true" />
          <div>
            <h3>API Key & Storage</h3>
            <p>API key status: {apiKeyLabel}. Keys are stored through the native Keychain bridge, not WebView localStorage.</p>
          </div>
        </div>
        <div className="settings-key-row">
          <input aria-label="Runtime API key" className="field-input" type="password" value={apiKeyDraft} placeholder={hasAPIKey ? "Saved in Keychain" : "Paste API key"} onChange={(event) => onAPIKeyChange(event.target.value)} />
          <button className="secondary-button" type="button" onClick={onRotateKey}>Rotate key</button>
          <button className="secondary-button danger" type="button" onClick={onDeleteKey} disabled={!hasAPIKey} title={hasAPIKey ? "Delete saved API key" : "No API key is saved."}>Delete key</button>
        </div>
      </Card>
      <Card className="settings-card">
        <div className="settings-card-heading">
          <Link2 size={18} aria-hidden="true" />
          <div>
            <h3>Endpoint</h3>
            <p>HTTPS is recommended. HTTP is allowed for self-hosted or private-network endpoints.</p>
          </div>
        </div>
        <div className="field-stack">
          <input aria-label="Settings endpoint" className="field-input" value={baseURL} onChange={(event) => onBaseURLChange(event.target.value)} onBlur={(event) => onPersistEndpoint(event.currentTarget.value)} />
          {endpointWarning ? <p className="field-warning">{endpointWarning}</p> : null}
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
        <select aria-label="Settings model" className="field-input" value={model} onChange={(event) => { onModelChange(event.target.value); onPersistModel(event.target.value); }}>
          {deepSeekModels.map((modelName) => <option key={modelName} value={modelName}>{modelName}</option>)}
        </select>
      </Card>
      <Card className="settings-card">
        <div className="settings-card-heading">
          <Folder size={18} aria-hidden="true" />
          <div>
            <h3>Workspace Boundary</h3>
            <p>File tools are restricted to the workspace unless the runtime enters trust mode.</p>
          </div>
        </div>
        <dl className="runtime-list">
          <div><dt>Workspace</dt><dd>{workspace}</dd></div>
          <div><dt>Sandbox</dt><dd>workspace-write</dd></div>
          <div><dt>Trust mode</dt><dd>{tuiMode === "YOLO" ? "enabled by mode" : "off"}</dd></div>
        </dl>
      </Card>
      <Card className="settings-card">
        <div className="settings-card-heading">
          <Gauge size={18} aria-hidden="true" />
          <div>
            <h3>Diagnostics</h3>
            <p>{diagnosticsResult ?? "Run a local bridge/runtime diagnostic before handing the app to testers."}</p>
          </div>
        </div>
        <button className="secondary-button" type="button" onClick={onRunDiagnostics}>Run diagnostics</button>
      </Card>
      <Card className="settings-card">
        <h3>Runtime Capabilities</h3>
        <div className="capability-row">
          {(info?.capabilities.length ? info.capabilities : ["threads", "turns", "events", "approvals"]).map((capability) => <span key={capability} className="pill low">{capability}</span>)}
        </div>
      </Card>
      <Card className="settings-card">
        <h3>Scoped Auto-Allow Rules</h3>
        {autoAllowRules.length ? (
          <>
            <ul className="check-list">
              {autoAllowRules.map((rule) => <li key={rule}>{rule}</li>)}
            </ul>
            <button className="secondary-button" type="button" onClick={onClearAutoAllowRules}>Clear auto-allow rules</button>
          </>
        ) : (
          <p className="empty-state">No scoped rules saved yet.</p>
        )}
      </Card>
      <Card className="settings-card">
        <h3>Usage</h3>
        <dl className="runtime-list">
          <div><dt>Total spend</dt><dd>{usage ? `$${usage.totalCost.toFixed(4)}` : "$0.0000"}</dd></div>
          <div><dt>Input tokens</dt><dd>{usage?.inputTokens.toLocaleString() ?? "0"}</dd></div>
          <div><dt>Output tokens</dt><dd>{usage?.outputTokens.toLocaleString() ?? "0"}</dd></div>
          <div><dt>Runtime</dt><dd>{health?.status ?? "unknown"}</dd></div>
        </dl>
      </Card>
    </div>
  );
}

function RuntimeInspector({
  approvalPolicy,
  autoAllowRules,
  capabilities,
  hasAPIKey,
  health,
  info,
  model,
  onClearAutoAllowRules,
  pendingApproval,
  tuiMode,
  usage,
  workspace,
}: {
  approvalPolicy: ApprovalPolicy;
  autoAllowRules: string[];
  capabilities: string[];
  hasAPIKey: boolean;
  health?: RuntimeHealth;
  info?: RuntimeInfo;
  model: string;
  onClearAutoAllowRules(): void;
  pendingApproval?: TimelineItem;
  tuiMode: TuiMode;
  usage?: UsageAggregation;
  workspace: string;
}) {
  const modeInfo = modeDescriptions[tuiMode];
  return (
    <aside className="right-inspector">
      <InspectorHeader title="Runtime" />
      <InspectorCard title="Mode">
        <StatusValue label={tuiMode} tone={modeInfo.tone === "danger" ? "danger" : "ok"} />
        <p className="empty-state compact">{modeInfo.summary}</p>
      </InspectorCard>
      <InspectorCard title="Approval policy">
        <strong>{approvalPolicy}</strong>
        <p className="empty-state compact">{policyDescriptions[approvalPolicy]}</p>
      </InspectorCard>
      <InspectorCard title="Workspace boundary">
        <dl className="runtime-list">
          <div><dt>Workspace</dt><dd>{workspace}</dd></div>
          <div><dt>Sandbox</dt><dd>workspace-write</dd></div>
          <div><dt>Trust</dt><dd>{tuiMode === "YOLO" ? "on" : "off"}</dd></div>
        </dl>
      </InspectorCard>
      <RuntimeCard hasAPIKey={hasAPIKey} health={health} info={info} model={model} />
      <InspectorCard title="Pending approval">
        {pendingApproval?.approval ? <p>{pendingApproval.approval.toolName}: {pendingApproval.approval.command ?? pendingApproval.approval.actionType}</p> : <p className="empty-state">No pending approval.</p>}
      </InspectorCard>
      <InspectorCard title="Auto-allow rules">
        {autoAllowRules.length ? (
          <>
            <ul className="check-list">
              {autoAllowRules.map((rule) => <li key={rule}>{rule}</li>)}
            </ul>
            <button className="text-button" type="button" onClick={onClearAutoAllowRules}>Clear rules</button>
          </>
        ) : (
          <p className="empty-state">None saved.</p>
        )}
      </InspectorCard>
      <InspectorCard title="Capabilities">
        <div className="capability-row">
          {capabilities.map((capability) => <span key={capability} className="pill low">{capability}</span>)}
        </div>
      </InspectorCard>
      <InspectorCard title="Usage">
        <dl className="runtime-list">
          <div><dt>Turns</dt><dd>{usage?.completedTurns ?? 0}</dd></div>
          <div><dt>Tokens</dt><dd>{((usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0)).toLocaleString()}</dd></div>
        </dl>
      </InspectorCard>
    </aside>
  );
}

function CommandPalette({ onClose, onRun }: { onClose(): void; onRun(command: NativeCommand): void }) {
  const commands: Array<{ command: NativeCommand; key: string; title: string; description: string }> = [
    { command: "newThread", key: "Cmd N", title: "New thread", description: "Start a fresh DeepSeek Agent task." },
    { command: "settings", key: "Cmd ,", title: "Runtime Settings", description: "Adjust model, mode, policy, and runtime state." },
    { command: "stopTurn", key: "Cmd .", title: "Stop current turn", description: "Interrupt the active agent run." },
    { command: "demoRuntime", key: "", title: "Use Demo Runtime", description: "Explore without a DeepSeek API key." },
  ];

  return (
    <div className="command-palette-backdrop" role="presentation" onClick={onClose}>
      <section className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette" onClick={(event) => event.stopPropagation()}>
        <div className="command-palette-header">
          <Sparkles size={18} aria-hidden="true" />
          <div>
            <p>Command Palette</p>
            <span>Run TUI-aligned DeepSeek Agent actions</span>
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

function ComposerV2({
  activeTurnId,
  model,
  onChange,
  onInterrupt,
  onModelChange,
  onSend,
  prompt,
}: {
  activeTurnId?: string;
  model: string;
  onChange(value: string): void;
  onInterrupt(): void;
  onModelChange(value: string): void;
  onSend(): void;
  prompt: string;
}) {
  return (
    <form className="composer-v2" onSubmit={(event) => { event.preventDefault(); onSend(); }}>
      <textarea aria-label="Prompt" value={prompt} placeholder="Ask DeepSeek to inspect, explain, plan, or request tool approval..." onChange={(event) => onChange(event.target.value)} />
      <div className="composer-meta">
        <select aria-label="Composer model" value={model} onChange={(event) => onModelChange(event.target.value)}>
          {deepSeekModels.map((modelName) => <option key={modelName} value={modelName}>{modelName}</option>)}
        </select>
        <span className="composer-spacer" />
        {activeTurnId ? (
          <button className="secondary-button" type="button" onClick={onInterrupt}>
            <Square size={15} aria-hidden="true" />
            Stop turn
          </button>
        ) : null}
        <button className="send-button" type="submit" aria-label="Send prompt" disabled={!prompt.trim()}>
          <Send size={18} aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}

function StarterCanvas({ onChoosePrompt }: { onChoosePrompt(value: string): void }) {
  return (
    <Card className="starter-canvas">
      <div>
        <h3>New chat</h3>
        <p>Start a focused DeepSeek Agent turn for this workspace.</p>
      </div>
      <div className="starter-prompts">
        {suggestedPrompts.map(([title, body]) => (
          <button key={title} type="button" onClick={() => onChoosePrompt(title)}>
            <Sparkles size={16} aria-hidden="true" />
            <span><strong>{title}</strong><small>{body}</small></span>
          </button>
        ))}
      </div>
    </Card>
  );
}

function SettingsModal({
  apiKeyDraft,
  hasAPIKey,
  onAPIKeyChange,
  onClose,
  onDeleteKey,
  onSaveKey,
}: {
  apiKeyDraft: string;
  hasAPIKey: boolean;
  onAPIKeyChange(value: string): void;
  onClose(): void;
  onDeleteKey(): void;
  onSaveKey(): void;
}) {
  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <section className="settings-sheet" role="dialog" aria-modal="true" aria-label="Rotate API key" onClick={(event) => event.stopPropagation()}>
        <header className="sheet-header">
          <h2>Rotate API key</h2>
          <button className="icon-only" type="button" aria-label="Close sheet" onClick={onClose}><X size={16} aria-hidden="true" /></button>
        </header>
        <p className="empty-state">Enter a new DeepSeek API key. The app saves it through the native Keychain bridge and then clears this field.</p>
        <input className="field-input" type="password" value={apiKeyDraft} placeholder={hasAPIKey ? "New API key" : "Paste API key"} onChange={(event) => onAPIKeyChange(event.target.value)} autoFocus />
        <div className="sheet-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
          <button className="secondary-button danger" type="button" disabled={!hasAPIKey} onClick={onDeleteKey}>Delete key</button>
          <button className="primary-button" type="button" disabled={!apiKeyDraft.trim()} onClick={onSaveKey}>Save key</button>
        </div>
      </section>
    </div>
  );
}

function RuntimeCard({ hasAPIKey, health, info, model }: { hasAPIKey: boolean; health?: RuntimeHealth; info?: RuntimeInfo; model: string }) {
  return (
    <InspectorCard title="Runtime">
      <div className="runtime-line"><span className={`status-dot ${health?.status === "ok" ? "ok" : "offline"}`} /> deepseek-runtime-api</div>
      <dl className="runtime-list">
        <div><dt>Mode</dt><dd>{info?.mode === "fake" ? "demo" : info?.mode ?? "unknown"}</dd></div>
        <div><dt>Runtime</dt><dd>{info?.runtimeVersion ?? "not probed"}</dd></div>
        <div><dt>API key</dt><dd>{runtimeAPIKeyStatusLabel(info, hasAPIKey)}</dd></div>
        <div><dt>Model</dt><dd>{model}</dd></div>
      </dl>
    </InspectorCard>
  );
}

function PageHeader({ children, eyebrow, subtitle, title }: { children?: ReactNode; eyebrow?: string; subtitle?: string; title: string }) {
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

function Card({ children, className = "", title }: { children: ReactNode; className?: string; title?: string }) {
  return <section className={`deepseek-card ${className}`}>{title ? <h3>{title}</h3> : null}{children}</section>;
}

function InspectorCard({ children, title }: { children?: ReactNode; title?: string }) {
  return <section className="inspector-card">{title ? <h3>{title}</h3> : null}{children}</section>;
}

function InspectorHeader({ title }: { title: string }) {
  return <header className="inspector-header"><h2>{title}</h2></header>;
}

function StatusValue({ label, tone }: { label: string; tone: "ok" | "danger" }) {
  return <p className={tone === "ok" ? "status-value ok" : "status-value danger"}><span className={`status-dot ${tone}`} />{label}</p>;
}

function FeatureBlurb({ icon, text, title }: { icon: ReactNode; text: string; title: string }) {
  return <div className="feature-blurb"><span>{icon}</span><div><strong>{title}</strong><p>{text}</p></div></div>;
}

function SetupRow({ children, description, icon, index, title }: { children: ReactNode; description: string; icon: ReactNode; index: string; title: string }) {
  return <div className="setup-row"><span className="step-index">{index}</span><span className="row-icon">{icon}</span><div><strong>{title}</strong><p>{description}</p></div><div className="row-control">{children}</div></div>;
}

function StatusMini({ label, value }: { label: string; value: string }) {
  return <div className="status-mini"><span className="status-dot ok" /><div><strong>{label}</strong><p>{value}</p></div></div>;
}

function BrandTitle() {
  return <div className="brand-title"><PanelLeft size={18} aria-hidden="true" /><strong>DeepSeek Agent</strong><ChevronDown size={14} aria-hidden="true" /></div>;
}

function StatusPill({ status }: { status: TimelineItem["status"] }) {
  return <span className={`status-pill status-${status}`}>{status === "completed" ? <CheckCircle2 size={14} aria-hidden="true" /> : <Clock3 size={14} aria-hidden="true" />}{status}</span>;
}
