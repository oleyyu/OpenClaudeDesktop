// The "Supports" row of the Add-pack dialog (source-extension-import.jsx). A pack's summary lists the `implies` flags
// that are true (extension-packs.cjs); those are protocol switches (electron/core-registry.mjs), not names a person
// reads. Only flags that turn on something the user sees get a name here, under the label the app already gives that
// feature; the rest (and any flag a third-party pack invents) are left out. U-18.
export const PACK_CAPABILITY_LABELS = Object.freeze({
  collaborationModes: "Plan mode",
  structuredOutput: "Workflows",
  modelWorkflows: "Workflows",
  sideQuestion: "Side chat",
  btwChildSessions: "Side chat",
  shellCommands: "Shell commands",
  threadSearch: "Conversation search",
  titleRequest: "Session titles",
  generatesTitles: "Session titles",
  hooksList: "Hooks",
  agentsList: "Agents",
  appsDirectory: "Apps",
  codexProvider: "Custom endpoint",
});

/** @param {string[]} [capabilities] the summary's true flags @returns {string[]} English labels, deduplicated, in flag order */
export function packCapabilityLabels(capabilities = []) {
  const labels = [];
  for (const key of capabilities) {
    const label = Object.hasOwn(PACK_CAPABILITY_LABELS, key) ? PACK_CAPABILITY_LABELS[key] : null;
    if (label && !labels.includes(label)) labels.push(label);
  }
  return labels;
}
