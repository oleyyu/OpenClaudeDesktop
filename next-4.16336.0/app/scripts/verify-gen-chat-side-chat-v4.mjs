// Checks the 4.16336.0 Chat side chat graph (scripts/extract-chat-side-chat-v4.mjs -> src/generated/chat-side-chat-v4)
// byte for byte, with its reviewed pins (cds-core manifest, root and adapter declarations, adapter module).
import { extractChatSideChatV4 } from './extract-chat-side-chat-v4.mjs';
await extractChatSideChatV4({ check: true });
