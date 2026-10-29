// w13-coworkfn-schedtools (research/w13-coworkfn.md O-31, cwf-39): the Cowork skill tools of the official cowork MCP server
// (3.6556.2 asar index.chunk-h5ilKUwe.js `function re({tool:e},a,o={},s=i.t)` save_skill and `function ee({tool:e})`
// propose_skills; names jPKPzV-P `D7t="save_skill"`, `k7t="propose_skills"`), for Cowork sessions:
//   save_skill      write <skill root>/<name>/SKILL.md in the connected core's own user skills folder (its descriptor's
//                   first "~/…" skillRoots entry, core-registry.mjs), on the user's card. The official local-storage
//                   branch (`usesLocalSkillStorage()`: saveLocalSkill) with the official SKILL.md frontmatter (`j`), its
//                   "already exists" refusal and the result sentences of a skill the core reads at its next session start
//                   (`A`, deliveredAsSkill false). A core without a user skills folder gets a plain refusal.
//   propose_skills  render-only: the proposals come back as structuredContent for the card; nothing is written.
// The descriptions and parameter text are the official ones word for word, except save_skill's description, whose
// account sentences (claude.ai skills storage) say the skills folder instead (SAVE_SKILL_CHANGE).
//
// ctx.skills (main.cjs agentTools.provide("skills", …)): { serverInfo() → the connected core's serverInfo, t(text, values) }
import nodeFs from "node:fs";
import nodeOs from "node:os";
import nodePath from "node:path";
import { randomUUID } from "node:crypto";
import { coreForEngine, coreName, corePath } from "../core-registry.mjs";

export const group = "cowork-skills";
// w13-close-cowork-misc (E76): Cowork only, as the official chat sessions have it. 3.6556.2 asar
// index.chunk-Dl8NPgw7.js builds the cowork server (h5ilKUwe `n.canSaveSkill && R.push(re(…))`) for every local agent
// mode session, but a chat one (`Ge = s.sessionType === t.SZ`, SZ = V5t "chat") gets `Y.tools = [...t.TY, …]` and
// `Y.disallowedTools = [..., t.LX, t.MX, …]` (LX = O7t mcp__cowork__save_skill, MX = A7t mcp__cowork__propose_skills).
// The Chat title menu's Turn into skill only fills the composer (ca2ef848d Bae Ii), as officially.
export const surfaces = ["cowork"];

export const SAVE_SKILL_CHANGE = Object.freeze([
  "Save a skill to the user's account, or update an existing one (with overwrite: true). Saved skills persist across all sessions. This is the only way to change a saved skill — editing skill files on disk does not persist.",
  "Save a skill to the user's skills folder, or update an existing one (with overwrite: true). Saved skills persist across all sessions.",
]);
export const DESCRIPTIONS = Object.freeze({
  save_skill: SAVE_SKILL_CHANGE[1],
  propose_skills: "Surface recurring multi-step procedures from the user's memory as skill proposals. Render-only — calling this shows a review card in the conversation; it does not write any files or create the skill. The user reviews and saves from the card.\n\nCall once with all proposals (max 3). Only used during memory consolidation; do not call for ad-hoc requests.",
});
// h5i, word for word.
export const PARAMETERS = Object.freeze({
  name: "Kebab-case skill name (e.g., 'meeting-notes-to-jira'). Used as the storage key and directory name.",
  description: "One-line description of when to use this skill. Injected into the system prompt as the trigger.",
  content: "Full skill instructions in Markdown. Must be self-contained — no references to the current session.",
  overwrite: "Update the existing skill with this name. Its SKILL.md is replaced with the content above; any other files in the skill are kept. Set when the user asked to change an existing skill, or after an 'already exists' error.",
  proposalName: "kebab-case skill slug",
  target: "Existing skill name to amend. Required when kind is 'improvement'; omit for 'new'.",
  proposalDescription: "one line shown on the card",
  evidence: "memory file paths where this procedure was observed",
  skillMd: "complete SKILL.md draft (frontmatter + Trigger/Steps/Verification body)",
});
// The card (ion-dist): i18n keys, translated by ctx.skills.t.
export const CARDS = Object.freeze({
  save: "Save skill", // shared-12 QvmjxZ7K5S
  update: "Update “{skillName}”?", // OaaJuNOpdq
});
const PROPOSALS_MAX = 3;

