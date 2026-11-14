// Checks the 4.16336.0 chat message parts graph (scripts/extract-chat-messages-v4.mjs -> src/generated/chat-messages-v4)
// byte for byte, with its reviewed pins (cds-core manifest, root, inner and adapter declarations, adapter module).
import { extractChatMessagesV4 } from './extract-chat-messages-v4.mjs';
await extractChatMessagesV4({ check: true });
