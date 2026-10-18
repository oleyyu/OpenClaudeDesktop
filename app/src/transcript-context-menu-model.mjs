import { t } from "../electron/i18n/index.mjs";
// Transcript right-click menus. Pure: the caller resolves the DOM target.
//
// messageMenu: scroll-messages-current.js:33652-33818 CY. Items in order —
// Copy (the selection, cmd+c); Copy code block / Copy path / Copy code over
// code that is not inside a link; Open in default browser (http/https only),
// Open in Preview (official: 'Open in Browser pane', :33727-33760; OpenClaude Desktop's pane is the Preview: a loopback http/https page while the
// session has a Preview pane, canOpenInPreview) and Copy link over a link; a separator when anything came before the
// message items; Copy message and Copy message as Markdown; a separator
// before Attach selection as context (cmd+shift+l, a selection of at least 2
// characters) or Attach message as context; Pin as chapter / Unpin chapter on
// an assistant message (canPin, pinned: cd5a31703 TI :25645-25651, the
// session-chapters store); then Rewind to here (a user
// message) and Fork from here (approval-current.js message menu onFork), each
// only where the core serves thread/revert / thread/fork and the session is
// idle (canRewind / canFork, decided by the caller), each with its one-line
// description (cd5a31703 zNe :25678-25707, EI.rewindMenu / EI.forkMenu).
// Over an image of the message (dI imageSrc / imageFileName, TI w → c26fb8b6b
// Ge :172-222): Copy image and Save image head the menu (imageTarget, the
// image's own copy/save from source-response-image.jsx).
//
// fileRefMenu: c856385e2-k3utJqnh.js Mn/Z for a transcript file reference —
// Attach as context (with a composer), Copy ▸ Absolute path / Relative path /
// Filename, a separator, Open in ▸ Files pane, Show in Finder.

const separator = Object.freeze({ type: "separator" });
const item = (id, label, extra = {}) => ({ type: "item", id, label, ...extra });

// scroll-messages-current.js:33094-33115 qJ/JJ/YJ: a link counts only for
// these protocols, and only http/https can open in the browser. A page on
// this computer (localhost, 127.x, ::1, *.localhost, 0.0.0.0) can also open in
// the Preview pane (CY linkTarget.canOpenInPreview).
const LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:", "irc:", "ircs:", "xmpp:", "computer:"]);
export function isLoopbackHost(hostname) {
  const host = String(hostname || "").toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  return host === "localhost" || host.endsWith(".localhost") || host === "::1" || host === "0.0.0.0" || /^127(?:\.\d{1,3}){3}$/.test(host);
}
export function linkTarget(href) {
  if (!href) return { linkHref: null, canOpenInBrowser: false, canOpenInPreview: false };
  try {
    const url = new URL(href), protocol = url.protocol, web = protocol === "http:" || protocol === "https:";
    return { linkHref: LINK_PROTOCOLS.has(protocol) ? href : null, canOpenInBrowser: web, canOpenInPreview: web && isLoopbackHost(url.hostname) };
  } catch {
    return { linkHref: null, canOpenInBrowser: false, canOpenInPreview: false };
  }
}

/** True when the selection is long enough to attach (CY w / S: trimmed ≥ 2). */
export const attachableSelection = (text) => typeof text === "string" && text.trim().length >= 2;

export function messageMenu({ imageTarget = null, selectionText = null, codeTarget = null, linkHref = null, canOpenInBrowser = false, canOpenInPreview = false, messageText, canAttach = false, canPin = false, pinned = false, canRewind = false, canFork = false } = {}) {
  const selection = typeof selectionText === "string" && selectionText.trim() !== "" ? selectionText : null;
  const link = linkHref || null;
  const code = link ? null : codeTarget?.text ? codeTarget : null;
  const hasText = typeof messageText === "string";
  const attach = canAttach && hasText;
  const pin = canPin && hasText;
  const image = imageTarget?.src ? imageTarget : null;
  const entries = [];
  if (image) entries.push(item("copy-image", t("Copy image")), item("save-image", t("Save image")));
  if (selection !== null) entries.push(item("copy-selection", t("Copy"), { shortcut: "cmd+c" }));
  if (code) entries.push(item("copy-code", code.isBlock ? t("Copy code block") : code.isPath ? t("Copy path") : t("Copy code")));
  if (link) {
    if (canOpenInBrowser) entries.push(item("open-link", t("Open in default browser")));
    if (canOpenInPreview) entries.push(item("open-in-preview", t("Open in Preview")));
    entries.push(item("copy-link", t("Copy link")));
  }
  const before = entries.length > 0;
  if (before && hasText) entries.push(separator);
  if (hasText) entries.push(item("copy-message", t("Copy message")), item("copy-markdown", t("Copy message as Markdown")));
  // TI E = attach || pin: the separator heads the Attach / Pin group even when only Pin is offered.
  if ((before || hasText) && (attach || pin)) entries.push(separator);
  if (attach) entries.push(attachableSelection(selection)
    ? item("attach", t("Attach selection as context"), { shortcut: "cmd+shift+l" })
    : item("attach", t("Attach message as context")));
  // TI (cd5a31703 :25645-25651): Pin as chapter / Unpin chapter on an assistant message, right after Attach.
  if (pin) entries.push(item("pin", pinned ? t("Unpin chapter") : t("Pin as chapter")));
  if ((canRewind || canFork) && entries.length) entries.push(separator);
  if (canRewind) entries.push(item("rewind", t("Rewind to here"), { description: t("Removes this message and what follows") }));
  if (canFork) entries.push(item("fork", t("Fork from here"), { description: t("Starts a new session, keeps this one") }));
  return entries;
}

