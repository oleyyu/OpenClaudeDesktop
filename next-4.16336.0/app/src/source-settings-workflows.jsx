// Settings › Code › Dynamic workflows, modeled on Claude Code 2.1.280's settings (enableWorkflows / disableWorkflows,
// workflowKeywordTriggerEnabled, workflowSizeGuideline and the CLAUDE_CODE_WORKFLOW_* variables) plus OpenClaude Desktop's
// per-core Workflow engine. One master switch; the rest shows only while it is on, and the tuning rows stay behind a
// collapsed Advanced disclosure. The environment and managed settings win over every row (prefs/workflow-settings.mjs);
// a row they decide says so and is read-only.
import React from 'react';
import { t } from '../electron/i18n/index.mjs';
import { SourceSwitch as SettingSwitch } from './source-switch.jsx';
import { SourceSelect } from './source-select.jsx';
import { NumberField } from './source-settings-models.jsx';
import { SourceSettingsButton } from './source-settings-button.jsx';
import { resolveWorkflowSettings, envBool, WORKFLOW_RANGES, WORKFLOW_DEFAULTS } from '../electron/prefs/workflow-settings.mjs';
import { hasNativeWorkflowEngine, workflowEngineChoice } from './session-command-model.mjs';
import { coreName, coreForEngine, coreSandboxed } from '../electron/core-registry.mjs';
import { SavedWorkflowsList } from './source-saved-workflows.jsx';

/** The effective workflow settings for the renderer: saved config, plus what main reported of the environment. */
export function workflowSettingsFor(boot, config, { coreId, models } = {}) {
  return resolveWorkflowSettings({ config: config || boot?.config || {}, env: boot?.workflowEnv || {}, managed: boot?.workflowManaged || {}, parallelism: boot?.workflowParallelism ?? 4,
    coreId, models: Array.isArray(models) && models.length ? models.map((model) => model?.model).filter((id) => typeof id === 'string') : null });
}

const envNote = (entry) => entry?.source === 'env' ? t('Set by {variable}.', { variable: entry.variable }) : '';

/**
 * The Dynamic workflows group. ctx: {config, boot, engine (settingsCore), shownValue, save, commit, rowErrors,
 * setRowErrors, models, advanced, setAdvanced}.
 */
