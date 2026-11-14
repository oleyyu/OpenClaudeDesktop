import React from 'react';
import './source-switch.css';

// shared-frame Qv: controlled CDS switch. Persistence belongs to the caller.
// A menu may use the decorative variant inside its own checkbox item.
export function SourceSwitch({ label, checked = false, disabled = false, onChange, decorative = false, size }) {
  const data = { className: 'ss-switch cds-reset', 'data-cds': 'Switch',
    'data-size': size && size !== 'base' ? size : undefined,
    'data-checked': checked || undefined, 'data-disabled': disabled || undefined };
  const thumb = <span className="ss-switch-knob" data-checked={checked || undefined}/>;
  if (decorative) return <span {...data} aria-hidden="true">{thumb}</span>;
  return <button {...data} type="button" role="switch" aria-label={label} aria-checked={checked} disabled={disabled}
    onMouseDown={event => {
      // Qv -> Va -> Ba: only prevent selection caused by repeated left clicks.
      if (event.button === 0 && event.detail > 1) event.preventDefault();
    }}
    onKeyDown={event => { if (event.key === 'Enter' && event.repeat) event.preventDefault(); }}
    onClick={() => onChange?.(!checked)}>{thumb}</button>;
}
