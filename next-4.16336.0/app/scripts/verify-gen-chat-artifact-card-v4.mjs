// Checks the 4.16336.0 Chat artifact card graph (scripts/extract-chat-artifact-card-v4.mjs -> src/generated/chat-artifact-card-v4)
// byte for byte, with its reviewed pins (cds-core manifest, root and adapter declarations, adapter module, linked areas).
import { extractChatArtifactCardV4 } from './extract-chat-artifact-card-v4.mjs';
await extractChatArtifactCardV4({ check: true });