const error = (text) => ({ content: [{ type: "text", text }], isError: true });
// h5i `r`: a name as the results quote it (at most 100 characters, ' as ’).
const quoted = (value) => (value.length > 100 ? `${value.slice(0, 99)}…` : value).replace(/'/g, "’");
/** h5i `j`: the SKILL.md a saved skill gets. */
export function skillFile(name, description, content) {
  const field = (value) => value.replace(/[\r\n]+/g, " ").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `---\nname: "${field(name)}"\ndescription: "${field(description)}"\n---\n\n${content}\n`;
}
/** The connected core's user skills folder: its descriptor's first "~/…" skillRoots entry (corePath), else null. */
export function userSkillRoot(serverInfo, home = nodeOs.homedir()) {
  const descriptor = coreForEngine(serverInfo?.engine);
  const root = (descriptor.skillRoots ?? []).map((value) => corePath(serverInfo ?? null, value)).find((value) => value === "~" || value?.startsWith("~/"));
  return root ? nodePath.join(home, root.slice(2)) : null;
}
const NAME = /^[a-z0-9][a-z0-9-]{0,63}$/;

function service(ctx) {
  const skills = ctx?.skills;
  if (!skills || typeof skills.serverInfo !== "function") throw new Error("Skills aren’t available in this session.");
  return skills;
}
const say = (skills, key, values) => {
  const text = typeof skills.t === "function" ? skills.t(key) : key;
  return text.replace(/\{(\w+)\}/g, (match, name) => values?.[name] ?? match);
};

/** Writes root/name/SKILL.md (atomically; a link anywhere on the way is refused). → { outcome: 'created'|'updated' } | { exists: true } */
export async function writeSkill({ root, name, description, content, overwrite = false, fs = nodeFs.promises }) {
  await fs.mkdir(root, { recursive: true, mode: 0o755 });
  if ((await fs.lstat(root)).isSymbolicLink()) throw new Error("The skills folder is a link.");
  const dir = nodePath.join(root, name), file = nodePath.join(dir, "SKILL.md");
  const existing = await fs.lstat(dir).catch(() => null);
  if (existing && (existing.isSymbolicLink() || !existing.isDirectory())) throw new Error(`${dir} isn’t a skill folder.`);
  if (existing && !overwrite) return { exists: true };
  if (!existing) await fs.mkdir(dir, { mode: 0o755 });
  const current = await fs.lstat(file).catch(() => null);
  if (current && !current.isFile()) throw new Error(`${file} isn’t a file.`);
  const temp = nodePath.join(dir, `.SKILL.md.${randomUUID()}.tmp`);
  try {
    await fs.writeFile(temp, skillFile(name, description, content), { flag: "wx", mode: 0o644 });
    await fs.rename(temp, file);
  } catch (cause) { await fs.rm(temp, { force: true }).catch(() => {}); throw cause; }
  return { outcome: existing && current ? "updated" : "created", file };
}

async function saveSkill(args = {}, ctx) {
  const skills = service(ctx);
  const raw = typeof args.name === "string" ? args.name.trim() : "";
  const name = raw.includes(":") ? raw.slice(raw.indexOf(":") + 1).trim() : raw; // h5i QH: a "plugin:" prefix is dropped
  const description = typeof args.description === "string" ? args.description : "";
  const content = typeof args.content === "string" ? args.content : "";
  const overwrite = args.overwrite === true;
  if (!NAME.test(name)) return error("Failed to save skill: Use lowercase letters, digits and dashes for the skill name.");
  if (!description.trim() || !content.trim()) return error("Failed to save skill: a description and the skill's content are required.");
  const info = skills.serverInfo();
  const root = userSkillRoot(info);
  if (!root) return error(`Failed to save skill: ${coreName(info ?? null)} has no skills folder to save to.`);
  const shown = quoted(name);
  if (ctx.signal?.aborted) throw new Error("The turn was stopped.");
  const exists = !!(await nodeFs.promises.lstat(nodePath.join(root, name)).catch(() => null));
  if (exists && !overwrite) return error(`Skill '${shown}' already exists. Call save_skill again with overwrite: true to update it.`);
  const answer = typeof ctx.requestApproval === "function"
    ? await ctx.requestApproval({ kind: "other", tool: "save_skill", title: exists ? say(skills, CARDS.update, { skillName: name }) : say(skills, CARDS.save), detail: `${name}\n${description}\n\n${content}` })
    : false;
  if (ctx.signal?.aborted) throw new Error("The turn was stopped.");
  if (!(answer === true || answer?.approved === true)) return error("User rejected save_skill. Please acknowledge this and suggest alternative approaches.");
  let saved;
  try { saved = await writeSkill({ root, name, description, content, overwrite }); }
  catch (cause) { return error(`Failed to save skill: ${cause instanceof Error ? cause.message : String(cause)}`); }
  if (saved.exists) return error(`Skill '${shown}' already exists. Call save_skill again with overwrite: true to update it.`);
  // h5i A with deliveredAsSkill false: the core lists a new skill when its next session starts.
  const message = saved.outcome === "created" ? `Saved skill '${shown}'. It will be available in new conversations, not in this one.` : `Updated skill '${shown}'. The updated skill will be available in new conversations.`;
  return { content: [{ type: "text", text: message }], structuredContent: { message, path: saved.file } };
}

/** The zod schema's checks (h5i ee), as its messages say them. */
function proposalsOf(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > PROPOSALS_MAX) throw new Error(`proposals: between 1 and ${PROPOSALS_MAX} proposals are required.`);
  return value.map((entry, index) => {
    const at = `proposals[${index}]`;
    if (!entry || typeof entry !== "object") throw new Error(`${at}: a proposal object is required.`);
    if (typeof entry.name !== "string" || !entry.name) throw new Error(`${at}.name: a kebab-case skill slug is required.`);
    if (!["new", "improvement"].includes(entry.kind)) throw new Error(`${at}.kind: must be 'new' or 'improvement'.`);
    if (entry.target !== undefined && typeof entry.target !== "string") throw new Error(`${at}.target: must be a string.`);
    if (entry.kind === "improvement" && !entry.target) throw new Error(`${at}.target: target is required when kind is 'improvement'`);
    if (typeof entry.description !== "string") throw new Error(`${at}.description: required.`);
    if (entry.evidence !== undefined && (!Array.isArray(entry.evidence) || entry.evidence.some((item) => typeof item !== "string"))) throw new Error(`${at}.evidence: must be a list of paths.`);
    if (typeof entry.skillMd !== "string") throw new Error(`${at}.skillMd: required.`);
    return { name: entry.name, kind: entry.kind, ...(entry.target ? { target: entry.target } : {}), description: entry.description,
      ...(entry.evidence ? { evidence: [...entry.evidence] } : {}), skillMd: entry.skillMd };
  });
}

