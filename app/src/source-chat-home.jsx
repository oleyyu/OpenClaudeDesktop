import React, { useLayoutEffect, useMemo, useRef, useSyncExternalStore } from 'react';
// w13-chatui-home: the Chat new-page greeting. chat-cowork-1to1 r3 (chat-home-r3-03): the 3.6556.2 greeting (shared-23 Dy /
// My through generated/chat-home and generated/cowork-home, kept as ChatGreetingTextV3 / SourceChatGreetingV3 for the
// screenshot comparison) is retired; only the 4.16336.0 greeting below is mounted.
// 4.16336.0 (scripts/extract-home-v4.mjs → src/generated/home-chat-cowork): shared-23 ix (the greeting text) and lx (the
// lockup with CdsAnimatedSpark), the layout table shared-19 ya ("classic"), fx's frame shared-19 Sa and the phone seat
// class shared-33 Zo, over src/source-home-v4-adapters.jsx.
import { useChatGreeting as useChatGreetingV4, HomeGreeting as HomeGreetingV4 } from './generated/home-chat-cowork/shared-23.mjs';
import { homeLayout as homeLayoutV4, greetingFrameClass as greetingFrameClassV4, greetingSlotLiftClass } from './generated/home-chat-cowork/shared-19.mjs';
import { homeGreetingSeatClass as greetingSeatV4 } from './generated/home-chat-cowork/shared-33.mjs';
import { HomeHost } from './source-home-v4-adapters.jsx';
import { hostGrowthBookFlag } from './host-growthbook.mjs';
import { cdsClassNames } from './cds-core.mjs';
import { newPageCardSlot } from './generated/home-chat-cowork/new-page-card-slot.mjs';

// 4.16336.0 shared-23 fx (the one new-page greeting call site, `d(fx, { incognitoModeEnabled: o, planBadge: null, layout:
// t.greetingLockup })` with t = shared-19 ya(variant)): `o = ix({ incognito: t })`, then `div { className: hu }` (shared-19
// Sa) around [planBadge (null at the call site: nothing), Nb (an account anniversary: null without a claude.ai account),
// lx { text, isAgentRoute: false, layout, spark: true }]. fx's `T(px, [])` effect is shared-100 Vm, an idle prefetch of
// official chunks the host does not ship, so it is not carried. The variant is the new_page_home ruling
// (integration-3 review-0 P1): "home" while the host switch local_new_page_home is open (the user's official screenshot
// draws the home arm; host-growthbook.mjs), else "classic" (D29/D31). The slot is the composer's greeting slot:
// shared-19 `h(pS(variant).greetingSlotClass, ee)` with ee = shared-33 Zo(greetingPhoneSeat) (shared-23 De).
export const newPageLayoutVariant = hostGrowthBookFlag('local_new_page_home') ? 'home' : 'classic';
const noGreetings = [];
const homeVariantV4 = homeLayoutV4(newPageLayoutVariant);
export function ChatGreetingText({ incognito }) {
  const text = useChatGreetingV4(useMemo(() => ({ incognito }), [incognito]));
  return <div className={greetingFrameClassV4}><HomeGreetingV4 text={text} isAgentRoute={false} layout={homeVariantV4.greetingLockup} spark /></div>;
}

export function SourceChatGreeting({ greetings = noGreetings, incognito }) {
  const host = useMemo(() => ({ surface: 'chat', greetings }), [greetings]);
  // chat-home r1-07: shared-19 SD (ED's greeting slot) is `div { className: h(greetingSlotClass + seat, aC, held &&
  // "opacity-0"), inert: held }`; the hold is ED's lift-for-notices wait, never on for this host (no composer lift), so the
  // slot is the plain div with aC. data-surface-greeting keeps the host's hook (no class of its own).
  return <HomeHost.Provider value={host}>
    <div data-surface-greeting="" className={cdsClassNames(homeVariantV4.greetingSlotClass, greetingSeatV4(homeVariantV4.greetingPhoneSeat), greetingSlotLiftClass)}>
      <ChatGreetingText incognito={incognito} />
    </div>
  </HomeHost.Provider>;
}

