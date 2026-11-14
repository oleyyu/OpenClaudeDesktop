// Custom instructions (C1).
//
// DeepSeek core: the global instructions ARE the system prompt. When they are
// set, params.codeDesktop.customization.systemPrompt carries them and the
// bridge replaces every built-in section with that text (harness
// system-prompt.js); empty (or the feature switched off) keeps the built-in
// prompt. The project instructions (the nearest .code-desktop/instructions.md
// and the project override from settings) travel as
// customization.instructions and follow the system prompt: as their bare text
// after a custom one, under a "# Project instructions" heading after the
// built-in one. Both ride on thread/start, thread/resume and turn/start (the
// bridge applies them from the next model step).
// Codex core: with global instructions set they replace Codex's own prompt
// (thread/start and thread/resume baseInstructions, 0.155.1+), the project
// text alone is the developerInstructions (the app's default line goes), the
// personality is none and every instruction block Codex adds on its own is
// switched off for the thread (CUSTOM_PROMPT_CODEX_CONFIG): nothing the system
// wrote reaches the model. Without them the project text is appended to
// developerInstructions as before. Other cores can't replace their prompt; with
// global instructions they get those (and the project text) instead of the
// app's default line.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { normalizeInstructions, projectInstructionsFor } = require("./prefs/instructions.mjs");
const { coreForEngine, coreName, coreSupports } = require("./core-registry.mjs");
const i18n = require("./i18n/index.mjs");

const PROJECT_FILE = path.posix.join(".code-desktop", "instructions.md");
// No practical limit on the project instructions file (user preference).
const FILE_CAP = Number.MAX_SAFE_INTEGER;
// No total cap: everything the user wrote reaches the model (user preference).
const TOTAL_CAP = Infinity;
const MAX_LEVELS = 8;
const TRUNCATED = "[truncated]";
// thread/goal/set and codeDesktop/commands/execute start model turns on the agent too (goal rounds, /goal's round
// driver), so they carry the current instructions like turn/start: a change in Settings › Instructions reaches them.
const DEEPSEEK_METHODS = new Set(["thread/start", "thread/resume", "turn/start", "thread/goal/set", "codeDesktop/commands/execute"]);
const CODEX_METHODS = new Set(["thread/start", "thread/resume"]);
// Codex config keys (codex debug prompt-input) for the blocks it writes itself: permissions, environment context,
// collaboration-mode, apps, plugin and skills usage, and the skills list. Its multi-agent role (from the model catalog)
// and recommended plugins (only without plugins altogether) have no switch.
const CUSTOM_PROMPT_CODEX_CONFIG = Object.freeze({
  include_permissions_instructions: false, include_environment_context: false, include_collaboration_mode_instructions: false,
  include_apps_instructions: false, include_apps_usage_instructions: false, include_plugin_usage_instructions: false,
  include_skills_usage_instructions: false, "skills.include_instructions": false,
});
const PREVIEW_TIMEOUT = 15000;
const TEMPLATE = `<!--
  Project instructions for OpenClaude Desktop.
  Everything outside this comment is appended to the agent's system prompt for
  sessions in this folder and its subfolders. HTML comments are ignored.
  Example:
  - Use pnpm, not npm.
  - Run the unit tests before saying a change is done.
-->
`;

