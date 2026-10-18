import { EditorSelection, EditorView, undo, redo, undoDepth, redoDepth, selectAll, findClusterBreak } from './code-editor-core.mjs';
import { unfoldEditorRange } from './file-editor-folds.mjs';
import { selectedEditorContext } from './generated/code-editor-current/wrapper.mjs';

// 2.31226.0 cbd02b8f2 sn/U/cn/dn/fn: preserve linewise copy semantics
// across the context menu and native keyboard clipboard operations.
let copiedLine = null;
export function editorCopyInfo(state) {
  const selected = state.selection.ranges.filter(range => !range.empty);
  if (selected.length) return { text: selected.map(range => state.sliceDoc(range.from, range.to)).join(state.lineBreak), ranges: selected, linewise: false };
  const lines = [], ranges = [];
  let previous = -1;
  for (const range of state.selection.ranges) {
    const line = state.doc.lineAt(range.from);
    if (line.number <= previous) continue;
    lines.push(line.text); ranges.push({ from: line.from, to: Math.min(state.doc.length, line.to + 1) }); previous = line.number;
  }
  return { text: lines.join(state.lineBreak), ranges, linewise: true };
}
export function rememberEditorCopy(info) { copiedLine = info.linewise ? info.text : null; }
const clipboardText = (state, text) => state.facet(EditorView.clipboardInputFilter).reduce((value, filter) => filter(value, state), text);
const isLinewise = (state, text) => copiedLine !== null && copiedLine === text && state.selection.ranges.every(range => range.empty);
export function pasteInEditor(view, text) {
  const state = view.state;
  if (state.readOnly) return false;
  const filtered = clipboardText(state, text), document = state.toText(filtered);
  const byRange = document.lines === state.selection.ranges.length;
  let index = 1, changes;
  if (isLinewise(state, filtered)) {
    let previous = -1;
    changes = state.changeByRange(range => {
      const line = state.doc.lineAt(range.from);
      if (line.from === previous) return { range };
      previous = line.from;
      const insert = state.toText((byRange ? document.line(index++).text : filtered) + state.lineBreak);
      return { changes: { from: line.from, insert }, range: EditorSelection.cursor(range.from + insert.length) };
    });
  } else changes = byRange ? state.changeByRange(range => {
    const line = document.line(index++);
    return { changes: { from: range.from, to: range.to, insert: line.text }, range: EditorSelection.cursor(range.from + line.length) };
  }) : state.replaceSelection(document);
  view.dispatch(changes, { userEvent: 'input.paste', scrollIntoView: true });
  return true;
}
export const editorClipboardExtension = [
  EditorView.domEventObservers({ copy: (_event, view) => rememberEditorCopy(editorCopyInfo(view.state)), cut: (_event, view) => rememberEditorCopy(editorCopyInfo(view.state)) }),
  EditorView.domEventHandlers({ paste: (event, view) => {
    const text = event.clipboardData?.getData('text/plain');
    return typeof text === 'string' && text !== '' && isLinewise(view.state, clipboardText(view.state, text)) ? pasteInEditor(view, text) : false;
  } }),
];
export function syncEditorSelection(view) {
  const selection = view.dom.ownerDocument.getSelection();
  if (!selection?.anchorNode || !selection.focusNode || !view.contentDOM.contains(selection.anchorNode) || !view.contentDOM.contains(selection.focusNode)) return;
  const anchor = view.posAtDOM(selection.anchorNode, selection.anchorOffset), head = view.posAtDOM(selection.focusNode, selection.focusOffset);
  if (anchor !== view.state.selection.main.anchor || head !== view.state.selection.main.head) view.dispatch({ selection: { anchor, head }, userEvent: 'select.pointer' });
}
// c82eca2bd ft: order, shortcuts and read-only branches of the original menu.
export function editorMenuItems(state, { windows = false } = {}) {
  return [
    ...(!state.readOnly ? [
      { action: 'undo', label: 'Undo', shortcut: 'cmd+z', disabled: undoDepth(state) === 0 },
      { action: 'redo', label: 'Redo', shortcut: windows ? 'ctrl+y' : 'cmd+shift+z', disabled: redoDepth(state) === 0 },
      { separator: true }, { action: 'cut', label: 'Cut', shortcut: 'cmd+x' },
    ] : []),
    { action: 'copy', label: 'Copy', shortcut: 'cmd+c' },
    ...(!state.readOnly ? [{ action: 'paste', label: 'Paste', shortcut: 'cmd+v' }] : []),
    { separator: true }, { action: 'selectAll', label: 'Select all', shortcut: 'cmd+a' },
  ];
}
export async function runEditorCommand(view, action, { isCurrent = () => true, clipboard = globalThis.navigator?.clipboard } = {}) {
  if (!isCurrent()) return;
  if (action === 'copy' || action === 'cut') {
    const info = editorCopyInfo(view.state), doc = view.state.doc;
    await clipboard.writeText(info.text); rememberEditorCopy(info);
    // A pending clipboard write cannot cut into a newer document or detached editor.
    if (action === 'cut' && isCurrent() && view.state.doc === doc && !view.state.readOnly) view.dispatch({ changes: info.ranges.map(({ from, to }) => ({ from, to })), userEvent: 'delete.cut', scrollIntoView: true });
  } else if (action === 'paste') {
    const text = await clipboard.readText();
    if (isCurrent() && text !== '') pasteInEditor(view, text);
  } else ({ undo, redo, selectAll })[action]?.(view);
  if (isCurrent()) view.focus();
}

// cd2efac6e oo/so and cbd02b8f2 Ba: decimal line[:column], clamped
// to the document, with a caret on a grapheme boundary rather than inside one.
export function parseEditorLocation(value) {
  const match = /^(\d+)\s*(?::\s*(\d*))?$/.exec(String(value).trim());
  return match ? { line: Number(match[1]), column: match[2] ? Number(match[2]) : undefined } : null;
}
export function editorCaret(state) {
  const head = state.selection.main.head, line = state.doc.lineAt(head);
  return { line: line.number, column: head - line.from + 1, lines: state.doc.lines };
}
export function editorLocation(state, line, column = 1) {
  const row = state.doc.line(Math.max(1, Math.min(line, state.doc.lines)));
  const offset = Math.min(Math.max(column, 1) - 1, row.length);
  const before = findClusterBreak(row.text, offset, false);
  return row.from + (offset > 0 ? findClusterBreak(row.text, before, true) : 0);
}
export function goToEditorLocation(view, line, column) {
  const anchor = editorLocation(view.state, line, column);
  view.dispatch({ selection: { anchor }, effects: [...unfoldEditorRange(view.state, anchor), EditorView.scrollIntoView(anchor, { y: 'center' })] }); view.focus();
}
export function goToLineShortcut(event) {
  return !event.isComposing && !event.nativeEvent?.isComposing && !!event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey &&
    (/^[ -~]$/.test(event.key) ? event.key.toLowerCase() === 'g' : event.code === 'KeyG');
}

// cbd02b8f2 gi/_i: attach the contiguous selected block containing the primary
// caret. Exclude a trailing newline from both text and the last line label.
export function editorSelectedContext(state) {
  const selected = selectedEditorContext(state);
  return selected ? {text: selected.text, ...selected.range} : null;
}
export function fileSelectionLabel(path, selection) {
  return `${path}:L${selection.fromLine}${selection.toLine === selection.fromLine ? '' : `-L${selection.toLine}`}`;
}
