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

type AppView = "setup" | "project" | "thread" | "review" | "settings" | "automations" | "skills";
type NativeCommand = "newThread" | "commandPalette" | "settings" | "review" | "stopTurn" | "demoRuntime" | "automations" | "skills";
type SettingsSheet = "account" | "rotateKey" | null;

const previewViews = new Set<AppView>(["setup", "project", "thread", "review", "settings", "automations", "skills"]);

function initialPreviewView(): AppView {
  const value = new URLSearchParams(window.location.search).get("view") as AppView | null;
  return value && previewViews.has(value) ? value : "setup";
}

const demoProjects = [
  { name: "Demo workspace", folders: ["src", "tests", "docs", "scripts"] },
];

const deepSeekModels = ["deepseek-v4-flash", "deepseek-v4-pro"];

type ReviewDecision = "accepted" | "rejected";
type ReviewFile = { path: string; additions: number; deletions: number; status: string; summary: string; diff: string[] };

const demoReviewFiles: ReviewFile[] = [
  {
    path: "web/src/embedded/chat/App.tsx",
    additions: 48,
    deletions: 12,
    status: "modified",
    summary: "Wires Demo Mode into the product review flow and disables empty actions.",
    diff: [
      "function completeSetup(settings: RuntimeSettings) {",
      "- return startRuntime(settings);",
      "+ const checked = validateEndpoint(settings.baseURL);",
      "+ return startRuntime({ ...settings, baseURL: checked });",
      "}",
    ],
  },
  {
    path: "web/src/bridge/FakeAgentBridge.ts",
    additions: 36,
    deletions: 4,
    status: "modified",
    summary: "Adds deterministic fake runtime events for approval, file review, and test evidence.",
    diff: [
      "async respondApproval(approvalId: string, decision: ApprovalDecision) {",
      "- return this.runtime.respondApproval(approvalId, decision);",
      "+ const event = createReviewQueueEvent(approvalId, decision);",
      "+ this.emit(event);",
      "+ return this.runtime.respondApproval(approvalId, decision);",
      "}",
    ],
  },
  {
    path: "docs/07_ACCEPTANCE_CHECKLIST.md",
    additions: 18,
    deletions: 2,
    status: "modified",
    summary: "Documents the end-to-end product acceptance checks for tester handoff.",
    diff: [
      "## Review changes",
      "- Static diff is acceptable",
      "+ Empty review has no fake diff",
      "+ Accepted files enable commit only with a message",
    ],
  },
];

const recentRuns = [
  ["Run #04", "Inspect workspace and summarize launch risks", "21.6s", "Completed"],
  ["Run #03", "Prepare focused verification checklist", "18.9s", "Completed"],
  ["Run #02", "Review runtime setup flow", "24.1s", "Completed"],
  ["Run #01", "Create first local agent thread", "12.4s", "Completed"],
];