/** The nearest <dir>/.code-desktop/instructions.md, walking up from cwd (≤8 levels, never home or /). */
function findProjectFile(cwd, { home = os.homedir(), fs: fsys = fs } = {}) {
  if (typeof cwd !== "string" || !path.isAbsolute(cwd)) return null;
  let dir = path.resolve(cwd);
  for (let level = 0; level < MAX_LEVELS; level++) {
    if (dir === home || dir === path.parse(dir).root) return null;
    const candidate = path.join(dir, PROJECT_FILE);
    try { if (fsys.statSync(candidate).isFile()) return candidate; } catch {}
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

// The template's comment (and any other HTML comment) contributes nothing.
const stripComments = (text) => text.replace(/<!--[\s\S]*?-->/g, "");
const clean = (text) => (typeof text === "string" ? stripComments(text.replace(/\r\n?/g, "\n")).trim() : "");

/** Reads the project file as UTF-8, capped at 32 KB. */
function readProjectFile(file, fsys = fs) {
  if (!file) return { text: "", bytes: 0, exists: false };
  try {
    const stat = fsys.statSync(file);
    if (!stat.isFile()) return { text: "", bytes: 0, exists: false };
    const fd = fsys.openSync(file, "r");
    try {
      const buffer = Buffer.alloc(Math.min(stat.size, FILE_CAP));
      const read = fsys.readSync(fd, buffer, 0, buffer.length, 0);
      return { text: buffer.subarray(0, read).toString("utf8").replace(/�+$/, ""), bytes: stat.size, exists: true, capped: stat.size > FILE_CAP };
    } finally { fsys.closeSync(fd); }
  } catch { return { text: "", bytes: 0, exists: false }; }
}

/**
 * text: the appended block for the Codex core (global + project, with headings).
 * systemPrompt: the global text that replaces the DeepSeek core's built-in prompt, or null.
 * instructions: the project block the DeepSeek core adds after the system prompt, or null.
 * @returns {{text:string, systemPrompt:string|null, instructions:string|null, parts:{source:string, path?:string, chars:number}[], chars:number, truncated:boolean, root:string|null}}
 */
function composeInstructions({ prefs, cwd, fileText = "", filePath = null }) {
  const value = normalizeInstructions(prefs);
  const empty = { text: "", systemPrompt: null, instructions: null, parts: [], chars: 0, truncated: false, root: null };
  if (!value.enabled) return empty;
  const parts = [], blocks = [];
  const global = clean(value.global);
  // The system prompt is the user's text as written (comments included), only trimmed.
  const systemPrompt = value.global.trim() ? value.global.trim() : null;
  if (global) { blocks.push(`# Custom instructions\n${global}`); parts.push({ source: "global", chars: global.length }); }
  const entry = projectInstructionsFor(value, cwd);
  const file = entry?.useFile === false ? "" : clean(fileText);
  const override = clean(entry?.text);
  const root = entry?.root ?? (filePath ? path.dirname(path.dirname(filePath)) : null) ?? (typeof cwd === "string" ? cwd : null);
  let instructions = null;
  if (file || override) {
    const body = [file, override].filter(Boolean).join("\n\n");
    blocks.push(`# Project instructions (${root})\n${body}`);
    instructions = systemPrompt ? body : `# Project instructions (${root})\n${body}`;
    if (file) parts.push({ source: "projectFile", path: filePath, chars: file.length });
    if (override) parts.push({ source: "projectOverride", path: entry.root, chars: override.length });
  }
  let text = blocks.join("\n\n"), truncated = false;
  if (text.length > TOTAL_CAP) { text = `${text.slice(0, TOTAL_CAP - TRUNCATED.length - 1)}\n${TRUNCATED}`; truncated = true; }
  return { text, systemPrompt, instructions, parts, chars: text.length, truncated, root: file || override ? root : null };
}

/** Reads fresh from disk and composes for cwd. */
function composeFor(prefs, cwd, { home, fs: fsys = fs } = {}) {
  const value = normalizeInstructions(prefs);
  const entry = projectInstructionsFor(value, cwd);
  const filePath = findProjectFile(cwd, { home, fs: fsys });
  const file = readProjectFile(entry?.useFile === false ? null : filePath, fsys);
  return { ...composeInstructions({ prefs: value, cwd, fileText: file.text, filePath }), filePath, entry };
}

/**
 * Mutates params for the core request. engine is serverInfo.engine;
 * read(cwd) returns the composition for cwd.
 */
function decorateCoreParams(method, params, { engine, cwd, read }) {
  if (!params || typeof params !== "object") return params;
  if (coreSupports(engine, "customization")) {
    if (!DEEPSEEK_METHODS.has(method)) return params;
    const { systemPrompt = null, instructions = null } = read(cwd);
    const codeDesktop = params.codeDesktop && typeof params.codeDesktop === "object" ? params.codeDesktop : {};
    params.codeDesktop = { ...codeDesktop, customization: { ...codeDesktop.customization, systemPrompt: systemPrompt || null, instructions: instructions || null } };
    return params;
  }
  if (!CODEX_METHODS.has(method)) return params;
  const { text, systemPrompt = null, instructions = null } = read(cwd);
  if (systemPrompt) {
    // The user's prompt is the whole prompt: no default line, no built-in prose.
    if ((engine?.engine ?? engine) === "codex") {
      params.baseInstructions = systemPrompt;
      params.developerInstructions = instructions || null;
      params.personality = "none";
      params.config = { ...(params.config && typeof params.config === "object" ? params.config : {}), ...CUSTOM_PROMPT_CODEX_CONFIG };
    } else params.developerInstructions = text;
    return params;
  }
  if (!text) return params;
  params.developerInstructions = [typeof params.developerInstructions === "string" ? params.developerInstructions : "", text].filter(Boolean).join("\n\n");
  return params;
}

/** The bridge's preview, reduced to the fields the page shows. */
function systemPromptResult(result) {
  const value = result && typeof result === "object" ? result : {};
  const text = typeof value.text === "string" ? value.text : "";
  return { text, defaultText: typeof value.defaultText === "string" ? value.defaultText : "", defaultTemplate: typeof value.defaultTemplate === "string" ? value.defaultTemplate : "", custom: value.custom === true, exact: value.exact === true,
    sections: Array.isArray(value.sections) ? value.sections.filter(s => s && typeof s.name === "string").map(s => ({ name: s.name, chars: Number(s.chars) || 0 })) : [],
    tools: Array.isArray(value.tools) ? value.tools.filter(t => typeof t === "string") : [],
    model: typeof value.variables?.model === "string" ? value.variables.model : null,
    cwd: typeof value.cwd === "string" ? value.cwd : null, threadId: typeof value.threadId === "string" ? value.threadId : null };
}

function projectFileTarget(prefs, cwd, options) {
  const found = findProjectFile(cwd, options);
  if (found) return found;
  const entry = projectInstructionsFor(normalizeInstructions(prefs), cwd);
  return path.join(entry?.root ?? cwd, PROJECT_FILE);
}

// The instruction files the DeepSeek core loads itself (dsh-agent-instructions, mounted by dsh-base): the harness
// home's AGENTS.md, then AGENTS.md, CLAUDE.md, AGENTS.local.md and CLAUDE.local.md in every folder from the project
// root (the nearest folder with .git, else the session folder) down to the session folder. They are sent as a
// separate baseline message (capped at 64 KiB), not inside the system prompt.
const CORE_INSTRUCTION_NAMES = ["AGENTS.md", "CLAUDE.md", "AGENTS.local.md", "CLAUDE.local.md"];
/**
 * Which instruction files a core loads itself: the global file and the names looked up in every folder from the project
 * root down to the session folder. The DeepSeek core (above); Qwen Code (below: context.fileName or QWEN.md and
 * AGENTS.md, global and per folder, QWEN.local.md, rules); Gemini CLI (memoryDiscovery.ts: GEMINI.md, plus settings context.fileName,
 * global ~/.gemini/GEMINI.md); Codex (AGENTS.override.md or AGENTS.md, global $CODEX_HOME/AGENTS.md); MiniMax Code (below:
 * cwdOnly, firstMatch); OpenCode and MiMo Code (below: globals, walkUp); ZCode (below: nearest). null: none known.
 */
function coreInstructionSpec(engine, { home, env = process.env, fs: fsys = fs } = {}) {
  if (engine === "deepseek") return { global: path.join(typeof env.DSH_HOME === "string" && env.DSH_HOME ? env.DSH_HOME : path.join(home, ".dsh"), "AGENTS.md"), names: CORE_INSTRUCTION_NAMES };
  // Qwen Code 0.24.7 (memoryDiscovery.ts, memory-constants.ts, config/rulesDiscovery.ts): the names in settings
  // context.fileName replace QWEN.md + AGENTS.md, each read globally (<QWEN_HOME or ~/.qwen>/<name>) and in every
  // folder up to the project root; then <project root>/.qwen/QWEN.local.md (a git root only), and the rule files under
  // <qwen dir>/rules and <project root, else the session folder>/.qwen/rules (a rule with `paths:` loads when the model
  // touches a matching file).
  if (engine === "qwen") {
    const dir = typeof env.QWEN_HOME === "string" && env.QWEN_HOME ? env.QWEN_HOME : path.join(home, ".qwen");
    let names = ["QWEN.md", "AGENTS.md"];
    try {
      const configured = JSON.parse(fsys.readFileSync(path.join(dir, "settings.json"), "utf8"))?.context?.fileName;
      const list = (Array.isArray(configured) ? configured : [configured]).map((name) => typeof name === "string" ? name.trim() : "").filter((name) => name && /^[^/\\]+$/.test(name) && name !== "." && name !== "..");
      if (list.length) names = [...new Set(list)];
    } catch {}
    return { global: path.join(dir, names[0]), extraGlobals: names.slice(1).map((name) => path.join(dir, name)), names, qwenDir: dir,
      local: path.join(".qwen", "QWEN.local.md"), rules: { global: path.join(dir, "rules"), project: path.join(".qwen", "rules") } };
  }
  if (engine === "gemini") {
    const dir = path.join(home, ".gemini");
    let extra = [];
    try {
      const configured = JSON.parse(fsys.readFileSync(path.join(dir, "settings.json"), "utf8"))?.context?.fileName;
      extra = (Array.isArray(configured) ? configured : [configured]).filter((name) => typeof name === "string" && /^[^/\\]+\.md$/i.test(name));
    } catch {}
    return { global: path.join(dir, "GEMINI.md"), names: [...new Set(["GEMINI.md", ...extra])] };
  }
  if (engine === "codex") return { global: path.join(typeof env.CODEX_HOME === "string" && env.CODEX_HOME ? env.CODEX_HOME : path.join(home, ".codex"), "AGENTS.md"), names: ["AGENTS.override.md", "AGENTS.md"] };
  // MiniMax Code (local-runtime-v2 static-prompt-reader.ts): <data dir>/AGENTS.md ($MINIMAX_DATA_DIR, $MAVIS_DATA_DIR or
  // ~/.minimax), and one project file read from the session folder only (no walk up to the repo root): CLAUDE.md, else
  // AGENTS.md, whichever is first with text. Each is capped at 32 KiB.
  if (engine === "minimax") {
    const dir = [env.MINIMAX_DATA_DIR, env.MAVIS_DATA_DIR].map((value) => typeof value === "string" ? value.trim() : "").find(Boolean) || path.join(home, ".minimax");
    return { global: path.join(dir, "AGENTS.md"), names: ["CLAUDE.md", "AGENTS.md"], cwdOnly: true, firstMatch: true };
  }
  // OpenCode and MiMo Code (session/instruction.ts systemPaths): the first global file that exists of
  // <config>/AGENTS.md and ~/.claude/CLAUDE.md (unless *_DISABLE_CLAUDE_CODE_PROMPT); per project, every AGENTS.md from
  // the session folder up to the worktree, else every CLAUDE.md, else every CONTEXT.md (deprecated). MiMo also adds
  // the CLAUDE.md files when its AGENTS.md files hold fewer than 500 characters.
  if (engine === "opencode" || engine === "mimo") {
    const mimo = engine === "mimo";
    const flag = (name) => /^(1|true)$/i.test(String(env[name] ?? "").trim());
    const claude = !flag(mimo ? "MIMOCODE_DISABLE_CLAUDE_CODE_PROMPT" : "OPENCODE_DISABLE_CLAUDE_CODE_PROMPT");
    const configHome = typeof env.XDG_CONFIG_HOME === "string" && env.XDG_CONFIG_HOME ? env.XDG_CONFIG_HOME : path.join(home, ".config");
    return { globals: [path.join(configHome, mimo ? "mimocode" : "opencode", "AGENTS.md"), ...(claude ? [path.join(home, ".claude", "CLAUDE.md")] : [])],
      names: ["AGENTS.md", ...(claude ? ["CLAUDE.md"] : []), "CONTEXT.md"], walkUp: true, sparseClaude: mimo && claude ? 500 : 0 };
  }
  // ZCode (adapters/src/context/index.ts resolveUserInstructions, DEFAULT_PRIORITY_FILES ["AGENTS.md"]): the user file
  // ~/.zcode/AGENTS.md (findDefaultUserInstructionFile, $HOME of the bridge = this home), plus the workspace file: the
  // nearest AGENTS.md from the session folder up to the git root, else up to the filesystem root (findInstructionFile).
  // ZCode's /init writes that workspace file, not the user one.
  if (engine === "zcode") return { global: path.join(home, ".zcode", "AGENTS.md"), names: ["AGENTS.md"], nearest: true };
  return null;
}
function coreInstructionFiles(cwd, { home, env = process.env, fs: fsys = fs, engine = "deepseek" } = {}) {
  const spec = coreInstructionSpec(engine, { home, env, fs: fsys });
  if (!spec) return [];
  const stat = (file) => { try { const info = fsys.statSync(file); return info.isFile() ? { exists: true, bytes: info.size } : { exists: false, bytes: 0 }; } catch { return { exists: false, bytes: 0 }; } };
  // globals: the core reads the first one that exists (none existing: the first is where to create one).
  const global = spec.globals ? spec.globals.find((file) => stat(file).exists) ?? spec.globals[0] : spec.global;
  const files = [{ path: global, scope: "global", ...stat(global) }];
  // extraGlobals: more global files the core reads too, listed when they exist (Qwen: one per context file name).
  for (const file of spec.extraGlobals ?? []) { const info = stat(file); if (info.exists) files.push({ path: file, scope: "global", ...info }); }
  if (spec.rules) files.push(...ruleFiles(spec.rules.global, "global", fsys));
  if (typeof cwd !== "string" || !path.isAbsolute(cwd)) return files;
  if (spec.cwdOnly) {
    // firstMatch: only the first file the core actually reads (one with text; an empty or blank file is skipped).
    for (const name of spec.names) {
      const file = path.join(cwd, name), info = stat(file);
      if (!info.exists) continue;
      if (spec.firstMatch) {
        let text = "";
        try { text = fsys.readFileSync(file, "utf8"); } catch {}
        if (!text.trim()) continue;
        files.push({ path: file, scope: "project", ...info });
        break;
      }
      files.push({ path: file, scope: "project", ...info });
    }
    return files;
  }
  if (spec.nearest) {
    // One file: the first match walking up from the session folder, stopping at the git root (else at "/"); a match
    // that is the global file itself is read once, as the global.
    let root = null;
    for (let dir = cwd; ; dir = path.dirname(dir)) { if (fsys.existsSync(path.join(dir, ".git"))) { root = dir; break; } if (path.dirname(dir) === dir) break; }
    for (let dir = cwd; ; dir = path.dirname(dir)) {
      const match = spec.names.map((name) => path.join(dir, name)).find((file) => stat(file).exists);
      if (match) { if (path.resolve(match) !== path.resolve(global)) files.push({ path: match, scope: "project", ...stat(match) }); break; }
      if (dir === root || path.dirname(dir) === dir) break;
    }
    return files;
  }
  let root = null;
  for (let dir = cwd; ; dir = path.dirname(dir)) {
    if (fsys.existsSync(path.join(dir, ".git"))) { root = dir; break; }
    if (path.dirname(dir) === dir || dir === home) break;
  }
  const chain = [];
  for (let dir = cwd; ; dir = path.dirname(dir)) { chain.unshift(dir); if (dir === (root ?? cwd) || path.dirname(dir) === dir) break; }
  if (spec.walkUp) {
    // findUp order (the session folder first); the first name with any match wins.
    const up = (name) => [...chain].reverse().map((dir) => path.join(dir, name)).map((file) => ({ file, info: stat(file) })).filter(({ info }) => info.exists);
    const add = (matches) => { for (const { file, info } of matches) files.push({ path: file, scope: "project", ...info }); };
    const [first, ...rest] = spec.names;
    const agents = up(first);
    if (agents.length) {
      add(agents);
      if (spec.sparseClaude) {
        let text = "";
        for (const { file } of agents) { try { text += fsys.readFileSync(file, "utf8"); } catch {} }
        if (text.trim().length < spec.sparseClaude) add(up("CLAUDE.md"));
      }
    } else for (const name of rest) { const matches = up(name); if (matches.length) { add(matches); break; } }
    return files;
  }
  for (const dir of chain) for (const name of spec.names) {
    const file = path.join(dir, name), info = stat(file);
    if (info.exists && !(spec.qwenDir && path.dirname(path.resolve(file)) === path.resolve(spec.qwenDir))) files.push({ path: file, scope: "project", ...info });
  }
  // Qwen: the per-developer QWEN.local.md at a git root (none without one), then the project's rules.
  if (spec.local && root) {
    const file = path.join(root, spec.local), info = stat(file);
    if (info.exists) files.push({ path: file, scope: "project", local: true, ...info });
  }
  if (spec.rules) {
    const projectRules = path.join(root ?? cwd, spec.rules.project);
    if (path.resolve(projectRules) !== path.resolve(spec.rules.global)) files.push(...ruleFiles(projectRules, "project", fsys));
  }
  return files;
}

const MAX_RULE_FILES = 200, MAX_RULE_DEPTH = 8;
/** The `paths:` globs of a rule file's YAML frontmatter (a string, a [a, b] list or a "- a" list), else null. */
function rulePaths(text) {
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)([\s\S]*)$/.exec(String(text).replace(/\r\n?/g, "\n"));
  if (!match) return { paths: null, body: String(text) };
  const lines = match[1].split("\n");
  const unquote = (value) => value.trim().replace(/^(["'])(.*)\1$/, "$2");
  let paths = null;
  for (let index = 0; index < lines.length; index++) {
    const key = /^paths\s*:\s*(.*)$/.exec(lines[index]);
    if (!key) continue;
    const value = key[1].trim();
    if (value.startsWith("[")) paths = value.replace(/^\[|\]$/g, "").split(",").map(unquote).filter(Boolean);
    else if (value) paths = [unquote(value)];
    else {
      paths = [];
      for (let next = index + 1; next < lines.length && /^\s*-\s*/.test(lines[next]); next++) paths.push(unquote(lines[next].replace(/^\s*-\s*/, "")));
      paths = paths.filter(Boolean);
    }
    break;
  }
  return { paths: paths && paths.length ? paths : null, body: match[2] };
}
/**
 * Qwen's rule files in one rules folder (rulesDiscovery.ts loadRulesFromDir): every .md below it, sorted, that keeps
 * text once its frontmatter and HTML comments are removed. paths: the globs that make it load only for matching files.
 */
function ruleFiles(dir, scope, fsys = fs) {
  const found = [];
  const walk = (folder, depth) => {
    if (depth > MAX_RULE_DEPTH || found.length >= MAX_RULE_FILES) return;
    let entries = [];
    try { entries = fsys.readdirSync(folder, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.join(folder, entry.name);
      if (entry.isDirectory()) walk(full, depth + 1);
      else if (entry.isFile() && entry.name.endsWith(".md") && found.length < MAX_RULE_FILES) found.push(full);
    }
  };
  walk(dir, 0);
  found.sort();
  const out = [];
  for (const file of found) {
    let text = "", bytes = 0;
    try { text = fsys.readFileSync(file, "utf8"); bytes = fsys.statSync(file).size; } catch { continue; }
    const { paths, body } = rulePaths(text);
    if (!stripComments(body).trim()) continue;
    out.push({ path: file, scope, rule: true, paths, exists: true, bytes });
  }
  return out;
}

// The running core's instruction-file family: the DeepSeek core by its profile capability, else by descriptor id.
function runningEngine(client) {
  const info = client?.serverInfo;
  if (!info) return null;
  if (coreSupports(info, "harnessProfile")) return "deepseek";
  return coreForEngine(info.engine).id;
}

function createInstructionsService({ getConfig, getClient, shell, knownCwd, home = os.homedir(), fs: fsys = fs }) {
  const prefs = () => getConfig()?.customInstructions;
  const sessionCwd = (params) => {
    const config = getConfig() || {};
    if (typeof params?.cwd === "string" && params.cwd) return params.cwd;
    const meta = typeof params?.threadId === "string" ? config.threadMetadata?.[params.threadId] : undefined;
    return typeof meta?.cwd === "string" && meta.cwd ? meta.cwd : config.cwd;
  };
  const preview = (cwd) => {
    const result = composeFor(prefs(), cwd, { home, fs: fsys });
    const target = projectFileTarget(prefs(), cwd, { home, fs: fsys });
    const file = readProjectFile(target, fsys);
    const engine = coreForEngine(getClient()?.serverInfo?.engine).id;
    return { text: result.text, systemPrompt: result.systemPrompt, instructions: result.instructions, parts: result.parts, chars: result.chars, truncated: result.truncated, root: result.root, cwd, engine,
      project: result.entry ? { root: result.entry.root, text: result.entry.text, useFile: result.entry.useFile } : null,
      file: { path: target, exists: file.exists, bytes: file.bytes } };
  };
  async function run(p = {}) {
    const cwd = knownCwd(p.cwd);
    switch (p.op) {
      case "preview": return preview(cwd);
      case "system-prompt": {
        // The exact system prompt the DeepSeek core assembles for this project with the saved
        // settings (harness codeDesktop/systemPrompt/preview), plus its built-in default.
        const client = getClient();
        // Not connected (a failed start, a restart, a core switch), or a core without the preview (Codex).
        if (!client?.serverInfo) throw new Error(i18n.t("Connect {core} first: the preview asks the running core.", { core: coreName(getConfig()?.core) }));
        if (!coreSupports(client.serverInfo, "systemPromptPreview")) throw new Error(i18n.t("{core} can’t show its final system prompt.", { core: coreName(client.serverInfo) }));
        const { systemPrompt, instructions } = composeFor(prefs(), cwd, { home, fs: fsys });
        const config = getConfig() || {};
        const threadId = typeof p.threadId === "string" && (config.threadIds || []).includes(p.threadId) ? p.threadId : undefined;
        const model = typeof p.model === "string" && p.model ? p.model : undefined;
        const result = await client.request("codeDesktop/systemPrompt/preview", { cwd, ...(threadId ? { threadId } : {}), ...(model ? { model } : {}),
          codeDesktop: { customization: { systemPrompt: systemPrompt || null, instructions: instructions || null } } }, PREVIEW_TIMEOUT);
        return systemPromptResult(result);
      }
      case "create-file": {
        const target = projectFileTarget(prefs(), cwd, { home, fs: fsys });
        fsys.mkdirSync(path.dirname(target), { recursive: true });
        try { fsys.writeFileSync(target, TEMPLATE, { flag: "wx" }); } catch (error) { if (error?.code !== "EEXIST") throw error; }
        const error = await shell.openPath(target);
        if (error) throw new Error(error);
        return preview(cwd);
      }
      case "open-file": {
        const target = projectFileTarget(prefs(), cwd, { home, fs: fsys });
        if (!readProjectFile(target, fsys).exists) throw new Error("The instructions file doesn’t exist yet.");
        const error = await shell.openPath(target);
        if (error) throw new Error(error);
        return true;
      }
      case "reveal-file": {
        const target = projectFileTarget(prefs(), cwd, { home, fs: fsys });
        if (!readProjectFile(target, fsys).exists) throw new Error("The instructions file doesn’t exist yet.");
        shell.showItemInFolder(target);
        return true;
      }
      // The DeepSeek core's own instruction files (coreInstructionFiles): listed, opened, revealed; only the harness
      // home's AGENTS.md can be created here. A path must be one the list names.
      case "core-files": {
        const client = getClient();
        if (!client?.serverInfo) return { files: [] };
        return { files: coreInstructionFiles(cwd, { home, fs: fsys, engine: runningEngine(client) }) };
      }
      case "core-file-open":
      case "core-file-reveal":
      case "core-file-create": {
        const engine = runningEngine(getClient());
        const files = coreInstructionFiles(cwd, { home, fs: fsys, engine });
        const target = files.find((file) => file.path === p.path);
        if (!target) throw new Error("Unknown instructions file.");
        if (p.op === "core-file-create") {
          if (target.scope !== "global") throw new Error("Only the global instructions file can be created here.");
          fsys.mkdirSync(path.dirname(target.path), { recursive: true });
          const name = coreForEngine(getClient()?.serverInfo?.engine).assistant || coreForEngine(getClient()?.serverInfo?.engine).name;
          try { fsys.writeFileSync(target.path, `# Instructions for every ${name} session\n\n`, { flag: "wx" }); } catch (error) { if (error?.code !== "EEXIST") throw error; }
        } else if (!target.exists) throw new Error("The instructions file doesn’t exist yet.");
        if (p.op === "core-file-reveal") { shell.showItemInFolder(target.path); return true; }
        const error = await shell.openPath(target.path);
        if (error) throw new Error(error);
        return { files: coreInstructionFiles(cwd, { home, fs: fsys, engine }) };
      }
      default: throw new Error("Unsupported instructions operation.");
    }
  }
  function decorate(method, params) {
    try {
      return decorateCoreParams(method, params, { engine: getClient()?.serverInfo, cwd: sessionCwd(params),
        read: (cwd) => composeFor(prefs(), cwd, { home, fs: fsys }) });
    } catch (error) {
      // Instructions never block a message; the session runs without them.
      console.warn("Custom instructions were not attached:", error);
      return params;
    }
  }
  // The user's global instructions are on and non-empty: they are the whole prompt, nothing the system wrote is sent.
  const customPromptActive = () => { const value = normalizeInstructions(prefs()); return value.enabled && !!value.global.trim(); };
  return { run, decorate, customPromptActive };
}

module.exports = { CUSTOM_PROMPT_CODEX_CONFIG, createInstructionsService, findProjectFile, composeInstructions, composeFor, decorateCoreParams, readProjectFile, systemPromptResult, coreInstructionFiles, PROJECT_FILE, TOTAL_CAP };
