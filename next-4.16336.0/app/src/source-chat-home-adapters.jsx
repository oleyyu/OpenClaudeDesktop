import { createContext, useContext } from 'react';
import { getLocale } from '../electron/i18n/index.mjs';

// w13-chatui-home: host services of the 3.6556.2 Chat greeting graph (scripts/extract-chat-home.mjs →
// src/generated/chat-home). Each export answers one original binding the generated shared-23 Dy reads; the generator
// pins the original declaration with features, so a renamed or reshaped original stops generation.
//
// OpenClaude has no claude.ai account (E59): the bootstrap, the account-scoped greeting cache, the web build's
// pre-painted composer and Datadog do not exist here. E53: the local equivalent of the bootstrap's
// personalized_greeting is a local greeting table with the official shape
// `[{ surface, days: [{ day, slots: [{ until, text }] }] | null, default_slots: [{ until, text }] }]` (shared-23 ly),
// supplied by the host through ChatGreetingHost. It is empty by default, so the greeting is the official fallback
// "You’re here!".
export const ChatGreetingHost = createContext({ greetings: [] });

// shared-25 kB (export jr): the account bootstrap query. Here its data is only the local greeting table; there is no
// `account` (no claude.ai account), so Dy's pre-paint account checks never run.
export function useChatGreetingBootstrap() {
  const { greetings } = useContext(ChatGreetingHost);
  return { data: { personalized_greeting: greetings ?? [] } };
}

// shared-25 oA (export bo): the greeting entries a signed-in claude.ai account caches in localStorage
// ("static-composer-greeting-data-v2", keyed by account uuid and session marker). Without an account the official
// read returns null (`aA() === null`), and so does this one.
export function readCachedChatGreetings() {
  return null;
}

// shared-156 jB (export Co): the page's search parameters. The host window has no `?incognito` route, so Dy's
// incognito-parameter branch stays as generated but never applies.
const noSearchParams = new URLSearchParams();
export function useChatGreetingSearchParams() {
  return noSearchParams;
}

// shared-23 Ey: the static composer greeting the web build pre-paints into #static-composer-greeting-text on /new.
// The desktop host renders its home with React only (no static boot markup), the same as the official `pathname !==
// "/new"` result: null.
export function readStaticComposerGreeting() {
  return null;
}

// shared-78 Gc (export wT): Datadog global context properties. No telemetry here.
export function setGreetingTelemetry() {}

// shared-1 dg (export Xf): the boot locale a pre-painted greeting was written in. Only compared while a pre-painted
// greeting exists (never here); the host's boot locale is its i18n locale.
export const chatBootLocale = getLocale();
