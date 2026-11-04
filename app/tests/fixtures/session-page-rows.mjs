// W14-code r4 closeout R4DC-N7: the host's test-only sessionPageRows export left src/sessions-page-model.mjs (the
// Sessions page is the generated Hf table). The tests keep it as their oracle: the rows Hf shows for one surface and
// query (its Code branch), composed from the host records and the generated predicates.
import { isSessionArchived, sortSessionPageRows, isListedSession } from '../../src/generated/code-current/sessions-page-model.mjs';
import { sessionPageRecords } from '../../src/sessions-page-model.mjs';

export function sessionPageRows(sessions, { surface = 'code', query = '', sortBy = 'type', ...context } = {}) {
  const lower = query.trim().toLowerCase();
  // R3-nested NBS-3: Hf lists a Code row only when ba(e.source.data) (shared-11 pw) holds, before the surface filter.
  const rows = sessionPageRecords(sessions, context).filter((row) => isListedSession(row.source.data))
    .filter((row) => isSessionArchived(row) === (surface === 'archived') && (!lower || (row.title ?? '').toLowerCase().includes(lower)));
  return sortSessionPageRows(rows, !!lower && sortBy === 'type');
}
