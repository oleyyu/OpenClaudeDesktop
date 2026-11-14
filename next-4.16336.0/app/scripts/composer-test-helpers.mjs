// Claude2.2553.1 shared-14 fN:18576 / setEditable:19954 use a real document
// editor. Native keyboard selection is observable to PM; Playwright.fill's
// immediate DOM Range + Delete can outrun its selectionchange handling.
// This helper does not inject editor state or change any expected draft text.
// In the Code card the CDS shell's box (source-composer-shell.jsx) is the div[data-cds=ChatComposerEditor] and has no
// value; the draft is read from the editor the text went into.
export async function fillComposer(page,editor,text) {
 await editor.focus();await editor.press('Meta+A');await editor.press('Backspace');
 if(text)await page.keyboard.insertText(text);
 await page.waitForFunction(([node,text])=>node.value===text,[await editor.elementHandle(),text]);
}