export function fileRefMenu({ absolute = null, relative = null, filename, canAttach = false, canOpen = true, canReveal = false } = {}) {
  const entries = [];
  if (canAttach && absolute) entries.push(item("attach-file", t("Attach as context")));
  entries.push(item("copy", t("Copy"), { submenu: [
    ...(absolute ? [item("copy-absolute", t("Absolute path"))] : []),
    ...(relative ? [item("copy-relative", t("Relative path"))] : []),
    item("copy-filename", t("Filename")),
  ] }));
  if (canOpen) entries.push(separator, item("open-in", t("Open in"), { submenu: [item("open-files-pane", t("Files pane"))] }));
  if (canReveal && absolute) {
    if (!canOpen) entries.push(separator);
    entries.push(item("reveal", t("Show in Finder")));
  }
  return entries;
}

/** The text 'Attach … as context' puts in the composer: a Markdown quote of
 * the attached text (the local stand-in for the source's context snippet). */
export function quoteBlock(text) {
  const value = typeof text === "string" ? text.replace(/\s+$/, "") : "";
  if (!value.trim()) return "";
  return value.split("\n").map((line) => (line.length ? `> ${line}` : ">")).join("\n");
}
/** The draft after attaching: the existing draft, a blank line, the quote and
 * a blank line to type into, so several attachments keep their order. */
export function draftWithQuote(draft, text) {
  const quote = quoteBlock(text);
  if (!quote) return typeof draft === "string" ? draft : "";
  const head = typeof draft === "string" ? draft.replace(/\s+$/, "") : "";
  return head ? `${head}\n\n${quote}\n\n` : `${quote}\n\n`;
}

/** A transcript row's message text for Copy message / Attach message: an
 * agent or plan row's Markdown, a user row's text parts joined as the bubble
 * shows them; undefined for any other row or an empty message (F9: only rows
 * with text get the message menu). */
export function messageItemText(item) {
  if (!item) return undefined;
  if (item.type === "agentMessage" || item.type === "plan") return typeof item.text === "string" && item.text !== "" ? item.text : undefined;
  if (item.type !== "userMessage") return undefined;
  const text = (item.content || []).filter((part) => part.type === "text" || part.text).map((part) => part.text || "").join("\n");
  return text !== "" ? text : undefined;
}

// cf74bc599 df / attachTerminalOutput "cmd+shift+l": ⇧⌘L (or ⇧⌃L) attaches a selection made inside the transcript.
export const attachSelectionChord = (event) => !!event && !event.altKey && !!event.shiftKey && !!event.metaKey !== !!event.ctrlKey
  && typeof event.key === "string" && event.key.toLowerCase() === "l";

// ---- Where a right-click came from (2.42304.0 c96d752d0-BOCqU7c2.js, the message ContextMenu) ----------------------
// The row's onContextMenu reads `byKeyboard: e.button === -1` (a keyboard-invoked menu: the ContextMenu key or
// Shift+F10) and TNe re-dispatches it on the hidden trigger as `PointerEvent("contextmenu", {button: -1})` for a
// keyboard opening and `MouseEvent("contextmenu", {button: 2})` for a pointer one, so a keyboard opening lands on the
// first item and a pointer one does not. Locally the transcript opens SourceMenu at the point directly (no hidden
// trigger), so the caller passes byKeyboard on as initialHighlight "first".
export function contextMenuOrigin(event) {
  const x = Number(event?.clientX), y = Number(event?.clientY);
  return { byKeyboard: event?.button === -1, point: { x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 } };
}

// ENe's Popup carries `onContextMenu: xNe` (`e.preventDefault()`): a right-click on the open menu — its popup, or one
// of its submenus, whose events bubble through the popup's React tree — shows neither the native menu nor another
// one. Locally the popups are SourceMenu portals: the root is data-cds="ContextMenu", a submenu a nested role="menu".
export const OPEN_CONTEXT_MENU = '[data-cds="ContextMenu"], [role="menu"][data-nested]';
export function preventMenuContextMenu(event) {
  const node = event?.target?.nodeType === 1 ? event.target : event?.target?.parentElement;
  if (!node?.closest?.(OPEN_CONTEXT_MENU)) return false;
  event.preventDefault();
  return true;
}
