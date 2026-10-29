import { parseUnifiedDiff } from './diff-model.js';
import { commandRowState } from './command-row-model.mjs';
import { isHiddenTranscriptItem } from './transcript-item-visibility.mjs';
import { questionReceipt } from './generic-tool-model.mjs';
import { appToolStandsAlone } from './agent-tool-titles.mjs';
import { computerUseAction } from './computer-use-model.mjs';
import { imageGenerationState } from './media-item-model.mjs';
import { commandText } from './shell-command-model.mjs';
import { t, tn, getLocale } from '../electron/i18n/index.mjs';

// Contract: approval-current:4164–4238; cf6ae6197:6986–7031. Only protocol
// actions classify a command. Never guess a tool from shell text.
export const fileBasename = (value = '') => String(value).replace(/[\\/]+$/, '').split(/[\\/]/).at(-1) || 'file';
export const changeKind = change => typeof change.kind === 'string' ? change.kind : change.kind?.type;
export const changePath = change => change.kind?.move_path || change.path || '';
export function fileAction(item) {
  const actions = item?.commandActions;
  return item?.type === 'commandExecution' && actions?.length === 1 && ['read', 'search', 'listFiles'].includes(actions[0].type) ? actions[0] : null;
}
/**
 * The facts an expanded search / list / other file step shows. A tool's own arguments when it has them, else the
 * pattern and path the action reports; only a step that reports neither (Codex's `ls -la`: path null) names the
 * command that ran (the action's own, else the item's, without the `<shell> -lc` wrapper), so 'Listed workspace'
 * still says what ran and a search never gets a synthesized command: fact beside its inputs.
 */
export function fileActionFacts(item, action) {
  if (action?.type === 'search' || action?.type === 'listFiles') {
    const args = action.arguments;
    if (args && typeof args === 'object' && !Array.isArray(args) && Object.keys(args).length)
      return Object.entries(args).filter(([, value]) => value != null);
    const facts = Object.entries({ ...(action.query != null ? { pattern: action.query } : {}), ...(action.path ? { path: action.path } : {}) });
    if (facts.length) return facts;
    const command = commandText(action.command ?? item?.command);
    return command ? [['command', command]] : [];
  }
  return Object.entries({ command: item?.command, ...(action?.query != null ? { query: action.query } : {}), ...(action?.path ? { path: action.path } : {}) }).filter(([, value]) => value != null);
}
export function readContents(output = '') {
  const lines = output.split('\n');
  const prefix = /^ *\d+(?:[:|] ?|→|\t)/;
  return lines.every(line => !line || prefix.test(line)) ? lines.map(line => line.replace(prefix, '')).join('\n') : output;
}
const verbs = { read: [t('Read'), t('Reading'), t('Failed to read')], add: [t('Created'), t('Creating'), t('Failed to write')], update: [t('Edited'), t('Editing'), t('Failed to edit')], delete: [t('Deleted'), t('Deleting'), t('Failed to edit')], search: [t('Searched'), t('Searching'), t('Failed to search')], listFiles: [t('Listed'), t('Listing'), t('Failed to list')] };
const verb = (kind, state) => (verbs[kind] || verbs.update)[state === 'busy' || state === 'blocked' ? 1 : state === 'failed' ? 2 : 0];
// A Codex imageGeneration reports its own statuses ('generating', 'failed', …); as a group member it takes the
// tool statuses the row states read. imageView and sleep carry no status: they are done when they arrive.
const memberStatus = item => item?.type !== 'imageGeneration' ? item
  : { ...item, status: { busy: 'inProgress', failed: 'failed', stopped: 'interrupted' }[imageGenerationState(item)] || 'completed' };
