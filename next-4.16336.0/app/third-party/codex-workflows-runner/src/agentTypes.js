// Resolve a workflow `agentType` to its system prompt (and optional model) from the
// subagent markdown definitions in .claude/agents — the same registry the native
// Agent tool uses. Local (Code Desktop), as Claude Code 2.1.280 resolves it:
//   • a definition is found by its frontmatter `name:` (the agentType), falling back
//     to the file name when a file declares none; files in subfolders count too;
//   • project scope is every .claude/agents from cwd up to the git root (the closest
//     wins), then the user scope (~/.claude/agents), then the built-in types;
//   • frontmatter values may be YAML scalars, flow lists ([a, b]) or block lists;
//   • `tools:` (the allowlist) and `disallowedTools:` are returned so the caller can
//     narrow the agent's tools (toolNarrowing.js), and an unknown type is reported
//     with the available names.

import { readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join, parse } from "node:path";

// Local: an agent() configuration mistake (unknown agentType, a bad name, a worktree that can't be set up). The
// runtime rethrows it instead of turning it into a null result, as Claude does.
export class AgentConfigError extends Error {
  constructor(message) { super(message); this.name = "AgentConfigError"; }
}
export const isAgentConfigError = (error) => error instanceof AgentConfigError || error?.name === "AgentConfigError";

const cache = new Map();

// Local: Claude Code's built-in agent types, used when no .claude/agents file of
// the same name exists (a project/user definition overrides a built-in). Explore
// and Plan are read-only, so they also lower the thread sandbox to read-only.
const BUILT_IN = {
  "general-purpose": {
    systemPrompt: "You are a general-purpose agent for researching complex questions, searching for code, and executing multi-step tasks. Search broadly when you do not know where something lives, read the relevant files, and complete the task fully without gold-plating. Your final message is returned verbatim to the caller as data: make it a concise, complete report of what you did and found, including absolute file paths.",
  },
  Explore: {
    systemPrompt: "You are a read-only search agent. Locate code, configuration and patterns across the codebase quickly: use file listing and text search, read only the excerpts you need, and never modify files or run commands with side effects. Your final message is returned verbatim to the caller as data: report the conclusion with absolute file paths and line references, not file dumps.",
    sandbox: "read-only",
  },
  Plan: {
    systemPrompt: "You are a software architect. Explore the relevant code without modifying anything, then design an implementation plan: the files to change, the step-by-step approach, the trade-offs considered and the risks. Never edit files or run commands with side effects. Your final message is returned verbatim to the caller as data: the plan, with absolute file paths.",
    sandbox: "read-only",
  },
};

const exists = async (path) => { try { await stat(path); return true; } catch { return false; } };

// Project agent folders, closest first: cwd and its parents up to the git root (inclusive), never the home folder
// (that is the user scope) or the filesystem root.
async function projectAgentDirs(cwd) {
  const home = homedir(), dirs = [];
  let dir = cwd;
  for (;;) {
    if (dir === home) break;
    const parent = parse(dir).dir;
    if (!parent || parent === dir) break;
    dirs.push(join(dir, ".claude", "agents"));
    if (await exists(join(dir, ".git"))) break;
    dir = parent;
  }
  return dirs;
}

async function markdownFiles(dir, depth = 0) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return []; }
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(dir, entry.name);
    if (entry.isDirectory() && depth < 4) files.push(...await markdownFiles(path, depth + 1));
    else if ((entry.isFile() || entry.isSymbolicLink()) && entry.name.endsWith(".md")) files.push(path);
  }
  return files;
}

const unquote = (value) => {
  const text = String(value).trim();
  if (text.length >= 2 && (text[0] === '"' || text[0] === "'") && text.at(-1) === text[0]) return text.slice(1, -1);
  return text;
};
const flowList = (value) => value.slice(1, -1).split(",").map(unquote).filter(Boolean);

