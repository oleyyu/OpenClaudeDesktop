// Checks the frame-sidebar 4.16336.0 graph (scripts/extract-frame-sidebar-v4.mjs): the pins (snapshot chunks, root and
// boundary declarations, the finalized cds-core manifest + adapter), src/frame-sidebar-adapter.mjs and every byte of
// src/generated/frame-sidebar. prepare:ui discovers and runs it (verify-gen-*.mjs).
import { extractFrameSidebar } from './extract-frame-sidebar-v4.mjs';
await extractFrameSidebar({ check: true });
