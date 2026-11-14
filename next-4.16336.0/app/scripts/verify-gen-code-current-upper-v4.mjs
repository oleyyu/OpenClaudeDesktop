// --check for src/generated/code-current-upper-v4 (scripts/extract-code-current-upper-v4.mjs): re-derives every file and
// compares bytes; fails on any drift, a moved pin, an unused adapter or a pending root whose need is now exported.
import { extractCodeCurrentUpperV4 } from './extract-code-current-upper-v4.mjs';
await extractCodeCurrentUpperV4({ check: true });
