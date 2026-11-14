// Host adapters for src/generated/chat-markdown (scripts/extract-chat-markdown.mjs; the generator checks each original
// declaration's features before it points the slice here). OpenClaude has no claude.ai account and no Statsig (plan-w13
// E59): the Mermaid gate and the spotlight dynamic config read their defaults, and the highlighter is the host's shiki
// service (the same one the Code fence uses) instead of the official worker / in-page engines.
import React, { createContext, useContext, useId, useRef, useSyncExternalStore } from 'react';
import { useSettledHighlight } from './use-settled-highlight.mjs';
import { useStreamHighlight } from './use-stream-highlight.mjs';
import { tokenCSS } from './highlight-model.mjs';

// shared-10 Bu's `codeStyle` (Lu dark / Ru light), handed in by the host (source-chat-markdown.jsx calls the generated
// useCodeBlockTheme and provides it), so this adapter never imports the generated graph back.
export const ChatCodeStyleContext = createContext(null);

// shared-10 Ks / qs: a fence language becomes `language-<id>` only when it is 1–64 of [\w#+-].
const LANGUAGE_ID = /^[\w#+-]{1,64}$/;
const languageClass = (language) => (typeof language === 'string' && LANGUAGE_ID.test(language) ? `language-${language}` : undefined);

// shared-10 lf: the code body inside Eb, `s(h, { className: r, style: { ...R, ...c }, children: s("code", { ...J, style:
// { ...J.style, whiteSpace: g ? "pre-wrap" : "pre" }, children: q }) })` with J = `l ?? { className: qs(n), style: ee }`
// (plus codeTagClassName), R / ee the theme's pre / code rules, and q the shiki lines (plain text without a language or
// before the grammar is ready). Here the tokens come from the host's shiki service (stream tokens while the fence grows,
// settled tokens after), each a text span with its own colour, never innerHTML.
export function ChatSyntaxHighlighter({ children = '', language, className, PreTag = 'pre', customStyle, codeTagProps, codeTagClassName,
  wrapLongLines = false, streaming = false }) {
  const text = typeof children === 'string' ? children : '';
  const codeStyle = useContext(ChatCodeStyleContext);
  const codeRef = useRef(null);
  const scopeKey = useId();
  const lang = language || 'text';
  const stream = useStreamHighlight({ text, language: lang, isFrontier: streaming, languageSettled: true, scopeKey });
  const settled = useSettledHighlight({ text, language: lang, isFrontier: streaming, languageSettled: true, scopeKey,
    held: stream.retained, isHeld: stream.isHeld }, codeRef);
  const tokens = language ? stream.tokens ?? (stream.retained ? null : settled) : null;
  const trailing = stream.tokens ? text.slice(stream.coveredText.length) : '';
  const codeRule = codeStyle?.['code[class*="language-"]'], preRule = codeStyle?.['pre[class*="language-"]'];
  const tag = codeTagProps ?? { className: languageClass(language), style: codeRule };
  const code = codeTagClassName ? { ...tag, className: [tag.className, codeTagClassName].filter(Boolean).join(' ') } : tag;
  return <PreTag className={className} style={{ ...preRule, ...customStyle }}>
    <code {...code} ref={codeRef} style={{ ...code.style, whiteSpace: wrapLongLines ? 'pre-wrap' : 'pre' }}>
      {tokens ? [...tokens.map((token, index) => <span key={index} style={tokenCSS(token)}>{token.text}</span>), trailing || null] : text}
    </code>
  </PreTag>;
}

// shared-10 xb: the Mermaid diagram Eb draws for a `mermaid` fence when claude_ai_markdown_mermaid_render is on. That
// gate reads off here (shared-25 fs → useFeatureIsOn), so Eb keeps the fence as code; this answer is never reached.
export function ChatMermaidDiagram({ code = '' }) {
  return <pre dir="ltr"><code>{code}</code></pre>;
}

// shared-10 Cb: the zod schema of claude_code_spotlight_code_viewed_signal.languages; the dynamic config is never
// read here (below), so no schema is needed.
export const spotlightLanguagesSchema = null;

// shared-25 zs (Hh): a Statsig dynamic config value; without Statsig every key answers its fallback (Eb passes Sb = []).
export function useChatDynamicConfigValue(name, key, fallback) { return fallback; }

// shared-25 OH (In): the localStorage write of the spotlight "code viewed" timestamp; the spotlight languages list is
// empty, so Eb never asks, and nothing is written.
export function setChatLocalValue() {}

// shared-frame Ga (jd): the resolved colour scheme of the theme store (Sa, default Ca with no snapshot). The host's
// resolved mode is html[data-mode] ("light" / "dark" from the appearance setting), else prefers-color-scheme, as the
// loaded CSS reads it (same rule as source-mcp-app-host-adapters.jsx resolvedHostMode).
function resolvedMode() {
  const win = globalThis.window;
  const mode = win?.document?.documentElement?.dataset?.mode;
  if (mode === 'light' || mode === 'dark') return mode;
  return win?.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function subscribeMode(onChange) {
  const win = globalThis.window;
  if (!win?.document || typeof win.MutationObserver !== 'function') return () => {};
  const observer = new win.MutationObserver(onChange);
  observer.observe(win.document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  const media = win.matchMedia?.('(prefers-color-scheme: dark)');
  media?.addEventListener?.('change', onChange);
  return () => { observer.disconnect(); media?.removeEventListener?.('change', onChange); };
}
export function useChatColorScheme() {
  return useSyncExternalStore(subscribeMode, resolvedMode, () => undefined);
}
