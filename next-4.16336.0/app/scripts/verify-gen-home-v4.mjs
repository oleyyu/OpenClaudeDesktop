// Checks the 4.16336.0 Chat greeting / Cowork home graph (scripts/extract-home-v4.mjs -> src/generated/home-chat-cowork):
// source pins, the AST-located roots and their declaration hashes, the finalized cds-core manifest pin, then a byte
// check of every generated file (prepare:ui runs every verify-gen-*.mjs).
import { extractHomeV4 } from './extract-home-v4.mjs';
await extractHomeV4({ check: true });
