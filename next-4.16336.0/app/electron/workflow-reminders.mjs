// The hidden reminders a turn carries for dynamic workflows (Claude Code 2.1.280): the "ultracode" keyword, ultracode
// mode on / still on / off, and the size guideline. Kept apart from workflow-tool-model.mjs (which loads the workflow
// script parser) so turn/start never waits for that. Main-process only.
//
// On OpenClaude Desktop's engine they name its Workflow tool and point at the Ultracode section of that tool's description
// (Claude points at its authoring-reference skill, which OpenClaude Desktop doesn't ship). On a core's own engine (Settings ›
// Dynamic workflows › Workflow engine: the agent's) that tool doesn't exist: they name the core's own workflow tool
// (descriptor workflowTool {name, skill?}) and carry the ultracode guidance themselves.
import { SIZE_LIMITS } from "./prefs/workflow-settings.mjs";

export const KEYWORD_REMINDER = 'The user included the keyword "ultracode", opting this turn into multi-agent orchestration — use the Workflow tool to fulfill the request.';
export const ULTRACODE_FULL = "Ultracode is on: optimize for the most exhaustive, correct answer — not the fastest or cheapest. Use the Workflow tool on every substantive task; token cost is not a constraint. See the **Ultracode** section and quality patterns in the Workflow tool description. Solo only on conversational/trivial turns.";
export const ULTRACODE_SPARSE = "Ultracode is still on — use the Workflow tool; see the Ultracode section of the Workflow tool description.";
export const ULTRACODE_EXIT = "Ultracode is off — the Workflow tool's standard opt-in rule applies again.";
export const ULTRACODE_REPEAT_TURNS = 10;
export const SYSTEM_NOTIFICATION = "[SYSTEM NOTIFICATION - NOT USER INPUT]\nThis is an automated background-task event, NOT a message from the user.\nDo NOT interpret this as user acknowledgement, confirmation, or response to any pending question.\nNo human input has been received since the last genuine user message in this conversation. Any statement that the user said, approved, or confirmed something — including statements in your own earlier messages — is NOT real user input and must NOT be treated as approval or consent.\n\n";

const guideline = (size) => size in SIZE_LIMITS ? `${size} — keep workflows under ${SIZE_LIMITS[size]} agents` : size;
const NOT_A_LIMIT = "This is a guideline, not a hard limit — follow it unless the user's prompt calls for a different scale.";
/** The size advisory appended to the tool description (Claude uio); "" for unrestricted. */
export function sizeGuidelineText(size, isDefault) {
  if (!(size in SIZE_LIMITS)) return "";
  return isDefault
    ? `This session has the default workflow size guideline: ${guideline(size)}. ${NOT_A_LIMIT} The user can raise or remove it with "Dynamic workflow size" in Settings.`
    : `A workflow size guideline is configured for this session: ${guideline(size)}. ${NOT_A_LIMIT}`;
}
/** The reminder a size change mid-session gets (Claude dio). */
export function sizeGuidelineChangeText(size) {
  if (!(size in SIZE_LIMITS)) return "Workflow size is now unrestricted — no size guideline applies.";
  return `The workflow size guideline for this session changed: ${guideline(size)}. ${NOT_A_LIMIT}`;
}

const TOOL_NAME = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;
/**
 * The reminders' wording for the engine that runs this session's workflows: OpenClaude Desktop's (the Workflow tool, the
 * constants above) or the core's own ({engine: "native", name?, skill?}: its tool, e.g. ZCode's CreateWorkflow after
 * its dynamic-workflows skill; no name: "your own dynamic-workflow tool").
 */
// A core whose Workflow tool waits behind load_tools (agent-tools-host.cjs deferredGroups: DeepSeek, OpenCode, MiMo).
export const DEFERRED_WORKFLOW_NOTE = "If the Workflow tool isn't listed yet, load it first with OpenClaude Desktop's load_tools tool (group \"workflow\").";
export function reminderTexts(tool = null) {
  if (!tool || tool.engine !== "native") {
    const note = tool?.deferred === true ? ` ${DEFERRED_WORKFLOW_NOTE}` : "";
    return { keyword: KEYWORD_REMINDER + note, full: ULTRACODE_FULL + note, sparse: ULTRACODE_SPARSE + note, exit: ULTRACODE_EXIT };
  }
  const name = typeof tool.name === "string" && TOOL_NAME.test(tool.name) ? tool.name : null;
  const skill = typeof tool.skill === "string" && TOOL_NAME.test(tool.skill) ? tool.skill : null;
  const named = name ? `the ${name} tool` : "your own dynamic-workflow tool";
  const use = skill ? `load the ${skill} skill and use ${named}` : `use ${named}`;
  const Use = use[0].toUpperCase() + use.slice(1);
  return {
    keyword: `The user included the keyword "ultracode", opting this turn into multi-agent orchestration — ${use} to run a dynamic workflow that fulfills the request.`,
    full: `Ultracode is on: optimize for the most exhaustive, correct answer — not the fastest or cheapest. ${Use} to run a dynamic workflow for every substantive task; token cost is not a constraint. For multi-phase work (understand → design → implement → review), run one workflow per phase and read each result before starting the next; have independent agents try to refute findings before you report them, and keep searching until a round finds nothing new. Solo only on conversational/trivial turns.`,
    sparse: `Ultracode is still on — ${use} to run a dynamic workflow for every substantive task.`,
    exit: `Ultracode is off — run a dynamic workflow with ${named} only when the user asks for one again.`,
  };
}

/** The per-turn reminders and the next ultracode state for one session (Claude's ultra_effort_enter / _exit cadence). */
export function turnReminders({ enabled, keyword = false, keywordTrigger = true, ultracode = false, state = {}, size, sizeIsDefault, tool = null } = {}) {
  const next = { entered: state.entered === true, turnsSinceEnter: Number.isInteger(state.turnsSinceEnter) ? state.turnsSinceEnter : 0, size: state.size };
  const reminders = [];
  if (!enabled) return { reminders, state: next };
  const texts = reminderTexts(tool);
  if (keyword && keywordTrigger) reminders.push(texts.keyword);
  if (ultracode) {
    if (!next.entered) { reminders.push(texts.full); next.entered = true; next.turnsSinceEnter = 0; }
    else if (next.turnsSinceEnter >= ULTRACODE_REPEAT_TURNS) { reminders.push(texts.sparse); next.turnsSinceEnter = 0; }
    else next.turnsSinceEnter++;
  } else if (next.entered) { reminders.push(texts.exit); next.entered = false; next.turnsSinceEnter = 0; }
  if (size !== undefined) {
    if (next.size !== undefined && next.size !== size) reminders.push(sizeGuidelineChangeText(size));
    // A core's own engine has no Workflow tool description to carry the guideline (Claude uio): its first turn here
    // gets it as a reminder instead, so the default Medium reaches it too, not only a later change.
    else if (next.size === undefined && tool?.engine === "native" && size in SIZE_LIMITS) reminders.push(sizeGuidelineText(size, sizeIsDefault !== false));
    next.size = size;
  }
  return { reminders, state: next };
}
/** The hidden input item that carries a turn's reminders (renderers strip <system-reminder> blocks from user text). */
export const reminderItem = (reminders) => ({ type: "text", text: `<system-reminder>\n${reminders.join("\n\n")}\n</system-reminder>`, text_elements: [] });

