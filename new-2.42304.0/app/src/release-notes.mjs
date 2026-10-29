// Bundled release notes for the What’s new dialog (titlebar-release-notes.js:4184-4200 j(surface) over the
// versioned `releases` list: {version, date, entries: [{surface, kind, text}]}, newest first). This client has a
// single surface, so an entry is {version, date, items: [{kind, text}]}; `limits` is the local "Known limits"
// footnote. Text may hold [[keys]] (keycaps) and `code` spans (I, :5071-5094).
// OpenClaude Desktop is a frame for many agent cores, so the notes are core-neutral: DeepSeek Harness appears only as
// the built-in core (a product name), never as "the assistant" every user runs.
// Every shipped version needs its entry (scripts/verify-release-notes.mjs fails the build otherwise), or the What’s new
// nudge never comes back after an update.
export const RELEASE_NOTES = Object.freeze([
  {
    version: "0.2.187",
    date: "2026-10-29",
    items: [
      { kind: "feat", text: "Computer use: the agent works in the apps you allow, in the background without taking your keyboard, mouse or focus, or with full-screen control when you approve it. Teach mode walks you through an app step by step." },
      { kind: "feat", text: "Claude in Chrome bridge: navigate, read pages, fill forms, click and run read-only scripts in your own Chrome, with a per-site approval." },
      { kind: "feat", text: "On a Mac without Node.js or Git, Setup opens with a Check your Mac step that installs what is missing." },
      { kind: "improvement", text: "A command the core keeps running in the background no longer spins beside the next step: the transcript shows one working mark at a time." },
      { kind: "improvement", text: "A background command that finishes normally no longer adds a “Background command completed” line; failed or stopped tasks still get their own row." },
      { kind: "improvement", text: "The click ripple on Home stays smooth." },
      { kind: "improvement", text: "Settings › Models shows one line per model, and Settings › Harness fields line up." },
      { kind: "improvement", text: "A full bug sweep across cores, terminals and tools: Stop also ends a running Chrome tool call, the model menu lists models on ACP cores again, and custom global instructions reach every core." },
    ],
  },
  {
    version: "0.2.186",
    date: "2026-10-15",
    items: [
      { kind: "feat", text: "Split view arranges up to ten sessions in a grid, and a session, the Tasks pane or the terminal can open in its own window." },
      { kind: "feat", text: "Long sessions get chapters: jump between them from the rail beside the transcript, or pin any turn as a chapter." },
      { kind: "feat", text: "Comment on lines in the Changes pane and on plan text; your comments go to the message box." },
      { kind: "feat", text: "Run a code block’s command in the terminal and watch its output under the block." },
      { kind: "feat", text: "The Changes pane lists the branch’s commits, and the git band shows the branch’s pull request when the GitHub CLI is installed." },
      { kind: "feat", text: "Drag sessions in the sidebar to pin them, reorder them or move them between groups." },
      { kind: "feat", text: "Rewind shows the messages you can go back to and which files would change." },
      { kind: "improvement", text: "Open files and the file tree follow changes on disk; HTML, SVG and PDF files show a rendered preview." },
      { kind: "improvement", text: "Preview finds your dev server, explains a failed or stopped server, and remembers the sites you allow." },
      { kind: "improvement", text: "Settings are grouped into General, This computer and Customize; Skills and Plugins are lists you can filter and sort, and the command palette lists session actions." },
    ],
  },
  {
    version: "0.2.185",
    date: "2026-10-13",
    items: [
      { kind: "feat", text: "The app is now called OpenClaude Desktop. Your sessions and settings carry over." },
      { kind: "feat", text: "Choose a speed (Standard, Fast or Ultrafast) for models that offer faster tiers, from the model menu or Settings; `/fast` takes a tier name." },
      { kind: "feat", text: "`/clear` starts a fresh session in the same folder with the same model and settings, and archives the old conversation." },
      { kind: "feat", text: "Ask a side question with `/btw` while a session keeps working." },
      { kind: "feat", text: "The app is available in Simplified Chinese: choose the language in Settings." },
      { kind: "feat", text: "Suggested tasks you put away come back under the message box on Home for their folder; pick one to put its prompt in the message box." },
      { kind: "improvement", text: "Home’s Action Center lists sessions whose last turn failed as Needs input, and hovering one shows what it is waiting for." },
      { kind: "improvement", text: "A new worktree session first refreshes its branch from origin and says which step it is on; without a working Git, a dialog explains how to install it." },
      { kind: "improvement", text: "Starting a new session from a custom sidebar group shows the group it will be added to, with an X to keep it out." },
    ],
  },
  {
    version: "0.2.130",
    date: "2026-10-01",
    items: [
      { kind: "feat", text: "OpenClaude Desktop is now a frame for agent cores: choose one in Settings › Cores. DeepSeek Harness is built in; the others install on demand or use the copy already on this Mac." },
      { kind: "feat", text: "The model menu lists the running core’s models and each model’s reasoning efforts." },
      { kind: "feat", text: "Sessions are saved by the core that ran them; the built-in DeepSeek Harness core keeps them in `~/.dsh`, so the DeepSeek Harness app can open them too." },
      { kind: "feat", text: "Plan mode, queued messages and `/compact` work along with approvals, sub-agents, skills and image input, wherever the running core supports them." },
      { kind: "improvement", text: "While the assistant thinks, the status line can show its reasoning in the transcript, and reads “Thought for Ns” when a thought ends." },
      { kind: "improvement", text: "Reasoning reads as plain text with Copy as quote; thinking before tool calls is an open Thought process step." },
      { kind: "improvement", text: "The Plan pane lists tasks as done, in progress or not done, and stays after a session is reopened." },
    ],
    limits: [
      "Some commands, such as /fork, /review and /rewind, depend on the running core; the slash menu says when one isn’t available.",
      "Sessions started outside OpenClaude Desktop, or before you switched cores, don’t appear in the sidebar.",
      "Removing a session hides it here only, unless the core can delete its own history.",
      "Some cores can’t add MCP servers or turn skills on or off from Settings; use that core’s own configuration.",
      "Usage counts and cost estimates come from records on this Mac, not from your provider’s bill.",
      "Writing to an added folder may need an extra permission step.",
    ],
  },
]);

