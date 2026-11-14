// Host adapters for src/generated/app-switch (scripts/extract-app-switch.mjs). Each export answers one import of the
// original 3.6556.2 chunks that reads a runtime service of the official desktop app.
import { useStartIntl } from './source-code-start-adapters.jsx';

// vendor-intl `p` (react-intl useIntl): the local catalog. useStartIntl formats the official descriptor
// ({defaultMessage, id}) after t() looks up the zh-CN entry, with the same placeholders ({tab}).
export const useIntl = useStartIntl;

// shared-52 `og` (th, `eh().parts.includes(e)`): a fizzy-lake part is on only when the root's data-cds-fizzy-lake
// attribute names it and the allow-list Qm has it. 3.6556.2 ships `Qm = []` and the host keeps fizzy-lake off (E12/R15:
// it never writes the attribute), so every part is off, as the original answers here.
export const isFizzyLakePart = () => false;
