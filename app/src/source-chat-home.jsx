import React, { useMemo } from 'react';
// w13-chatui-home (research/w13-chatui.md chatui-H2): the Chat new-page greeting. The text is the 3.6556.2 shared-23 Dy
// hook (scripts/extract-chat-home.mjs → src/generated/chat-home): "You’re here!" unless the local greeting table
// (E53, the personalized_greeting equivalent; empty by default) has a slot for "chat" at this day and hour. The
// greeting itself is the official shared-23 My (HomeGreeting, scripts/extract-cowork-home.mjs) in the same classic
// new-page seat as the Cowork greeting (source-surfaces.jsx SourceSurfaceGreeting; its CSS is source-surfaces.css).
// 3.6556.2 has no `{name} returns!` message (en-US 0 hits), so the Chat greeting no longer shows the display name.
import { HomeGreeting, homeLayout, homeGreetingSeatClass as greetingSeat } from './generated/cowork-home/index.mjs';
import { useChatGreeting } from './generated/chat-home/greeting.mjs';
import { greetingFrameClass } from './generated/chat-home/greeting-frame.mjs';
import { ChatGreetingHost } from './source-chat-home-adapters.jsx';
// 4.16336.0 (scripts/extract-home-v4.mjs → src/generated/home-chat-cowork): shared-23 ix (the greeting text) and lx (the
// lockup with CdsAnimatedSpark), the layout table shared-19 ya ("classic"), fx's frame shared-19 Sa and the phone seat
// class shared-33 Zo, over src/source-home-v4-adapters.jsx.
import { useChatGreeting as useChatGreetingV4, HomeGreeting as HomeGreetingV4 } from './generated/home-chat-cowork/shared-23.mjs';
import { homeLayout as homeLayoutV4, greetingFrameClass as greetingFrameClassV4 } from './generated/home-chat-cowork/shared-19.mjs';
import { homeGreetingSeatClass as greetingSeatV4 } from './generated/home-chat-cowork/shared-33.mjs';
import { HomeHost } from './source-home-v4-adapters.jsx';
import { hostGrowthBookFlag } from './host-growthbook.mjs';

// w13-close-chat-composer (chatui-home-02): shared-23 UC calls `c(Fy, {incognitoModeEnabled: u, planBadge: null, layout:
// e.greetingLockup})` with `e = zg(n)` (shared-19 rS) over UC's layoutVariant n, which shared-23 WC passes as
// `n === void 0 ? zl : n` (zl = shared-2 M1 "classic"); the other variant, "home", is the GrowthBook new_page_home arm
// (off here, D29/D31) — the same evidence source-surfaces.jsx keeps for the Cowork new page. So the layout is "classic".
const homeVariant = homeLayout('classic');
const noGreetings = [];

// shared-23 Fy: `o = Dy({ incognito: t })`, then `div { className: fg }` (shared-19 Wx) around [planBadge, My {text: o,
// isAgentRoute: u, layout: i}]. planBadge is null at the call site (`n === void 0 ? h-8 : n`: nothing), and isAgentRoute
// is false (no agent route here). Fy's `y(Iy, [])` effect is shared-15 $n, an idle-time chunk prefetch (Qn) with no local
// counterpart (nothing is lazily fetched), so it is not carried.
export function ChatGreetingTextV3({ incognito }) {
  const text = useChatGreeting(useMemo(() => ({ incognito }), [incognito]));
  return <div className={greetingFrameClass}><HomeGreeting layout={homeVariant.greetingLockup} text={text} /></div>;
}

// The 3.6556.2 greeting, kept beside the 4.16336.0 one as the comparison until the screenshot acceptance retires it
// (surface pilot productionPlan step 8); main.jsx and source-surfaces.jsx mount SourceChatGreeting below.
export function SourceChatGreetingV3({ greetings = noGreetings, incognito }) {
  const host = useMemo(() => ({ greetings }), [greetings]);
  return <ChatGreetingHost.Provider value={host}>
    <header className={`surface-greeting ${homeVariant.greetingSlotClass} ${greetingSeat(homeVariant.greetingPhoneSeat)}`}>
      <ChatGreetingTextV3 incognito={incognito} />
    </header>
  </ChatGreetingHost.Provider>;
}

// 4.16336.0 shared-23 fx (the one new-page greeting call site, `d(fx, { incognitoModeEnabled: o, planBadge: null, layout:
// t.greetingLockup })` with t = shared-19 ya(variant)): `o = ix({ incognito: t })`, then `div { className: hu }` (shared-19
// Sa) around [planBadge (null at the call site: nothing), Nb (an account anniversary: null without a claude.ai account),
// lx { text, isAgentRoute: false, layout, spark: true }]. fx's `T(px, [])` effect is shared-100 Vm, an idle prefetch of
// official chunks the host does not ship, so it is not carried. The variant is the new_page_home ruling
// (integration-3 review-0 P1): "home" while the host switch local_new_page_home is open (the user's official screenshot
// draws the home arm; host-growthbook.mjs), else "classic" (D29/D31). The slot is the composer's greeting slot:
// shared-19 `h(pS(variant).greetingSlotClass, ee)` with ee = shared-33 Zo(greetingPhoneSeat) (shared-23 De).
export const newPageLayoutVariant = hostGrowthBookFlag('local_new_page_home') ? 'home' : 'classic';
const homeVariantV4 = homeLayoutV4(newPageLayoutVariant);
export function ChatGreetingText({ incognito }) {
  const text = useChatGreetingV4(useMemo(() => ({ incognito }), [incognito]));
  return <div className={greetingFrameClassV4}><HomeGreetingV4 text={text} isAgentRoute={false} layout={homeVariantV4.greetingLockup} spark /></div>;
}

export function SourceChatGreeting({ greetings = noGreetings, incognito }) {
  const host = useMemo(() => ({ surface: 'chat', greetings }), [greetings]);
  return <HomeHost.Provider value={host}>
    <header className={`surface-greeting ${homeVariantV4.greetingSlotClass} ${greetingSeatV4(homeVariantV4.greetingPhoneSeat)}`}>
      <ChatGreetingText incognito={incognito} />
    </header>
  </HomeHost.Provider>;
}
