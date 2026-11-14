// Checks the 4.16336.0 transcript rows graph (scripts/extract-transcript-rows-v4.mjs -> src/generated/transcript-rows-v4)
// byte for byte, with its reviewed pins (cds-core manifest, root declarations, verbatim files, owner table).
import { extractTranscriptRowsV4 } from './extract-transcript-rows-v4.mjs';
await extractTranscriptRowsV4({ check: true });
