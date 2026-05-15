import { Activity, Settings } from "lucide-react";
import type { RuntimeHealth, RuntimeInfo } from "../runtime/types";

interface SidecarStatusProps {
  health?: RuntimeHealth;
  info?: RuntimeInfo;
  error?: string;
}

export function SidecarStatus({ health, info, error }: SidecarStatusProps) {
  const mode = info?.mode === "fake" ? "demo" : (info?.mode ?? "unknown");
  const runtime = info?.mode === "fake" ? "demo runtime" : (info?.runtimeVersion ?? "not probed");

  return (
    <aside className="status-panel">
      <div className="panel-title">
        <Activity size={17} aria-hidden="true" />
        Connection
      </div>
      <div className="status-line">
        <span className={`connection-dot ${health?.status ?? "offline"}`} />
        <span>{health?.message ?? error ?? "Connecting"}</span>
      </div>
      <dl className="status-list">
        <div>
          <dt>Mode</dt>
          <dd>{mode}</dd>
        </div>
        <div>
          <dt>Runtime</dt>
          <dd>{runtime}</dd>
        </div>
        <div>
          <dt>API key</dt>
          <dd>{info?.authRequired ? "required" : "not required"}</dd>
        </div>
      </dl>
      <div className="settings-note">
        <Settings size={16} aria-hidden="true" />
        API key is saved in macOS Keychain.
      </div>
    </aside>
  );
}
