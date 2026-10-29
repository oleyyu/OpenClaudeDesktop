import React from "react";
import { mergedTaskEvents, taskEventRow } from "./task-event-model.mjs";
import "./source-task-event.css";

// A background task's settled event in the transcript, as 2.42304.0 draws the turn's task_event card: c96d752d0
// `case"task_event":` puts it in the reply as a "code.task_events" card, h3e mounts it in its own transcript row
// (`${lp} flex min-w-0 flex-col empty:hidden`, lp = c8ba53634 ps-[var(--cds-assistant-message-text-inset,0px)]) and
// RZ / o$e draw one plain line, 'Background {noun} {status}' (m3qXDI92OE, text-danger only when failed) · {description}
// · took {elapsed} (SLlmAvczvk), every part text-body text-secondary that turns text-primary on hover (group/tool).
// With a Background tasks pane to focus it is LZ's button (data-transcript-keeps-pin, the pane opens on that task);
// otherwise the same line as a div. Several events read as one line (IZ: '{count} background {noun} {status}, {n}
// failed, …', only the failed part in danger). The TurnStatus.Step form (OWe / lKe, c4a9ee384 hl) is only for an event
// that lands between a turn's grouped tool steps (the tool-run builder's I(): "step"), which this host never places.
// The row is a .source-message so it takes the transcript's row gap (source-session.css), as the card row does.
export function SourceTaskEventRow({ children }) {
  return <div className="source-message source-task-events">{children}</div>;
}

export function SourceTaskEvent({ events, itemId, onOpen }) {
  const list = (events || []).filter(Boolean);
  if (!list.length) return null;
  const open = onOpen ? () => onOpen(list[0]) : null;
  let content, failed = false;
  if (list.length === 1) {
    const row = taskEventRow(list[0]);
    failed = row.danger;
    content = <span className="stev-line">
      <span className="stev-label" data-danger={row.danger || undefined}>{row.label}</span>
      {row.description && <span className="stev-description"><bdi>{`· ${row.description}`}</bdi></span>}
      {row.elapsed && <span className="stev-elapsed">{`· ${row.elapsed}`}</span>}
    </span>;
  } else {
    const merged = mergedTaskEvents(list);
    failed = merged.parts.some((part) => part.danger);
    content = <span className="stev-line"><span className="stev-merged">
      {merged.parts.map((part, index) => <React.Fragment key={part.key}>
        {index > 0 && <span>, </span>}
        <span className="stev-part" data-danger={part.danger || undefined}>{part.text}</span>
      </React.Fragment>)}
    </span></span>;
  }
  const props = { className: "source-task-event", "data-transcript-item-id": itemId, "data-task-event-status": list.length === 1 ? list[0].status : undefined, "data-failed": failed || undefined };
  return <SourceTaskEventRow>
    {open ? <button type="button" {...props} data-transcript-keeps-pin="" onClick={open}>{content}</button> : <div {...props}>{content}</div>}
  </SourceTaskEventRow>;
}
