// Host answers for src/generated/usage-countdown (scripts/extract-usage-countdown.mjs, W12b w12b-usage-notices): the
// 3.6556.2 usage-limit band's live reset countdown (c227f4d5e QF / $F) reads react-intl's useIntl / FormattedMessage
// (vendor-intl p / l). Here they are the local catalog's react-intl, the same ones the start card and the working
// line use (source-code-start-adapters.jsx: the English message is looked up in zh-CN by t(); formatNumber is the real
// Intl formatter of the app locale, so "{duration}" reads "12 min" / "12分钟" like the desktop).
export { useStartIntl as useIntl, StartMessage as FormattedMessage } from "./source-code-start-adapters.jsx";