export function fileRunState(items, pending = new Set()) {
  const states = items.map(item => commandRowState(memberStatus(item), pending.has(item.id)));
  return states.includes('blocked') ? 'blocked' : states.includes('busy') ? 'busy' : states.includes('unknown') ? 'unknown' : states.at(-1) || 'done';
}
export function fileToolSummary(items, state) {
  const item = items.at(-1), action = fileAction(item);
  if (action) {
    if (action.type === 'read') return { label: verb('read', state), path: action.path, meta: fileBasename(action.path) };
    const detail = action.type === 'search' ? action.query : action.path || fileBasename(item.cwd);
    return { label: [verb(action.type, state), detail].filter(Boolean).join(' ') };
  }
  const changes = items.flatMap(item => item.changes || []);
  const paths = new Set(changes.map(changePath));
  if (paths.size === 1) {
    const change = changes.at(-1);
    return { label: verb(changeKind(change), state), path: changePath(change), meta: fileBasename(changePath(change)) };
  }
  // Codex multi-file patch adapts the official group-summary fk, not a
  // fictional single-file meta such as "3 files".
  const groups = new Map();
  for (const change of changes) {
    const kind = changeKind(change);
    if (!groups.has(kind)) groups.set(kind, new Set());
    groups.get(kind).add(changePath(change));
  }
  const parts = [...groups].map(([kind, paths]) => tn(paths.size, '{verb} a file', '{verb} {count} files', { verb: verb(kind, state).toLowerCase() }));
  const label = parts.join(t(', '));
  return { label: label ? label[0].toUpperCase() + label.slice(1) : verb('update', state) };
}
export function changePreview(change) {
  const raw = typeof change.diff === 'string' ? change.diff : '';
  // Codex can return a headerless unified hunk. Supply parser framing only;
  // never include it in Copy or pretend it is a reported filename.
  const framed = raw.startsWith('@@') ? `--- a/file\n+++ b/file\n${raw}` : raw;
  const parsed = parseUnifiedDiff(framed);
  let rows = parsed.files.flatMap(file => file.fallbackReason ? [] : file.hunks.flatMap((hunk, index) => [
    ...(index ? [{ type: 'separator', text: hunk.header }] : []), ...hunk.rows,
  ]));
  const valid = parsed.files.length > 0 && parsed.files.every(file => !file.fallbackReason) && !parsed.sections.some(section => section.type === 'raw' && section.raw.trim());
  const kind = changeKind(change);
  // Add/delete may carry plain file contents, as defined by FileUpdateChange.
  if (!valid && raw && !/^(@@|diff --git|--- )/m.test(raw) && ['add', 'delete'].includes(kind)) {
    const lines = raw.split('\n'); if (lines.at(-1) === '') lines.pop();
    rows = lines.map((text, index) => ({ type: kind === 'add' ? 'added' : 'removed', text, oldLine: kind === 'delete' ? index + 1 : null, newLine: kind === 'add' ? index + 1 : null }));
  } else if (!valid) return { raw, rows: [], added: 0, removed: 0, fallback: true };
  const added = rows.filter(row => row.type === 'added').length, removed = rows.filter(row => row.type === 'removed').length;
  return { raw, rows, added, removed, pureSide: added && !removed && rows.every(row => ['added', 'note'].includes(row.type)) ? 'added' : removed && !added && rows.every(row => ['removed', 'note'].includes(row.type)) ? 'removed' : null };
}
export function fileRunCounts(items) {
  const paths = new Map();
  for (const item of items) {
    if (['failed', 'declined', 'interrupted'].includes(item.status)) continue;
    for (const change of item.changes || []) {
      const preview = changePreview(change), path = changePath(change);
      const previous = changeKind(change) === 'add' ? { added: 0, removed: 0 } : paths.get(path) || { added: 0, removed: 0 };
      paths.set(path, { added: previous.added + preview.added, removed: previous.removed + preview.removed });
    }
  }
  return [...paths.values()].reduce((sum, counts) => ({ added: sum.added + counts.added, removed: sum.removed + counts.removed }), { added: 0, removed: 0 });
}
function runKey(item) {
  const action = fileAction(item);
  if (action?.type === 'read' && action.path) return `Read ${action.path}`;
  if (item.type !== 'fileChange' || !item.changes?.length) return null;
  const keys = new Set(item.changes.map(change => `${changeKind(change)} ${changePath(change)}`));
  return keys.size === 1 ? [...keys][0] : null;
}
export function coalesceFileRuns(items) {
  const runs = [];
  for (const item of items) {
    const last = runs.at(-1), key = runKey(item);
    if (key && last && runKey(last) === key && last.turnId === item.turnId) {
      runs[runs.length - 1] = { ...last, fileRun: [...(last.fileRun || [last]), item] };
    } else runs.push(item);
  }
  return runs;
}

// An answered question is its own receipt card (wue/vZ, approval-current.js:45232-45240), never a group member.
// Npe groups every consecutive tool call of any category, so Codex view_image, image generation and sleep join the
// run too (their images go in the member's body inside the group, FN :17324); a hook's injected context does not.
// Claude's stands-alone tools (ask_user_question, push_notification, send_to_user, report_findings) and the
// DeepSeek core's `present` cards are never folded into a group either (agent-tool-titles.mjs appToolStandsAlone).
// w12b-transcript: the user's own '!' command (source userShell) is a user entry (c96d752d0 `ii === "bash"`), never a tool.
const groupable = item => ['commandExecution', 'fileChange', 'webSearch', 'mcpToolCall', 'dynamicToolCall', 'collabAgentToolCall', 'computerUse', 'imageView', 'imageGeneration', 'sleep'].includes(item.type) && !questionReceipt(item) && !appToolStandsAlone(item)
  && !(item.type === 'commandExecution' && item.source === 'userShell');
