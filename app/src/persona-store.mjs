// C2 persona store: the renderer's single source for the assistant display
// name and spark icon. Pure (node-testable); main.jsx
// syncs it from boot.config.persona and use-persona.js wraps it for React.
// Visible copy only: accessible names ("Stop DeepSeek’s response", ...) never read it.
import { normalizePersona, PERSONA_DEFAULT } from '../electron/prefs/persona.mjs';
import { getAssistantName } from '../electron/i18n/index.mjs';

export const DEFAULT_ASSISTANT_NAME = 'DeepSeek';
let persona = PERSONA_DEFAULT;
const listeners = new Set();

export function setPersona(value) {
  const next = normalizePersona(value);
  if (Object.keys(next).every(key => next[key] === persona[key])) return persona;
  persona = Object.freeze(next);
  for (const listener of [...listeners]) listener();
  return persona;
}
export function getPersona() { return persona; }
export const getSnapshot = getPersona;
export function subscribe(listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
// Without a custom name: the running core's assistant ("DeepSeek", "Codex", … — i18n getAssistantName).
export function assistantName() { return persona.assistantName || getAssistantName() || DEFAULT_ASSISTANT_NAME; }

/** Escape a name for use inside a RegExp source. */
export function escapeRegExp(text) { return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
// W14-code r5 cleanup R5DC-01: fillGreeting / greetingFor left with the Settings › Persona "Home greeting" row.
