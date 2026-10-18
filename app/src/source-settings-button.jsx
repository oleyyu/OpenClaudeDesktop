import React from 'react';
import { Icon } from './icons';
import { buttonKeyPress, buttonPointerPress } from './button-press.mjs';
import './source-settings-button.css';

// Native buttons used by the desktop settings pages. Other CDS Button
// branches (links, joined groups and tooltip providers) stay separate.
export const SourceSettingsButton = React.forwardRef(function SourceSettingsButton({
  variant = 'secondary', size, icon, iconSize = 20, iconOnly = false,
  iconPosition = 'start', className = '', children, type = 'button',
  busy=false, flush=false, style, onClick, onKeyDown, onKeyUp, onMouseDown, onPointerDownCapture, ...props
}, ref) {
  // shared-frame ks :2833-2836/:2880-2882: flush (true = "start") applies only to
  // a non-joined ghost; Cs start/end/both = ms-/me-/mx-outset against
  // --cds-outset-x, which is ws var(--cds-pad-md) for a labelled button or
  // Os (:2778) = (h-control - icon px)/2 for icon-only ('auto' measured as md).
  const flushSide = variant === 'ghost' ? (flush === true ? 'start' : ['start', 'end', 'both'].includes(flush) ? flush : undefined) : undefined;
  const iconPx = typeof iconSize === 'number' ? iconSize : 20;
  const outsetStyle = flushSide ? { '--cds-outset-x': iconOnly ? `calc((var(--cds-h-control) - calc(${iconPx / 16}rem * var(--cds-rem-scale, 1))) / 2)` : 'var(--cds-pad-md)', ...style } : style;
  // shared-frame Ts/Ds: explicit sm buttons still use density-auto icons.
  // CSS chooses one optical master; both glyphs are decorative and hidden from AT.
  const glyphAt = (pixels, densityClass = '') => <Icon key={pixels} name={icon} size={pixels}
    style={{fontSize:`calc(${pixels / 16}rem * var(--cds-rem-scale, 1))`}}
    className={`${iconOnly ? '' : `ssb-icon-${iconPosition}`} ${densityClass}`}/>;
  // Ts: xs/xxs buttons resolve 'auto-sm' (shared-frame aa: one token below the
  // density size), i.e. 12px compact / 16px comfortable.
  const glyph = React.isValidElement(icon) ? icon : !icon ? null : iconSize === 'auto'
    ? <>{glyphAt(16, 'ssb-auto-compact')}{glyphAt(20, 'ssb-auto-comfortable')}</>
    : iconSize === 'auto-sm'
      ? <>{glyphAt(12, 'ssb-auto-compact')}{glyphAt(16, 'ssb-auto-comfortable')}</>
      : glyphAt(iconSize);
  return <button {...props} ref={ref} type={type} data-cds="Button" data-variant={variant} data-flush={flushSide} style={outsetStyle}
    aria-busy={busy||undefined} aria-disabled={busy||props['aria-disabled']||undefined}
    data-size={size && size !== 'base' ? size : undefined} data-cds-icon-only={iconOnly ? '' : undefined}
    className={`source-settings-button ${className}`}
    onPointerDownCapture={event => { buttonPointerPress(event); onPointerDownCapture?.(event); }}
    onKeyDown={event => {
      if(busy&&(event.key==='Enter'||event.key===' ')){event.preventDefault();event.stopPropagation();return;}
      buttonKeyPress(event);
      onKeyDown?.(event);
    }}
    onKeyUp={event=>{if(busy&&(event.key==='Enter'||event.key===' ')){event.preventDefault();event.stopPropagation();return;}onKeyUp?.(event);}}
    onClick={event=>{if(busy){event.preventDefault();event.stopPropagation();return;}onClick?.(event);}}
    onMouseDown={event => {
      onMouseDown?.(event);
      if (event.detail > 1 && event.button === 0 && !event.target.closest?.('input:not([type=hidden]):not([disabled]),[contenteditable]:not([contenteditable=false]),textarea:not([disabled])')) event.preventDefault();
    }}>
    <span aria-hidden="true" className="ssb-squish"><span data-cds-part="paint" className="ssb-paint"/></span>
    <span className="ssb-content">{iconOnly ? glyph : <>{iconPosition === 'start' && glyph}{children}{iconPosition === 'end' && glyph}</>}</span>
    {busy&&<span className="ssb-spinner" aria-hidden="true"><span data-cds="Spinner"><span/><span/></span></span>}
  </button>;
});
