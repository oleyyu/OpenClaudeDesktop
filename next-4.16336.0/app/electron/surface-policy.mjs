// Desktop product surfaces are independent of a core's permission modes.
// Old sessions without a surface belong to Code; never reclassify their history.
import { hiddenChatVersion } from './chat-branches-model.mjs';
import { isIncognitoSession } from './chat-incognito-model.mjs'; // w13-chatfn-history
export const SURFACES = Object.freeze(['chat', 'cowork', 'code']);
export const validSurface = value => SURFACES.includes(value);
export const sessionSurface = (id, metadata = {}) => validSurface(metadata?.[id]?.surface) ? metadata[id].surface : 'code';
export const surfaceDraftKey = (surface = 'code', side = 0) => `${surface === 'code' ? 'epitaxy' : surface}-draft${side ? '-split' : ''}`;
// w13-chatfn-branches: a branched Chat conversation is listed once, by the version it shows (chat-branches-model.mjs).
// w13-chatfn-history: an incognito chat stays out of every list (shared-78 "Incognito chats stay out of your history…").
export const surfaceSessions = (sessions, surface, metadata) => sessions.filter(session => surface === 'code' ? sessionSurface(session.id, metadata) === 'code' : sessionSurface(session.id, metadata) !== 'code' && !hiddenChatVersion(session.id, metadata) && !isIncognitoSession(session.id, metadata));
export const surfaceInstructions = surface => surface === 'chat'
  ? 'You are a conversational assistant in OpenClaude Desktop. Answer the user directly in their language. Help with writing, explanation, analysis and brainstorming. Do not inspect the working directory unless the user asks about files. Do not edit files or execute commands. Use attached files only as context when requested.'
  : surface === 'cowork'
    ? 'You are a task assistant in OpenClaude Desktop Cowork. Help the user complete work with documents, research, data and files. For multi-step work, maintain a concise plan using the plan tool. Work in the selected working directory. Preserve source files unless asked to change them. Create useful deliverables and link to their actual file paths in the final answer. Follow the user language; do not claim work finished without checking the result.'
    : '';
// w13-coworkfn-engine (cwf-06, research/w13-coworkfn.md O-15: a 3P deployment's Cowork session runs on the system prompt
// the app records for it): the Cowork line for a session on the connected core, whose cwd is its own host-cwd
// (core-cowork.mjs). It names the session's outputs folder, the folders the user connected and how to use them.
const COWORK_FOLDER_LINE = 'Work in the selected working directory.';
export function coworkInstructions({ outputsDir = null, folders = [] } = {}) {
  const connected = [...new Set((Array.isArray(folders) ? folders : []).filter(folder => typeof folder === 'string' && folder))];
  const lines = [surfaceInstructions('cowork').replace(COWORK_FOLDER_LINE, connected.length
    ? 'Work on the user’s files in the connected folders listed below.' : 'No folder is connected to this task yet.')];
  if (typeof outputsDir === 'string' && outputsDir)
    lines.push(`Your outputs folder is ${outputsDir}. Save the files you create for the user there unless they ask for another location; it is always writable and needs no folder request.`);
  if (connected.length) lines.push(`Connected folders:\n${connected.map(folder => `- ${folder}`).join('\n')}`);
  lines.push('Writing outside the connected folders and the outputs folder is blocked. If you need another folder, ask the user to add it (or use the request_cowork_directory tool when you have it). When a file is ready for the user, present it with the present_files tool when you have it; otherwise give its full path in your final answer.');
  return lines.join('\n\n');
}

// UI-only request metadata must not leak into native core protocols.
export function takeSurface(params) {
  const value = params.codeDesktop?.surface;
  if (value === undefined) return null;
  if (!validSurface(value)) throw new Error('Choose a valid workspace.');
  const { surface, ...rest } = params.codeDesktop;
  if (Object.keys(rest).length) params.codeDesktop = rest;
  else delete params.codeDesktop;
  return surface;
}

// w13-close-main-process (closeout chatfn-projects-02): a Chat session is read-only (permission-policy.mjs: mode 'chat'
// asks for the read-only sandbox), and main enforces it whatever the renderer sent, since a Chat cwd can be a real
// folder of the user's (a project's). The surface is the request's own for thread/start, else the thread's recorded one
// (sessionMetadata), so a resume or a turn can't leave it by naming another surface. thread/start|resume get the
// read-only sandbox (a Bypass request's `never` stays `never`: nothing can escalate out of read-only), turn/start a
// readOnly sandboxPolicy without network when it names one. Returns true when the request is a Chat session's.
export const CHAT_READ_ONLY_METHODS = Object.freeze(['thread/start', 'thread/resume', 'turn/start']);
export function enforceChatReadOnly(method, params, { surface = null, metadata = {} } = {}) {
  if (!CHAT_READ_ONLY_METHODS.includes(method) || !params || typeof params !== 'object') return false;
  const chat = method === 'thread/start' ? surface === 'chat'
    : surface === 'chat' || (typeof params.threadId === 'string' && sessionSurface(params.threadId, metadata) === 'chat');
  if (!chat) return false;
  if (method === 'turn/start') {
    if (params.sandboxPolicy !== undefined && params.sandboxPolicy?.type !== 'readOnly') params.sandboxPolicy = { type: 'readOnly', networkAccess: false };
    if (params.permissions !== undefined) { delete params.permissions; params.sandboxPolicy = { type: 'readOnly', networkAccess: false }; }
    return true;
  }
  if (params.permissions !== undefined) delete params.permissions;
  params.sandbox = 'read-only';
  return true;
}