export const tools = [
  {
    name: "save_skill",
    title: "Save skill",
    description: DESCRIPTIONS.save_skill,
    inputSchema: {
      type: "object",
      properties: { name: { type: "string", description: PARAMETERS.name }, description: { type: "string", description: PARAMETERS.description },
        content: { type: "string", description: PARAMETERS.content }, overwrite: { type: "boolean", description: PARAMETERS.overwrite } },
      required: ["name", "description", "content"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: saveSkill,
  },
  {
    name: "propose_skills",
    title: "Propose skills",
    description: DESCRIPTIONS.propose_skills,
    inputSchema: {
      type: "object",
      properties: {
        proposals: {
          type: "array", minItems: 1, maxItems: PROPOSALS_MAX,
          items: {
            type: "object",
            properties: {
              name: { type: "string", minLength: 1, description: PARAMETERS.proposalName },
              kind: { type: "string", enum: ["new", "improvement"] },
              target: { type: "string", description: PARAMETERS.target },
              description: { type: "string", description: PARAMETERS.proposalDescription },
              evidence: { type: "array", items: { type: "string" }, description: PARAMETERS.evidence },
              skillMd: { type: "string", description: PARAMETERS.skillMd },
            },
            required: ["name", "kind", "description", "skillMd"],
          },
        },
      },
      required: ["proposals"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (args = {}) => {
      const proposals = proposalsOf(args.proposals);
      return { content: [{ type: "text", text: `Shown ${proposals.length} skill proposal(s) to the user for review. The card renders at this point in your reply and anything you write next appears below it, so refer to it as the card above. Continue with the next phase; do not wait for them to respond.` }],
        structuredContent: { proposals } };
    },
  },
];
