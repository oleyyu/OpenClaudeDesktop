// Bypass across a core switch (main.cjs): a session's Bypass choice lives in renderer memory and every reconnect
// revokes it. The one exception is the reconnect a user core switch starts while Bypass is active: the switch mints a
// one-shot token, that reconnect binds it to its new connection if the new core's requirements allow Bypass, and the
// renderer applies it once and clears it. The token names the scope the user confirmed Bypass for (the renderer's
// folder and open session), so it lands only there, never on whatever folder the reloaded page opens in. Held in
// memory only: never saved.
import { bypassAvailability } from './permission-policy.mjs';

// The confirmed scope a switch sends on its select and its reconnect ({carryCwd, carrySession}).
export function carryScope(p) {
  return { cwd: typeof p?.carryCwd === 'string' ? p.carryCwd : '', sessionId: typeof p?.carrySession === 'string' && p.carrySession ? p.carrySession : null };
}
// The switch's token: only with the opt-in on, for the scope the select named.
export function requestCarry(config, scope) {
  return config?.allowBypassPermissions === true && scope ? { pending: true, cwd: scope.cwd, sessionId: scope.sessionId } : null;
}
// The switch's own reconnect binds the token to its connection, once the new core's configRequirements/read allows Bypass
// and the reconnect names the same scope the select did.
export function bindCarry(carry, connectionId, requirements, scope) {
  if (carry?.pending !== true || typeof connectionId !== 'string' || !connectionId) return null;
  if (!scope || scope.cwd !== carry.cwd || scope.sessionId !== carry.sessionId) return null;
  return bypassAvailability(requirements).allowed ? { connectionId, cwd: carry.cwd, sessionId: carry.sessionId } : null;
}
// What init/reconnect hand the renderer: the carry for this very connection, while the opt-in is still on.
export function carryFor(carry, connectionId, config) {
  if (!carry || typeof carry.connectionId !== 'string' || carry.connectionId !== connectionId || config?.allowBypassPermissions !== true) return null;
  return { connectionId: carry.connectionId, cwd: carry.cwd, sessionId: carry.sessionId };
}
// Renderer: the carry applies only to the scope it was confirmed for: the same open session, or a draft in the same
// folder (after the switch reload no session is open). Anything else drops it.
export function carryApplies(carry, { current, cwd }) {
  if (!carry || typeof carry.cwd !== 'string') return false;
  return current ? !!carry.sessionId && current === carry.sessionId : (cwd || '') === carry.cwd;
}
