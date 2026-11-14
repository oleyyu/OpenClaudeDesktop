// Checks the 4.16336.0 Chat answer renderer graph (scripts/extract-chat-renderer-v4.mjs -> src/generated/chat-renderer-v4)
// byte for byte, with its reviewed pins (cds-core manifest, root / pending root and adapter declarations, adapter module,
// linked modules, the verbatim KaTeX chunk) and its guard against writes to imported bindings.
import { extractChatRendererV4 } from './extract-chat-renderer-v4.mjs';
await extractChatRendererV4({ check: true });
