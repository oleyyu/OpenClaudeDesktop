// ctx.requestApproval for OpenClaude Desktop's agent tools (agent-tools-host.cjs): asks the user in a sheet on the
// window that shows the session (else the main window) and resolves true only for an explicit Allow. One question
// at a time per window; a window that closes, or a quit, answers no. Copy goes through the app's i18n.
//   request.kind "preview-site"     { host, url }                    an outside site in the preview
//   request.kind "chrome-site"      { host, url }                    a site the Chrome tools act on (agent-tools/browser.mjs)
//   request.kind "preview-server"   { name, command, args, cwd, env } a .claude/launch.json dev server the agent starts
//   request.kind "terminal-command" { title?, detail?, command, cwd } a command typed into a terminal tab
//   request.kind "workflow"         { name, description, phases, args?, always? } a dynamic workflow the model starts
//                                   (Claude Code's "Run a dynamic workflow?"); answers {approved, always}
//   request.kind "monitor"          { command, cwd, description }   a command Monitor watches in the background
//   request.kind "schedule"         { cron, humanSchedule, prompt, recurring }  a prompt CronCreate schedules
//   request.kind "web-fetch"        { host, url }                    a web page WebFetch reads
//   request.kind "notebook-edit"    { path, mode, cellId?, source? } a notebook cell NotebookEdit changes
//   request.kind "open-path"        { action: reveal|editor, path, editor?, line? }  reveal_path / open_in_editor
//   anything else                   { title?, detail? }
// Every sheet names the session that asks and its folder (split view and several windows can show other sessions),
// and says so when that session isn't the one the window shows. options.signal (the tool call's: a stopped turn
// aborts it) closes an open sheet as a No, and a question still waiting its turn is never shown.

/** A command line as a shell would read it: plain words as they are, anything else in single quotes. */
function shellLine(command, args = []) {
  const quote = (word) => {
    const text = String(word);
    return /^[\w@%+=:,./-]+$/.test(text) ? text : `'${text.replace(/'/g, "'\\''")}'`;
  };
  return [command, ...(Array.isArray(args) ? args : [])].filter((word) => word !== undefined && word !== null && word !== "").map(quote).join(" ");
}

// launch.json env variables that change which program runs or what it loads before its own code: a harmless-looking
// `npm run dev` with PATH=./.bin:… or NODE_OPTIONS=--require ./x.js runs something else. The approval names them.
const RISKY_ENV = /^(?:PATH|NODE_OPTIONS|NODE_PATH|BASH_ENV|ENV|ZDOTDIR|SHELL|PYTHONSTARTUP|PYTHONPATH|PYTHONHOME|PERL5OPT|PERL5LIB|RUBYOPT|RUBYLIB|GIT_EXEC_PATH|GIT_CONFIG_GLOBAL|ELECTRON_RUN_AS_NODE|(?:npm|NPM)_config_\w+|DYLD_\w+|LD_\w+)$/;
/** A launch configuration's env for an approval: KEY=value lines (capped), how many more, and the risky names. */
function launchEnvSummary(env) {
  const entries = env && typeof env === "object" && !Array.isArray(env) ? Object.entries(env).filter(([key, value]) => typeof key === "string" && key && typeof value === "string") : [];
  const lines = entries.slice(0, 20).map(([key, value]) => `${key}=${value.length > 200 ? `${value.slice(0, 200)}…` : value}`);
  return { lines, more: Math.max(0, entries.length - lines.length), risky: entries.map(([key]) => key).filter((key) => RISKY_ENV.test(key)) };
}

/** The line naming the session: In “title” · folder, plus a note when the window shows another session. */
function sessionLines(session, t) {
  if (!session || typeof session !== "object") return [];
  const title = typeof session.title === "string" && session.title.trim() ? session.title.trim() : "";
  const folder = typeof session.folder === "string" ? session.folder : "";
  const lines = [];
  if (title && folder) lines.push(t("In “{session}” · {folder}", { session: title, folder }));
  else if (title) lines.push(t("In “{session}”", { session: title }));
  else if (folder) lines.push(t("In a session in {folder}", { folder }));
  if (lines.length && session.shown === false) lines.push(t("This session isn’t the one shown in this window."));
  return lines;
}
const withSession = (detail, session, t) => {
  const head = sessionLines(session, t).join("\n");
  return [head, detail].filter(Boolean).join("\n\n");
};

