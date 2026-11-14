// Both source contracts: 3.6556.2 -> src/generated/chat-markdown (production, linked by chat-renderer / code-transcript),
// 4.16336.0 -> src/generated/chat-markdown-v4 (isolated graph until the cutover).
import { extractChatMarkdown, contractVersions } from './extract-chat-markdown.mjs';
for (const version of contractVersions) await extractChatMarkdown({ check: true, version });
