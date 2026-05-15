import { Send, Square } from "lucide-react";

interface ComposerProps {
  value: string;
  disabled: boolean;
  activeTurnId?: string;
  onChange(value: string): void;
  onSubmit(): void;
  onInterrupt(): void;
}

export function Composer({ value, disabled, activeTurnId, onChange, onSubmit, onInterrupt }: ComposerProps) {
  return (
    <form
      className="composer"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="composer-shell">
        <textarea
          aria-label="Prompt"
          value={value}
          placeholder="Ask DeepSeek to inspect, explain, or plan against this project..."
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        <div className="composer-actions">
          {activeTurnId ? (
            <button className="secondary-button icon-button" type="button" title="Interrupt turn" onClick={onInterrupt}>
              <Square size={16} aria-hidden="true" />
              Stop
            </button>
          ) : null}
          <button className="primary-button icon-button" type="submit" disabled={disabled || value.trim().length === 0}>
            <Send size={16} aria-hidden="true" />
            Send
          </button>
        </div>
      </div>
    </form>
  );
}
