// Shared Settings building blocks for pages that render their own groups
// (tabs with `page: Component`). SettingRow is the row the built-in pages use.
import React, { useId } from 'react';
import { t } from '../electron/i18n/index.mjs';

export function SettingRow({row,error}) {
 const label=useId(),description=useId();
 // V3-w11-sweep-shell-b: `row.className` is c71860c77 X's className (Or's Auto-open row passes "invisible" until loaded).
 return <div className={row.className?`${row.grid?'ss-grid-row':'ss-row'} ${row.className}`:(row.grid?'ss-grid-row':'ss-row')} role="group" aria-labelledby={label} aria-describedby={row.description&&!row.grid?description:undefined} data-setting-id={row.id} data-settings-row="" data-indent={row.indent||undefined}>
   <div className="ss-row-top"><div className="ss-row-copy"><div id={label} className={row.grid?'sr-only':'text-body'}><span className="settings-row-title">{row.label}</span></div>{row.description&&!row.grid&&<div id={description} data-settings-desc="">{row.description}</div>}</div>{row.control&&<div className="ss-control">{row.control}</div>}</div>{row.grid}
   {/* c71860c77:1820-1840: a failed save is muted body text in the row's below slot; the raw reason stays in the title (and the console). */}
   {(row.below||error)&&<div className="ss-row-below">{row.below}{error&&<span className="ss-row-error" title={error}>{t('Couldn’t save the setting. Try again.')}</span>}</div>}
 </div>;
}

export function SettingsGroup({title,rows=[],rowErrors={},children}) {
  return <section className="ss-group"><h3 tabIndex={-1} className="text-heading-semibold settings-row-title">{title}</h3><div className="settings-group-dividers">{rows.map(r=><SettingRow key={r.id} row={r} error={rowErrors[r.id]}/>)}{children}</div></section>;
}

export const settingRow=(id,label,description,control,extra={})=>({id,label,description,control,...extra});
