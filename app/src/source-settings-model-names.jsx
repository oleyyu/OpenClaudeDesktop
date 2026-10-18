// Settings › Models per-model options: each listed model is a collapsible entry (name, Default badge, efforts) whose
// rows are its everyday options, all keyed on the running core's id:
//   Display name     preferences modelNames (prefs/model-names.mjs), applied by model-names-model.mjs namedModels
//                    to the model menu, the composer / environment-bar model buttons, Home and session rows;
//   Image input      modelSettings params images:false (prefs/model-settings.mjs withModelOverrides): the composer
//                    keeps images out (composer-attachments-model modelAcceptsImages); a catalog that lists the model
//                    as text only can't be overridden, since the core drops images for it;
//   Default effort, Context window, Max output tokens, Temperature: the page's own rows (source-settings-models.jsx),
//                    the last three only on a core that reads them (coreTakesModelParams).
import React, { useState } from 'react';
import { SettingRow } from './source-settings-kit.jsx';
import { SourceDisclosure } from './source-disclosure.jsx';
import { SourceSettingsButton } from './source-settings-button.jsx';
import { customModelName, modelNameError, normalizeModelNames, setModelName, MODEL_NAME_MAX } from '../electron/prefs/model-names.mjs';
import { t } from '../electron/i18n/index.mjs';

/** The catalog's own name of a model/list entry (the id when it has none). */
export const defaultModelName = model => (typeof model?.displayName === 'string' && model.displayName.trim()) || model?.model || model?.id || '';

/**
 * The Display name field: saves on blur or Enter (Escape puts the saved name back), Reset clears it. names is the saved
 * modelNames; onSave({modelNames}) is the page's preference save.
 */
export function ModelNameField({ model, names, coreId, onSave, onError }) {
  const [pending, setPending] = useState(undefined);
  const fallback = defaultModelName(model), saved = customModelName(normalizeModelNames(pending === undefined ? names : pending), coreId, model.model);
  const save = async text => {
    let next;
    try { next = setModelName(pending === undefined ? names : pending, coreId, model.model, text); }
    catch (error) { onError?.(error?.message || String(error)); return; }
    setPending(next ?? {}); onError?.(null);
    try { await onSave({ modelNames: next ?? null }); }
    catch (error) { console.warn('Couldn’t save the model name:', error); onError?.(error?.message || String(error)); }
    finally { setPending(undefined); }
  };
  return <span className="msx-name-control">
    <input data-cds="TextInput" className="cds-input cds-reset msx-text" aria-label={t('{name} display name', { name: fallback })} placeholder={fallback}
      defaultValue={saved ?? ''} key={saved ?? ''} maxLength={MODEL_NAME_MAX} spellCheck={false} autoComplete="off"
      onBlur={event => {
        const text = event.currentTarget.value.trim();
        if (text === (saved ?? '') || (!saved && text === fallback)) { event.currentTarget.value = saved ?? ''; return; }
        const error = modelNameError(text);
        if (error) { onError?.(error); return; }
        void save(text === fallback ? '' : text);
      }}
      onKeyDown={event => {
        if (event.key === 'Enter') event.currentTarget.blur();
        else if (event.key === 'Escape' && event.currentTarget.value !== (saved ?? '')) { event.preventDefault(); event.stopPropagation(); event.currentTarget.value = saved ?? ''; }
      }}/>
    {saved && <SourceSettingsButton size="sm" variant="ghost" aria-label={t('Reset {name} display name', { name: fallback })} onClick={() => void save('')}>{t('Reset')}</SourceSettingsButton>}
  </span>;
}

/**
 * One model's entry: the header (custom name, the catalog name and id when they differ, badges, the efforts line)
 * opens its option rows. Open at first when one of its options is already set.
 */
export function ModelOptionsEntry({ model, name, defaultName, badges = null, description = null, rows = [], rowErrors = {}, customized = false }) {
  const label = <span className="msx-model-head">
    <span className="msx-model-name text-body settings-row-title">{name}{badges}</span>
    {(name !== defaultName || defaultName !== model.model) && <span className="msx-model-ids">
      {name !== defaultName && <span>{defaultName}</span>}{defaultName !== model.model && <code className="msx-name-id">{model.model}</code>}</span>}
    {description}
  </span>;
  return <div className="msx-model-entry" data-setting-id={`model-${model.model}`} data-model-options={model.model}>
    <SourceDisclosure className="msx-model-disclosure" triggerClassName="msx-model-trigger" defaultOpen={customized} label={label}
      ariaLabel={t('{name} options', { name })}>
      <div className="settings-group-dividers msx-model-rows">{rows.map(row => <SettingRow key={row.id} row={row} error={rowErrors[row.id]}/>)}</div>
    </SourceDisclosure>
  </div>;
}