function approvalCopy(request = {}, { t, assistant, session = null }) {
  const values = { assistant, host: request.host ?? "", command: request.command ?? "", cwd: request.cwd ?? "", name: typeof request.name === "string" ? request.name : "" };
  if (request.kind === "workflow") {
    const phases = Array.isArray(request.phases) ? request.phases.filter((phase) => phase && typeof phase.title === "string") : [];
    const lines = [typeof request.description === "string" ? request.description : ""];
    if (phases.length) lines.push("", t("This dynamic workflow will spin up multiple subagents across the following phases:"), ...phases.map((phase, index) => `${index + 1}. ${phase.title}${phase.detail ? ` — ${phase.detail}` : ""}`));
    if (request.args !== undefined) { let text; try { text = JSON.stringify(request.args); } catch { text = String(request.args); } lines.push("", t("Arguments: {args}", { args: text.length > 400 ? `${text.slice(0, 400)}…` : text })); }
    if (typeof request.note === "string" && request.note) lines.push("", request.note);
    lines.push("", t("Dynamic workflows can use a lot of tokens quickly by running many subagents in parallel — which counts against your usage limit. Stop a running workflow at any time in the Tasks pane, or turn off Dynamic workflows in Settings."));
    return {
      message: typeof request.title === "string" && request.title ? request.title : t("Run a dynamic workflow?"),
      detail: withSession(lines.filter((line, index, all) => line || (index > 0 && all[index - 1])).join("\n").trim(), session, t),
      allow: t("Yes, run it"),
      ...(typeof request.name === "string" && request.name && request.always !== false ? { always: t("Yes, and don’t ask again for {name}", { name: request.name }) } : {}),
      deny: t("No"),
    };
  }
  if (request.kind === "preview-site") {
    return {
      message: t("Let {assistant} use {host} in the preview?", values),
      detail: withSession(t("{assistant} will be able to read this site and click and type on it in this session. Only allow sites you trust.", values), session, t),
      allow: t("Allow"),
    };
  }
  if (request.kind === "chrome-site") {
    return {
      message: t("Let {assistant} use {host} in Chrome?", values),
      detail: withSession(t("{assistant} will be able to read this site and click and type on it in Chrome in this session. Only allow sites you trust.", values), session, t),
      allow: t("Allow"),
    };
  }
  if (request.kind === "preview-server") {
    const line = shellLine(request.command, request.args);
    const env = launchEnvSummary(request.env);
    return {
      message: values.name ? t("Let {assistant} start “{name}” from .claude/launch.json?", values) : t("Let {assistant} start a dev server from .claude/launch.json?", values),
      detail: withSession([line, request.cwd ? t("In {cwd}", values) : "",
        env.lines.length ? [t("With these environment variables:"), ...env.lines, ...(env.more ? [t("and {count} more", { count: env.more })] : [])].join("\n") : "",
        env.risky.length ? t("Warning: {names} can make it run a different program or load other code than the command shows. Allow it only if you set these yourself.", { names: env.risky.join(", ") }) : "",
        t("The command runs on your computer outside {assistant}’s sandbox, with your permissions and network access. Only allow commands you trust.", values)].filter(Boolean).join("\n\n"), session, t),
      allow: t("Start"),
    };
  }
  if (request.kind === "terminal-command") {
    return {
      message: typeof request.title === "string" && request.title ? request.title : t("Let {assistant} run this command in the terminal?", values),
      detail: withSession([String(request.command ?? ""), request.cwd ? t("In {cwd}", values) : "", typeof request.detail === "string" ? request.detail : ""].filter(Boolean).join("\n\n"), session, t),
      allow: t("Run"),
    };
  }
  if (request.kind === "monitor") {
    return {
      message: t("Let {assistant} watch this command in the background?", values),
      detail: withSession([String(request.command ?? ""), request.cwd ? t("In {cwd}", values) : "",
        t("It runs in your own shell, outside the sandbox, until it ends or its time runs out, and each line it prints is sent to {assistant}. You can stop it in the Background tasks pane.", values)].filter(Boolean).join("\n\n"), session, t),
      allow: t("Run"),
    };
  }
  if (request.kind === "schedule") {
    const once = request.recurring === false;
    const cadence = typeof request.humanSchedule === "string" && request.humanSchedule ? request.humanSchedule : typeof request.cron === "string" ? request.cron : "";
    return {
      message: once ? t("Let {assistant} schedule this prompt?", values) : t("Let {assistant} start this loop?", values),
      detail: withSession([cadence, typeof request.prompt === "string" ? request.prompt : "",
        once ? t("The prompt runs once in this session when it’s due and the session is idle, with the session’s current permissions. You can stop it in the Background tasks pane.")
          : t("The prompt runs in this session each time it’s due and the session is idle, with the session’s current permissions, for up to 7 days. You can stop it in the Background tasks pane.")].filter(Boolean).join("\n\n"), session, t),
      allow: t("Allow"),
    };
  }
  if (request.kind === "open-path") {
    const file = typeof request.path === "string" ? request.path : "";
    const name = file.split("/").pop() || file;
    return {
      message: request.action === "editor" ? t("Let {assistant} open {file} in {editor}?", { ...values, file: name, editor: typeof request.editor === "string" && request.editor ? request.editor : t("your editor") }) : t("Let {assistant} show {file} in Finder?", { ...values, file: name }),
      detail: withSession(file, session, t),
      allow: t("Allow"),
    };
  }
  if (request.kind === "notebook-edit") {
    const file = typeof request.path === "string" ? request.path : "";
    const name = file.split("/").pop() || file;
    return {
      message: request.mode === "delete" ? t("Let {assistant} delete a cell in {file}?", { ...values, file: name }) : request.mode === "insert" ? t("Let {assistant} add a cell to {file}?", { ...values, file: name }) : t("Let {assistant} edit {file}?", { ...values, file: name }),
      detail: withSession([file, request.cellId ? t("Cell {cell}", { cell: request.cellId }) : "", request.mode === "delete" ? "" : typeof request.source === "string" ? request.source.slice(0, 1500) : ""].filter(Boolean).join("\n\n"), session, t),
      allow: t("Allow"),
    };
  }
  if (request.kind === "web-fetch") {
    return {
      message: t("Let {assistant} fetch {host}?", values),
      detail: withSession([typeof request.url === "string" ? request.url : "", t("{assistant} will read this page’s content. Allow it for this session to let {assistant} read other pages from this site without asking.", values)].filter(Boolean).join("\n\n"), session, t),
      allow: t("Allow"),
    };
  }
  return {
    message: typeof request.title === "string" && request.title ? request.title : t("Allow {assistant} to continue?", values),
    detail: withSession(typeof request.detail === "string" ? request.detail : "", session, t),
    allow: t("Allow"),
  };
}

