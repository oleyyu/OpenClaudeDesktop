import React from "react";
import { mergedTaskEvents, taskEventRow } from "./task-event-model.mjs";
import "./source-task-event.css";

// A background task's settled event in the transcript (aue/R2/L2, approval-current.js:44297-44440): one plain line,
// 'Background {noun} {status}' (text-danger only when failed) · {description} · took {elapsed}, every part
// text-body text-secondary that turns text-primary on hover. With a Background tasks pane to focus it is a button
// (L2 finished: the pane opens on that task); otherwise the same line as a div. Several events read as one line
// ('{count} background {noun} {status}, {n} failed, …', only the failed part in danger).
export function SourceTaskEvent({ events, itemId, onOpen }) {
  const list = (events || []).filter(Boolean);
  if (!list.length) return null;
  const open = onOpen ? () => onOpen(list[0]) : null;
  let content, failed = false;
  if (list.length === 1) {
    const row = taskEventRow(list[0]);
    failed = row.danger;
    // sXe: with the description's tense sentence (`g`) that one span replaces the label and the description.
    content = <span className="stev-line">
      {row.tense ? <span className="stev-description" dir="auto">{row.tense}</span> : <>
        <span className="stev-label" data-danger={row.danger || undefined}>{row.label}</span>
        {row.description && <span className="stev-description"><bdi>{`· ${row.description}`}</bdi></span>}
      </>}
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
  return open ? <button type="button" {...props} onClick={open}>{content}</button> : <div {...props}>{content}</div>;
}
