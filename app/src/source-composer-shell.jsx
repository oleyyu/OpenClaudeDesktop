// R3-composer step 3 (composer-shell, research/composer.md §4.2, ledger composer-01 / composer-03): the Code card on the
// original 2.42304.0 CDS ChatComposer shell — shared-5 Af with its parts jf (generated chat-composer-shell.mjs) — around the
// local ProseMirror editor.
//
// The official Code card (c227f4d5e uM) renders `lc` = shared-5 bp = Object.assign(yp, jf): yp hands Af its editor
// contract (hasDraftText, draftStoreKey, minLines, disabled, onMeasureTarget, extraEditorAttributes, focus, storeCaret,
// handoffCard, trailingNotch "float", render) and renders shared-9's lazily loaded tiptap ChatComposerEditorImpl (cm)
// through gp. The host has no tiptap: SourceComposerShell transcribes yp for the local editor, and ComposerShellEditor
// transcribes gp / cm's box — the `div.relative.min-w-0` > `div[data-cds=ChatComposerEditor]` that wears shared-26 qa /
// Ia / $m (editorClass, editorSizeStyle, proseMirrorContentClass) with the layout context's startInset and the settled
// glide, the ProseMirror element inside it reported to the shell as its measure target (multiline fit, --cmp-wrap-h), the
// imperative handle Df's focus goes through, and the content report (Wa) the shell's send state reads.
//
// R4g-composer CP2 (X7-08): the placeholder is cm's now — the `span[data-composer-placeholder]` over the editor box
// (shared-26 $a: absolute, the row's type and padding, the fit box Ya — one truncated line for "clamp", wrapping for
// "grow" —, the start inset, the trailing reserve while the card is one row, text-muted; shared-28 Jx's elementtiming)
// with shared-5 Xf's resolved copy, and for the "grow" fit one invisible `[data-composer-placeholder-ghost]` per line
// (shared-26 Qa, shared-5 Yf) stacked with the editor in the box's grid (eo), which is what gives a wrapping placeholder
// its height and what the shell's --cmp-wrap-h measure reads. The local editor no longer gets the copy (no
// data-placeholder, so its own ::before stays empty); it carries data-doc-empty like shared-28's docEmptyAttribute.
//
// Host differences (R3-composer report §1 step 3, CP2 report): the visually-empty test is the host draft text (cm: an
// empty doc whose only block is a paragraph, so an empty code block shows no placeholder there); data-doc-empty is
// rendered by React with the draft rather than set per transaction; no rotating phrase sets (shared-5 Zf's framer-motion
// crossfade: the host passes plain strings and has no framer-motion) and no draft reserve stand-in (sa); there is no
// draft-store swap, no hydration policy and no mention extension (the local editor has its own); handoffCard
// (framer-motion) is not passed, so the shell never animates a card hand-off (only used with `motion`, which the Code
// card does not pass).
//
// R4g-composer CP5 (X7-11): uM renders three lc.Overlay parts; the middle one, `Je ? D(sc, {getEditor, text: Xe,
// className: Bo(oM, U && "font-mono")}) : null`, is shared-5 XO — the dictation "Listening..." line (Je = shared-5 HO: a
// dictation session owns this editor) — not a keyword / bash highlight. The host has no dictation (Code passes
// hideDictation, see source-composer-dictation), so Je is never true and the overlay is never drawn; jf's Overlay (qd)
// renders nothing without children, so leaving it out is the same DOM. The host's "ultracode" keyword mark is a
// ProseMirror inline decoration inside the editor (source-composer-editor.jsx keywordPlugin), a host feature the
// 2.42304.0 renderer does not have (ultracode is an effort level there); it never stacks with an overlay.
import React, { cloneElement, forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  ChatComposerParts, ChatComposerShell, chatComposerFormPlaceholder, placeholderGhostLines, useChatComposerFocusRef, useResolvedPlaceholder,
} from './generated/code-composer/chat-composer-shell.mjs';
import {
  ChatComposerLayoutContext, SendPinContext, editorClass, editorSizeStyle, placeholderGhostProps, placeholderProps, proseMirrorContentClass,
  resolvePlaceholderFit, stackedEditorClass,
} from './generated/code-composer/chat-composer-layout.mjs';
import { placeholderElementTiming } from './generated/code-composer/chat-composer-placeholder-timing.mjs';
import { cdsClassNames } from './generated/view-tabs/shared-frame-BfjMqbuN.js';

/** jf: Header / Attachments / Actions / PrimaryAction / Chin / Overlay / Tray (bp carries them as statics). */
export const ComposerShellParts = ChatComposerParts;

/**
 * shared-5 yp for the local editor. `editor` is the host's half of the contract: what the shell reads (hasDraftText,
 * draftStoreKey, minLines, disabled, onMeasureTarget, extraEditorAttributes) and what yp passes on to its editor
 * (everything else, e.g. the editor node, className, maxHeight, placeholder), as `{...n, ...e}` does.
 */
export const SourceComposerShell = forwardRef(function SourceComposerShell({ variant = 'default', dropScope = 'card', editor, editorRef, ...props }, ref) {
  // yp: `let { ref: o, focus: s, handle: c } = Df(r)`.
  const { ref: handleRef, focus, handle } = useChatComposerFocusRef(editorRef);
  // yp `l` = vp(c.current?.getEditor(), node, offset): the caret the shell resolved from a click goes where it pointed.
  const storeCaret = useCallback((node, offset) => { handle.current?.placeCaretAtDom(node, offset); }, [handle]);
  const formPlaceholder = chatComposerFormPlaceholder(props.form);
  const shellEditor = {
    hasDraftText: editor.hasDraftText,
    draftStoreKey: editor.draftStoreKey,
    minLines: editor.minLines,
    disabled: editor.disabled,
    onMeasureTarget: editor.onMeasureTarget,
    extraEditorAttributes: editor.extraEditorAttributes,
    focus,
    storeCaret,
    trailingNotch: 'float',
    render: (shellProps) => <ComposerShellEditor ref={handleRef} {...editor} placeholder={editor.placeholder ?? formPlaceholder} {...shellProps} />,
  };
  return <ChatComposerShell ref={ref} {...props} variant={variant} dropScope={dropScope} editor={shellEditor} />;
});

