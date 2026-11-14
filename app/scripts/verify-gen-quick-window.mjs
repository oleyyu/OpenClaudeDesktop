import { extractQuickWindow } from './extract-quick-window.mjs';
// U-QUICK-ENTRY: the official Quick Entry page slices (electron/generated/quick-window-official.cjs) match the frozen
// 4.16336.0 snapshot byte for byte.
await extractQuickWindow({ check: true });