const suggestedPrompts = [
  ["Explain this project", "Summarize structure, risks, and next useful commands"],
  ["Find risky changes", "Review changed files and likely test coverage gaps"],
  ["Write tests for this module", "Create focused unit or interaction tests"],
  ["Plan a refactor", "Create a small implementation plan with verification steps"],
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
  const [reviewMode, setReviewMode] = useState<"split" | "unified">("split");
  const [reviewFiles, setReviewFiles] = useState<ReviewFile[]>([]);
  const [reviewDecisions, setReviewDecisions] = useState<Record<string, ReviewDecision>>({});
  const [commitMessage, setCommitMessage] = useState("Review generated changes");
  const [reviewedFiles, setReviewedFiles] = useState(new Set<string>());
  const [selectedReviewFiles, setSelectedReviewFiles] = useState(new Set<string>());
  const [actionNote, setActionNote] = useState<string>();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [settingsSheet, setSettingsSheet] = useState<SettingsSheet>(null);
  const [diagnosticsResult, setDiagnosticsResult] = useState<string>();
  const [temperature, setTemperature] = useState(() => loadPreference("deepseek-agent.temperature", "0.2"));
  const [temperatureError, setTemperatureError] = useState<string>();
  const [reasoningEffort, setReasoningEffort] = useState(() => loadPreference("deepseek-agent.reasoningEffort", "High"));
  const [maxOutputTokens, setMaxOutputTokens] = useState(() => loadPreference("deepseek-agent.maxOutputTokens", "4096"));
  const [appearanceMode, setAppearanceMode] = useState(() => loadPreference("deepseek-agent.appearanceMode", "Light"));
  const [accentColor, setAccentColor] = useState(() => loadPreference("deepseek-agent.accentColor", "#3366ff"));
  const [workspaceToggles, setWorkspaceToggles] = useState<Record<string, boolean>>({
    "Auto-apply safe edits": loadPreference("deepseek-agent.toggle.autoApply", "false") === "true",
    "Confirm destructive actions": loadPreference("deepseek-agent.toggle.confirmDestructive", "true") !== "false",
    "Code suggestions": loadPreference("deepseek-agent.toggle.codeSuggestions", "true") !== "false",
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
        if (runtimeSettings.baseURL) {
          setBaseURL(runtimeSettings.baseURL);
        }
        if (runtimeSettings.model) {
          setModel(runtimeSettings.model);
        }
        setHasAPIKey(runtimeSettings.hasAPIKey);
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
    document.documentElement.style.setProperty("--ds-accent", accentColor);
    savePreference("deepseek-agent.accentColor", accentColor);
    savePreference("deepseek-agent.appearanceMode", appearanceMode);
  }, [accentColor, appearanceMode]);

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

  useEffect(() => {
    if (!selectedThreadId || view !== "thread") {
      return;
    }
    const threadId = selectedThreadId;
    const hasActiveItems = threadState.items.some((item) => item.status === "running" || item.status === "waiting");
    const intervalMs = info?.mode === "fake" || hasActiveItems ? 700 : 2500;
    const interval = window.setInterval(() => {
      void bridge.getThread(threadId).then((detail) => {
        setThreadState(createInitialThreadState(detail.thread, detail.items, detail.lastSeq));
      });
    }, intervalMs);
    return () => window.clearInterval(interval);
  }, [bridge, info?.mode, selectedThreadId, threadState.items, view]);

  async function refreshUsage() {
    setUsage(await bridge.getUsage());
  }

  async function refreshThreadDetail(threadId: string) {
    const detail = await bridge.getThread(threadId);
    setThreadState(createInitialThreadState(detail.thread, detail.items, detail.lastSeq));
  }

  async function createThread() {
    const thread = await bridge.createThread({ title: "New chat", projectPath });
    setThreads(await bridge.listThreads({ limit: 20 }));
    setSelectedThreadId(thread.id);
    setReviewFiles([]);
    setReviewDecisions({});
    setSelectedReviewFiles(new Set());
    setReviewedFiles(new Set());
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
      setView("project");
      setActionNote(demoMode ? "Demo Mode is ready without an API key." : "Settings saved to native storage. DeepSeek runtime is starting.");
    } catch (setupError) {
      setError(setupError instanceof Error ? setupError.message : "Failed to save runtime settings");
    }
  }

  function selectThread(id: string) {
    setSelectedThreadId(id);
    setSelectedReviewFiles(new Set());
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
    if (decision === "allow" && demoRuntime) {
      setReviewFiles(demoReviewFiles);
      setReviewDecisions({});
      setReviewedFiles(new Set());
      setSelectedReviewFiles(new Set());
    }
    if (selectedThreadId) {
      await refreshThreadDetail(selectedThreadId);
    }
    await refreshUsage();
  }

  function markReviewed(path: string) {
    setReviewedFiles((current) => {
      const next = new Set(current);
      next.add(path);
      return next;
    });
  }

  function toggleSelectedReviewFile(path: string) {
    setSelectedReviewFiles((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
    markReviewed(path);
  }

  function applySelectedReviewFiles() {
    if (selectedReviewFiles.size === 0) {
      setActionNote("Select a changed file before applying.");
      return;
    }
    setReviewDecisions((current) => {
      const next = { ...current };
      selectedReviewFiles.forEach((path) => {
        next[path] = "accepted";
      });
      return next;
    });
    setReviewedFiles((current) => {
      const next = new Set(current);
      selectedReviewFiles.forEach((path) => next.add(path));
      return next;
    });
    setActionNote(`Accepted ${selectedReviewFiles.size} ${selectedReviewFiles.size === 1 ? "file" : "files"}.`);
    setSelectedReviewFiles(new Set());
  }

  function rejectSelectedReviewFiles() {
    if (selectedReviewFiles.size === 0) {
      setActionNote("Select a changed file before rejecting.");
      return;
    }
    setReviewDecisions((current) => {
      const next = { ...current };
      selectedReviewFiles.forEach((path) => {
        next[path] = "rejected";
      });
      return next;
    });
    setReviewedFiles((current) => {
      const next = new Set(current);
      selectedReviewFiles.forEach((path) => next.add(path));
      return next;
    });
    setActionNote(`Rejected ${selectedReviewFiles.size} ${selectedReviewFiles.size === 1 ? "file" : "files"}.`);
    setSelectedReviewFiles(new Set());
  }

  function commitAcceptedReviewFiles() {
    const acceptedCount = Object.values(reviewDecisions).filter((decision) => decision === "accepted").length;
    if (acceptedCount === 0 || !commitMessage.trim()) {
      setActionNote("Accept at least one file and enter a commit message before committing.");
      return;
    }
    setActionNote(`Commit preview is ready for ${acceptedCount} ${acceptedCount === 1 ? "file" : "files"}.`);
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

  function updateTemperature(value: string) {
    setTemperature(value);
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 2) {
      setTemperatureError("Temperature must be between 0 and 2.");
      return;
    }
    setTemperatureError(undefined);
    savePreference("deepseek-agent.temperature", value);
  }

  function updateReasoningEffort(value: string) {
    setReasoningEffort(value);
    savePreference("deepseek-agent.reasoningEffort", value);
  }

  function updateMaxOutputTokens(value: string) {
    setMaxOutputTokens(value);
    savePreference("deepseek-agent.maxOutputTokens", value);
  }

  function toggleWorkspacePreference(label: string) {
    setWorkspaceToggles((current) => {
      const next = { ...current, [label]: !current[label] };
      const storageKeys: Record<string, string> = {
        "Auto-apply safe edits": "deepseek-agent.toggle.autoApply",
        "Confirm destructive actions": "deepseek-agent.toggle.confirmDestructive",
        "Code suggestions": "deepseek-agent.toggle.codeSuggestions",
      };
      savePreference(storageKeys[label], String(next[label]));
      return next;
    });
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
          .then((snapshot) => {
            setHasAPIKey(snapshot.hasAPIKey);
            setSetupComplete(true);
            setView("project");
            setActionNote("Demo Mode is ready without an API key.");
          })
          .catch((demoError: unknown) => {
            setError(demoError instanceof Error ? demoError.message : "Failed to switch to Demo Mode");
          });
        break;
      case "automations":
        setSetupComplete(true);
        setView("automations");
        break;
      case "skills":
        setSetupComplete(true);
        setView("skills");
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
  const hasReviewChanges = reviewFiles.length > 0;
  const acceptedCount = Object.values(reviewDecisions).filter((decision) => decision === "accepted").length;
  const rejectedCount = Object.values(reviewDecisions).filter((decision) => decision === "rejected").length;

  return (
    <div className="deepseek-wallpaper" data-appearance={appearanceMode.toLowerCase()}>
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
            onBrowseWorkspace={() => {
              setWorkspace("~/DeepSeekAgent");
              setActionNote("Demo workspace selected. Native folder picker will replace this placeholder after signing.");
            }}
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
              onAction={setActionNote}
              onSelectThread={selectThread}
              onShowProject={() => setView("project")}
              onShowSettings={() => setView("settings")}
              onShowReview={() => setView("review")}
              onShowAutomations={() => setView("automations")}
              onShowSkills={() => setView("skills")}
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
                <ProjectCommandCenter isDemo={demoRuntime} model={model} projectName={workspaceName} onAction={setActionNote} onCreateThread={() => void createThread()} onShowReview={() => setView("review")} />
              ) : null}
              {view === "thread" ? (
                <ActiveThread
                  activeTurnId={threadState.activeTurnId}
                  files={reviewFiles}
                  hasReviewChanges={hasReviewChanges}
                  model={model}
                  onModelChange={(nextModel) => void updateModelPreference(nextModel)}
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
                  hasChanges={hasReviewChanges}
                  mode={reviewMode}
                  selectedFiles={selectedReviewFiles}
                  files={reviewFiles}
                  reviewDecisions={reviewDecisions}
                  acceptedCount={acceptedCount}
                  rejectedCount={rejectedCount}
                  commitMessage={commitMessage}
                  reviewedFiles={reviewedFiles}
                  threadTitle={activeThreadTitle}
                  onModeChange={setReviewMode}
                  onToggleFile={toggleSelectedReviewFile}
                  onApplySelected={applySelectedReviewFiles}
                  onRejectSelected={rejectSelectedReviewFiles}
                  onCommit={commitAcceptedReviewFiles}
                  onCommitMessageChange={setCommitMessage}
                  onAction={setActionNote}
                  runtimeAvailable={health?.status === "ok"}
                />
              ) : null}
              {view === "automations" ? (
                <AutomationsPage onAction={setActionNote} />
              ) : null}
              {view === "skills" ? (
                <SkillsPage onAction={setActionNote} />
              ) : null}
              {view === "settings" ? (
                <SettingsUsage
                  apiKeyDraft={apiKeyDraft}
                  appearanceMode={appearanceMode}
                  baseURL={baseURL}
                  diagnosticsResult={diagnosticsResult}
                  hasAPIKey={hasAPIKey}
                  health={health}
                  info={info}
                  maxOutputTokens={maxOutputTokens}
                  model={model}
                  reasoningEffort={reasoningEffort}
                  temperature={temperature}
                  temperatureError={temperatureError}
                  toggles={workspaceToggles}
                  usage={usage}
                  accentColor={accentColor}
                  onAPIKeyChange={setApiKeyDraft}
                  onAppearanceModeChange={(value) => {
                    setAppearanceMode(value);
                    savePreference("deepseek-agent.appearanceMode", value);
                    setActionNote(`Appearance set to ${value}.`);
                  }}
                  onAccentColorChange={setAccentColor}
                  onDeleteKey={() => void deleteAPIKey()}
                  onRunDiagnostics={() => void runDiagnostics()}
                  onBaseURLChange={setBaseURL}
                  onPersistEndpoint={(nextBaseURL) => void persistRuntimePreference({ baseURL: nextBaseURL, startRuntime: false }).then(() => setActionNote("Endpoint preference saved."))}
                  onModelChange={setModel}
                  onPersistModel={(nextModel) => void updateModelPreference(nextModel)}
                  onMaxOutputTokensChange={updateMaxOutputTokens}
                  onReasoningEffortChange={updateReasoningEffort}
                  onManageAccount={() => setSettingsSheet("account")}
                  onRotateKey={() => setSettingsSheet("rotateKey")}
                  onTemperatureChange={updateTemperature}
                  onTogglePreference={toggleWorkspacePreference}
                />
              ) : null}
            </section>
            <RightInspector
              view={view}
              isDemo={demoRuntime}
              hasAPIKey={hasAPIKey}
              health={health}
              info={info}
              usage={usage}
              model={model}
              reviewedFiles={reviewedFiles}
              reviewDecisions={reviewDecisions}
              acceptedCount={acceptedCount}
              rejectedCount={rejectedCount}
              commitMessage={commitMessage}
              selectedFiles={selectedReviewFiles}
              files={reviewFiles}
              hasReviewChanges={hasReviewChanges}
              runtimeAvailable={health?.status === "ok"}
              onShowReview={() => setView("review")}
              onCreateThread={() => void createThread()}
              onAction={setActionNote}
              onApplySelected={applySelectedReviewFiles}
              onRejectSelected={rejectSelectedReviewFiles}
              onCommit={commitAcceptedReviewFiles}
              onCommitMessageChange={setCommitMessage}
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
          sheet={settingsSheet}
          onAPIKeyChange={setApiKeyDraft}
          onClose={() => setSettingsSheet(null)}
          onDeleteKey={() => void deleteAPIKey()}
          onSaveKey={() => void saveRotatedKey()}
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
}: SetupScreenProps) {
  const canCompleteSetup = demoMode || apiKeyDraft.trim().length > 0 || hasAPIKey;

  return (
    <div className="setup-layout">
      <div className="setup-rail">
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
          <button className="text-button" type="button" disabled title="Help opens after onboarding docs are bundled.">
            Need help?
          </button>
        </div>
        <div className="setup-heading">
          <h2>First Run Setup</h2>
          <p>Let's get DeepSeek Agent ready on your Mac.</p>
        </div>
        {error ? <div className="error-banner">{error}</div> : null}
        <SetupRow index="1" icon={<Link2 size={21} />} title="Connect to DeepSeek" description="Use a DeepSeek-compatible endpoint. HTTPS is recommended; private HTTP endpoints are allowed by the native runtime.">
          <input aria-label="DeepSeek URL" className="field-input" value={baseURL} onChange={(event) => onBaseURLChange(event.target.value)} />
        </SetupRow>
        <SetupRow index="2" icon={<KeyRound size={21} />} title="Enter your DeepSeek API key" description="The key is never written to WebView localStorage. Native builds store it in macOS Keychain.">
          <input
            className="field-input"
            type="password"
            aria-label="DeepSeek API key"
            value={apiKeyDraft}
            placeholder={demoMode ? "Not required for Demo Mode" : "Paste API key"}
            onChange={(event) => onAPIKeyChange(event.target.value)}
          />
        </SetupRow>
        <SetupRow index="3" icon={<Layers3 size={21} />} title="Choose a model" description="DeepSeek-only model defaults for new agent threads.">
          <select aria-label="Setup model" className="field-input" value={model} onChange={(event) => onModelChange(event.target.value)}>
            {deepSeekModels.map((modelName) => <option key={modelName} value={modelName}>{modelName}</option>)}
          </select>
        </SetupRow>
        <SetupRow index="4" icon={<Folder size={21} />} title="Choose workspace folder" description="This is where your projects and agent data will live.">
          <div className="workspace-picker-row">
            <input aria-label="Workspace folder" className="field-input" value={workspace} onChange={(event) => onWorkspaceChange(event.target.value)} />
            <button className="secondary-button" type="button" onClick={onBrowseWorkspace}>Browse</button>
          </div>
        </SetupRow>
        <SetupRow index="5" icon={<Sparkles size={21} />} title="Enable Demo Mode" description="Explore the app with a local demo runtime and no API key.">
          <button className={demoMode ? "toggle on" : "toggle"} type="button" onClick={() => onDemoModeChange(!demoMode)} aria-label="Enable Demo Mode" aria-pressed={demoMode}>
            <span />
          </button>
        </SetupRow>
        <div className="setup-status-card">
          <StatusMini label="Sidecar ready" value={health?.status === "ok" ? "Runtime bridge is responding." : "Waiting for runtime health."} />
          <StatusMini label="Key storage" value={apiKeyDraft || hasAPIKey ? "Ready for secure native storage." : demoMode ? "Not required for Demo Mode." : "API key needed for real mode."} />
          <StatusMini label="Runtime compatible" value="DeepSeek-TUI Runtime API mapped." />
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
  onAction,
  onSelectThread,
  onShowProject,
  onShowAutomations,
  onShowSkills,
  onShowReview,
  onShowSettings,
  projects,
  selectedThreadId,
  threads,
}: {
  activeProjectName: string;
  currentView: AppView;
  onCreateThread(): void;
  onAction(message: string): void;
  onSelectThread(id: string): void;
  onShowProject(): void;
  onShowAutomations(): void;
  onShowSkills(): void;
  onShowReview(): void;
  onShowSettings(): void;
  projects: Array<{ name: string; folders: string[] }>;
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
        <kbd>⌘ N</kbd>
      </button>
      <nav className="primary-nav" aria-label="Primary navigation">
        <NavButton active={currentView === "automations"} icon={<Sparkles size={17} />} label="Automations" onClick={onShowAutomations} />
        <NavButton active={currentView === "skills"} icon={<Layers3 size={17} />} label="Skills" onClick={onShowSkills} />
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
          <button type="button" aria-label="Add project" disabled title="Project picker is coming in the next alpha.">
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
                <button key={folder} className="folder-button" type="button" onClick={() => onAction(`${folder} folder selected. Runtime file browser wiring is coming next.`)}>
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
  onAction,
  onCreateThread,
  onShowReview,
  projectName,
}: {
  isDemo: boolean;
  model: string;
  onAction(message: string): void;
  onCreateThread(): void;
  onShowReview(): void;
  projectName: string;
}) {
  return (
    <div className="page project-page">
      <PageHeader eyebrow="Project" title="Project Command Center" subtitle={projectName}>
        <button className="secondary-button" type="button" onClick={() => onAction("Open in IDE is queued for native workspace wiring.")}>
          <Code2 size={16} aria-hidden="true" />
          Open in IDE
        </button>
        <button className="icon-only" type="button" aria-label="More project actions" onClick={() => onAction("Project action menu is not expanded in this alpha.")}>
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
          {isDemo ? <CardLink label="View all tasks" onClick={() => onAction("Task history is visible in Demo Mode.")} /> : null}
        </Card>
        <Card title="Suggested prompts">
          <PromptList onCreateThread={onCreateThread} />
          <CardLink label="See more prompts" onClick={() => onAction("Prompt catalog is limited to four starter prompts in this alpha.")} />
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
              <CardLink label="View all runs" onClick={() => onAction("Run history is shown as demo data in this alpha.")} />
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
  files,
  hasReviewChanges,
  model,
  onModelChange,
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
  files: ReviewFile[];
  hasReviewChanges: boolean;
  model: string;
  onModelChange(value: string): void;
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
  const items = timelineItems;
  return (
    <div className="page thread-page">
      <PageHeader eyebrow="Active thread" title={threadTitle}>
        <span className="runtime-badge">{runtimeModeLabel}</span>
        <button className="icon-only" type="button" aria-label="More thread actions" onClick={onShowReview}>
          <MoreHorizontal size={18} aria-hidden="true" />
        </button>
      </PageHeader>
      <div className="timeline-v2">
        {items.length > 0 ? (
          items.map((item) => (
            <TimelineCard key={item.id} item={item} onApprovalDecision={onApprovalDecision} onStopTask={onInterrupt} />
          ))
        ) : (
          <StarterCanvas onChoosePrompt={onPromptChange} />
        )}
        {hasReviewChanges ? <FilesChangedCard files={files} onOpenReview={onShowReview} /> : null}
        {hasReviewChanges ? <TerminalEvidenceCard /> : null}
      </div>
      <ComposerV2 activeTurnId={activeTurnId} model={model} prompt={prompt} onChange={onPromptChange} onInterrupt={onInterrupt} onModelChange={onModelChange} onSend={onSend} />
    </div>
  );
}

function ReviewChanges({
  acceptedCount,
  commitMessage,
  files,
  hasChanges,
  mode,
  onAction,
  onApplySelected,
  onCommit,
  onCommitMessageChange,
  onModeChange,
  onRejectSelected,
  onToggleFile,
  rejectedCount,
  reviewDecisions,
  reviewedFiles,
  runtimeAvailable,
  selectedFiles,
  threadTitle,
}: {
  acceptedCount: number;
  commitMessage: string;
  files: ReviewFile[];
  hasChanges: boolean;
  mode: "split" | "unified";
  onAction(message: string): void;
  onApplySelected(): void;
  onCommit(): void;
  onCommitMessageChange(value: string): void;
  onModeChange(mode: "split" | "unified"): void;
  onRejectSelected(): void;
  onToggleFile(path: string): void;
  rejectedCount: number;
  reviewDecisions: Record<string, ReviewDecision>;
  reviewedFiles: Set<string>;
  runtimeAvailable: boolean;
  selectedFiles: Set<string>;
  threadTitle: string;
}) {
  const selectedCount = selectedFiles.size;
  const additions = files.reduce((total, file) => total + file.additions, 0);
  const deletions = files.reduce((total, file) => total + file.deletions, 0);
  const selectedPrimaryPath = Array.from(selectedFiles)[0];
  const selectedFile = files.find((file) => file.path === selectedPrimaryPath) ?? files[0];
  const primaryFile = selectedFile?.path ?? "Selected change";
  return (
    <div className="page review-page">
      <PageHeader eyebrow="Active thread" title={threadTitle}>
        <span className="runtime-badge review">review</span>
        <button className="icon-only" type="button" aria-label="More review actions" onClick={() => onAction("Review action menu is not expanded in this alpha.")}>
          <MoreHorizontal size={18} aria-hidden="true" />
        </button>
      </PageHeader>
      <Card className="diff-card">
        <div className="diff-header">
          <div>
            <h3>{hasChanges ? primaryFile : "No changes yet"}</h3>
            <p>{hasChanges ? <><span className="positive">+{additions} additions</span> <span className="negative">-{deletions} deletions</span> {files.length} files changed</> : "Start an agent turn to populate the review queue."}</p>
          </div>
          <div className="segmented">
            <button className={mode === "split" ? "active" : ""} type="button" disabled={!hasChanges} title={hasChanges ? "Split diff" : "No diff available."} onClick={() => onModeChange("split")}>Split</button>
            <button className={mode === "unified" ? "active" : ""} type="button" disabled={!hasChanges} title={hasChanges ? "Unified diff" : "No diff available."} onClick={() => onModeChange("unified")}>Unified</button>
          </div>
        </div>
        <div className="diff-body" data-mode={mode}>
          {hasChanges && selectedFile ? (
            selectedFile.diff.map((line, index) => (
              <div key={`${selectedFile.path}-${index}`} className={`code-line ${line.startsWith("+") ? "add" : line.startsWith("-") ? "delete" : "muted"}`}>
                <span>{42 + index}</span>
                <span>{line}</span>
              </div>
            ))
          ) : (
            <div className="review-empty-state">
              <FileCode2 size={22} aria-hidden="true" />
              <strong>No changes yet</strong>
              <p className="empty-state">Start an agent turn, then return here to review generated files, terminal evidence, and apply or reject actions.</p>
            </div>
          )}
        </div>
        <div className="diff-related">
          {hasChanges ? <FilesChangedTable files={files} reviewDecisions={reviewDecisions} reviewedFiles={reviewedFiles} selectedFiles={selectedFiles} onToggleFile={onToggleFile} /> : <p className="empty-state">No changed files yet.</p>}
          <Card className="impact-card">
            <dl>
              <div><dt>Change type</dt><dd>{hasChanges ? "Runtime setup" : "None"}</dd></div>
              <div><dt>Risk level</dt><dd><span className="pill low">{hasChanges ? "Low" : "None"}</span></dd></div>
              <div><dt>Estimated impact</dt><dd>{hasChanges ? "Local setup only" : "Waiting for changes"}</dd></div>
            </dl>
            <p>{hasChanges ? selectedFile?.summary : "Start a DeepSeek turn to review generated changes."}</p>
          </Card>
        </div>
      </Card>
      {hasChanges ? (
        <div className="review-status-strip">
          <span>Accepted {acceptedCount} {acceptedCount === 1 ? "file" : "files"}</span>
          <span>Rejected {rejectedCount} {rejectedCount === 1 ? "file" : "files"}</span>
        </div>
      ) : null}
      <div className="review-bottom-grid">
        {hasChanges ? <TerminalEvidenceCard compact /> : <Card><p className="empty-state">No terminal evidence yet.</p></Card>}
        <Card title="DeepSeek Agent">
          <p>{hasChanges ? "The selected setup change validates the endpoint before starting the runtime and keeps the API key in native storage." : "No review summary is available until DeepSeek produces changes."}</p>
          <ul className="check-list">
            <li>Consistent with local runtime flow</li>
            <li>No workspace files changed in Demo Mode</li>
            <li>Ready for tester smoke checks</li>
          </ul>
        </Card>
      </div>
      <ReviewActionBar
        hasChanges={hasChanges}
        acceptedCount={acceptedCount}
        commitMessage={commitMessage}
        runtimeAvailable={runtimeAvailable}
        selectedCount={selectedCount}
        onApplySelected={onApplySelected}
        onCommit={onCommit}
        onCommitMessageChange={onCommitMessageChange}
        onRejectSelected={onRejectSelected}
        onAction={onAction}
      />
      <ComposerV2 model="deepseek-v4-flash" prompt="" onChange={() => {}} onInterrupt={() => {}} onModelChange={() => {}} onSend={() => onAction(runtimeAvailable ? "Requested more tests for the selected change." : "Runtime is unavailable; diagnostics required before requesting tests.")} placeholder="Ask DeepSeek about this change..." />
    </div>
  );
}

function SettingsUsage({
  accentColor,
  apiKeyDraft,
  appearanceMode,
  baseURL,
  diagnosticsResult,
  hasAPIKey,
  health,
  info,
  maxOutputTokens,
  model,
  onAccentColorChange,
  onAPIKeyChange,
  onAppearanceModeChange,
  onBaseURLChange,
  onDeleteKey,
  onManageAccount,
  onMaxOutputTokensChange,
  onModelChange,
  onPersistEndpoint,
  onPersistModel,
  onReasoningEffortChange,
  onRotateKey,
  onRunDiagnostics,
  onTemperatureChange,
  onTogglePreference,
  reasoningEffort,
  temperature,
  temperatureError,
  toggles,
  usage,
}: {
  accentColor: string;
  apiKeyDraft: string;
  appearanceMode: string;
  baseURL: string;
  diagnosticsResult?: string;
  hasAPIKey: boolean;
  health?: RuntimeHealth;
  info?: RuntimeInfo;
  maxOutputTokens: string;
  model: string;
  onAccentColorChange(value: string): void;
  onAPIKeyChange(value: string): void;
  onAppearanceModeChange(value: string): void;
  onBaseURLChange(value: string): void;
  onPersistEndpoint(value: string): void;
  onDeleteKey(): void;
  onManageAccount(): void;
  onMaxOutputTokensChange(value: string): void;
  onModelChange(value: string): void;
  onPersistModel(value: string): void;
  onReasoningEffortChange(value: string): void;
  onRotateKey(): void;
  onRunDiagnostics(): void;
  onTemperatureChange(value: string): void;
  onTogglePreference(label: string): void;
  reasoningEffort: string;
  temperature: string;
  temperatureError?: string;
  toggles: Record<string, boolean>;
  usage?: UsageAggregation;
}) {
  const apiKeyLabel = info?.mode === "fake" ? (hasAPIKey ? "Configured; not required in Demo Mode" : "Not required in Demo Mode") : (hasAPIKey ? "Configured" : "Required");
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
          <button className="secondary-button" type="button" onClick={onManageAccount}>Manage account</button>
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
          <input className="field-input" type="password" value={apiKeyDraft} placeholder={hasAPIKey ? "Saved in Keychain" : "Paste API key"} onChange={(event) => onAPIKeyChange(event.target.value)} />
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
        <input className="field-input" value={baseURL} onChange={(event) => onBaseURLChange(event.target.value)} onBlur={(event) => onPersistEndpoint(event.currentTarget.value)} />
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
        <div className="settings-model-row">
          <FieldLabel label="Temperature" value={temperature} error={temperatureError} onChange={onTemperatureChange} />
          <FieldSelect label="Reasoning effort" value={reasoningEffort} options={["Low", "Medium", "High"]} onChange={onReasoningEffortChange} />
          <FieldLabel label="Max output tokens" value={maxOutputTokens} onChange={onMaxOutputTokensChange} />
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
        <ToggleRows toggles={toggles} onToggle={onTogglePreference} />
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
            {["Light", "Dark"].map((modeName) => (
              <button key={modeName} className={appearanceMode === modeName ? "active" : ""} type="button" onClick={() => onAppearanceModeChange(modeName)}>{modeName}</button>
            ))}
          </div>
          <div className="appearance-swatches" aria-label="Accent colors">
            {["#3366ff", "#2563eb", "#0f766e", "#4f46e5", "#be123c", "#475569"].map((color) => (
              <button key={color} className={accentColor === color ? "active" : ""} type="button" style={{ background: color }} aria-label={`Accent ${color}`} onClick={() => onAccentColorChange(color)} />
            ))}
          </div>
        </div>
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
        <div className="settings-card-heading">
          <Gauge size={18} aria-hidden="true" />
          <div>
            <h3>Usage & Cost</h3>
            <p>{usage ? formatUsage(usage) : "Usage unavailable"}</p>
          </div>
        </div>
        <div className="usage-tabs">
          {["Overview", "Token usage", "Recent runs", "Current model", "Cache"].map((tab, index) => (
            <button key={tab} className={index === 0 ? "active" : ""} type="button" disabled={index === 0} title={index === 0 ? "Current usage view." : "Refresh diagnostics for this usage view."} onClick={() => onRunDiagnostics()}>{tab}</button>
          ))}
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

function AutomationsPage({ onAction }: { onAction(message: string): void }) {
  return (
    <div className="page skeleton-page">
      <PageHeader title="Automations" subtitle="Scheduled DeepSeek Agent tasks">
        <button className="primary-button" type="button" disabled title="Coming soon">New automation</button>
      </PageHeader>
      <Card className="empty-product-card">
        <Sparkles size={24} aria-hidden="true" />
        <h3>Automations are not configured yet</h3>
        <p className="empty-state">Create scheduled tasks later to let DeepSeek watch and maintain projects.</p>
        <div className="skeleton-actions">
          <button className="secondary-button" type="button" onClick={() => onAction("Automation templates are coming soon in this alpha.")}>View planned templates</button>
          <button className="secondary-button" type="button" disabled title="Runtime scheduler is not enabled in this MVP.">Run schedule now</button>
        </div>
      </Card>
      <Card title="Planned automation types">
        <div className="task-list">
          {[
            ["Nightly test sweep", "Run configured checks and summarize failures."],
            ["Dependency watch", "Review dependency updates before applying."],
            ["Release readiness", "Collect build, test, and packaging evidence."],
          ].map(([title, body]) => (
            <article key={title} className="task-item"><strong>{title}</strong><p>{body}</p><span>Coming soon</span></article>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SkillsPage({ onAction }: { onAction(message: string): void }) {
  return (
    <div className="page skeleton-page">
      <PageHeader title="Skills" subtitle="Project-specific DeepSeek workflows">
        <button className="primary-button" type="button" disabled title="Coming soon">Import skill</button>
      </PageHeader>
      <Card className="empty-product-card">
        <Layers3 size={24} aria-hidden="true" />
        <h3>No skills installed yet</h3>
        <p className="empty-state">Skills will help DeepSeek follow project-specific workflows.</p>
        <div className="skeleton-actions">
          <button className="secondary-button" type="button" onClick={() => onAction("Skill catalog preview is coming soon in this alpha.")}>Browse planned skills</button>
          <button className="secondary-button" type="button" disabled title="Local skill import is not enabled in this MVP.">Validate skill</button>
        </div>
      </Card>
      <Card title="Planned starter skills">
        <div className="task-list">
          {[
            ["SwiftUI app review", "Check macOS views, state, and signing notes."],
            ["WebView bridge audit", "Verify native-web command wiring and fallback behavior."],
            ["Tester handoff", "Produce launch evidence and known issues."],
          ].map(([title, body]) => (
            <article key={title} className="task-item"><strong>{title}</strong><p>{body}</p><span>Coming soon</span></article>
          ))}
        </div>
      </Card>
    </div>
  );
}

function RightInspector({
  acceptedCount,
  commitMessage,
  files,
  hasAPIKey,
  hasReviewChanges,
  health,
  info,
  isDemo,
  model,
  onAction,
  onApplySelected,
  onCommit,
  onCommitMessageChange,
  onCreateThread,
  onRejectSelected,
  onShowReview,
  rejectedCount,
  reviewDecisions,
  reviewedFiles,
  runtimeAvailable,
  selectedFiles,
  usage,
  view,
}: {
  acceptedCount: number;
  commitMessage: string;
  files: ReviewFile[];
  hasAPIKey: boolean;
  hasReviewChanges: boolean;
  health?: RuntimeHealth;
  info?: RuntimeInfo;
  isDemo: boolean;
  model: string;
  onAction(message: string): void;
  onApplySelected(): void;
  onCommit(): void;
  onCommitMessageChange(value: string): void;
  onCreateThread(): void;
  onRejectSelected(): void;
  onShowReview(): void;
  rejectedCount: number;
  reviewDecisions: Record<string, ReviewDecision>;
  reviewedFiles: Set<string>;
  runtimeAvailable: boolean;
  selectedFiles: Set<string>;
  usage?: UsageAggregation;
  view: AppView;
}) {
  if (view === "settings" || view === "automations" || view === "skills") {
    return (
      <aside className="right-inspector">
        <InspectorHeader title={view === "settings" ? "Account & Status" : "Runtime"} />
        <InspectorCard title={view === "settings" ? "DeepSeek Plan" : "Product state"}><StatusValue label={view === "settings" ? "Active" : "MVP skeleton"} tone="ok" /></InspectorCard>
        <RuntimeCard hasAPIKey={hasAPIKey} health={health} info={info} model={model} />
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
    const totalFiles = files.length;
    const reviewed = hasReviewChanges ? Math.min(reviewedFiles.size, totalFiles) : 0;
    const selectedCount = selectedFiles.size;
    const additions = files.reduce((total, file) => total + file.additions, 0);
    const deletions = files.reduce((total, file) => total + file.deletions, 0);
    return (
      <aside className="right-inspector">
        <InspectorHeader title="Review" />
        <div className="segmented full">
          <button className="active" type="button" disabled title="Current review panel.">Review</button>
          <button type="button" disabled title="Detailed queue metadata is coming soon.">Details</button>
        </div>
        <InspectorCard title="Review queue">
          <p>{reviewed} of {totalFiles} files reviewed</p>
          <div className="progress"><span style={{ width: `${totalFiles === 0 ? 0 : Math.min(100, (reviewed / totalFiles) * 100)}%` }} /></div>
          <div className="change-total"><span className="positive">+{additions} additions</span><span className="negative">-{deletions} deletions</span></div>
        </InspectorCard>
        {hasReviewChanges ? <FileQueue files={files} reviewDecisions={reviewDecisions} reviewedFiles={reviewedFiles} /> : <InspectorCard><p className="empty-state">No changed files yet.</p></InspectorCard>}
        <InspectorCard title="Review actions">
          <ActionButton label="Open in editor" disabled={selectedCount === 0} disabledReason="Select a changed file first." onClick={() => onAction("Opening selected file in editor is queued.")} />
          <ActionButton label="Apply selected" disabled={selectedCount === 0} disabledReason="No selected files to apply." onClick={onApplySelected} />
          <ActionButton label="Reject selected" disabled={selectedCount === 0} disabledReason="No selected files to reject." onClick={onRejectSelected} />
          <ActionButton label="Request more tests" disabled={!runtimeAvailable} disabledReason="Runtime must be connected before requesting tests." onClick={() => onAction("Requested more tests for selected files.")} />
        </InspectorCard>
        <InspectorCard title="Commit">
          <input className="field-input" value={hasReviewChanges ? commitMessage : ""} placeholder="Commit message" onChange={(event) => onCommitMessageChange(event.target.value)} disabled={!hasReviewChanges} />
          <button className="primary-button full-width" type="button" disabled={acceptedCount === 0 || !commitMessage.trim()} title={acceptedCount === 0 ? "Accept files before committing." : !commitMessage.trim() ? "Enter a commit message." : "Commit accepted files."} onClick={onCommit}>Commit {acceptedCount} {acceptedCount === 1 ? "file" : "files"}</button>
          <p className="empty-state compact">Accepted {acceptedCount} {acceptedCount === 1 ? "file" : "files"} / Rejected {rejectedCount} {rejectedCount === 1 ? "file" : "files"}</p>
        </InspectorCard>
      </aside>
    );
  }

  if (view === "project") {
    return (
      <aside className="right-inspector">
        <InspectorHeader title="Project" />
        <RuntimeCard hasAPIKey={hasAPIKey} health={health} info={info} model={model} />
        <InspectorCard title="Quick actions">
          <ActionButton label="New thread" onClick={onCreateThread} />
          <ActionButton label="Run tests" onClick={() => onAction(isDemo ? "Queued Demo Mode test run." : "Create a thread before running agent checks.")} />
          <ActionButton label="View diffs" onClick={onShowReview} />
          <ActionButton label="Open in IDE" onClick={() => onAction("Opening project in IDE is queued.")} />
        </InspectorCard>
        <InspectorCard title="Top changed files">
          {isDemo && files.length ? <FileQueue files={files} reviewDecisions={reviewDecisions} reviewedFiles={reviewedFiles} compact /> : <p className="empty-state">No changed files yet.</p>}
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
        <button className="active" type="button" disabled title="Current summary panel.">Summary</button>
        <button type="button" disabled title="Detailed queue metadata is coming soon.">Details</button>
      </div>
      <InspectorCard>
        <p>{hasReviewChanges ? "DeepSeek prepared generated changes with review and verification evidence." : "Start an agent turn to generate reviewable changes for this thread."}</p>
      </InspectorCard>
      <InspectorCard title="Changes">
        <div className="change-total"><span className="positive">+{files.reduce((total, file) => total + file.additions, 0)} additions</span><span className="negative">-{files.reduce((total, file) => total + file.deletions, 0)} deletions</span></div>
      </InspectorCard>
      <InspectorCard title={`Changed files (${files.length})`}>{hasReviewChanges ? <FileQueue files={files} reviewDecisions={reviewDecisions} reviewedFiles={reviewedFiles} compact /> : <p className="empty-state">No changed files yet.</p>}</InspectorCard>
      <InspectorCard title="Quick actions">
        <ActionButton label="Open diff" onClick={onShowReview} />
        <ActionButton label="Apply changes" disabled={!hasReviewChanges} disabledReason="No generated changes to apply yet." onClick={() => onAction("Applied changes in Demo Mode.")} />
        <ActionButton label="Request tests" disabled={!runtimeAvailable || !hasReviewChanges} disabledReason={!runtimeAvailable ? "Runtime must be connected before requesting tests." : "No active changes need tests yet."} onClick={() => onAction("Requested tests in Demo Mode.")} />
      </InspectorCard>
      <RuntimeCard hasAPIKey={hasAPIKey} health={health} info={info} model={model} />
    </aside>
  );
}

function TimelineCard({ item, onApprovalDecision, onStopTask }: { item: TimelineItem; onApprovalDecision(approvalId: string, decision: ApprovalDecision): void; onStopTask(): void }) {
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
          <div><dt>Risk</dt><dd>Medium; requires explicit tester approval</dd></div>
        </dl>
        {item.approval.command ? <pre className="command-preview">{item.approval.command}</pre> : null}
        {isWaitingForDecision ? (
          <div className="approval-actions">
            <button className="secondary-button" type="button" onClick={onStopTask}>Stop task</button>
            <button className="secondary-button" type="button" onClick={() => onApprovalDecision(item.approval!.approvalId, "deny")}>Deny</button>
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

function FilesChangedCard({ files, onOpenReview }: { files: ReviewFile[]; onOpenReview(): void }) {
  const additions = files.reduce((total, file) => total + file.additions, 0);
  const deletions = files.reduce((total, file) => total + file.deletions, 0);
  return (
    <Card className="files-card">
      <div className="card-title-row">
        <h3>Files changed</h3>
        <span>{files.length} files <span className="positive">+{additions}</span> <span className="negative">-{deletions}</span></span>
      </div>
      <FilesChangedTable files={files} reviewedFiles={new Set()} selectedFiles={new Set(files.map((file) => file.path))} onToggleFile={() => {}} />
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
	PASS runtime bridge checks
	PASS setup flow checks
	PASS review panel checks

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
  onModelChange,
  onSend,
  placeholder = "Ask DeepSeek anything...",
  prompt,
}: {
  activeTurnId?: string;
  model: string;
  onChange(value: string): void;
  onInterrupt(): void;
  onModelChange(value: string): void;
  onSend(): void;
  placeholder?: string;
  prompt: string;
}) {
  return (
    <form className="composer-v2" onSubmit={(event) => { event.preventDefault(); onSend(); }}>
      <textarea aria-label="Prompt" value={prompt} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      <div className="composer-meta">
        <select aria-label="Composer model" value={model} onChange={(event) => onModelChange(event.target.value)}>
          {deepSeekModels.map((modelName) => <option key={modelName} value={modelName}>{modelName}</option>)}
        </select>
        <label className="icon-only file-attach" title="Attach a file">
          <input type="file" aria-label="Attach file" onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) {
              onChange(`${prompt}${prompt ? "\n" : ""}Attached file: ${file.name}`);
            }
          }} />
          <Link2 size={16} aria-hidden="true" />
        </label>
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

function ReviewActionBar({
  acceptedCount,
  commitMessage,
  hasChanges,
  onApplySelected,
  onCommit,
  onCommitMessageChange,
  onAction,
  onRejectSelected,
  runtimeAvailable,
  selectedCount,
}: {
  acceptedCount: number;
  commitMessage: string;
  hasChanges: boolean;
  onApplySelected(): void;
  onCommit(): void;
  onCommitMessageChange(value: string): void;
  onAction(message: string): void;
  onRejectSelected(): void;
  runtimeAvailable: boolean;
  selectedCount: number;
}) {
  return (
    <div className="review-action-bar">
      <button className="secondary-button" type="button" disabled={selectedCount === 0} title={selectedCount === 0 ? "Select a changed file first." : undefined} onClick={() => onAction("Opening selected file in editor is queued.")}>Open in editor</button>
      <button className="secondary-button" type="button" disabled={selectedCount === 0} title={selectedCount === 0 ? "No selected files to apply." : undefined} onClick={onApplySelected}>Apply selected</button>
      <button className="secondary-button danger" type="button" disabled={selectedCount === 0} title={selectedCount === 0 ? "No selected files to reject." : undefined} onClick={onRejectSelected}>Reject selected</button>
      <button className="secondary-button" type="button" disabled={!runtimeAvailable || !hasChanges} title={!runtimeAvailable ? "Runtime must be connected before requesting tests." : !hasChanges ? "No changes need tests yet." : undefined} onClick={() => onAction("Requested more tests for selected files.")}>Request more tests</button>
      <input className="commit-message-inline" value={hasChanges ? commitMessage : ""} placeholder="Commit message" disabled={!hasChanges} onChange={(event) => onCommitMessageChange(event.target.value)} />
      <button className="primary-button" type="button" disabled={acceptedCount === 0 || !commitMessage.trim()} title={acceptedCount === 0 ? "Accept files before committing." : !commitMessage.trim() ? "Enter a commit message." : undefined} onClick={onCommit}>Commit {acceptedCount} {acceptedCount === 1 ? "file" : "files"}</button>
    </div>
  );
}

function SettingsModal({
  apiKeyDraft,
  hasAPIKey,
  onAPIKeyChange,
  onClose,
  onDeleteKey,
  onSaveKey,
  sheet,
}: {
  apiKeyDraft: string;
  hasAPIKey: boolean;
  onAPIKeyChange(value: string): void;
  onClose(): void;
  onDeleteKey(): void;
  onSaveKey(): void;
  sheet: Exclude<SettingsSheet, null>;
}) {
  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <section className="settings-sheet" role="dialog" aria-modal="true" aria-label={sheet === "rotateKey" ? "Rotate API key" : "Manage account"} onClick={(event) => event.stopPropagation()}>
        <header className="sheet-header">
          <h2>{sheet === "rotateKey" ? "Rotate API key" : "Manage account"}</h2>
          <button className="icon-only" type="button" aria-label="Close sheet" onClick={onClose}><X size={16} aria-hidden="true" /></button>
        </header>
        {sheet === "rotateKey" ? (
          <>
            <p className="empty-state">Enter a new DeepSeek API key. The app saves it through the native Keychain bridge and then clears this field.</p>
            <input className="field-input" type="password" value={apiKeyDraft} placeholder={hasAPIKey ? "New API key" : "Paste API key"} onChange={(event) => onAPIKeyChange(event.target.value)} autoFocus />
            <div className="sheet-actions">
              <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
              <button className="secondary-button danger" type="button" disabled={!hasAPIKey} onClick={onDeleteKey}>Delete key</button>
              <button className="primary-button" type="button" disabled={!apiKeyDraft.trim()} onClick={onSaveKey}>Save key</button>
            </div>
          </>
        ) : (
          <>
            <p className="empty-state">DeepSeek account controls are local to this Mac for the MVP. API keys are configured through the Keychain section and model/runtime state is visible in the inspector.</p>
            <div className="sheet-actions">
              <button className="primary-button" type="button" onClick={onClose}>Done</button>
            </div>
          </>
        )}
      </section>
    </div>
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

function FilesChangedTable({
  files,
  onToggleFile,
  reviewDecisions = {},
  reviewedFiles,
  selectedFiles = new Set<string>(),
}: {
  files: ReviewFile[];
  onToggleFile(path: string): void;
  reviewDecisions?: Record<string, ReviewDecision>;
  reviewedFiles: Set<string>;
  selectedFiles?: Set<string>;
}) {
  return (
    <div className="changed-table">
      {files.map((file) => (
        <button key={file.path} className={selectedFiles.has(file.path) ? "selected" : ""} type="button" aria-label={`Select ${file.path}`} aria-pressed={selectedFiles.has(file.path)} onClick={() => onToggleFile(file.path)}>
          <FileCode2 size={15} aria-hidden="true" />
          <span>{file.path}</span>
          {reviewDecisions[file.path] ? <small className={`decision ${reviewDecisions[file.path]}`}>{reviewDecisions[file.path]}</small> : null}
          <strong className="positive">+{file.additions}</strong>
          <strong className="negative">-{file.deletions}</strong>
          {reviewedFiles.has(file.path) ? <CheckCircle2 size={15} aria-hidden="true" /> : null}
        </button>
      ))}
    </div>
  );
}

function FileQueue({ compact = false, files, reviewDecisions = {}, reviewedFiles }: { compact?: boolean; files: ReviewFile[]; reviewDecisions?: Record<string, ReviewDecision>; reviewedFiles: Set<string> }) {
  return <div className={compact ? "file-queue compact" : "file-queue"}>{files.map((file) => <div key={file.path}><span className={reviewedFiles.has(file.path) ? "queue-dot done" : "queue-dot"} /><span>{file.path}</span>{reviewDecisions[file.path] ? <small className={`decision ${reviewDecisions[file.path]}`}>{reviewDecisions[file.path]}</small> : null}<strong className="positive">+{file.additions}</strong><strong className="negative">-{file.deletions}</strong></div>)}</div>;
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

function InspectorCard({ children, title }: { children?: React.ReactNode; title?: string }) {
  return <section className="inspector-card">{title ? <h3>{title}</h3> : null}{children}</section>;
}

function InspectorHeader({ title }: { title: string }) {
  return <header className="inspector-header"><h2>{title}</h2><button className="icon-only" type="button" disabled title="Inspector stays visible in this MVP." aria-label="Close inspector"><X size={16} aria-hidden="true" /></button></header>;
}

function ActionButton({ disabled = false, disabledReason, label, onClick }: { disabled?: boolean; disabledReason?: string; label: string; onClick(): void }) {
  return <button className="action-button" type="button" disabled={disabled} title={disabled ? disabledReason : undefined} onClick={onClick}>{label}</button>;
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

function NavButton({ active = false, icon, label, onClick }: { active?: boolean; icon: React.ReactNode; label: string; onClick?: () => void }) {
  return <button className={active ? "nav-button active" : "nav-button"} type="button" onClick={onClick}>{icon}{label}</button>;
}

function CardLink({ label, onClick }: { label: string; onClick?: () => void }) {
  return <button className="card-link" type="button" onClick={onClick}>{label}<Send size={14} aria-hidden="true" /></button>;
}

function StatusPill({ status }: { status: TimelineItem["status"] }) {
  return <span className={`status-pill status-${status}`}>{status === "completed" ? <CheckCircle2 size={14} aria-hidden="true" /> : <Clock3 size={14} aria-hidden="true" />}{status}</span>;
}

function FieldLabel({ error, label, onChange, value }: { error?: string; label: string; onChange(value: string): void; value: string }) {
  return <label className="field-label"><span>{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} />{error ? <small className="field-error">{error}</small> : null}</label>;
}

function FieldSelect({ label, onChange, options, value }: { label: string; onChange(value: string): void; options: string[]; value: string }) {
  return <label className="field-label"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function MetricSmall({ delta, label, value }: { delta: string; label: string; value: string }) {
  return <div className="usage-metric"><span>{label}</span><strong>{value}</strong><small>{delta}</small></div>;
}

function ToggleRows({ onToggle, toggles }: { onToggle(label: string): void; toggles: Record<string, boolean> }) {
  return <div className="toggle-rows">{Object.entries(toggles).map(([label, enabled]) => <div key={label}><span>{label}</span><button className={enabled ? "toggle on" : "toggle"} type="button" aria-label={label} aria-pressed={enabled} onClick={() => onToggle(label)}><span /></button></div>)}</div>;
}

function UsageChart() {
  return <div className="usage-chart"><svg viewBox="0 0 600 140" role="img" aria-label="Usage trend"><path d="M0 90 C80 30 120 120 200 70 S340 65 420 86 520 45 600 72" fill="none" stroke="#3366FF" strokeWidth="4" /><path d="M0 100 C80 80 120 92 200 88 S340 95 420 90 520 76 600 82" fill="none" stroke="#7FA8FF" strokeWidth="3" /></svg></div>;
}
