// --check for src/generated/sessions-page-v4 (scripts/extract-sessions-page-v4.mjs): re-derives every file and compares
// bytes; fails on any drift, a moved pin or an unused adapter.
import { extractSessionsPageV4 } from './extract-sessions-page-v4.mjs';
await extractSessionsPageV4({ check: true });