const defined = (attributes) => Object.fromEntries(Object.entries(attributes ?? {}).filter(([, value]) => value !== undefined));

/**
 * shared-5 Zf (cm's `c(da, {resolved: ye})`): a plain placeholder is its text. The rotating branch (an object placeholder's
 * phrases crossfading through framer-motion AnimatePresence / motion.span) is not transcribed: the host has no
 * framer-motion and its composer passes strings only, so an object placeholder would show its current phrase unanimated.
 */
function ResolvedPlaceholder({ resolved }) {
  return resolved.text;
}

/**
 * gp / cm's box around the local editor. `node` is the SourceComposerEditor element; it is rendered inside the
 * ChatComposerEditor box (its own data-cds dropped: the box carries it, as cm's EditorContent does) with the shell's
 * disabled state, the extra attributes the shell merged (cm puts them on the ProseMirror element), autoHeight off (the
 * box scrolls: max-h-96 and the maxHeight style) and its element reported to the shell's onMeasureTarget. The
 * placeholder is cm's span before the box and, for the "grow" fit, its ghost lines inside it (see the header).
 */
export const ComposerShellEditor = forwardRef(function ComposerShellEditor({
  node, className, minLines, maxHeight, disabled, placeholder = '', placeholderClassName, placeholderFit, hasText, onMeasureTarget, extraEditorAttributes,
}, ref) {
  const { multiline, startInset, glideArmed, columnReservesTrailing } = useContext(ChatComposerLayoutContext);
  const reportContent = useContext(SendPinContext);
  const element = useRef(null);
  // gp's handle (focus / getEditor / setContent / getIsAtStart / getIsAtEnd / scrollToEnd / getCursorOffset) on the host
  // element: focus keeps the selection (EditorView.focus), the edges are the host caretAtEdge, the offset its selection.
  useImperativeHandle(ref, () => ({
    focus: () => element.current?.focus(),
    getElement: () => element.current,
    getIsAtStart: () => element.current?.caretAtEdge?.('start'),
    getIsAtEnd: () => element.current?.caretAtEdge?.('end'),
    getCursorOffset: () => element.current?.selectionStart ?? 0,
    scrollToEnd: () => requestAnimationFrame(() => requestAnimationFrame(() => {
      const input = element.current;
      if (!input?.isConnected) return;
      input.setSelectionRange?.(input.value.length);
      const box = input.parentElement;
      if (box) box.scrollTop = box.scrollHeight;
    })),
    placeCaretAtDom: (target, offset) => element.current?.placeCaretAtDom?.(target, offset),
  }), []);
  // cm: `Ae` turns true a frame after mount (hydrated), and the box's transitions run only once settled (`Me = Ae && U`).
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setHydrated(true));
    return () => cancelAnimationFrame(id);
  }, []);
  // cm: `de?.(Eo(e).trim().length > 0)` on every document change — the shell's hasContent (kf) follows the draft.
  useEffect(() => { reportContent?.(!!hasText); }, [reportContent, hasText]);
  const inputRef = useCallback((input) => {
    element.current = input;
    node.props.inputRef?.(input);
    onMeasureTarget?.(input);
  }, [node.props.inputRef, onMeasureTarget]);
  const settled = hydrated && glideArmed;
  // cm `fe && W` (the document is visually empty: no text, one paragraph): the host draft holds no text.
  const visuallyEmpty = !hasText;
  // cm `ye = Xi(u, fe && W)`: the resolved copy (phrases rotate only while the editor is empty).
  const resolved = useResolvedPlaceholder(placeholder, visuallyEmpty);
  // cm `Ie = Rt(h, m)`, `Le = Ie === "grow" ? Qi(u) : []`, `ze = Le.map(e => c("span", {...jt({text: e, multiline: V,
  // reserveTrailing: !ue})}, e))`: one invisible ghost per placeholder line, its text drawn by the sheet's
  // `[data-composer-placeholder-ghost]:before { content: attr(…) }`.
  const fit = resolvePlaceholderFit(minLines, placeholderFit);
  const ghosts = (fit === 'grow' ? placeholderGhostLines(placeholder) : [])
    .map((text) => <span key={text} {...placeholderGhostProps({ text, multiline, reserveTrailing: !columnReservesTrailing })} />);
  return <div className="relative min-w-0">
    {visuallyEmpty && resolved.text ? <span data-composer-placeholder="" aria-hidden="true" {...placeholderElementTiming}
      {...placeholderProps({ multiline, minLines, maxHeight, placeholderFit: fit, startInset, disabled, settled, reserveTrailing: !columnReservesTrailing, className: placeholderClassName })}>
      <ResolvedPlaceholder resolved={resolved} />
    </span> : null}
    <div data-cds="ChatComposerEditor"
      className={editorClass({ startInset, disabled, settled, className: cdsClassNames(proseMirrorContentClass, ghosts.length > 0 && stackedEditorClass, className) })}
      style={editorSizeStyle(minLines, maxHeight)}>
      {cloneElement(node, { ...defined(extraEditorAttributes), inputRef, 'data-cds': undefined, disabled, autoHeight: false,
        placeholder: undefined, 'data-doc-empty': visuallyEmpty ? 'true' : 'false' })}
      {ghosts}
    </div>
  </div>;
});
