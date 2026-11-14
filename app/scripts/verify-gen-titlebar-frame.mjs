// Checks the titlebar-frame 4.16336.0 graph (scripts/extract-titlebar-frame-v4.mjs): the pins (snapshot chunks, root, also and
// boundary declarations, the finalized cds-core manifest + adapter), src/titlebar-frame-adapter.mjs and every byte of
// src/generated/titlebar-frame. prepare:ui discovers and runs it (verify-gen-*.mjs).
import { extractTitlebarFrame } from './extract-titlebar-frame-v4.mjs';
await extractTitlebarFrame({ check: true });
