import React from 'react';
import { Icon } from './icons.jsx';
import { settingsMatchRange } from './settings-model.mjs';
import { t, tn } from '../electron/i18n/index.mjs';

function Match({ text, query }) {
  const match = settingsMatchRange(text, query);
  if (!match) return text;
  return <>{text.slice(0, match.start)}<span className="ss-search-match">{text.slice(match.start, match.end)}</span>{text.slice(match.end)}</>;
}

// cc011544b gt:720–830: section + optional via, indented child, or +N more.
// The parent label always identifies the destination; a solitary row is its
// subtitle, not an ungrouped replacement for the section.
// 3.6556.2 (menus C3): the popup's first child is the sr-only status line (hn pe: `p role=status sr-only`) that
// announces a "+N more" opened in place; always present, empty until one is.
export function SettingsSearchResults({ results, query, active, onSelect, onActive, announcement }) {
  return <div className="ss-search-results" aria-label={t('Settings search results')}>
    <p role="status" className="sr-only">{announcement}</p>
    {results.length ? results.map((result, index) => {
      const label = result.kind === 'more'
        ? tn(result.count, '{count} more match in {section}', '{count} more matches in {section}', { section: result.section })
        : result.id ? t('{label} in {section}', { label: result.label, section: result.section }) : result.section;
      return <button type="button" key={result.key} data-kind={result.kind}
        data-highlighted={index === active ? '' : undefined} aria-label={label}
        onMouseDown={event => event.preventDefault()} onMouseMove={() => onActive(index)} onClick={() => onSelect(result)}>
        {result.kind === 'hit' ? <span className="ss-search-hit">
          <span className="ss-search-heading"><Icon name={result.icon || 'Settings'} size={20}/><span><Match text={result.section} query={query}/></span></span>
          {result.via && <span className="ss-search-via"><Match text={result.via} query={query}/></span>}
        </span> : <span className="ss-search-child">{result.kind === 'child' ? <Match text={result.label} query={query}/> : t('+{count} more', { count: result.count })}</span>}
      </button>;
    }) : <div className="ss-search-empty"><Icon name="SearchCircle" size={28}/><span>{t('No matching settings')}</span></div>}
  </div>;
}