// Npe/Die: a prose/turn boundary closes a tool segment. This surface adds
// groups containing file or command tools (including pure command batches).
// Members retain their real ids and original order.
export function groupFileTools(items, transcriptView = 'normal') {
  const result = [], pending = [], hidden = [];
  const flush = () => {
    if (!pending.length) return;
    // Npe consumes all tool categories; pure web/MCP batches share the same group.
    // Count calls before inner same-path coalescing so repeated reads still
    // have one expandable aggregate. Details retain every original item.
    if (pending.length > 1)
      result.push({ ...pending[0], type: 'fileToolGroup', toolGroup: [...pending] });
    else result.push(...pending);
    result.push(...hidden);
    hidden.length = 0;
    pending.length = 0;
  };
  for (const item of items) {
    if (item.type === "subAgentActivity") continue; // Roll-up evidence, not a visible parent row or prose boundary.
    if (pending.length && pending[0].turnId !== item.turnId) flush();
    if (isHiddenTranscriptItem(item, transcriptView)) {
      // Deferred invisible siblings keep footer ids reachable after the tools,
      // without turning hidden reasoning into visual segment boundaries.
      (pending.length ? hidden : result).push(item);
      continue;
    }
    if (!groupable(item)) { flush(); result.push(item); continue; }
    pending.push(item);
  }
  flush();
  return result;
}
// cf6ae6197 xk/qO: a DeepSeek Harness tool with a source counterpart takes that
// category (TodoWrite 'todo', ExitPlanMode 'exit_plan_mode', the code tool 'code');
// ask_user_question, skill and job_* have none and stay 'used a tool'.
const HARNESS_CATEGORIES = { todo_write: 'todo', exit_plan_mode: 'exit_plan_mode', run_code: 'code' };
// fk metas without a count: 'searched code', 'found files', 'updated todos', 'proposed a plan', 'ran code'.
const FIXED_META = { search: t('code'), glob: t('files'), list: t('files'), web: t('the web'), todo: t('todos'), exit_plan_mode: t('a plan'), code: t('code') };
// Count metas per noun: [one, other].
const COUNT_META = { file: ['a file', '{count} files'], command: ['a command', '{count} commands'], agent: ['an agent', '{count} agents'], page: ['a page', '{count} pages'], tool: ['a tool', '{count} tools'], computer: ['the computer', 'the computer ({count} steps)'], image: ['an image', '{count} images'], sleep: ['once', '{count} times'] };
// cf6ae6197 rk/ik/sk + Sk. Keep visual segments distinct from the full
// accessible summary: all-failed categories tint only the verb; mixed failures
// retain their count in the visible meta. Interruptions are not tool failures.
export function fileGroupPresentation(items) {
  const categories = new Map(), filePaths = new Set(), waits = [];
  let missingFilePath = false;
  const add = (category, key, item, path) => {
    if (!categories.has(category)) categories.set(category, new Map());
    const entries=categories.get(category),state=commandRowState(memberStatus(item));
    const observation=state==='failed'?'failed':state==='done'?'succeeded':state==='busy'||state==='blocked'?'pending':undefined;
    // An interrupted retry has no new outcome. A pending retry clears the
    // previous outcome, and its completion replaces it on the same path.
    entries.set(key,observation===undefined?entries.get(key):observation==='pending'?undefined:observation);
    if (['add', 'update', 'delete', 'read'].includes(category)) {
      if (typeof path === 'string' && path) filePaths.add(path); else missingFilePath = true;
    }
  };
  for (const item of items) {
    const action = fileAction(item);
    if (item.type === 'fileChange') {
      for (const change of item.changes || []) add(changeKind(change), changePath(change), item, changePath(change));
    } else if (action?.type === 'read') add('read', action.path, item, action.path);
    // The bridge names the Harness tool on its search action: glob is fk's 'found files'.
    else if (action?.type === 'search') add(action.tool === 'glob' ? 'glob' : 'search', item.id, item);
    else if (action?.type === 'listFiles') add('list', item.id, item);
    else if (item.type === 'commandExecution') add('command', item.id, item);
    else if (item.type === 'webSearch') add(item.action?.type === 'openPage' ? 'web_fetch' : 'web', item.id, item);
    else if (item.type === 'collabAgentToolCall' && item.tool === 'spawnAgent') add('agent', item.id, item);
    else if (item.type === 'dynamicToolCall' && item.namespace == null && Object.hasOwn(HARNESS_CATEGORIES, item.tool)) add(HARNESS_CATEGORIES[item.tool], item.id, item);
    // Computer use (computer-use-model.mjs): 'used the computer (N steps)'.
    else if (computerUseAction(item)) add('computer', item.id, item);
    // Viewing an image reads that file; a generated image is 'generated an image'; sleeps add up to 'waited 30s'.
    else if (item.type === 'imageView') add('read', item.path, item, item.path);
    else if (item.type === 'imageGeneration') add('image', item.id, item);
    else if (item.type === 'sleep') { add('sleep', item.id, item); waits.push(item.durationMs); }
    else add('tool', item.id, item);
  }
  const words = { add: t('created'), update: t('edited'), delete: t('deleted'), read: t('read'), search: t('searched'), glob: t('found'), list: t('listed'), web: t('browsed'), web_fetch: t('fetched'), command: t('ran'), agent: t('ran'), todo: t('updated'), exit_plan_mode: t('proposed'), code: t('ran'), tool: t('used'), computer: t('used'), image: t('generated'), sleep: t('waited') };
  const fileKinds = new Set(['add', 'update', 'delete', 'read']);
  // User-requested compact Read count; never call six reads of one path six files.
  const readBatch = items.length > 1 && items.every(item => fileAction(item)?.type === 'read');
  const sharedPath = !readBatch && !missingFilePath && filePaths.size === 1 ? [...filePaths][0] : null;
  const fileCategories = [...categories.keys()].filter(kind => fileKinds.has(kind));
  const capital=value=>value.charAt(0).toUpperCase()+value.slice(1);
  const segment=(verb,meta,count,failed)=>{
    const failedMeta=failed?t('{meta} ({failed} failed)',{meta,failed}):meta;
    const isError=failed>0&&failed>=count;
    return {verb,meta:isError?meta:failedMeta,isError,failedMeta};
  };
  // Sk:16616–16702 groups the one known path even when commands or other
  // categories occur between its file operations. It stays at first file position.
  const fileSegment = sharedPath ? segment(
    new Intl.ListFormat(getLocale(),{type:'conjunction'}).format(fileCategories.map(kind=>words[kind])),
    fileBasename(sharedPath),fileCategories.length,
    fileCategories.filter(kind=>[...categories.get(kind).values()].includes('failed')).length,
  ) : null;
  const segments=[];
  for(const [kind,entries] of categories){
    if(fileSegment&&fileKinds.has(kind)){
      if(kind===fileCategories[0])segments.push({...fileSegment});
      continue;
    }
    const count=entries.size,failed=[...entries.values()].filter(value=>value==='failed').length;
    const noun=fileKinds.has(kind)?'file':kind==='command'?'command':kind==='agent'?'agent':kind==='web_fetch'?'page':kind==='computer'?'computer':kind==='image'?'image':kind==='sleep'?'sleep':'tool';
    let meta=Object.hasOwn(FIXED_META,kind)?FIXED_META[kind]:tn(count,...COUNT_META[noun]);
    // Sleeps that all report a duration read as the time waited ('waited 30s'), otherwise how many times.
    if(kind==='sleep'&&waits.length&&waits.every(Number.isFinite))meta=t('{seconds}s',{seconds:Math.round(waits.reduce((sum,ms)=>sum+Math.max(0,ms),0)/1000)});
    if(readBatch && kind==='read' && items.length>count)meta=t('{meta} ({count} reads)',{meta,count:items.length});
    segments.push(segment(words[kind]||t('used'),meta,count,failed));
  }
  if(segments.length)segments[0].verb=capital(segments[0].verb);
  return {label:segments.map(value=>`${value.verb} ${value.failedMeta}`).join(t(', ')),
    ...(fileSegment&&categories.size===fileCategories.length&&!fileSegment.isError&&fileSegment.meta===fileBasename(sharedPath)?{path:sharedPath}:{}),segments};
}

export function fileGroupSummary(items) {
  const {segments,...summary}=fileGroupPresentation(items);
  return summary;
}
export function pathChoices(value, cwd) {
  if (typeof value !== 'string' || !value || value.includes('\0')) return null;
  const normalize = path => { const parts = []; for (const part of path.split('/')) { if (part === '..') parts.pop(); else if (part && part !== '.') parts.push(part); } return '/' + parts.join('/'); };
  const absolute = value.startsWith('/') ? normalize(value) : cwd?.startsWith('/') ? normalize(`${cwd}/${value}`) : null;
  const root = cwd?.startsWith('/') ? normalize(cwd) : null;
  return { absolute, relative: absolute && root && absolute.startsWith(root + '/') ? absolute.slice(root.length + 1) : null, filename: fileBasename(value) };
}
