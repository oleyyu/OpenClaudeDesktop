// The Settings dialog's layers. Settings draws its backdrop at z 500 (.ss-backdrop); a host SourceDialog opened from a
// Settings page passes SETTINGS_LAYER (or SETTINGS_CONFIRM_LAYER for a confirm that may open over another such dialog),
// since without one it falls to MODAL_LAYER (z 140) under Settings. CDS parts take their layer from React context
// instead, and there are two graphs with their own context: cds-core (4.16336.0 host wiring) and the 3.6556.2 view-tabs
// slices (Cowork's page, code-routines' WorkspaceTrustDialog). SettingsCdsLayers gives both the Settings base.
import React from 'react';
import { CdsLayerProvider } from './cds-core.mjs';
import { CdsLayerProvider as ViewTabsLayerProvider } from './generated/view-tabs/shared-frame-6jtSkIit.js';

export const SETTINGS_BASE = 500;
export const SETTINGS_LAYER = Object.freeze({ base: 520, z: 520 });
export const SETTINGS_CONFIRM_LAYER = Object.freeze({ base: 520, z: 560 });

export function SettingsCdsLayers({ children }) {
  return <CdsLayerProvider base={SETTINGS_BASE}><ViewTabsLayerProvider base={SETTINGS_BASE}>{children}</ViewTabsLayerProvider></CdsLayerProvider>;
}
