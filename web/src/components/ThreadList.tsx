import { Folder, Plus } from "lucide-react";
import type { RuntimeThread } from "../runtime/types";

interface ThreadListProps {
  projectPath: string;
  threads: RuntimeThread[];
  selectedThreadId?: string;
  onProjectPathChange(value: string): void;
  onSelectThread(id: string): void;
  onCreateThread(): void;
}

export function ThreadList({
  projectPath,
  threads,
  selectedThreadId,
  onProjectPathChange,
  onSelectThread,
  onCreateThread,
}: ThreadListProps) {
  return (
    <aside className="thread-sidebar">
      <div className="brand-block">
        <div className="brand-mark">DS</div>
        <div>
          <h1>DeepSeek Agent</h1>
          <p>Mac agent</p>
        </div>
      </div>
      <label className="project-picker">
        <span>
          <Folder size={15} aria-hidden="true" />
          Workspace
        </span>
        <input value={projectPath} placeholder="Local folder path" onChange={(event) => onProjectPathChange(event.target.value)} />
      </label>
      <div className="thread-header">
        <span>Chats</span>
        <button className="ghost-button" type="button" title="New thread" onClick={onCreateThread}>
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>
      <nav className="thread-list" aria-label="Thread list">
        {threads.map((thread) => (
          <button
            key={thread.id}
            className={thread.id === selectedThreadId ? "thread-button active" : "thread-button"}
            type="button"
            onClick={() => onSelectThread(thread.id)}
          >
            <span>{thread.title}</span>
            <time>{new Date(thread.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
          </button>
        ))}
      </nav>
    </aside>
  );
}
