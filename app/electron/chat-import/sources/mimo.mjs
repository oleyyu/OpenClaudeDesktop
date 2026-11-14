// MiMo Code (XiaomiMiMo/MiMo-Code, an OpenCode 1.x fork): read from the code that WRITES its sessions (HEAD 0.1.16,
// packages/cli/src; OpenClaude Desktop pins and launches 0.1.15, cores/mimo.mjs release, over the same tables).
//
//   where    <data> = $MIMOCODE_HOME/data when MIMOCODE_HOME is set (absolute), else $XDG_DATA_HOME/mimocode
//            (~/.local/share/mimocode, the core's historyLocation) (packages/shared/src/global.ts:27-50
//            resolveMimocodeHome). The database is $MIMOCODE_DB (absolute, or a name under <data>; ":memory:" none),
//            else mimocode.db for the latest / beta / prod channels and mimocode-<channel>.db otherwise
//            (storage/db.ts:31-44 getChannelPath, Path): every <data>/mimocode*.db is read. Pre-SQLite installs left
//            <data>/storage/ JSON (storage/json-migration.ts:117-124), read like OpenCode's.
//   tables   OpenCode 1.x's (session/session.sql.ts): session(id, project_id, parent_id, context_from, directory, title,
//            title_source, version, time_created, time_updated, time_archived, …); message(id, session_id, agent_id
//            default 'main' (:94), time_created, data); part(id, message_id, session_id, data). No 2.x session_message.
//   slices   a session's background actors write their turns into it under their own agent_id; the conversation is the
//            'main' slice (server/routes/instance/session.ts:825-844: GET /session/:id/message lists only it by default).
//   parts    message-v2.ts: text {synthetic, ignored} (:186), reasoning, file, tool (:499), compaction with the projected
//            summary (:323 projection.summary; the summary message is assistant summary:true, session/compaction.ts
//            :427-436), checkpoint (:283: a boundary whose synthetic text indexes what it covers, session/checkpoint.ts
//            :1735-1765), agent mentions, subtask, retry, step-*, snapshot, patch. A user message with provenance
//            (:518-547: an actor's or a plugin hook's delivery) is the harness speaking: injected.
//   imports  MiMo's own copies of Claude Code / Codex / OpenCode sessions (POST /global/import) are listed in its
//            external_import table (migration 20260612000000_external_import): kept, marked importedFrom.
import path from 'node:path';
import { envOf, homeOf } from './shared.mjs';
import { databaseFiles, envDatabase, listAll, readAny, tablesOf } from './opencode.mjs';

export const id = 'mimo';
export const label = 'MiMo Code';
export const experimental = false;

/** <data> as resolveMimocodeHome computes it (a relative MIMOCODE_HOME is an error there: ignored here). */
export function dataDir(ctx) {
  const env = envOf(ctx);
  if (typeof env.MIMOCODE_HOME === 'string' && path.isAbsolute(env.MIMOCODE_HOME)) return path.join(env.MIMOCODE_HOME, 'data');
  return path.join(env.XDG_DATA_HOME || path.join(homeOf(ctx), '.local', 'share'), 'mimocode');
}
const databases = ctx => databaseFiles(dataDir(ctx), { prefix: 'mimocode', envValue: envOf(ctx).MIMOCODE_DB });
export const roots = ctx => [...new Set([envDatabase(envOf(ctx).MIMOCODE_DB, dataDir(ctx)), path.join(dataDir(ctx), 'mimocode.db'), path.join(dataDir(ctx), 'storage')].filter(Boolean))];

/** session id → 'cc' | 'codex' | 'opencode' for the sessions MiMo copied from another tool (read once per database). */
function importedSources(db) {
  if (!tablesOf(db).has('external_import')) return new Map();
  try { return new Map(db.prepare('SELECT session_id, source FROM external_import').all().map(row => [row.session_id, row.source])); } catch { return new Map(); }
}

export async function list(ctx = {}) {
  const imported = new WeakMap();
  return listAll(ctx, {
    source: id, dir: dataDir(ctx), files: await databases(ctx),
    extra: (row, db) => {
      if (!imported.has(db)) imported.set(db, importedSources(db));
      const from = imported.get(db).get(row.id);
      return from ? { importedFrom: from } : {};
    },
  });
}
export async function read(target, ctx = {}) {
  return readAny(target, ctx, { source: id, dir: dataDir(ctx), list, name: label });
}
