// Host adapters for src/generated/app-switch (scripts/extract-app-switch.mjs). Each export answers one import of the
// original 2.42304.0 chunks that reads a runtime service of the official desktop app.
import { useStartIntl } from './source-code-start-adapters.jsx';

// vendor-intl `p` (react-intl useIntl): the local catalog. useStartIntl formats the official descriptor
// ({defaultMessage, id}) after t() looks up the zh-CN entry, with the same placeholders ({tab}).
export const useIntl = useStartIntl;
