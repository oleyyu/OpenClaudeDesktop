import React from 'react';
import { SidebarStatusGlyph, SidebarStatusLayout, sidebarStatusMessages } from './generated/code-current/sidebar-status-glyph.mjs';
import { SidebarErrorLabel } from './source-sidebar-error-adapters.jsx';
import { useStartIntl } from './source-code-start-adapters.jsx';
import { t } from '../electron/i18n/index.mjs';
import { sidebarPrStateLabel } from './generated/code-current/sidebar-pr-icon.mjs';
import { sidebarPrMessages } from './generated/code-current/sidebar-pr-card.mjs';
import { sidebarEnvironmentLabel } from './generated/code-current/sidebar-details-view.mjs';

// The error mark (status glyph UD) and its label context live in source-sidebar-error-adapters.jsx.
export { SidebarCodeErrorGlyph } from './source-sidebar-error-adapters.jsx';

// cq places the visible mark in an aria-hidden decoration and announces it
// once inside the row label. Keeping those separate also survives hover/menu
// replacement of the mark by the row's More control.
export function CodeSessionStatusMark({ view }) {
  if (!view.mark) return null;
  return <SidebarErrorLabel.Provider value={view.errorLabel}>
    <SidebarStatusLayout.Provider value={{}}>
      <SidebarStatusGlyph state={view.mark} errorCategory={view.errorCategory} errorSurface="code" live={false} />
    </SidebarStatusLayout.Provider>
  </SidebarErrorLabel.Provider>;
}
export function CodeSessionStatusAnnouncement({ view, pr, env }) {
  const intl = useStartIntl();
  const label = view.mark === 'error' ? view.errorLabel ?? t('Something went wrong')
    : view.mark ? intl.formatMessage(view.mark === 'awaiting' ? sidebarStatusMessages.awaitingPermission : sidebarStatusMessages[view.mark]) : null;
  return <><span role="status" className="sr-only [[role=tooltip]_&]:hidden" data-find-omitted="">{label === null ? null : ` ${label}`}</span>
    {(pr || env) && <span className="sr-only [[role=tooltip]_&]:hidden" data-find-omitted=""> {[
      env ? sidebarEnvironmentLabel(intl, env) : undefined,
      pr ? sidebarPrStateLabel(intl, pr.state) : undefined, pr?.entries.length > 1 ? intl.formatMessage(sidebarPrMessages.prCount, { count: pr.entries.length }) : undefined,
    ].filter(Boolean).join(' · ')}</span>}
    {view.archived && <span className="sr-only"> {t('Archived')}</span>}</>;
}
