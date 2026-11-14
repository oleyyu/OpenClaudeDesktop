// Checks the 4.16336.0 code transcript graph (scripts/extract-code-transcript-v4.mjs -> src/generated/code-transcript-v4)
// byte for byte, with its reviewed pins (cds-core manifest, root declarations, owner table, pending-root structure).
import { extractCodeTranscriptV4 } from './extract-code-transcript-v4.mjs';
await extractCodeTranscriptV4({ check: true });
