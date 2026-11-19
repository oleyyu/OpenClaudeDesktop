// U-MARLIN (user decision, 2026-11-18; overrides D29 / R15 for Chat): the host's one answer to the official composer design
// gate. 4.16336.0 shared-123 s_ (exported Yx; ca2ef848d `zo = xc()`, shared-19 `Wi()`, shared-23 dw `Ga()`) reads the
// GrowthBook gate "voyage_composer_marlin" (gd), the device latch "composer-card-latch" (fd(), default "classic") and the boot
// skeleton stamp (Ug()). Both of the user's official screenshots (Chat home and a Chat conversation) are the marlin arm, so
// every reader in this host answers true from here.
export const COMPOSER_MARLIN_DESIGN = true;

// The same screenshots fix one more official input the marlin Chat conversation reads: its conversation is an external
// (hub) one. Only that arm gives the "Reply" placeholder (shared-36 PT: `a ? ["reply", "Reply"]`, a = isExternalConversation)
// and the centred chin with the + menu relocated into it (shared-36 lC = `!isLocalAgentRoute && isExternalConversation` is
// both shared-8 GQ's `centred` and shared-9 gO's hubChinControls → tO relocateControlsToChin). The desktop's Chat runs its
// conversations through the desktop (official: the hub); this host's local-core Chat does the same, so a Chat conversation
// answers true. Only the composer readers above take it; nothing else in the host reads isExternalConversation.
export const CHAT_CONVERSATION_EXTERNAL = true;