// F (:5070): groups render in this order, labelled New / Improved / Fixed (L, :5095-5099).
export const RELEASE_NOTE_KINDS = Object.freeze(["feat", "improvement", "fix"]);
export const RELEASE_NOTE_KIND_LABELS = Object.freeze({ feat: "New", improvement: "Improved", fix: "Fixed" });

// P (:5059-5069) `n`: the nudge needs an entry whose version is the running version.
export const LOCAL_RELEASE_NOTE_VERSIONS = Object.freeze(RELEASE_NOTES.map((entry) => entry.version));
export function hasReleaseNotes(version, notes = RELEASE_NOTES) {
  return !!version && notes.some((entry) => entry.version === version);
}

// d/p: a plain x.y.z version and its ordering (prerelease/build suffixes are not used locally).
const VERSION = /^(\d+)\.(\d+)\.(\d+)$/;
export function validVersion(value) {
  return typeof value === "string" && VERSION.test(value);
}
export function compareVersions(a, b) {
  const left = VERSION.exec(a).slice(1).map(Number), right = VERSION.exec(b).slice(1).map(Number);
  for (let index = 0; index < 3; index++) if (left[index] !== right[index]) return left[index] - right[index];
  return 0;
}

// B m (:5161-5165): with a valid running version only entries at or below it show; newest first.
export function releaseNotesFor(clientVersion, notes = RELEASE_NOTES) {
  const shown = validVersion(clientVersion)
    ? notes.filter((entry) => validVersion(entry.version) && compareVersions(entry.version, clientVersion) <= 0)
    : [...notes];
  return shown.sort((a, b) => (validVersion(a.version) && validVersion(b.version) ? compareVersions(b.version, a.version) : 0));
}

// I: split on [[keys]] (not followed by another ]) and `code`; text runs stay text.
export function releaseNoteSegments(text) {
  const parts = String(text).split(/\[\[(.+?)\]\](?!\])|`([^`]+)`/), segments = [];
  for (let index = 0; index < parts.length; index += 3) {
    if (parts[index]) segments.push({ type: "text", value: parts[index] });
    const keys = parts[index + 1], code = parts[index + 2];
    if (keys !== undefined) segments.push({ type: "keys", value: keys });
    else if (code !== undefined) segments.push({ type: "code", value: code });
  }
  return segments;
}

// The h4 date: O(new Date(`${date}T00:00:00Z`), {timeZone: "UTC", year: "numeric", month: "long", day: "numeric"}).
export function releaseNoteDate(date, locale = "en-US") {
  return new Intl.DateTimeFormat(locale, { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" }).format(new Date(`${date}T00:00:00Z`));
}
