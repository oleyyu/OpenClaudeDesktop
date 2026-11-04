import { chipPathOpenable, normalizeHttpUrl } from './user-inline-model.mjs';
import { t } from '../electron/i18n/index.mjs';

const decodeUri = text => { try { return decodeURI(text); } catch { return text; } };
const unc = text => /^(?:[\\/]{2}|[\\/]\?\?[\\/])/.test(text);
function range(first, last) {
  if (!first) return {};
  const a = Number(first), b = last ? Number(last) : a;
  return a === b ? { line: a } : { line: Math.min(a, b), endLine: Math.max(a, b) };
}
export function responseFileReference(href) {
  if (typeof href !== 'string' || !href) return null;
  const decoded = decodeUri(href), fileUrl = decoded.startsWith('file:///');
  let path = fileUrl ? decoded.slice(7).replaceAll('\\', '/') : decoded;
  if (/^\/[A-Za-z]:\//.test(path)) path = path.slice(1);
  if (unc(path) || path.startsWith('#')) return null;
  const hash = path.indexOf('#'), fragment = hash < 0 ? '' : path.slice(hash + 1);
  path = hash < 0 ? path : path.slice(0, hash);
  if (/^[a-z][a-z0-9+-]+:(?!\d+(?:[-:]\d+)?$)/i.test(path)) return null;
  if (fileUrl) { try { path = decodeURIComponent(path); } catch { /* Keep literal malformed escapes. */ } path = path.replaceAll('\\', '/'); }
  if (!path || unc(path)) return null;
  const colon = /:(\d+)(?:-(\d+)|:\d+)?$/.exec(path);
  if (colon) return { path: path.slice(0, colon.index), ...range(colon[1], colon[2]) };
  const lines = /^L(\d+)(?:-L?(\d+))?$/.exec(fragment);
  return { path, ...(lines ? range(lines[1], lines[2]) : {}) };
}
export function responseLinkTarget(href, cwd) {
  const file = responseFileReference(href);
  if (file) return { kind: 'file', file, openable: chipPathOpenable(file.path, cwd) };
  const url = normalizeHttpUrl(href);
  return url ? { kind: 'external', href: url } : { kind: 'plain' };
}

// Shorten only a plain URL label naming its own target, preserving escapes.
const head = (chars, size) => {
  let text = chars.slice(0, Math.max(0, size)).join('');
  return text.replace(/%(?:[a-f\d])?$/i, '');
};
function middle(chars, size) {
  if (chars.length <= size) return chars.join('');
  const count = Math.max(0, size - 1), first = Math.ceil(count / 2);
  let start = chars.length - (count - first);
  if (chars[start - 1] === '%') start += 2;
  else if (chars[start - 2] === '%') start += 1;
  return head(chars, first) + '…' + chars.slice(start).join('');
}
function shortenPath(chars, size) {
  const text = chars.join(''), slash = Math.max(text.lastIndexOf('/', text.length - 2), 0);
  const parent = Array.from(text.slice(0, slash)), leaf = Array.from(text.slice(slash));
  if (!parent.length) return middle(leaf, size);
  const leafBudget = Math.min(leaf.length, 48);
  if (parent.length + leafBudget <= size) return parent.join('') + middle(leaf, size - parent.length);
  const end = middle(leaf, Math.min(leafBudget, Math.max(2, size - 8)));
  let beginning = head(parent, Math.max(0, size - Array.from(end).length - 1));
  const boundary = beginning.lastIndexOf('/');
  if (boundary > 0) beginning = beginning.slice(0, boundary + 1);
  return beginning + '…' + end;
}
export function responseUrlLabel(label, href) {
  const value = label.trim();
  if (value.length <= 200 || !/^https?:\/\//i.test(value) || !/^https?:\/\//i.test(href) || /\s/.test(value) || (value !== href && decodeUri(value) !== decodeUri(href))) return null;
  let url; try { url = new URL(value); } catch { return null; }
  if (url.username || url.password) return null;
  const withoutScheme = value.replace(/^https?:\/\//i, ''), prefix = url.protocol === 'http:' ? 'http://' : '';
  const authority = withoutScheme.slice(0, url.host.length), tail = withoutScheme.slice(url.host.length);
  if (authority.toLowerCase() !== url.host || (tail && !/^[/?#]/.test(tail)) || Array.from(prefix + withoutScheme).length <= 200) return null;
  const host = authority.length > 80 ? '…' + authority.slice(-80) : authority;
  const available = 120 - prefix.length - host.length;
  const queryAt = tail.indexOf('?'), hashAt = tail.indexOf('#');
  const split = queryAt >= 0 && (hashAt < 0 || queryAt < hashAt) ? queryAt : -1;
  const path = Array.from(split < 0 ? tail : tail.slice(0, split)), query = Array.from(split < 0 ? '' : tail.slice(split));
  const queryHint = query.length <= 2 ? query.join('') : '?…';
  const remainder = path.length + Math.min(query.length, 2) <= available
    ? path.join('') + (query.length <= available - path.length ? query.join('') : head(query, available - path.length - 1) + '…')
    : shortenPath(path, available - queryHint.length) + queryHint;
  const points = Array.from(value);
  return { label: prefix + host + remainder, title: points.length > 600 ? points.slice(0, 600).join('') + '…' : value };
}

// GitHub PR/issue reference chips (markdown-current.js:3580-3687 Ps/Fs/Is/Ls/
// Rs/zs/Bs/Vs/Us/Ws/Gs/Ks; host helpers c03935b01 Lr/Br/zr/Vr). The source
// also resolves GitLab hosts for links, but only github.com becomes a chip.
const FORGE_URL = /^https?:\/\/([^/]+)\/([^/]+)\/([^/]+)\/(issues|pull)\/(\d{1,9})\b/;
const forgeHost = host => host.toLowerCase().replace(/^www\./, '');
function forgeRefOf(text) {
  const match = FORGE_URL.exec(text);
  return match ? { host: forgeHost(match[1]), owner: match[2], repo: match[3], kind: match[4], number: Number(match[5]) } : null;
}
const ENCODED_SEPARATOR = /%(?:2f|5c|2e)/i, FORGE_SEGMENT = /^[\w.-]+$/;
/** Ps: {host, owner, repo, kind: 'pull'|'issues', number} of a github.com PR/issue URL, else null
 * (ports, credentials, '.'/'..' and encoded separators after the number are refused). */
export function responseForgeRef(href) {
  if (typeof href !== 'string') return null;
  const ref = forgeRefOf(href);
  if (ref === null || ref.host !== 'github.com') return null;
  let url; try { url = new URL(href); } catch { return null; }
  const [, owner, repo, kind, number, ...rest] = url.pathname.split('/');
  return url.username === '' && url.password === '' && url.port === '' && forgeHost(url.hostname) === ref.host
    && owner === ref.owner && repo === ref.repo && FORGE_SEGMENT.test(owner) && FORGE_SEGMENT.test(repo)
    && kind === ref.kind && number === String(ref.number)
    && !rest.some(segment => segment === '.' || segment === '..' || ENCODED_SEPARATOR.test(segment)) ? ref : null;
}
// Fs: what follows /{kind}/{number}.
function forgeTail(href) {
  let url; try { url = new URL(href); } catch { return null; }
  const rest = url.pathname.split('/').slice(5);
  if (rest.at(-1) === '') rest.pop();
  return { rest, search: url.search, hash: url.hash };
}
const FORGE_DETAILS = new Set(['files', 'commits', 'checks']);
const FORGE_HASH_DETAILS = [[/^#issuecomment-\d+$/, 'comment'], [/^#discussion_r\d+$/, 'comment'], [/^#pullrequestreview-\d+$/, 'review']];
/** Rs + zs + Ks: '#N' in the session's own repo, else 'owner/repo#N'; deep links add '(files)' etc. */
export function forgeRefLabel(href, ref, sameRepo) {
  const short = sameRepo ? `#${ref.number}` : `${ref.owner}/${ref.repo}#${ref.number}`;
  const tail = forgeTail(href);
  let detail = null;
  if (tail !== null && tail.search === '') {
    if (tail.rest.length > 0) detail = FORGE_DETAILS.has(tail.rest[0]) ? tail.rest[0] : null;
    else detail = FORGE_HASH_DETAILS.find(([pattern]) => pattern.test(tail.hash))?.[1] ?? null;
  }
  return detail ? t(FORGE_DETAIL_LABELS[detail], { ref: short }) : short;
}
// c19e90103 Hv / Wv (57GAFzx/pK, YqdISDo0z0, HkLD3UV/tV, ZG4cO9soIo, aNmw4VDSAZ): the deep link's label, translated.
const FORGE_DETAIL_LABELS = Object.freeze({ files: '{ref} (files)', commits: '{ref} (commits)', checks: '{ref} (checks)',
  comment: '{ref} (comment)', review: '{ref} (review)' });
/** En() comparison: the session repo slug ('owner/repo', lowercased) names this reference's repo. */
export function forgeRefSameRepo(ref, repoSlug) {
  return !!repoSlug && repoSlug === `${ref.owner}/${ref.repo}`.toLowerCase();
}
/** The lowercased 'owner/name' of a repo identity (main.cjs repo-identities), '' when it has no owner. */
export function forgeRepoSlug(identity) {
  return identity?.owner && identity?.name ? `${identity.owner}/${identity.name}`.toLowerCase() : '';
}
// Us: the source trims only ASCII whitespace.
const trimAscii = text => text.replace(/^[ \t\n\r\f]+|[ \t\n\r\f]+$/g, '');
const FORGE_SHORT_LABEL = /^(?:([\w.-]+)\/([\w.-]+))?#(\d{1,9})$/;
/** Gs: a label the chip may replace (empty, '#N', 'owner/repo#N' or the same reference's URL). */
export function forgeRefLabelMatches(label, ref) {
  const text = trimAscii(String(label ?? ''));
  if (text === '') return true;
  if (/\s/.test(text)) return false;
  const short = FORGE_SHORT_LABEL.exec(text);
  if (short) return short[3] === String(ref.number) && (short[1] === undefined
    || (short[1].toLowerCase() === ref.owner.toLowerCase() && short[2].toLowerCase() === ref.repo.toLowerCase()));
  const other = forgeRefOf(text);
  return other !== null && other.host === ref.host && other.number === ref.number
    && other.owner.toLowerCase() === ref.owner.toLowerCase() && other.repo.toLowerCase() === ref.repo.toLowerCase();
}