// A small YAML subset for agent frontmatter: `key: scalar`, `key: [a, b]`, block lists (`key:` then `- a` lines) and
// block scalars (`key: |` / `key: >`). Comments and blank lines are ignored.
export function parseFrontmatter(text) {
  const m = String(text).match(/^﻿?---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!m) return { meta: {}, body: String(text) };
  const meta = {}, lines = m[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^([A-Za-z0-9_-]+):[ \t]*(.*)$/);
    if (!kv) continue;
    const key = kv[1], raw = kv[2].replace(/\s+#.*$/, "").trim();
    if (raw === "" || raw === "|" || raw === ">" || /^[|>][+-]?$/.test(raw)) {
      const block = [];
      while (i + 1 < lines.length && (/^\s/.test(lines[i + 1]) || lines[i + 1] === "")) block.push(lines[++i]);
      const items = block.map((line) => line.match(/^\s*-\s+(.*)$/)).filter(Boolean);
      if (raw === "" && items.length) meta[key] = items.map((item) => unquote(item[1].replace(/\s+#.*$/, ""))).filter(Boolean);
      else meta[key] = block.map((line) => line.trim()).join(raw.startsWith(">") ? " " : "\n").trim();
    } else if (raw.startsWith("[") && raw.endsWith("]")) meta[key] = flowList(raw);
    else meta[key] = unquote(raw);
  }
  return { meta, body: String(text).slice(m[0].length) };
}

// A tool list as Claude reads it: a YAML list, or one comma-separated string. Undefined when absent.
export function toolList(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const list = (Array.isArray(value) ? value : String(value).split(",")).map((name) => unquote(String(name))).filter(Boolean);
  return list.length ? list : undefined;
}

function definitionFrom(meta, body, path) {
  const name = typeof meta.name === "string" && meta.name.trim() ? meta.name.trim() : basename(path, ".md");
  const disallowedTools = toolList(meta.disallowedTools);
  const tools = toolList(meta.tools);
  const model = typeof meta.model === "string" && meta.model ? meta.model : undefined;
  return {
    name,
    definition: {
      systemPrompt: body.trim(),
      model,
      ...(disallowedTools ? { disallowedTools } : {}),
      // `tools: "*"` (or a list holding "*") is every tool: no allowlist.
      ...(tools && !tools.includes("*") ? { tools } : {}),
      source: path,
    },
  };
}

async function readScope(dir) {
  const found = new Map();
  for (const path of await markdownFiles(dir)) {
    let text;
    try { text = await readFile(path, "utf8"); } catch { continue; }
    const { meta, body } = parseFrontmatter(text);
    const { name, definition } = definitionFrom(meta, body, path);
    if (!found.has(name)) found.set(name, definition);
  }
  return found;
}

/** Every agent type visible from `cwd`: name -> definition (project closest first, then user, then built-in). */
export async function agentRegistry(cwd = process.cwd()) {
  if (cache.has(cwd)) return cache.get(cwd);
  const pending = (async () => {
    const registry = new Map();
    const scopes = [...await projectAgentDirs(cwd), join(homedir(), ".claude", "agents")];
    for (const dir of scopes) for (const [name, definition] of await readScope(dir)) if (!registry.has(name)) registry.set(name, definition);
    for (const [name, definition] of Object.entries(BUILT_IN)) if (!registry.has(name)) registry.set(name, { ...definition, source: "built-in" });
    return registry;
  })();
  cache.set(cwd, pending);
  pending.catch(() => cache.delete(cwd));
  return pending;
}

/** The agent type names visible from `cwd`, for Claude's "Available agents: …". */
export async function listAgentTypes(cwd = process.cwd()) {
  return [...(await agentRegistry(cwd)).keys()];
}

/** Claude's error for an unknown type: agent({agentType}): agent type 'X' not found. Available agents: … */
export async function unknownAgentTypeError(name, cwd = process.cwd()) {
  return new AgentConfigError(`agent({agentType}): agent type '${name}' not found. Available agents: ${(await listAgentTypes(cwd)).join(", ")}`);
}

/**
 * Returns { systemPrompt, model?, disallowedTools?, tools?, sandbox?, source } or null if the agentType is unknown.
 * `model` is whatever the definition's frontmatter declares (often a Claude alias like "opus") — pass it through
 * resolveModel() before use.
 */
export async function loadAgentType(name, cwd = process.cwd()) {
  if (!name) return null;
  // Local: an agent type is a name, never a path into another directory.
  if (typeof name !== "string" || /[\\/]|\.\.|\0/.test(name) || name === ".") throw new AgentConfigError(`agentType '${name}' is not a valid agent name`);
  const definition = (await agentRegistry(cwd)).get(name);
  return definition ? { ...definition } : null;
}
