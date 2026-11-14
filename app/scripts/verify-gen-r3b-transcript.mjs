import { extractR3bTranscript, contractVersions } from './extract-r3b-transcript.mjs';
// Both graphs: the 3.6556.2 one the host imports today (src/generated/r3b-transcript), and the isolated 4.16336.0
// migration target (src/generated/r3b-transcript-v4) the production switch moves to (not before batch 10).
for (const version of contractVersions) await extractR3bTranscript({ check: true, version });
