import { Activity, Settings } from "lucide-react";
import type { RuntimeHealth, RuntimeInfo } from "../runtime/types";

interface SidecarStatusProps {
  health?: RuntimeHealth;
  info?: RuntimeInfo;
  error?: string;
}

export function SidecarStatus({ health, info, error }: SidecarStatusProps) {
  return (
    <aside className="status-panel">
      <div className="panel-title">
        <Activity size={17} aria-hidden="true" />
        Sidecar
      </div>
      <div className="status-line">
        <span className={`connection-dot ${health?.status ?? "offline"}`} />
        <span>{health?.message ?? error ?? "Connecting"}</span>
      </div>
      <dl className="status-list">
        <div>
          <dt>Mode</dt>
          <dd>{info?.mode ?? "unknown"}</dd>
        </div>
        <div>
          <dt>Runtime</dt>
          <dd>{info?.runtimeVersion ?? "not probed"}</dd>
        </div>
        <div>
          <dt>Auth</dt>
          <dd>{info?.authRequired ? "required" : "not required"}</dd>
        </div>
      </dl>
      <div className="settings-note">
        <Settings size={16} aria-hidden="true" />
        API key lives in native settings or Keychain in real mode.
      </div>
    </aside>
  );
}

