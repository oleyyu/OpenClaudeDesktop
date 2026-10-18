// R4e-envbranch (home-15): Te's missing-branch warning text. The descriptor is the original FA.branchMissing (2.42304.0
// cc0051c10 94ae6MV2dl, generated/r4e-envbranch/start-branch-missing.mjs); as with the start card's messages
// (source-code-start-adapters.jsx useStartIntl), the English ICU source is looked up in the local catalog by t() (zh-CN)
// and formatted by the bundle's react-intl createIntl, so the known/saved selects pick the same sentences as official
// u.formatMessage(FA.branchMissing, {branch, known, fallback, saved}). Callable outside render (the warning is raised
// from selectBranch's async check).
import { kt as createIntl } from './generated/chat/vendor-intl-Cf4IuK3L.js';
import { getLocale, t } from '../electron/i18n/index.mjs';
import { branchMissingMessage } from './generated/r4e-envbranch/start-branch-missing.mjs';
import { branchMissingValues } from './branch-picker-model.mjs';

let cached = null;
const intlFor = locale => {
  if (cached?.locale !== locale) cached = { locale, intl: createIntl({ locale, defaultLocale: locale, messages: {} }) };
  return cached.intl;
};
/** { message, key }: the warning toast's text and its uniqueKey (`branch-missing:<branch>`). */
export function branchMissingNotice({ branch, fallback, savedBranch }) {
  const { values, uniqueKey } = branchMissingValues({ branch, fallback, savedBranch });
  const message = intlFor(getLocale()).formatMessage({ ...branchMissingMessage, defaultMessage: t(branchMissingMessage.defaultMessage) }, values);
  return { message: String(message), key: uniqueKey };
}
