import React, { useMemo, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Icon } from './icons.jsx';
import { SourceTooltip } from './source-tooltip';
import { skillFilePreview, skillFileIsLarge, skillFieldLabel, skillSourceLines } from './skill-file-model.mjs';
import { responseLinkTarget } from './response-link-model.mjs';
import { DocumentPre } from './source-document-code.jsx';
import { t } from '../electron/i18n/index.mjs';
import './source-skill-file.css';

function FileLink({ href, children }) {
  const target = responseLinkTarget(href);
  if (target.kind !== 'external') return <>{children}</>;
  const open = event => {
    event.preventDefault();
    if (event.button === 0 || event.button === 1) window.desktop?.call('external', { url: target.href }).catch(() => {});
  };
  return <a href={target.href} target="_blank" rel="noreferrer" onClick={open} onAuxClick={open}>{children}</a>;
}

// Images require the separate authenticated file/image preview capability;
// this single-file surface preserves their alt text without a network fetch.
const components = { a: FileLink, img: ({ alt }) => <span>{alt}</span>, pre: DocumentPre };

export function SkillMarkdown({ content }) {
  return <div className="skf-markdown"><Markdown remarkPlugins={[remarkGfm]} components={components} skipHtml>{content}</Markdown></div>;
}

export function SkillSource({ content }) {
  const lines = useMemo(() => skillSourceLines(content), [content]);
  const digits = Math.max(3, String(lines.length).length);
  return <div className="skf-source" tabIndex={0} aria-label={t("SKILL.md source")} style={{ '--skf-number-width': `${digits * .6 + .5}rem` }}>
    {lines.map((line, index) => <div className="skf-source-line" key={index}>
      <span className="skf-line-number" aria-hidden="true">{index + 1}</span>
      <span className="skf-line-sign" aria-hidden="true"> </span>
      <div className="skf-line-body"><code data-skill-source-line="">{line || <span aria-hidden="true">{'\u00a0'}</span>}</code>{'\n'}</div>
    </div>)}
  </div>;
}

export function SourceSkillFile({ content }) {
  const [mode, setMode] = useState('normal');
  const large = useMemo(() => skillFileIsLarge(content), [content]);
  const preview = useMemo(() => skillFilePreview(content), [content]);
  return <section className="skf-card" data-skill-file="" data-file-mode={mode}>
    <div className="skf-toolbar">
      <div className="skf-modes" role="radiogroup" aria-label={t("File view mode")} data-cds="SegmentedControl" data-size="sm"
        onKeyDown={event => {
          if (event.altKey || event.ctrlKey || event.metaKey) return;
          let next;
          if (event.key === 'Home') next = 'normal';
          else if (event.key === 'End') next = 'raw';
          else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) next = mode === 'normal' ? 'raw' : 'normal';
          if (!next) return;
          event.preventDefault();
          setMode(next);
          event.currentTarget.querySelector(`[data-mode-value="${next}"]`)?.focus();
        }}>
        <span className="skf-thumb" aria-hidden="true" data-raw={mode === 'raw' || undefined} />
        {[['normal', t('Preview'), 'Eye'], ['raw', t('Code'), 'Code']].map(([value, label, icon]) =>
          <SourceTooltip key={value} content={label} hoverable={false}>
            <button type="button" role="radio" aria-label={label} aria-checked={mode === value}
              tabIndex={mode === value ? 0 : -1} data-mode-value={value}
              onClick={() => setMode(value)}><Icon name={icon} size={16} aria-hidden="true" /></button>
          </SourceTooltip>)}
      </div>
    </div>
    <div className="skf-scroll scroll-fade-y scroll-fade-size-6">
      {large ? <div className="skf-large">
        <p className="skf-large-note">{t("Showing this large file as plain text to keep the page responsive. The full content is still here.")}</p>
        <pre tabIndex={0} aria-label={t("SKILL.md source")}>{content}</pre>
      </div> : mode === 'raw' ? <SkillSource content={content} /> :
        <div className="skf-preview" tabIndex={preview.structured ? undefined : 0}>
          {preview.fields.length > 0 && <div className="skf-metadata">{preview.fields.map((field, index) =>
            <React.Fragment key={index}><h3>{skillFieldLabel(field.key)}</h3><p>{field.value}</p></React.Fragment>)}</div>}
          {preview.content && <SkillMarkdown content={preview.content} />}
        </div>}
    </div>
  </section>;
}
