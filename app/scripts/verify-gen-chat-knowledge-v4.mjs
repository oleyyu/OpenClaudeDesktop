// --check for src/generated/chat-knowledge-v4 (scripts/extract-chat-knowledge-v4.mjs): re-derives every file and compares
// bytes; fails on any drift, a moved pin, an unused adapter or an unused linked area.
import { extractChatKnowledgeV4 } from './extract-chat-knowledge-v4.mjs';
await extractChatKnowledgeV4({ check: true });
