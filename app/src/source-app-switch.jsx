// The compact Chat/Code mode switch of the macOS titlebar (research/app-switch.md W1, decision D11).
//
// 3.6556.2 chain (GI → fT → lT → jC → Vj), all original except the container:
//   shared-22 GI    <R (CDS TooltipProvider)><div className={i(e, "ms-auto", "flex items-center")}><j_/></div></R>
//                   collapsed (W2): <div className="df-peek-mode-switch mb-2 flex shrink-0"><j_/></div> in the peek card
//                   (2.42304.0 DN; the switch no longer takes a ref for the raven callout anchor)
//   shared-22 AM    ⌥⌘←/→ surface chord (W3, 2.42304.0 names), mounted inside the frame sidebar -> useSurfaceChord below
//   shared-21 fT    container (router / GrowthBook / entitlement / telemetry)  -> host replica: AppSwitchContainer
//   shared-21 lT    segment builder                                            -> generated/app-switch/app-switch.mjs
//   shared-18 jC    div.df-app-switch, tags each [role='radio'] with data-mode -> generated/app-switch/app-switch-frame.mjs
//   shared-frame Vj CDS SegmentedControl over Base UI RadioGroup / Radio       -> view-tabs CdsSegmentedControl
// The df-app-switch rules (34px segments, muted unchecked icon, 16px/533.3 icon, bold checked Code) are the loaded
// public/assets/v1/shared-styles-D_GJawPO.css; nothing here sizes or colours the control.
import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { CdsDensityContext, CdsTooltipProvider, DirectionContext, clsx } from './generated/view-tabs/index.js';
import { AppSwitch, appSwitchShortcutHint, useAppSwitchSize } from './generated/app-switch/app-switch.mjs';
import { staticComposerBootFade } from './generated/app-switch/boot-fade.mjs';
import { useIntl } from './source-app-switch-adapters.jsx';
import { appSwitchProps, createAppSwitchPress, homeModeFor, homeNameFor, surfaceChordMatcher, surfaceChordTarget } from './app-switch-model.mjs';

// GI (2.42304.0 DN): e = i("draggable-none", Ys, _ && "flex", _ && B !== "web" && "-mt-[12px]") on the desktop (_)
// with the web frame variant (B === "web", the local root's data-variant), then i(e, ee ? "ms-auto" : He ? "ms-2" :
// "ms-auto", "flex items-center", ee && "df-titlebar-switch") with ee false on the desktop and no product wordmark (He).
export const appSwitchTitlebarClassName = clsx(clsx('draggable-none', staticComposerBootFade, 'flex'), 'ms-auto', 'flex items-center');
// R2-appswitch W2: DN `ae = K && !P` (3.6556.2 GI `ce`) — while the sidebar is collapsed the same container sits at the
// top of .dframe-sidebar-body (the peek card) in o("div", {className: "df-peek-mode-switch mb-2 flex shrink-0", children: o(j_, {})}),
// with no TooltipProvider of its own. style.css (F08 block) ports the band rules that place it on this root.
export const appSwitchPeekClassName = 'df-peek-mode-switch mb-2 flex shrink-0';

// Base UI reads the direction from its DirectionContext (vendor-frame ln, read by un as `?.direction ?? "ltr"`); the host answers with the document's dir,
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

// fT (2.42304.0 vC): the props of the original segment builder lT. `onMode` is main.jsx switchMode (it keeps the `sending` guard).
function AppSwitchContainer({ mode, homeMode, onMode, chord, attention, rtl }) {
  const intl = useIntl();
  const [pressed, setPressed] = useState(null);
  // uM's `pendingMode` (shared-52 store): the pressed mode after the 0ms timeout, read after the pressed one ($Y / KY).
  const [pending, setPending] = useState(null);
  const press = useMemo(() => createAppSwitchPress({ setPressed, setPending }), []);
  // pM: once the route shows the pending mode, `pendingMode: n(t.pendingMode) ? null : t.pendingMode`.
  useEffect(() => { if (pending !== null && pending === mode) setPending(null); }, [pending, mode]);
  useSurfaceChord({ enabled: chord, homeMode, current: pressed ?? pending ?? mode, rtl, onChord: value => { press(value, onMode); } });
  const size = useAppSwitchSize();
  // w13-surfaces-modes: 3.6556.2 shared-21 cT names the home segment by its mode -- the merged cowork home is Vw ("Claude",
  // D11; "Chat and Cowork" needs account and GrowthBook conditions this host does not have), the chat home "Chat".
  const homeName = homeNameFor(homeMode, intl);
  const { selected, home, code } = appSwitchProps({ mode, pressed, pending, homeMode, homeName, chord, rtl, attention, shortcutHint: appSwitchShortcutHint });
  const onChange = useCallback(value => { press(value, onMode); }, [press, onMode]);
  return <AppSwitch data-compact-mode-switcher={true} data-chorus-callout="pills" className="flex"
    homeMode={homeMode} selected={selected} onChange={onChange} size={size} home={home} code={code} />;
}

// placement "titlebar" (GI `G`, the open sidebar) or "peek" (GI `ce`, the collapsed sidebar's peek card).
// `homeMode` is shared-21 rT (app-switch-model.mjs homeModeFor, main.jsx passes it through the sidebar); without it the
// switch answers rT with Cowork unavailable, the Chat home.
export function SourceAppSwitch({ mode = 'code', homeMode = homeModeFor(), onMode, chord = false, attention, density = 'compact', direction, placement = 'titlebar' }) {
  const rootDirection = useSyncExternalStore(observeDirection, directionSnapshot, serverDirection);
  const resolved = direction ?? rootDirection;
  const context = useMemo(() => ({ direction: resolved }), [resolved]);
  const container = <AppSwitchContainer mode={mode} homeMode={homeMode} onMode={onMode} chord={chord} attention={attention} rtl={resolved === 'rtl'} />;
  // The desktop frame's CDS density is compact (shared-78 fW), so nT sizes the control "lg".
  return <DirectionContext value={context}><CdsDensityContext value={density}>
    {placement === 'peek' ? <div className={appSwitchPeekClassName}>{container}</div>
      : <CdsTooltipProvider><div className={appSwitchTitlebarClassName}>{container}</div></CdsTooltipProvider>}
  </CdsDensityContext></DirectionContext>;
}
