// w13-chatfn-memory: the memory a Chat (or Cowork) session starts with (research/w13-chatfn.md M1–M2, C4).
// Official: claude.ai adds the account memory to every chat while memory is on and not paused; a chat in a project gets
// that project's own memory instead ("…does not include projects, which have their own specific memory"); the + menu
// Memory checkbox turns it off for one conversation; an incognito chat neither uses nor makes memory.
import { memorySettings, memoryActive, readMemory } from '../chat-memory.mjs';
import { coworkMemoryEnabled } from '../prefs/cowork-settings.mjs';

export const id = 'memory';
export const surfaces = ['chat', 'cowork'];

export const MEMORY_PREAMBLE = 'Below is what you remember about the user from their past conversations in OpenClaude Desktop (their memory). Use it only when it is relevant to the current request; do not mention that you have a memory unless the user asks about it. If the user asks you to remember or forget something, tell them they can change memory in Settings › Memory.';

export function memoryBlock(memory, { project = false } = {}) {
  const text = String(memory ?? '').trim();
  if (!text) return null;
  const tag = project ? 'projectMemories' : 'userMemories';
  return `${MEMORY_PREAMBLE}\n<${tag}>\n${text.replace(new RegExp(`</?${tag}>`, 'g'), '')}\n</${tag}>`;
}

export async function apply({ config, method, params, surface, project, threadId, dataDir }) {
  if (surface !== 'chat' && surface !== 'cowork') return null;
  // w13-coworkui-settings: Settings › Cowork › Use memory in sessions off (c71860c77 ge enabled_cowork_memory) keeps a
  // Cowork session's memory out.
  if (surface === 'cowork' && !coworkMemoryEnabled(config)) return null;
  const settings = memorySettings(config);
  if (!memoryActive(settings)) return null;
  if (typeof threadId === 'string' && settings.threads[threadId] === false) return null;
  const metadata = typeof threadId === 'string' ? config?.sessionMetadata?.[threadId] : null;
  if (metadata?.incognito === true || params?.codeDesktop?.incognito === true) return null;
  if (typeof dataDir !== 'string' || !dataDir) return null;
  const projectId = typeof project?.id === 'string' ? project.id : null;
  const { memory } = readMemory(dataDir, { projectId });
  return memoryBlock(memory, { project: !!projectId });
}
