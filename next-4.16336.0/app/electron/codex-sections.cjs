// Codex's own sidebar organization (app-server threadSection/list|create|update|delete and thread/section/move,
// stable in 0.155.1; every Thread carries section and sectionEnteredAt), kept in step with OpenClaude Desktop's pins and
// custom groups while Codex runs, so organizing chats in the Codex app/CLI or in OpenClaude Desktop shows in both.
// The built-in section named "Pinned" is OpenClaude Desktop's pin; every other section is a custom group (codexSectionId).
// Cores without sections keep the local store alone.
const crypto = require("node:crypto");

const PINNED = "Pinned";

/** Whether a client runs Codex's own app-server (sections live there). */
function sectionsCore(owner, { coreForEngine }) {
  const info = owner?.serverInfo;
  return !!info && coreForEngine(info.engine).id === "codex" && info.capabilities?.permissionHints !== true;
}

async function listSections(owner) {
  const sections = [];
  let cursor = null;
  for (let page = 0; page < 20; page++) {
    const result = await owner.request("threadSection/list", { limit: 100, ...(cursor ? { cursor } : {}) }, 10000);
    for (const section of Array.isArray(result?.data) ? result.data : []) if (typeof section?.id === "string") sections.push(section);
    cursor = typeof result?.nextCursor === "string" && result.nextCursor ? result.nextCursor : null;
    if (!cursor) break;
  }
  return sections;
}

/**
 * Import Codex's sections into the local store: the Pinned section's id, and one custom group per other section
 * (created or renamed to match; a group whose section is gone keeps its sessions but loses the link).
 * @returns {boolean} whether the store changed
 */
async function importSections(owner, config) {
  const sections = await listSections(owner);
  let changed = false;
  const pinned = sections.find((section) => section.name === PINNED) ?? null;
  if ((config.codexPinnedSectionId ?? null) !== (pinned?.id ?? null)) { config.codexPinnedSectionId = pinned?.id ?? null; changed = true; }
  const groups = Array.isArray(config.customGroups) ? config.customGroups : (config.customGroups = []);
  const ids = new Set(sections.map((section) => section.id));
  for (const group of groups) if (group.codexSectionId && !ids.has(group.codexSectionId)) { delete group.codexSectionId; changed = true; }
  for (const section of sections) {
    if (section === pinned) continue;
    const group = groups.find((entry) => entry.codexSectionId === section.id) ?? groups.find((entry) => !entry.codexSectionId && entry.name === section.name);
    if (!group) { groups.push({ id: crypto.randomUUID(), name: section.name, codexSectionId: section.id }); changed = true; }
    else if (group.codexSectionId !== section.id || group.name !== section.name) { group.codexSectionId = section.id; group.name = section.name; changed = true; }
  }
  return changed;
}

/** The Codex section a group maps to, created on first use. */
async function groupSection(owner, config, groupId) {
  const group = (config.customGroups || []).find((entry) => entry.id === groupId);
  if (!group) return null;
  if (group.codexSectionId) return group.codexSectionId;
  const created = await owner.request("threadSection/create", { name: group.name }, 10000);
  const id = created?.section?.id ?? created?.id ?? null;
  if (typeof id === "string") group.codexSectionId = id;
  return group.codexSectionId ?? null;
}

/** Where a session belongs in Codex after a local change: Pinned, its group's section, or none. */
async function placeSession(owner, config, threadId) {
  const meta = config.sessionMetadata?.[threadId] ?? {};
  const sectionId = meta.pinned ? config.codexPinnedSectionId ?? null : meta.customGroupId ? await groupSection(owner, config, meta.customGroupId) : null;
  if (meta.pinned && !config.codexPinnedSectionId) return;
  await owner.request("thread/section/move", { threadId, sectionId }, 10000);
}

async function renameGroup(owner, config, groupId) {
  const group = (config.customGroups || []).find((entry) => entry.id === groupId);
  if (group?.codexSectionId) await owner.request("threadSection/update", { sectionId: group.codexSectionId, name: group.name }, 10000);
}

async function deleteGroupSection(owner, sectionId) {
  if (typeof sectionId === "string" && sectionId) await owner.request("threadSection/delete", { sectionId }, 10000);
}

module.exports = { sectionsCore, importSections, placeSession, renameGroup, deleteGroupSection, groupSection, PINNED };