// chat-home r1-06: shared-23 TT's frame — `div { className: u("flex h-full", j ? "flex-row" : "flex-col"), [Kf]: variant }`
// (Kf = shared-2 _$ "data-new-page-layout-rendered"; j = Ax(Xn("(min-width: 1024px)"))) around the scroll column `div {
// [Oh]: "", className: "min-h-0 flex-1 overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable_both-edges]" }` (Oh =
// shared-33 aE "data-new-page-scroll-column"); at ≥1024px TT also mounts Rx (the opened-file viewer), which this host
// does not have. Host boundary: main.jsx's conversation div is the scroll column for every section, so the frame is one
// element whose class switches — TT's frame on the new page, `contents` (no box) elsewhere — and the conversation
// subtree never remounts when a draft becomes a session. The host's row-flex body needs the frame to grow
// (source-surfaces.css [data-new-page-layout-rendered]).
const NEW_PAGE_WIDE_QUERY = '(min-width: 1024px)';
const subscribeWide = callback => {
  const query = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(NEW_PAGE_WIDE_QUERY) : null;
  query?.addEventListener('change', callback);
  return () => query?.removeEventListener('change', callback);
};
const wideSnapshot = () => typeof window !== 'undefined' && !!window.matchMedia?.(NEW_PAGE_WIDE_QUERY).matches;
export const NEW_PAGE_SCROLL_COLUMN = 'data-new-page-scroll-column';
export function SourceNewPageFrame({ home, children }) {
  const wide = useSyncExternalStore(subscribeWide, wideSnapshot, () => false);
  return home
    ? <div className={cdsClassNames('flex h-full', wide ? 'flex-row' : 'flex-col')} data-new-page-layout-rendered={newPageLayoutVariant}>{children}</div>
    : <div className="contents">{children}</div>;
}

// r2 chat-home-r2-05 / r2-06: shared-19 ED's card column around the Chat new page's composer (literals:
// generated/home-chat-cowork/new-page-card-slot.mjs). ED renders the slot `div { className: h("isolate", Be, K, ea),
// [Dk]: "" }`, inside it the band slot `div { className: h("relative -z-10", q, ra) }` (the notices; the host's notice
// stack stays inside its composer zone, so this slot is empty) and the card block `ac { className: h(J, ua) }` holding
// `div.relative.z-10` around the composer and kw's closed tray (aria-hidden, inert, grid-rows-[0fr]). K / q / J are
// shared-23's dock classes (shared-33 xk / Ck / Pk), so below 40rem the card docks to the column's bottom. ea / ra / ua
// apply while ED's vt (`greetingHeadroomFree && layoutVariant === "home"`) holds: the home arm here, whose headroom is
// free (shared-23 Ee: the desktop top bar is supported — the host draws it, source-titlebar.jsx). ED's Rc / Fp / aD / vT
// children (perf mark, upsell, destination key, below-composer slot) have no local content. The host composer zone
// inside keeps its own hooks.
const cardSlotHeadroom = newPageLayoutVariant === 'home';
// chat-cowork-1to1 r3 (chat-home-r3-06): shared-23 TT's resize effect, its band-slot part — below `(width < 40rem)` it writes
// shared-33 Sk ("--new-page-card-px") on the band slot (the card slot's first child) as the card block's (last child's)
// border-box height, which the band's dock class reads (`dock:bottom-[var(--new-page-card-px,0px)]`); at or above 40rem it
// writes nothing (and clears nothing). TT re-runs it from a ResizeObserver on the scroll column, the greeting, the card block,
// the slot and the column's first child; here the card block, the slot and the media query drive it. The rest of TT's
// effect (gT, whether the greeting fits beside the card) feeds only the "center" phone seat, which neither layout arm here uses.
function useNewPageCardHeight(bandRef, cardRef) {
  useLayoutEffect(() => {
    const band = bandRef.current, card = cardRef.current;
    if (!band || !card || typeof ResizeObserver === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const { cardHeightProperty, cardHeightQuery } = newPageCardSlot.band;
    const query = window.matchMedia(cardHeightQuery);
    const write = () => { if (query.matches) band.style.setProperty(cardHeightProperty, `${card.getBoundingClientRect().height}px`); };
    const observer = new ResizeObserver(write);
    observer.observe(card, { box: 'border-box' });
    if (card.parentElement) observer.observe(card.parentElement, { box: 'border-box' });
    query.addEventListener('change', write);
    write();
    return () => { observer.disconnect(); query.removeEventListener('change', write); };
  }, [bandRef, cardRef]);
}
export function SourceNewPageCardSlot({ children }) {
  const { slot, band, cardBlock, composerClass, tray } = newPageCardSlot;
  const bandRef = useRef(null), cardRef = useRef(null);
  useNewPageCardHeight(bandRef, cardRef);
  return <div className={cdsClassNames(slot.baseClass, slot.widthClass, slot.dockClass, cardSlotHeadroom && slot.headroomClass)} {...{ [slot.attribute]: '' }}>
    <div ref={bandRef} className={cdsClassNames(band.baseClass, band.dockClass, cardSlotHeadroom && band.headroomClass)} />
    <div ref={cardRef} className={cdsClassNames(cardBlock.dockClass, cardSlotHeadroom && cardBlock.headroomClass)}>
      <div className={composerClass}>{children}</div>
      <div aria-hidden inert className={cdsClassNames(tray.className, tray.closedRows)}><div className={tray.innerClass} /></div>
    </div>
  </div>;
}
