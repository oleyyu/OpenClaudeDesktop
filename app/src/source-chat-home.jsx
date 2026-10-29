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
export function ChatGreetingText({ incognito }) {
  const text = useChatGreeting(useMemo(() => ({ incognito }), [incognito]));
  return <div className={greetingFrameClass}><HomeGreeting layout={homeVariant.greetingLockup} text={text} /></div>;
}

export function SourceChatGreeting({ greetings = noGreetings, incognito }) {
  const host = useMemo(() => ({ greetings }), [greetings]);
  return <ChatGreetingHost.Provider value={host}>
    <header className={`surface-greeting ${homeVariant.greetingSlotClass} ${greetingSeat(homeVariant.greetingPhoneSeat)}`}>
      <ChatGreetingText incognito={incognito} />
    </header>
  </ChatGreetingHost.Provider>;
}
