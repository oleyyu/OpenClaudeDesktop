// Rich-then-plain clipboard writer for message Copy. Mirrors the audited
// 2.2553.1 order (analysis/rich-copy-20260920/source-contract.md): when HTML is
// present, one ClipboardItem carrying text/plain + text/html is attempted and a
// throw is swallowed; a plain writeText follows; only a failing plain write
// reports false. Pure: the environment is passed in, never looked up globally.

/** Resolves the clipboard environment of the window owning `node`, falling
 * back to the global scope when the node has no window. */
export function clipboardEnvironment(node) {
  const scope = node?.ownerDocument?.defaultView ?? globalThis;
  return { clipboard: scope?.navigator?.clipboard, ClipboardItem: scope?.ClipboardItem, Blob: scope?.Blob };
}

export async function writeClipboardPayload({ clipboard, ClipboardItem, Blob } = {}, { text, html = '' } = {}) {
  if (!clipboard) return false;
  const plain = typeof text === 'string' ? text : '';
  if (html && typeof clipboard.write === 'function' && typeof ClipboardItem === 'function' && typeof Blob === 'function') {
    try {
      await clipboard.write([new ClipboardItem({
        'text/plain': new Blob([plain], { type: 'text/plain' }),
        'text/html': new Blob([html], { type: 'text/html' }),
      })]);
      return true;
    } catch {}
  }
  try {
    await clipboard.writeText(plain);
    return true;
  } catch {
    return false;
  }
}
