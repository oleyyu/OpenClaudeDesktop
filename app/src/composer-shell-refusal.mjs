// 3.6556.2 c227f4d5e lF in bash mode (`bashMode: t = true`, `runsAsShell: n = true`): a shell command takes plain text
// only. Walking the composer document (ProseMirror `descendants`), it is refused when
// - a text node carries any mark other than a bare link (hF: a link whose href is the text itself, or https:// / http://
//   in front of it, with every other attribute at its default — `t.type.name === Uo.name && !n` is false here);
// - a block other than a paragraph appears (`e.type.name !== "paragraph" && (n || !pF(e))`, n true): a code block;
// - any inline node other than a hard break appears (`a = t || …`, t true): an @-mention or a slash command / skill chip.
// The host schema (composer-editor-model.mjs) has the link, strike and inline-code marks, the code block, the mention and
// the command chip; `rcLocalTagChip` has no host counterpart. Pure: no DOM, no view.
const autoLinkMark = (mark, text) => {
  if (mark?.type?.name !== "link" || typeof text !== "string") return false;
  const href = mark.attrs?.href;
  if (href !== text && href !== `https://${text}` && href !== `http://${text}`) return false;
  const spec = mark.type.spec?.attrs ?? {};
  return Object.entries(mark.attrs ?? {}).every(([key, value]) => key === "href" || (value ?? null) === (spec[key]?.default ?? null));
};

export function shellPlainTextRefused(doc) {
  if (!doc || typeof doc.descendants !== "function") return false;
  let refused = false;
  doc.descendants((node) => {
    if (refused) return false;
    if (node.isText) {
      refused = !node.marks.every((mark) => autoLinkMark(mark, node.text));
      return false;
    }
    if (node.isBlock) {
      refused = node.type.name !== "paragraph";
      return !refused;
    }
    if (node.type.name === "hard_break") return false;
    refused = true;
    return false;
  });
  return refused;
}
