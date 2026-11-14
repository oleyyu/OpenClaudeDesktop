// ReportFindings: Claude Code's tool for reporting code-review findings as a typed list, so the app can show them as
// review results (the transcript's Review result card and the Changes pane's findings bar, src/review-findings-model.mjs
// reportedFindings) instead of prose. Re-reporting after fixes sets each finding's outcome. Qwen Code has its own
// report_findings (the bridge projects it to the same card), so it lists ReportFindings in nativeTools.
// No side effects: the call only records what the agent found.
export const group = "findings";
export const native = "ReportFindings";

export const MAX_FINDINGS = 32;
export const VERDICTS = Object.freeze(["CONFIRMED", "PLAUSIBLE"]);
export const OUTCOMES = Object.freeze(["fixed", "skipped", "no_change_needed"]);
export const LEVELS = Object.freeze(["low", "medium", "high", "xhigh", "max"]);

const text = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/** The findings as the tool keeps them, or throws what is wrong. */
export function normalizeFindings(args = {}) {
  const list = Array.isArray(args.findings) ? args.findings : null;
  if (!list) throw new Error("findings must be a list (empty when nothing survived verification).");
  if (list.length > MAX_FINDINGS) throw new Error(`Report at most ${MAX_FINDINGS} findings, most severe first.`);
  if (args.level !== undefined && !LEVELS.includes(args.level)) throw new Error(`level must be one of ${LEVELS.join(", ")}.`);
  return list.map((entry, index) => {
    const file = text(entry?.file, 1000), summary = text(entry?.summary, 2000), scenario = text(entry?.failure_scenario, 4000);
    if (!file) throw new Error(`Finding ${index + 1} needs file.`);
    if (!summary) throw new Error(`Finding ${index + 1} needs summary.`);
    if (!scenario) throw new Error(`Finding ${index + 1} needs failure_scenario.`);
    const line = Number.isInteger(entry?.line) && entry.line > 0 ? entry.line : undefined;
    if (entry?.verdict !== undefined && !VERDICTS.includes(entry.verdict)) throw new Error(`Finding ${index + 1}: verdict must be CONFIRMED or PLAUSIBLE.`);
    if (entry?.outcome !== undefined && !OUTCOMES.includes(entry.outcome)) throw new Error(`Finding ${index + 1}: outcome must be fixed, skipped or no_change_needed.`);
    const category = text(entry?.category, 40), short = text(entry?.short_summary, 60);
    return { file, ...(line ? { line } : {}), summary, failure_scenario: scenario, ...(category ? { category } : {}), ...(short ? { short_summary: short } : {}),
      ...(entry?.verdict ? { verdict: entry.verdict } : {}), ...(entry?.outcome ? { outcome: entry.outcome } : {}) };
  });
}

export const tools = [
  {
    name: "ReportFindings",
    title: "Report findings",
    description: "Report code-review findings as a typed list so OpenClaude Desktop can show them as review results the user can open at the right line and ask you to fix. Use it at the end of a review: call it once with the verified findings ranked most severe first (an empty list if nothing survived verification), and don't also write the findings out as prose. When re-reporting after applying fixes, set each finding's outcome to what actually happened.",
    inputSchema: {
      type: "object",
      properties: {
        findings: {
          type: "array", maxItems: MAX_FINDINGS, description: "Verified findings, most severe first; empty if none survived.",
          items: {
            type: "object",
            properties: {
              file: { type: "string", description: "Path of the file the finding is in, relative to the repository." },
              line: { type: "integer", minimum: 1, description: "1-based line the finding anchors to." },
              summary: { type: "string", description: "One-sentence statement of the defect." },
              failure_scenario: { type: "string", description: "Concrete inputs or state that lead to the wrong output or crash." },
              category: { type: "string", description: "Short kebab-case kind, e.g. \"correctness\", \"security\", \"efficiency\"." },
              short_summary: { type: "string", description: "Compressed label (at most 60 characters)." },
              verdict: { type: "string", enum: [...VERDICTS], description: "Set when a verification pass ran." },
              outcome: { type: "string", enum: [...OUTCOMES], description: "Only when re-reporting after applying fixes: what happened to this finding." },
            },
            required: ["file", "summary", "failure_scenario"],
            additionalProperties: false,
          },
        },
        level: { type: "string", enum: [...LEVELS], description: "Effort level the review ran at." },
      },
      required: ["findings"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (args = {}) => {
      const findings = normalizeFindings(args);
      if (!findings.length) return "No findings reported. The user sees that the review found nothing.";
      const outcomes = findings.filter((entry) => entry.outcome).length;
      return `Reported ${findings.length === 1 ? "1 finding" : `${findings.length} findings`}${outcomes ? ` (${outcomes} with an outcome)` : ""}. The user sees them as review results; don't repeat them as prose.`;
    },
  },
];
