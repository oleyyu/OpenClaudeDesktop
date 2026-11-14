import React, { useLayoutEffect, useRef } from 'react';
import { Icon } from './icons';
import { SourceTooltip } from './source-tooltip';
import { nextSegment } from './segments-model.mjs';
import { bindSegmentIndicator } from './segment-indicator.mjs';
import './source-segments.css';

// shared-7 SR. Settings rows use the default contained branch (track, p-px,
// raised thumb). variant "uncontained" (the Customize owner/status filters,
// customize-page-shell De :628-655, customize-connectors :3580-3600) drops the
// track for gap-[1px], keeps a full-height thumb ringed by --cds-border (xR)
// and gives the labels vR text-secondary with a ghost hover fill. size goes
// through shared-frame qr as data-size (the .cds-root [data-size] token remap).
export function SourceSegments({ label, value, options, onChange, disabled = false, variant = 'contained', size, className }) {
  const root = useRef(null), thumb = useRef(null), binding = useRef(null);
  useLayoutEffect(() => {
    binding.current = bindSegmentIndicator(root.current, thumb.current);
    return () => { binding.current?.dispose(); binding.current = null; };
  }, []);
  useLayoutEffect(() => { binding.current?.refresh(); });
  const available = options.filter(option => !option.disabled);
  const tabValue = available.some(option => option.value === value) ? value : available[0]?.value;
  const select = option => { if (!disabled && !option.disabled && option.value !== value) onChange(option.value); };
  return <div ref={root} className={className ? `ss-segments ${className}` : 'ss-segments'} data-cds="SegmentedControl" role="radiogroup" aria-label={label}
    data-variant={variant === 'uncontained' ? 'uncontained' : undefined} data-size={size && size !== 'base' ? size : undefined}
    onKeyDown={event => {
      if (disabled || event.nativeEvent.isComposing || event.altKey || event.metaKey || event.ctrlKey) return;
      const focused = event.target.closest('[role=radio]');
      const from = options.find(option => String(option.value) === focused?.dataset.value)?.value ?? value;
      const next = nextSegment(options, from, event.key, getComputedStyle(root.current).direction === 'rtl');
      if (next === null) return;
      event.preventDefault();
      const index = options.findIndex(option => option.value === next);
      root.current.querySelectorAll('[role=radio]')[index]?.focus(); select(options[index]);
    }}>
    <span className="ss-segment-track" aria-hidden="true"><span ref={thumb} className="ss-segment-thumb"/></span>
    {options.map(option => {
      const button = <button type="button" role="radio" aria-label={option.label} aria-checked={value === option.value}
        tabIndex={tabValue === option.value ? 0 : -1} data-value={option.value} data-icon-only={!!option.icon || undefined}
        disabled={disabled || option.disabled} onMouseDown={event => { if (event.button === 0 && event.detail > 1) event.preventDefault(); }}
        onClick={() => select(option)}>{option.icon ? <Icon name={option.icon} size={20}/> : option.label}</button>;
      return option.icon ? <SourceTooltip key={option.value} content={option.label} automatic hoverable={false}>{button}</SourceTooltip>
        : React.cloneElement(button, { key: option.value });
    })}
  </div>;
}
