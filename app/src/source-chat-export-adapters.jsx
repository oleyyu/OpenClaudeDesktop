// Host answers for src/generated/chat-export (scripts/extract-chat-export.mjs, w13-chatfn-history): the 3.6556.2 export
// dialog's date range (c71ba149d DateRangeSelector) reads react-intl's useIntl / FormattedMessage (vendor-intl p / l).
// Here they are the local catalog's react-intl, the same ones the start card and the usage countdown use
// (source-code-start-adapters.jsx: the English message is looked up in zh-CN by t()).
import { StartMessage } from "./source-code-start-adapters.jsx";
import { dictionary } from "../electron/i18n/index.mjs";
export { useStartIntl as useIntl } from "./source-code-start-adapters.jsx";

// w13-close-main-jsx-tests (zh "To" context): the catalog is keyed by the English text, and the range's "From" /
// "To" (H9/0QD/PB9, xdBzfNZWw7; ja-JP 開始日 / 終了日) share it with the email card's headers (mcp-app-card cfdfec14c
// "To" AEtSiuVhQb, ja-JP 宛先). An entry keyed "<English>|<message id>" is that message's own translation; without one
// the plain English entry applies as before.
const inContext = (message) => {
  const table = dictionary(), key = `${message.defaultMessage}|${message.id}`;
  return table && Object.hasOwn(table, key) ? { ...message, defaultMessage: table[key] } : message;
};
export function FormattedMessage(props) {
  return <StartMessage {...inContext(props)} />;
}
