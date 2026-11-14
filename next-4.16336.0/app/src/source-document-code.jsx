import React, { useLayoutEffect, useRef, useState } from 'react';
import { Icon } from './icons.jsx';
import { SourceTooltip } from './source-tooltip';
import { createClipboardFeedback } from './clipboard-feedback.mjs';
import { clipboardEnvironment, writeClipboardPayload } from './clipboard-payload.mjs';
import { documentCode, DOCUMENT_CODE_THEMES } from './document-code-model.mjs';
import { useSettledHighlight } from './use-settled-highlight.mjs';
import { tokenCSS } from './highlight-model.mjs';
import './source-document-code.css';
import './highlight-tokens.css';
import { t } from '../electron/i18n/index.mjs';

export function SourceDocumentCode({ text, className }) {
  const code = documentCode(text, className);
  const codeRef = useRef(null), controller = useRef(null);
  const [state, setState] = useState('idle');
  const tokens = useSettledHighlight({ text: code.text, language: code.language, languageSettled: true, isFrontier: false, themes: DOCUMENT_CODE_THEMES }, codeRef);
  useLayoutEffect(() => {
    const feedback = createClipboardFeedback({
      timeout: 2000, onState: setState,
      writeText: async value => {
        if (!await writeClipboardPayload(clipboardEnvironment(codeRef.current), { text: value })) throw Error('Clipboard unavailable');
      },
    });
    controller.current = feedback;
    return () => { controller.current = null; feedback.dispose(); };
  }, []);
  useLayoutEffect(() => { controller.current?.setText(code.text); }, [code.text]);
  return <div className="sdc-block" role="group" aria-label={code.language ? t('{language} code', { language: code.language }) : t('Code')} tabIndex={0}>
    <div className="sdc-track"><div className="sdc-actions">
      <SourceTooltip content={t("Copy")} side="bottom" hoverable={false}>
        <button type="button" className="sdc-copy" aria-label={t("Copy to clipboard")} aria-busy={state === 'pending' || undefined}
          onClick={() => { void controller.current?.copy(); }}>
          <Icon name={state === 'copied' ? 'Check' : 'Copy'} size={16} aria-hidden="true" />
        </button>
      </SourceTooltip>
      <span className="sr-only" role="status">{state === 'copied' ? t('Copied') : ''}</span>
    </div></div>
    {code.label && <div className="sdc-label">{code.label}</div>}
    <div className="sdc-scroll"><pre className="sdc-pre" data-wrap={code.wrap || undefined}>
      <code ref={codeRef} className="sdc-code" data-highlighted={!!tokens || undefined}>{tokens
        ? tokens.map((token, index) => <span key={index} data-code-token="" style={tokenCSS(token)}>{token.text}</span>)
        : code.text}</code>
    </pre></div>
  </div>;
}

export function DocumentPre({ children, node, ...props }) {
  const items = React.Children.toArray(children);
  const child = items[0];
  if (items.length === 1 && React.isValidElement(child) && typeof child.props.children === 'string')
    return <SourceDocumentCode text={child.props.children} className={child.props.className} />;
  return <pre {...props}>{children}</pre>;
}
