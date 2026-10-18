import React from "react";
import { Icon } from "./icons";
import { SourceTooltip } from "./source-tooltip";
import { t } from "../electron/i18n/index.mjs";
// sidebar-groups.js hw (5320) / Nb (2685): Kl tooltip content + cmd+b, not hoverable.
export const SIDEBAR_TOGGLE_TOOLTIP = {
  hide: { content: t("Hide sidebar"), shortcut: "cmd+b", hoverable: false },
  show: { content: t("Show sidebar"), shortcut: "cmd+b", hoverable: false },
};
export const basename = (p) =>
  p?.split("/").filter(Boolean).pop() || "Select folder";
export function ToolButton({
  label,
  icon,
  onClick,
  disabled,
  active,
  children,
  tooltip,
  ...props
}) {
  // Existing callers retain their native title. Only an explicit tooltip opts
  // into CDS behavior; false suppresses both forms for an external wrapper.
  // String copy is looked up here too, so literal labels are localized.
  label = t(label);
  const customTooltip = tooltip != null && tooltip !== false;
  const tooltipProps = tooltip && typeof tooltip === "object" ? tooltip : {};
  const button = (
    <button
      type="button"
      className={"code-icon-button" + (active ? " is-selected" : "")}
      title={customTooltip || tooltip === false ? undefined : label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children || <Icon name={icon} />}
    </button>
  );
  return customTooltip ? (
    <SourceTooltip
      hoverable={false}
      automatic
      {...tooltipProps}
      content={
        typeof tooltip === "string"
          ? t(tooltip)
          : Object.hasOwn(tooltipProps, "content")
            ? t(tooltipProps.content)
            : label
      }
    >
      {button}
    </SourceTooltip>
  ) : (
    button
  );
}
export function Composer({
  draft,
  setDraft,
  textarea,
  attachments,
  setAttachments,
  onSubmit,
  running,
  sending,
  connected,
  onStop,
  workdir,
  workspaceInfo,
  onMenu,
  model,
  effort,
  permission,
  worktree,
  setWorktree,
  usage,
  mode,
  onFolder,
}) {
  return (
    <div className="composer-zone" data-epitaxy-chat-column>
      <div className="context-row">
        <button
          className="context-chip"
          aria-haspopup="dialog"
          onClick={(e) => onMenu("local", e.currentTarget)}
        >
          <Icon name="Laptop" size={14} />
          Local
        </button>
        <button
          className="context-chip folder-chip"
          title={workdir}
          onClick={(e) => onMenu("folder", e.currentTarget)}
        >
          <Icon name="Folder" size={14} />
          <span>{basename(workdir)}</span>
        </button>
        {workspaceInfo?.isRepo && (
          <div className="branch-worktree">
            <button
              className="branch-chip"
              role="combobox"
              aria-label="Branch"
              onClick={(e) => onMenu("branch", e.currentTarget)}
            >
              <Icon name="GitBranch" size={14} />
              <span>{workspaceInfo.branch || "HEAD"}</span>
            </button>
            <label title="Work in an isolated copy of the repository">
              <input
                type="checkbox"
                checked={worktree}
                disabled={running || sending}
                onChange={(e) => setWorktree(e.target.checked)}
              />
              worktree
            </label>
          </div>
        )}
        <ToolButton
          label="Add another folder"
          icon="FolderPlus"
          onClick={onFolder}
        />
      </div>
      <form
        onSubmit={onSubmit}
        className="composer epitaxy-prompt"
        data-cds-shell="true"
      >
        <div data-surface>
          <div className="composer-input-row">
            <textarea
              ref={textarea}
              aria-label="Message DeepSeek"
              rows={1}
              placeholder={
                mode === "code"
                  ? "Describe a task or ask a question"
                  : "How can I help you today?"
              }
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  onSubmit();
                }
              }}
            />
            {running ? (
              <ToolButton
                label="Stop response"
                onClick={onStop}
                icon="StopFilled"
              />
            ) : (
              <button
                className="send-button"
                type="submit"
                aria-label="Send message"
                disabled={!draft.trim() || sending || !connected}
              >
                {sending ? (
                  <span className="spinner" />
                ) : (
                  <Icon name="ArrowReturn" size={16} />
                )}
              </button>
            )}
          </div>
          {attachments.length > 0 && (
            <div className="attachments">
              {attachments.map((p) => (
                <span key={p}>
                  <Icon name="Attachment" size={12} />
                  {basename(p)}
                  <button
                    aria-label={"Remove " + basename(p)}
                    type="button"
                    onClick={() =>
                      setAttachments((a) => a.filter((x) => x !== p))
                    }
                  >
                    <Icon name="X" size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </form>
      <div className="composer-footer">
        <ToolButton
          label="Add"
          icon="Add"
          onClick={(e) => onMenu("add", e.currentTarget)}
        />
        <div className="dictation-controls">
          <ToolButton
            label="Dictation"
            icon="Microphone"
            onClick={(e) => onMenu("dictation", e.currentTarget)}
          />
          <button
            aria-label="Dictation settings"
            onClick={(e) => onMenu("dictation", e.currentTarget)}
          >
            <Icon name="CaretDown" size={12} />
          </button>
        </div>
        <button
          className="permission-button"
          aria-label="Permission mode"
          onClick={(e) => onMenu("permission", e.currentTarget)}
        >
          {permission === "auto"
            ? "Auto"
            : permission === "plan"
              ? "Plan"
              : "Ask"}
        </button>
        <div className="model-controls">
          <button
            className="model-trigger"
            role="combobox"
            aria-label="Model"
            aria-haspopup="listbox"
            disabled={running || sending}
            onClick={(e) => onMenu("model", e.currentTarget)}
          >
            {model?.displayName || model?.model || "Default model"}
          </button>
          <button
            className="effort-trigger"
            role="combobox"
            aria-label="Reasoning effort"
            aria-haspopup="listbox"
            disabled={running || sending}
            onClick={(e) => onMenu("effort", e.currentTarget)}
          >
            <EffortIcon value={effort} />
            {effort[0]?.toUpperCase() + effort.slice(1)}
          </button>
          <button
            className="usage-trigger"
            aria-label="Usage"
            title="Context usage"
            onClick={(e) => onMenu("usage", e.currentTarget)}
          >
            <Icon name="UsageGaugeMiddle" size={15} />
          </button>
          <button
            className="fast-trigger"
            aria-label="Fast mode off"
            title="Fast mode off"
            onClick={(e) => onMenu("fast", e.currentTarget)}
          >
            <Icon name="Lightning" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
function EffortIcon({ value }) {
  // DeepSeek Harness efforts are off/low/high/max.
  const levels = {
    off: 0,
    none: 0,
    minimal: 1,
    low: 1,
    medium: 2,
    high: 3,
    xhigh: 4,
    max: 4,
    ultra: 4,
  };
  return (
    <span className="effort-bars" aria-hidden="true">
      {[1, 2, 3, 4].map((n) => (
        <i key={n} className={n <= (levels[value] ?? 2) ? "filled" : ""} />
      ))}
    </span>
  );
}
