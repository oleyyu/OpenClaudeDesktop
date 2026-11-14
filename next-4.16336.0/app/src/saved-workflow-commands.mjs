// Saved workflows as '/' commands (Claude Code 2.1.280 getWorkflowCommands: kind "workflow", "running dynamic
// workflow"): each saved workflow (main.cjs saved-workflows) becomes /<name>, whose message asks the model to run it
// with OpenClaude Desktop's Workflow tool. Custom commands and built-ins with the same name win (session-command-model).
import { COMMAND_NAME } from "./custom-commands-model.mjs";

/** A core library's declared args ({pr: {type, required, description}}) as one line for the model and a hint for the menu. */
function declaredArgs(args) {
  return Object.entries(args && typeof args === "object" ? args : {}).filter(([key, value]) => key && value && typeof value === "object").slice(0, 20)
    .map(([key, value]) => ({ key, type: typeof value.type === "string" ? value.type : "string", required: value.required === true, description: typeof value.description === "string" ? value.description : "" }));
}
/** The menu's argument hint: the declared args (`pr=<string>`; optional ones in brackets), else [args]. */
export function workflowArgumentHint(entry) {
  const list = declaredArgs(entry?.args);
  return list.length ? list.map((arg) => arg.required ? `${arg.key}=<${arg.type}>` : `[${arg.key}=<${arg.type}>]`).join(" ") : "[args]";
}

/** The message /<name> sends: Claude's "Run the "<name>" workflow." prompt; the user's arguments follow it. */
export function workflowCommandBody({ name, description = "", whenToUse = "", phases = [], engine = null, args = null }) {
  // A core's own library (ZCode: .zcode/workflows): its engine runs it by name, CreateWorkflow({saved: {name, args}}).
  if (engine === "core") {
    const list = declaredArgs(args);
    return [`Run the saved workflow "${name}".`, description || null, whenToUse ? `When to use: ${whenToUse}` : null,
      list.length ? `Arguments it declares: ${list.map((arg) => `${arg.key} (${arg.type}${arg.required ? ", required" : ""}${arg.description ? `: ${arg.description}` : ""})`).join("; ")}.` : null,
      `Invoke: CreateWorkflow({ saved: { name: ${JSON.stringify(name)}, args } }), taking args from the text below (key=value pairs or plain words); ask for a required argument that is missing.`].filter(Boolean).join("\n");
  }
  return [`Run the "${name}" workflow.`, description || null, whenToUse ? `When to use: ${whenToUse}` : null,
    Array.isArray(phases) && phases.length ? `Phases: ${phases.join(" → ")}` : null,
    `Invoke: Workflow({ name: ${JSON.stringify(name)}, args }), with the arguments below as args when there are any.`].filter(Boolean).join("\n");
}

/** Command rows (the custom-command shape) for the saved workflows whose names can be typed as a command. */
export function workflowCommandRows(workflows = []) {
  const seen = new Set(), rows = [];
  for (const entry of Array.isArray(workflows) ? workflows : []) {
    const name = typeof entry?.name === "string" ? entry.name : "";
    if (!COMMAND_NAME.test(name) || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    rows.push({ name, description: entry.description || "", argumentHint: workflowArgumentHint(entry), body: workflowCommandBody(entry), scope: entry.source === "project" ? "project" : "global", path: "", workflow: true });
  }
  return rows;
}
