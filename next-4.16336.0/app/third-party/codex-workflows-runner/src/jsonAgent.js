// Local (Code Desktop): structured agent() results on a core WITHOUT structured output (capabilities.structuredOutput
// false: ZCode, Qwen Code, Kimi, Gemini, MiniMax — no turn/start outputSchema and no thread/start dynamicTools).
// The author's JSON Schema goes into the prompt, the JSON is taken from the reply (strict JSON.parse, then a fenced
// or embedded object/array: codexAgent.js checkSchemaResult), validated with schemaValidate.js, and a reply that
// does not validate is answered in the same conversation with the errors, up to MAX_STRUCTURED_OUTPUT_RETRIES
// failed replies (default 5), as the StructuredOutput tool path does (structuredAgent.js).
import { StructuredAgentError } from './structuredAgent.js';

export const JSON_REQUEST = 'Return your final answer as one JSON value that matches this JSON Schema exactly. Reply with only that JSON value (a ```json fenced block is fine) and no other text. JSON Schema:';
export const JSON_RETRY = 'Your reply did not match the required JSON Schema:';
export const JSON_RETRY_TAIL = 'Reply again with only the corrected JSON value.';

export function jsonRequestText(prompt, schema) {
  return `${String(prompt)}\n\n${JSON_REQUEST}\n${JSON.stringify(schema)}`;
}
export function jsonRetryText(errors) {
  const list = (Array.isArray(errors) ? errors : [String(errors)]).slice(0, 8).join('; ').slice(0, 600);
  return `${JSON_RETRY} ${list}\n${JSON_RETRY_TAIL}`;
}
export function structuredRetryCap(env = process.env) {
  const cap = Number(env.MAX_STRUCTURED_OUTPUT_RETRIES ?? 5);
  if (!Number.isSafeInteger(cap) || cap < 1) throw Error('MAX_STRUCTURED_OUTPUT_RETRIES must be a positive integer');
  return cap;
}

/**
 * One agent on one thread: turn 1 asks for the JSON, later turns quote the validation errors.
 * check(text, schema) → {ok, value, errors} (codexAgent.js checkSchemaResult).
 */
// outputSchema: the wire schema for a core that honors turn/start outputSchema (its reply is still validated here).
export async function runJsonAgent({ client, threadParams, prompt, opts, runTurn, check, metrics, outputSchema }) {
  const schema = structuredClone(opts.schema);
  const cap = structuredRetryCap();
  const started = await client.startThread(threadParams);
  const threadId = started?.thread?.id;
  if (!threadId) throw Error('thread/start did not return thread.id');
  const state = { activeTools: new Set(), toolCalls: 0 };
  let failures = 0, lastError = '';
  try {
    let input = jsonRequestText(prompt, schema);
    for (;;) {
      const params = { threadId, input: [{ type: 'text', text: input }], ...opts.requestedModel ? { model: opts.requestedModel } : {}, ...opts.effort ? { effort: opts.effort } : {}, ...outputSchema ? { outputSchema } : {} };
      const { turn, text } = await runTurn(client, threadId, params, opts, state);
      opts.signal?.throwIfAborted();
      if (turn.status === 'interrupted') throw new Error('Agent turn interrupted');
      if (turn.status && turn.status !== 'completed') {
        throw new StructuredAgentError(turn.error?.message ?? `turn ended with status=${turn.status}`, 'provider', { codexErrorInfo: turn.error?.codexErrorInfo });
      }
      const checked = check(text, schema);
      if (checked.ok) return checked.value;
      failures++;
      lastError = (checked.errors ?? []).slice(0, 8).join('; ').slice(0, 600) || 'the reply is not valid JSON';
      if (failures >= cap) {
        throw new StructuredAgentError(`agent({schema}): JSON result retry cap (${cap}) exceeded — ${failures} replies did not match the schema — last error: ${lastError}`, 'retry-limit', { retryable: false });
      }
      opts.log?.(`  ⟳ JSON result did not match the schema (${failures}/${cap}): ${lastError.slice(0, 140)}`);
      input = jsonRetryText(checked.errors?.length ? checked.errors : [lastError]);
    }
  } finally {
    metrics(threadId, state.toolCalls);
  }
}
