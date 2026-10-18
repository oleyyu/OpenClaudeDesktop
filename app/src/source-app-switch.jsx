// The compact Chat/Code mode switch of the macOS titlebar (research/app-switch.md W1, decision D11).
//
// Installed 2.42304.0 chain, all original except the container:
//   shared-22 DN    <Zs (CDS TooltipProvider)><div className={O(je, "ms-auto", "flex items-center")}><bg/></div></Zs>
//                   collapsed (W2): <div className="df-peek-mode-switch mb-2 flex shrink-0"><bg/></div> in the peek card
//   shared-22 AM    ⌥⌘←/→ surface chord (W3), mounted by jM in DN       -> useSurfaceChord below
//   shared-21 vC    container (router / GrowthBook / entitlement / telemetry)  -> host replica: AppSwitchContainer
//   shared-21 _C    segment builder                                            -> generated/app-switch/app-switch.mjs
//   shared-18 yx    div.df-app-switch, tags each [role='radio'] with data-mode -> generated/app-switch/app-switch-frame.mjs
//   shared-frame hO CDS SegmentedControl over Base UI RadioGroup / Radio       -> view-tabs CdsSegmentedControl
// The df-app-switch rules (34px segments, muted unchecked icon, 16px/533.3 icon, bold checked Code) are the loaded
// public/assets/v1/shared-styles-Bl9zqrv-.css; nothing here sizes or colours the control.
import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { CdsDensityContext, CdsTooltipProvider } from './generated/view-tabs/shared-frame-BfjMqbuN.js';
import { DirectionContext, clsx } from './generated/view-tabs/vendor-frame-DfPJ1QmD.js';
import { AppSwitch, appSwitchShortcutHint, useAppSwitchSize } from './generated/app-switch/app-switch.mjs';
import { staticComposerBootFade } from './generated/app-switch/boot-fade.mjs';
import { useIntl } from './source-app-switch-adapters.jsx';
import { appSwitchProps, createAppSwitchPress, surfaceChordMatcher, surfaceChordTarget } from './app-switch-model.mjs';

// DN: je = O("draggable-none", _c, d && "flex", d && L !== "web" && "-mt-[12px]") on the desktop (d) with the web
// frame variant (L === "web", the local root's data-variant), then O(je, I ? "ms-auto" : Ae ? "ms-2" : "ms-auto",
// "flex items-center", I && "df-titlebar-switch") with I false on the desktop and no product wordmark (Ae) here.
export const appSwitchTitlebarClassName = clsx(clsx('draggable-none', staticComposerBootFade, 'flex'), 'ms-auto', 'flex items-center');
// R2-appswitch W2: DN `ae = K && !P` — while the sidebar is collapsed the same container sits at the top of
// .dframe-sidebar-body (the peek card) in p("div", {className: "df-peek-mode-switch mb-2 flex shrink-0", children: p(bg)}),
// with no TooltipProvider of its own. style.css (F08 block) ports the band rules that place it on this root.
export const appSwitchPeekClassName = 'df-peek-mode-switch mb-2 flex shrink-0';

// Base UI reads the direction from its DirectionContext (vendor-frame wd); the host answers with the document's dir,
// as source-view-tabs.jsx does.
const directionSnapshot = () => globalThis.document?.documentElement?.dir === 'rtl' ? 'rtl' : 'ltr';
const serverDirection = () => 'ltr';
function observeDirection(callback) {
  const doc = globalThis.document, Observer = doc?.defaultView?.MutationObserver;
  if (!Observer) return () => {};
  const observer = new Observer(callback);
  observer.observe(doc.documentElement, { attributes: true, attributeFilter: ['dir'] });
  return () => observer.disconnect();
}

// R2-appswitch W3: AM (shared-22, mounted by jM inside DN) — a window keydown listener (vendor-all-0 w, mantine
// useWindowEvent) that moves to the neighbouring mode on ⌥⌘←/→ (app-switch-model.mjs surfaceChordTarget over the
// original qL/$L/RL and jL bindings). Its navigation is the same Fk press the segments use (shared-6 Ja via `n(a, "tab")`),
// so the thumb moves at once and a refused switch springs back. Bound only where `chord` (AM's desktop `e = B()`) holds,
// which is also what makes bC offer the hint. The host mounts it with the one switch the sidebar renders (titlebar or
// peek) so both share the pressed value the original keeps in its global store (zq).
function useSurfaceChord({ enabled, homeMode, current, rtl, onChord }) {
  const live = useRef(null);
  live.current = { homeMode, current, rtl, onChord };
  const matchers = useMemo(() => ({ prev: surfaceChordMatcher('chorus_surface_prev'), next: surfaceChordMatcher('chorus_surface_next') }), []);
  useEffect(() => {
    const view = globalThis.window;
    if (!enabled || typeof view?.addEventListener !== 'function') return undefined;
    const onKeyDown = event => {
      const state = live.current;
      const target = surfaceChordTarget(event, { modes: [state.homeMode, 'code'], current: state.current, rtl: state.rtl,
        matchPrev: matchers.prev, matchNext: matchers.next });
      if (target === null) return;
      state.onChord(target);
      event.preventDefault();
    };
    view.addEventListener('keydown', onKeyDown);
    return () => view.removeEventListener('keydown', onKeyDown);
  }, [enabled, matchers]);
}

// vC: the props of the original segment builder _C. `onMode` is main.jsx switchMode (it keeps the `sending` guard).
function AppSwitchContainer({ mode, homeMode, onMode, chord, attention, rtl }) {
  const intl = useIntl();
  const [pressed, setPressed] = useState(null);
  const press = useMemo(() => createAppSwitchPress({ setPressed }), []);
  useSurfaceChord({ enabled: chord, homeMode, current: pressed ?? mode, rtl, onChord: value => { press(value, onMode); } });
  const size = useAppSwitchSize();
  // YS: the merged home is "Claude" (D11). The other original answer, "Chat and Cowork", depends on account and
  // GrowthBook conditions this host does not have.
  const homeName = intl.formatMessage({ defaultMessage: 'Claude', id: '4PjoX4rZSt' });
  const { selected, home, code } = appSwitchProps({ mode, pressed, homeMode, homeName, chord, rtl, attention, shortcutHint: appSwitchShortcutHint });
  const onChange = useCallback(value => { press(value, onMode); }, [press, onMode]);
  return <AppSwitch data-compact-mode-switcher={true} data-chorus-callout="pills" className="flex"
    homeMode={homeMode} selected={selected} onChange={onChange} size={size} home={home} code={code} />;
}

// placement "titlebar" (DN `G`, the open sidebar) or "peek" (DN `ae`, the collapsed sidebar's peek card).
export function SourceAppSwitch({ mode = 'code', homeMode = 'cowork', onMode, chord = false, attention, density = 'compact', direction, placement = 'titlebar' }) {
  const rootDirection = useSyncExternalStore(observeDirection, directionSnapshot, serverDirection);
  const resolved = direction ?? rootDirection;
  const context = useMemo(() => ({ direction: resolved }), [resolved]);
  const container = <AppSwitchContainer mode={mode} homeMode={homeMode} onMode={onMode} chord={chord} attention={attention} rtl={resolved === 'rtl'} />;
  // The desktop frame's CDS density is compact (shared-78 fW), so uC sizes the control "lg".
  return <DirectionContext value={context}><CdsDensityContext value={density}>
    {placement === 'peek' ? <div className={appSwitchPeekClassName}>{container}</div>
      : <CdsTooltipProvider><div className={appSwitchTitlebarClassName}>{container}</div></CdsTooltipProvider>}
  </CdsDensityContext></DirectionContext>;
}
