# Workflow structured results

## Desktop compatibility policy

OpenClaude Desktop retains multi-core model mapping and schema fallbacks. A core without the dynamic `StructuredOutput` tool uses validated JSON (with `outputSchema` when available), and logs that difference. Model substitutions and read-only tool mappings also appear under **Compatibility differences** in the Tasks card. A read-only shell is not equivalent to removing Claude's individual tools. Unsupported command clamps still refuse to start an agent.

Model-started desktop workflows now share a session output-token ledger with the main model and sibling runners. Each user turn captures its own baseline; completed siblings remain counted, and agents from an older turn that finish later contribute to the current turn. Nested workflows share the same meter. Reaching a target blocks further admissions, while already-running agents can finish above it. Without a target, `spent()` is still shared and `remaining()` stays infinite. This uses the core's reported usage and does not make different providers' tokenizers or reporting cadence identical. Standalone runner calls without a desktop pool retain their local meter.

Agent resume identity uses the global call chain, prompt and explicitly authored, normalized `schema`, `model`, `effort`, `isolation`, `agentType`, `disallowedTools` and `bashCommandClamp`. Host defaults and display labels are excluded; forced-model mode discards per-call model overrides. Local journal keys are now `v5:`. Older agent entries remain on disk but are not reused, so their first resume reruns those calls; human/session extension history is unchanged. This aligns the observed Claude matching semantics without claiming binary or provider equivalence.

## Structured output protocol

The alternate runner uses a thread-local `StructuredOutput` dynamic tool for `agent(prompt, {schema})`. The tool description carries the author's complete object-rooted JSON Schema. Its protocol parameter schema is a permissive object because Codex strips unsupported keywords from tool metadata; the full author schema, preserved as text, remains authoritative. The Harness Ajv compiler validates the schema before startup and validates every tool input without coercing data or enforcing formats. Open objects can require properties absent from `properties`; closed contradictory objects fail before startup.

Only a successful tool result supplies the script's value. JSON in ordinary response text does not count. Invalid tool inputs return an error to the same model conversation; the default limit is five failed calls. `MAX_STRUCTURED_OUTPUT_RETRIES` accepts a positive integer override. A turn that finishes without a result gets one reminder. A second finish without that result rejects the agent call while the completed child remains done in progress. A provider API failure instead returns null and marks the child failed.

The runner commits values after successful tool items and retains the last valid capture in a model response. Raw response-boundary events identify all calls in that response; ordinary trailing tools finish before the runner interrupts the next model step. A reached retry cap stops later calls when no valid result exists. Concurrent threads keep separate handlers and captured values. A stream failure after an accepted structured result clears that result, stops provider reconnection and prevents a fresh outer attempt. The script receives null and the child is failed. Partial arguments and rejected structured inputs still permit provider recovery; ordinary tools already completed before the failure keep their effects. A failed terminal turn never returns a previously captured value. User cancellation still rejects and waits for interruption; retries and skipped members retain their Workflow controls.

```js
try {
  const answer = await agent('Inspect the changes', {
    schema: {
      type: 'object',
      properties: { summary: { type: 'string' } },
      required: ['summary'],
    },
  });
  return answer.summary;
} catch (error) {
  log(error.message);
  return null;
}
```

Scripts migrating from text-based schema output must call the result tool, catch missing-output and validation failures, and handle null API failures separately. `parallel` and `pipeline` still turn uncaught per-item errors into null. The separate session extension retains its legacy strict-output conversion and parsing helpers; these are not used by `agent()`.

`app/scripts/build-workflow-schema.mjs` bundles the shared validator and dependency licenses into the packaged app. `schema-build.json` records source and output hashes. Actual Claude 2.1.286 and Codex 0.155.1 local process comparisons cover admission, corrected outputs, retry limits and the missing-output reminder; additional lifecycle probes verify multiple captures, trailing tool effects, API failures, terminal progress and stream failures after complete or partial tool items. These do not establish complete product equivalence, model-fallback retraction or all provider authentication behavior. The response-boundary path requires the experimental raw events supported by the tested Codex 0.155.1 app-server.

# Workflow tool narrowing

`agent(prompt, {disallowedTools, bashCommandClamp})` is validated as Claude Code 2.1.280 validates it: each must be an array of non-empty, unpadded strings and every clamp entry a `Bash(<command or prefix>)` rule, or the spawn is refused. Both are sorted and de-duplicated before they join the resume identity, and an empty array means unset. An `agentType` definition's own `disallowedTools:` frontmatter joins the call's list. `src/toolNarrowing.js` maps the list onto the running core's real controls: excluding a file-write tool (`Write`, `Edit`, `MultiEdit`, `NotebookEdit`) or the shell (`Bash`, `PowerShell`, …) runs the agent read-only on every core, since these cores have one file-change tool and read through a sandboxed shell. Native Codex also takes per-thread config, so `WebSearch`/`WebFetch` turn web search off, `Agent`/`Task` turn sub-agents off and `mcp__…` entries disable the matching MCP servers or tools. A core that cannot remove a requested tool refuses the spawn before admission, and so does any non-empty `bashCommandClamp`, because no core can limit its shell to listed commands over the app-server protocol. Names with no separate tool on these cores (`Read`, `Grep`, `TodoWrite`, …) are no-ops, as unknown names are in Claude.
