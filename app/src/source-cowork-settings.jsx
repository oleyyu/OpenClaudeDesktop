import React from 'react';
import { CoworkSettingsPage } from './generated/cowork-settings/index.mjs';
import { CoworkSettingsHostProvider, useCoworkSettingsHostValue } from './source-cowork-settings-adapters.jsx';

// w13-coworkui-settings (research/w13-coworkui.md §1.5, cwui-38..42): Settings › Cowork, the 3.6556.2 page itself
// (c71860c77 De, generated into src/generated/cowork-settings). Official nav (shared-46): `e.push({id:"cowork",
// href:"/settings/cowork",…,icon:Fp})` with Fp = Tasks, right after Claude Code. On this computer the page shows, in De's
// order: Cowork files (cfea69990 P), Trusted Cowork folders (cabd7b1c1 se), Open links in built-in browser and Allowed
// sites (cdc95db1a f / p), Global instructions (ced6780ff ye) and Memory (c71860c77 me). Dispatch, trusted devices, the
// guest pass and the session-host toggle need a claude.ai account and render nothing (src/source-cowork-settings-adapters.jsx).
// Global instructions is config.customInstructions.global, the same text Settings › Instructions edits.
export function SourceCoworkSettings({ config, desktopCall, onSave }) {
  const value = useCoworkSettingsHostValue({ config, call: desktopCall, onSave });
  return <CoworkSettingsHostProvider value={value}><CoworkSettingsPage/></CoworkSettingsHostProvider>;
}
