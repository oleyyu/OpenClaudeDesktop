import React, { useState } from 'react';
import { folderName, pathBasename } from "./host-path-model.mjs";
import { Icon } from './icons';
import { Px as ProgressSection, Fx as EmptyOutputs } from './generated/current-chat/c21f11e6d-CxD82rYo.js';
import { j as Panel, N as Section, m as MergedContext, v as LayoutContext, _ as flatLayout, y as row } from './generated/current-chat/cc5a62f6f-BgHG1Ree.js';
import { itemDeliverables } from './source-deliverables.jsx';
import { planStepStatus } from './source-plan-checklist.jsx';
import { t } from '../electron/i18n/index.mjs';
import { SourceSpark } from './source-spark.jsx';
import { SourceSettingsButton } from './source-settings-button.jsx';
import './source-surfaces.css';

import { uj as Nb, cj as bannerOffset, fj as dockHeight, Dj as greetingSeat } from './generated/current-chat/shared-19-DmuztgN-.js';
import { Px as HomeColumn } from './generated/current-chat/shared-18-DaJGQi6_.js';
import { CN as HomeGreeting, homeColumnClass } from './generated/current-chat/shared-23-CuGEZNcW.js';
export { homeScrollClass } from './generated/current-chat/shared-23-CuGEZNcW.js';
// XI -> Px in installed shared-23/shared-18: the scrolling viewport and column are separate.
// Local transcripts keep their own scroll host when this is no longer a new page.
export function SourceSurfaceHome({ active, children }) {
  if (!active) return children;
  return <HomeColumn className={`surface-home-column ${homeColumnClass} ${Nb('home').columnTopOffsetClass} ${bannerOffset} ${dockHeight}`}>
    {children}
  </HomeColumn>;
}

// Render the original greeting component, including its cap-sized Spark, optical
// centering, responsive spacing, and text-change animation.
export function SourceSurfaceGreeting({ name }) {
  return <header className={`surface-greeting ${Nb('home').greetingSlotClass} ${greetingSeat(Nb('home').greetingPhoneSeat)}`}>
    <HomeGreeting layout={Nb('home').greetingLockup} text={name ? t('{name} returns!', { name }) : t('You’re here!')} />
  </header>;
}

export function coworkOutputs(items = []) {
  const files = new Map();
  for (const item of items) {
    for (const file of itemDeliverables(item) ?? []) files.set(file.path, file);
    if (item.type === 'fileChange' && item.status === 'completed') {
      for (const file of item.changes ?? []) {
        if (!file.path) continue;
        if (file.kind?.type === 'delete') files.delete(file.path);
        else files.set(file.path, { path: file.path });
      }
    }
  }
  return [...files.values()];
}

// Installed c21f11e6d SessionActivityPanel -> cc5a62f6f: original flat panel sections,
// progress timeline, fold behavior, typography and illustrations. Host supplies task data.
export function SourceCoworkProgress({ plan, items, cwd, running, sessionId, onOpenFile, onOpenFolder }) {
  const steps = Array.isArray(plan) ? plan : plan?.plan ?? [];
  const todos = steps.map(step => ({ ...step, content: step.content ?? step.step, status: planStepStatus(step.status) }));
  const files = coworkOutputs(items);
  const [progressOpen, setProgressOpen] = useState(true);
  const [outputsOpen, setOutputsOpen] = useState(true);
  return <aside className="cowork-progress cds-root" data-density="comfortable" aria-label={t('Task details')}>
    <MergedContext.Provider value={true}><LayoutContext.Provider value={flatLayout}>
      <Panel shrinkSections>
        <ProgressSection todos={todos} allTodosCompleted={todos.length > 0 && todos.every(step => step.status === 'completed')}
          isExpanded={progressOpen} setIsExpanded={setProgressOpen} headerHostedToggle
          conversationUuid={sessionId} sessionId={sessionId} isSessionActive={running}
          disableTodoCommentAttachment maxContentHeight="24rem" />
        <Section title={t('Outputs')} isExpanded={outputsOpen} onToggle={() => setOutputsOpen(value => !value)} maxContentHeight="24rem">
          {files.length ? files.map(file => <button key={file.path} className={row.button} onClick={() => onOpenFile(file.path)} title={file.path}>
            <span className={row.glyph}><Icon name="File" size={20} /></span><span className={row.name}>{pathBasename(file.path)}</span>
          </button>) : <EmptyOutputs />}
          {cwd && <button className={row.button} onClick={onOpenFolder} title={cwd} aria-label={t('Working folder')}>
            <span className={row.glyph}><Icon name="Folder" size={20} /></span><span className={row.name}>{folderName(cwd)}</span>
          </button>}
        </Section>
      </Panel>
    </LayoutContext.Provider></MergedContext.Provider>
  </aside>;
}

// Cowork while it is still in development (main COWORK_ENABLED off): this page instead of its home, with no composer,
// so no Cowork session can start; Code and Chat are one click away.
export function SourceCoworkComingSoon({ onMode }) {
  return <div className="cowork-soon" role="region" aria-labelledby="cowork-soon-title">
    <SourceSpark size={48} className="cowork-soon-spark" />
    <h1 id="cowork-soon-title" className="cowork-soon-title">{t('Cowork is in development')}</h1>
    <p className="cowork-soon-text">{t('It’s coming in a later release. For now, use Code to work in a project, or Chat to talk.')}</p>
    <div className="cowork-soon-actions">
      <SourceSettingsButton variant="primary" onClick={() => onMode?.('code')}>{t('Open Code')}</SourceSettingsButton>
      <SourceSettingsButton onClick={() => onMode?.('chat')}>{t('Open Chat')}</SourceSettingsButton>
    </div>
  </div>;
}
