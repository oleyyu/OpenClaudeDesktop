import React, { createContext, useContext } from 'react';
import { SidebarStatusLabel, sidebarErrorKind, sidebarErrorShapes, sidebarErrorColors } from './generated/code-current/sidebar-status-glyph.mjs';
import { NestedErrorIcon } from './generated/code-current/nested-session-parts.mjs';
import { t } from '../electron/i18n/index.mjs';

// shared-18 ZD (SidebarStatusGlyph) draws the error mark through UD. That host seam lives on its own so the status
// glyph's import graph never reaches the row-details view: 2.42304.0 shared-20 kE reads the PR card's messages
// (OE.selfHosted) while its module initialises, and the old status-adapters -> details-view -> pr-card -> status-glyph
// cycle would evaluate it before the PR card. Only render-time references cross the status-glyph <-> adapter edge.
export const SidebarErrorLabel = createContext(undefined);
export function SidebarCodeErrorGlyph({ errorCategory, live, tooltip }) {
  const label = useContext(SidebarErrorLabel) ?? t('Something went wrong');
  const kind = sidebarErrorKind(errorCategory);
  return <SidebarStatusLabel label={label} live={live} tooltip={tooltip}>
    <NestedErrorIcon color={sidebarErrorColors[kind]} shape={sidebarErrorShapes[kind]} />
  </SidebarStatusLabel>;
}