export function workflowSettingsGroup({ config, boot, engine, shownValue, save, rowErrors = {}, setRowErrors, models = [], advanced, setAdvanced, desktopCall = null, cwd = null }) {
  const shown = (key) => shownValue(key, config[key]);
  // The Workflow agents' model is saved per core (workflowSubagentModels[core id]).
  const coreId = coreForEngine(typeof engine === 'string' ? engine : engine?.engine).id;
  const resolved = workflowSettingsFor(boot, { ...config, ...Object.fromEntries(['dynamicWorkflows', 'workflowKeywordTrigger', 'workflowSizeGuideline', 'workflowPromptProvenance', 'workflowEngines', 'workflowMaxConcurrentAgents', 'workflowStructuredOutputRetries', 'workflowPrefixStaggerMs', 'workflowSizeWarningAgents', 'workflowSizeWarningTokens', 'workflowSubagentModel', 'workflowSubagentModels'].map((key) => [key, shown(key)]).filter(([, value]) => value !== undefined)) }, { coreId, models });
  const row = (id, label, description, control, extra = {}) => ({ id, label, description, control, searchText: typeof description === 'string' ? description : '', ...extra });
  // Only a hard off from the environment locks the switch (CLAUDE_CODE_DISABLE_WORKFLOWS, CLAUDE_CODE_WORKFLOWS=false):
  // CLAUDE_CODE_WORKFLOWS=true just makes them on by default, so the user can still turn them off (Claude Code 2.1.280).
  const masterNote = resolved.disabledBy === 'managed' ? t('Turned off by your organization’s managed settings.')
    : resolved.disabledBy === 'env' ? t('Set by {variable}.', { variable: envBool(boot?.workflowEnv?.CLAUDE_CODE_DISABLE_WORKFLOWS) === true ? 'CLAUDE_CODE_DISABLE_WORKFLOWS' : 'CLAUDE_CODE_WORKFLOWS' }) : '';
  const rows = [
    row('dynamicWorkflows', t('Dynamic workflows'),
      <>{t('Let DeepSeek write scripts that run many agents in parallel for complex tasks. Workflows can use a lot of your usage limit quickly.')}{masterNote && <span className="ss-workflow-note"> {masterNote}</span>}</>,
      <SettingSwitch label={t('Dynamic workflows')} checked={resolved.enabled} disabled={!!masterNote} onChange={(value) => save('dynamicWorkflows', value)} />,
      { searchText: t('Let DeepSeek write scripts that run many agents in parallel for complex tasks.') }),
  ];
  if (!resolved.enabled) return { tab: 'code', title: 'Dynamic workflows', rows };
  // Workflow engine: a core with its own engine (capabilities.modelWorkflows) lets the user pick; saved per core.
  const id = coreForEngine(typeof engine === 'string' ? engine : engine?.engine).id, name = coreName(engine);
  // On the core's own engine the runner-only rows below change nothing (only OpenClaude Desktop's runner reads them): they
  // are read-only there and say so.
  const nativeEngine = hasNativeWorkflowEngine(engine) && workflowEngineChoice(engine, shown('workflowEngines')) === 'native';
  const runnerNote = nativeEngine ? t('{core}’s own engine doesn’t use this setting. Choose OpenClaude Desktop as the Workflow engine to apply it.', { core: name }) : '';
  // A core without a command sandbox (ZCode, an ACP agent without sandbox-exec): OpenClaude Desktop's engine runs its agents
  // with approvals off, so outside Bypass the agent refuses every command that could change something.
  const unconfinedNote = coreSandboxed(engine) === false ? t('Outside Bypass permissions, these workflow agents can run only read-only commands: {core} has no sandbox to run the others in.', { core: name }) : '';
  const withNote = (text) => unconfinedNote ? <>{text}<span className="ss-workflow-note"> {unconfinedNote}</span></> : text;
  if (hasNativeWorkflowEngine(engine)) {
    const choice = workflowEngineChoice(engine, shown('workflowEngines'));
    const engineText = choice === 'native' ? t('{core} runs workflows with its own engine and tools. The Tasks pane shows them either way.', { core: name })
      : t('OpenClaude Desktop runs {core}’s workflows: its own workflow tool is hidden from the model.', { core: name });
    rows.push(row('workflowEngine', t('Workflow engine'), choice === 'native' ? engineText : withNote(engineText),
    <SourceSelect label={t('Workflow engine')} align="end" className="sselect-width-220" value={choice}
      onChange={(value) => save('workflowEngines', { ...(shown('workflowEngines') || {}), [id]: value === 'codeDesktop' ? 'codeDesktop' : null }, 'workflowEngine')}
      items={[{ value: 'native', label: t('{core}’s own workflows (default)', { core: name }) }, { value: 'codeDesktop', label: t('OpenClaude Desktop') }]} />, { indent: true, searchText: engineText }));
  } else {
    rows.push(row('workflowEngine', t('Workflow engine'), withNote(t('{core} has no workflow engine of its own, so OpenClaude Desktop runs its workflows.', { core: name })), <span>{t('OpenClaude Desktop')}</span>,
      { indent: true, searchText: t('{core} has no workflow engine of its own, so OpenClaude Desktop runs its workflows.', { core: name }) }));
  }
  // A row an administrator's managed settings decide (workflowKeywordTriggerEnabled, workflowSizeGuideline): locked.
  const managedNote = t('Set by your organization’s managed settings.');
  const managedText = (text, locked) => locked ? <>{text}<span className="ss-workflow-note"> {managedNote}</span></> : text;
  rows.push(
    row('workflowKeywordTrigger', t('Ultracode keyword trigger'), managedText(t('Including the keyword “ultracode” in a message opts that turn into a dynamic workflow.'), resolved.managed?.keywordTrigger),
      <SettingSwitch label={t('Ultracode keyword trigger')} checked={resolved.keywordTrigger} disabled={!!resolved.managed?.keywordTrigger} onChange={(value) => save('workflowKeywordTrigger', value)} />,
      { indent: true, searchText: t('Including the keyword “ultracode” in a message opts that turn into a dynamic workflow.') }),
    row('workflowSizeGuideline', t('Dynamic workflow size'), managedText(t('How many agents a workflow should aim for. A guideline for DeepSeek, not a hard limit.'), resolved.managed?.sizeGuideline),
      <SourceSelect label={t('Dynamic workflow size')} align="end" className="sselect-width-220" value={resolved.sizeGuideline} disabled={!!resolved.managed?.sizeGuideline} onChange={(value) => save('workflowSizeGuideline', value)}
        items={[{ value: 'unrestricted', label: t('Unrestricted'), description: t('No size guideline') },
          { value: 'small', label: t('Small'), description: t('Fewer than 5 agents') },
          { value: 'medium', label: t('Medium'), description: t('Fewer than 10 agents (default)') },
          { value: 'large', label: t('Large'), description: t('Fewer than 50 agents') }]} />, { indent: true, searchText: t('How many agents a workflow should aim for. A guideline for DeepSeek, not a hard limit.') }),
    // The saved workflows the chosen engine runs (OpenClaude Desktop's .claude/workflows, or the core's own library: ZCode's
    // .zcode/workflows), with their arguments, file and, for a core library, delete and run history.
    ...(desktopCall ? [row('workflowSaved', t('Saved workflows'), t('Workflows saved for this project and for all your projects. Run one with /<name> in a session.'), null,
      { indent: true, searchText: t('Workflows saved for this project and for all your projects. Run one with /<name> in a session.'),
        below: <SavedWorkflowsList desktopCall={desktopCall} cwd={cwd} connected={!!boot?.connected} revision={JSON.stringify(shown('workflowEngines') ?? null)} /> })] : []),
    // A disclosure row (caret), not a Show / Hide text button: the tuning rows open beneath it.
    row('workflowAdvanced', t('Advanced'), t('Concurrency, retries and other runner details.'),
      <SourceSettingsButton size="sm" variant="ghost" iconOnly icon={advanced ? 'CaretUp' : 'CaretDown'} iconSize={16} aria-label={t('Advanced')} title={t('Advanced')}
        aria-expanded={advanced} onClick={() => setAdvanced(!advanced)} />, { indent: true }),
  );
  if (!advanced) return { tab: 'code', title: 'Dynamic workflows', rows };
  // A numeric row: blank is the default (shown as the placeholder); the environment variable, when set, decides.
  const numberRow = (key, label, description, { placeholder, step = 1, runnerOnly = false } = {}) => {
    const entry = resolved[{ workflowMaxConcurrentAgents: 'maxConcurrentAgents', workflowStructuredOutputRetries: 'structuredOutputRetries', workflowPrefixStaggerMs: 'prefixStaggerMs', workflowSizeWarningAgents: 'sizeWarningAgents', workflowSizeWarningTokens: 'sizeWarningTokens' }[key]];
    const [min, max] = WORKFLOW_RANGES[key], fromEnv = entry?.source === 'env';
    // A value the field refuses is a validation message of its own (rowErrors[`${key}:invalid`]), kept apart from
    // rowErrors[key], which SettingRow reads as a failed save ('Couldn’t save the setting. Try again.'): one bad value
    // shows one message. It goes away as soon as the field is edited again or a valid value is saved.
    const invalidKey = `${key}:invalid`, validation = rowErrors[invalidKey], unused = runnerOnly && !!runnerNote;
    const clearValidation = () => { if (validation) setRowErrors?.((errors) => { const next = { ...errors }; delete next[invalidKey]; return next; }); };
    return row(key, label, <>{description}{fromEnv && <span className="ss-workflow-note"> {envNote(entry)}</span>}{unused && <span className="ss-workflow-note"> {runnerNote}</span>}</>,
      <NumberField label={label} className="ss-workflow-number" min={min} max={max} step={step} disabled={fromEnv || unused} invalid={!!rowErrors[key]}
        value={fromEnv ? entry.value : shown(key)} placeholder={placeholder} onEdit={clearValidation}
        onCommit={(text, revert) => {
          const value = text.trim() === '' ? null : Number(text.trim());
          if (value !== null && !(Number.isInteger(value) && value >= min && value <= max)) { setRowErrors?.((errors) => ({ ...errors, [invalidKey]: t('Enter a whole number from {min} to {max}.', { min, max }) })); revert(); return; }
          clearValidation();
          save(key, value);
        }} />,
      { indent: true, searchText: description, ...(validation ? { below: <span className="ss-row-error" data-validation="" role="alert">{validation}</span> } : {}) });
  };
  rows.push(
    numberRow('workflowMaxConcurrentAgents', t('Agents running at once'), t('Workflow agents that run at the same time; more wait for a slot. Empty is automatic.'), { placeholder: t('Auto ({count})', { count: resolved.maxConcurrentAgents.auto }), runnerOnly: true }),
    numberRow('workflowStructuredOutputRetries', t('Structured result retries'), t('Invalid structured results an agent may correct before it fails.'), { placeholder: String(WORKFLOW_DEFAULTS.structuredOutputRetries), runnerOnly: true }),
    numberRow('workflowPrefixStaggerMs', t('Prefix stagger (ms)'), t('Agents sharing a prompt prefix wait this long for the first reply, to reuse its cache. 0 turns it off.'), { placeholder: String(WORKFLOW_DEFAULTS.prefixStaggerMs), step: 100, runnerOnly: true }),
    row('workflowPromptProvenance', t('Prompt provenance'), <>{t('Mark each agent’s task as computed by the script, not typed by you.')}{resolved.promptProvenance.source === 'env' && <span className="ss-workflow-note"> {envNote(resolved.promptProvenance)}</span>}{runnerNote && <span className="ss-workflow-note"> {runnerNote}</span>}</>,
      <SettingSwitch label={t('Prompt provenance')} checked={resolved.promptProvenance.value} disabled={resolved.promptProvenance.source === 'env' || !!runnerNote} onChange={(value) => save('workflowPromptProvenance', value)} />,
      { indent: true, searchText: t('Mark each agent’s task as computed by the script, not typed by you.') }),
    numberRow('workflowSizeWarningAgents', t('Large workflow warning: agents'), t('The Tasks pane warns when a run schedules more agents than this.'), { placeholder: String(WORKFLOW_DEFAULTS.sizeWarningAgents) }),
    numberRow('workflowSizeWarningTokens', t('Large workflow warning: tokens'), t('…or when its tokens pass this.'), { placeholder: WORKFLOW_DEFAULTS.sizeWarningTokens.toLocaleString('en-US'), step: 1000 }),
    row('workflowSubagentModel', t('Workflow agents’ model'), <>{t('Used unless a script picks a model for an agent.')}{resolved.subagentModel.source === 'env' && <span className="ss-workflow-note"> {envNote(resolved.subagentModel)}</span>}{resolved.subagentModel.force && <span className="ss-workflow-note"> {t('CLAUDE_CODE_SUBAGENT_MODEL_FORCE is set: a model a script picks for an agent is ignored.')}</span>}{resolved.subagentModel.unavailable && resolved.subagentModel.source !== 'env' && <span className="ss-workflow-note"> {t('{model} isn’t available on {core}, so workflow agents use the session model.', { model: resolved.subagentModel.unavailable, core: coreName(engine) })}</span>}{runnerNote && <span className="ss-workflow-note"> {runnerNote}</span>}</>,
      <SourceSelect label={t('Workflow agents’ model')} align="end" className="sselect-width-220" disabled={resolved.subagentModel.source === 'env' || !!runnerNote}
        value={resolved.subagentModel.source === 'env' ? resolved.subagentModel.value : resolved.subagentModel.value || ''}
        onChange={(value) => save('workflowSubagentModels', { ...(shown('workflowSubagentModels') || {}), [coreId]: value || null }, 'workflowSubagentModel')}
        items={[{ value: '', label: t('Session model') }, ...models.map((model) => ({ value: model.model, label: model.displayName || model.model })),
          ...(resolved.subagentModel.source === 'env' && !models.some((model) => model.model === resolved.subagentModel.value) ? [{ value: resolved.subagentModel.value, label: resolved.subagentModel.value }] : [])]} />,
      { indent: true, searchText: t('Used unless a script picks a model for an agent.') }),
  );
  // Workflow(<name>) rules (Claude Code's /permissions): "Yes, and don’t ask again" adds an allow; each can be removed
  // here so that workflow asks again. Ask and deny rules (managed or hand-written) are listed read-only.
  // Managed ones (the organization's permissions) are listed too, marked, and never removable here; a removal saves
  // the user's own rules only.
  const rules = resolved.rules ?? { allow: [], ask: [], deny: [] };
  const userRules = resolved.userRules ?? rules;
  const managedRules = resolved.managed?.rules ?? { allow: [], ask: [], deny: [] };
  const ruleName = (name) => name === '*' ? t('Every workflow') : name;
  const listed = [...rules.allow.map((name) => ({ name, behavior: 'allow' })), ...rules.ask.map((name) => ({ name, behavior: 'ask' })), ...rules.deny.map((name) => ({ name, behavior: 'deny' }))]
    .map((entry) => ({ ...entry, managed: managedRules[entry.behavior]?.includes(entry.name) && !userRules[entry.behavior]?.includes(entry.name) }));
  rows.push(row('workflowRules', t('Allowed workflows'), t('Saved workflows you chose to run without asking. Remove one to be asked again.'),
    listed.length ? null : <span className="ss-workflow-rules-empty">{t('None')}</span>,
    { indent: true, searchText: t('Saved workflows you chose to run without asking. Remove one to be asked again.'),
      ...(listed.length ? { below: <ul className="ss-workflow-rules" aria-label={t('Allowed workflows')}>{listed.map(({ name, behavior, managed }) => (
        <li key={`${behavior}:${name}`}>
          <span className="ss-workflow-rule-name">{ruleName(name)}</span>
          {behavior === 'allow' && !managed
            ? <SourceSettingsButton size="sm" variant="secondary" aria-label={t('Remove {name}', { name: ruleName(name) })}
                onClick={() => save('workflowRules', { ...userRules, allow: userRules.allow.filter((entry) => entry !== name) })}>{t('Remove')}</SourceSettingsButton>
            : <span className="ss-workflow-rule-kind">{behavior === 'allow' ? t('Always allowed') : behavior === 'ask' ? t('Always asks') : t('Blocked')}{managed ? ` · ${t('Set by your organization')}` : ''}</span>}
        </li>))}</ul> } : {}) }));
  return { tab: 'code', title: 'Dynamic workflows', rows };
}