/**
 * @param {object} o
 * @param {(sessionId: string) => object|null} o.windowFor   the window to ask in
 * @param {(session: {id, cwd}, window: object|null) => ({title?: string, folder?: string, shown?: boolean}|null)} [o.describeSession]
 */
function createAgentToolApproval({ dialog, windowFor, t, assistant = () => "DeepSeek", describeSession = () => null }) {
  const queues = new WeakMap();
  return async function requestApproval(session, request = {}, { signal } = {}) {
    const declined = request.kind === "workflow" ? { approved: false, always: false } : false;
    if (signal?.aborted) return declined;
    const window = windowFor(session?.id);
    let about = null;
    try { about = describeSession(session, window && !window.isDestroyed?.() ? window : null); } catch { about = null; }
    const copy = approvalCopy(request, { t, assistant: assistant(), session: about });
    // A workflow asks Yes / Yes, and don't ask again / No and answers {approved, always}; every other request a boolean.
    const buttons = copy.always ? [copy.allow, copy.always, copy.deny] : [copy.allow, copy.deny ?? t("Don’t allow")];
    const ask = async () => {
      if (signal?.aborted) return declined;
      const options = { type: "question", buttons, defaultId: buttons.length - 1, cancelId: buttons.length - 1, noLink: true, message: copy.message, detail: copy.detail, ...(signal ? { signal } : {}) };
      const { response } = window && !window.isDestroyed() ? await dialog.showMessageBox(window, options) : await dialog.showMessageBox(options);
      // A sheet the stopped turn closed is a No whatever it reports.
      if (signal?.aborted) return declined;
      if (request.kind === "workflow") return { approved: response === 0 || (!!copy.always && response === 1), always: !!copy.always && response === 1 };
      return response === 0;
    };
    if (!window) return ask().catch(() => declined);
    const previous = queues.get(window) ?? Promise.resolve();
    const answer = previous.catch(() => {}).then(() => (window.isDestroyed() ? declined : ask())).catch(() => declined);
    queues.set(window, answer);
    return answer;
  };
}

module.exports = { createAgentToolApproval, approvalCopy, shellLine, launchEnvSummary };
