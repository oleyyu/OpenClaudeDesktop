// Checks the chat-header 4.16336.0 graph (scripts/extract-chat-header-v4.mjs): the pins (snapshot chunks, root and
// boundary declarations, the finalized cds-core manifest + adapter), src/chat-header-adapter.mjs and every byte of
// src/generated/chat-header. prepare:ui discovers and runs it (verify-gen-*.mjs).
import { extractChatHeader } from './extract-chat-header-v4.mjs';
await extractChatHeader({ check: true });
