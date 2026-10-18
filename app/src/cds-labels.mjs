// R4i-graph GR2 (Y1-R3-graph-1): the CDS labels function the host gives CdsLabelsContext (view-tabs shared-frame `vn`).
//
// 2.42304.0: the app root (shared-23 UG / WG) renders CdsRoot with `labels: Ev()`; Ev is shared-104 `Bl`
//   function Bl(){let e=Ci();return w(()=>zl(e),[e])}
// zl(intl) answers (key, defaultMessage, params) through Rl, caching the parameterless answers by key + default:
//   function zl(e){let t=new Map;return(n,r,i)=>{if(i!==void 0)return Rl(e,n,r,i);let a=`${n}\0${r}`,…}}
// and Rl formats {...Fl[key] ?? {id:`cds.${key}`}, defaultMessage} with react-intl, except the four counted keys,
// which go through ICU plurals (Il: "{count, plural, one {# message} other {# messages}} queued. …", Ll: "… language(s)
// found"). CdsRoot (`Za`) chains its own labels before an outer provider's, and every CDS control reads them through
//   function Z(e,t,n){return bn(W(vn),e,t,n)}   function bn(e,t,n,r){return e?.(t,n,r)||yn(n,r)}
// so an empty answer falls back to the English default.
//
// Host adapter: the host has no react-intl and no message ids; its catalog (electron/i18n) is keyed by the English
// source string, which is exactly the call site's defaultMessage. So the labels function looks the default up with
// t() (placeholders filled by t, like formatMessage's values), and the counted keys pick the English singular/plural
// with tn(). The locale is fixed for the life of a renderer (changing it reloads the window), so one module-level
// function stands in for Bl's per-intl memo.
import { t, tn } from '../electron/i18n/index.mjs';

// Rl's counted keys: [singular, plural] English forms (Il / Ll split into the host's tn pair).
export const CDS_COUNTED_LABELS = Object.freeze({
  oneMessageQueuedStatus: ['1 message queued. Will send after the current response.', '{count} messages queued. Will send after the current response.'],
  nMessagesQueuedStatus: ['1 message queued. Will send after the current response.', '{count} messages queued. Will send after the current response.'],
  oneLanguageFound: ['1 language found', '{count} languages found'],
  nLanguagesFound: ['1 language found', '{count} languages found'],
});

/** Rl for the host: one CDS label in the active UI language. */
export function cdsLabel(key, defaultMessage, params, translate = t, translatePlural = tn) {
  const counted = Object.hasOwn(CDS_COUNTED_LABELS, key) ? CDS_COUNTED_LABELS[key] : null;
  if (counted) {
    // Il(e,1) / Ll(e,1) for the "one…" keys; the "n…" keys only when params.count is a finite number.
    if (key.startsWith('one')) return translatePlural(1, counted[0], counted[1]);
    const count = Number(params?.count);
    if (Number.isFinite(count)) return translatePlural(count, counted[0], counted[1]);
  }
  if (typeof defaultMessage !== 'string') return defaultMessage;
  return translate(defaultMessage, params);
}

/** zl for the host: the labels function, caching parameterless answers by `${key}\0${defaultMessage}`. */
export function createCdsLabels(translate = t, translatePlural = tn) {
  const cache = new Map();
  return (key, defaultMessage, params) => {
    if (params !== undefined) return cdsLabel(key, defaultMessage, params, translate, translatePlural);
    const id = `${key}\0${defaultMessage}`;
    const hit = cache.get(id);
    if (hit !== undefined) return hit;
    const value = cdsLabel(key, defaultMessage, undefined, translate, translatePlural);
    cache.set(id, value);
    return value;
  };
}

/** The app root's labels (the host's Ev()): CdsLabelsContext's value for every window. */
export const cdsLabels = createCdsLabels();
