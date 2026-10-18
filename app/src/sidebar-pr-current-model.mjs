import { aggregatePullRequests, pullRequestEntries, prStateOrder, prWebUrl } from './generated/code-current/sidebar-pr-model.mjs';

const optionalText = value => typeof value === 'string' && value.length > 0 ? value : undefined;
const count = value => Number.isInteger(value) && value >= 0 ? value : undefined;

// The local engine currently supplies one observed branch PR per session.
// Translate that record into the original aggregation contract. Do not invent
// extra repository bindings when the engine has not supplied them.
export function currentSidebarPullRequest(session) {
  const record = session.prInfo ?? session.codeDesktop?.pr;
  const state = session.prInfo?.state ?? session.prState ?? (record ? 'open' : 'none');
  if (state === 'none' || !Object.hasOwn(prStateOrder, state)) return undefined;
  const url = prWebUrl(record?.url ?? session.prLink);
  let repo = optionalText(record?.repo), number = Number(record?.number);
  if (url) {
    try {
      const match = new URL(url).pathname.match(/^\/([^/]+\/[^/]+)\/pull\/(\d+)\/?$/);
      repo ??= match?.[1];
      if (!Number.isInteger(number) || number <= 0) number = Number(match?.[2]);
    } catch { /* An unusable URL does not provide repository identity. */ }
  }
  number = Number.isInteger(number) && number > 0 ? number : undefined;
  const title = optionalText(record?.title);
  const ci = record?.ciState ?? record?.ci;
  const ciState = ci === 'skipped' ? 'passed' : ['failed', 'pending', 'passed'].includes(ci) ? ci : undefined;
  const records = number !== undefined || url !== undefined || title !== undefined ? [{
    state, repo: repo ?? '', number, url, title, ciState,
    additions: count(record?.additions), deletions: count(record?.deletions),
  }] : [];
  const aggregated = aggregatePullRequests(records);
  return { state: aggregated.hasPr ? aggregated.displayState : state, count: Math.max(1, records.length), entries: pullRequestEntries(aggregated) };
}
