import { createHash } from 'node:crypto';

// coworkd uses processName as both a Linux account and /sessions directory.
// Keep the app's full thread ID in host storage; guest accounts must fit 32 bytes.
export function guestSessionName(sessionId) {
  if (typeof sessionId !== 'string' || !/^[\w-]{1,100}$/.test(sessionId)) throw new Error('Invalid Cowork session ID.');
  if (/^[a-z_][a-z0-9_-]{0,31}$/.test(sessionId)) return sessionId;
  if (/^cw-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(sessionId)) {
    // Base36 keeps every UUID bit and yields a stable 28-character account name.
    return `cw-${BigInt('0x' + sessionId.slice(3).replaceAll('-', '')).toString(36).padStart(25, '0')}`;
  }
  return `cw-${createHash('sha256').update(sessionId).digest('hex').slice(0, 28)}`;
}
export const guestWorkdir = sessionId => `/sessions/${guestSessionName(sessionId)}/mnt/work`;
