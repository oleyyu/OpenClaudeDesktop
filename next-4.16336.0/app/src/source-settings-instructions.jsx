import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createManualTextSave } from './manual-text-save.mjs';
import { SourceSettingsButton } from './source-settings-button.jsx';
import { SourceSwitch } from './source-switch.jsx';
import { SourceSelect } from './source-select.jsx';
import { SettingsGroup, settingRow } from './source-settings-kit.jsx';
import { INSTRUCTIONS_MAX_CHARS, normalizeInstructions, projectInstructionsFor, withProjectInstructions, instructionsProjectList } from '../electron/prefs/instructions.mjs';
import { getLocale, t, tn } from '../electron/i18n/index.mjs';
import './source-profile-setting.css';
import './instructions-settings.css';
import { coreCapabilities, coreForEngine, coreName, coreSupports } from '../electron/core-registry.mjs';

// C1 Settings → Instructions. On the DeepSeek core the global instructions ARE
// the whole system prompt (empty = the built-in prompt); project instructions
// follow it. On Codex both are appended to Codex's own prompt. Every save
// sends the whole customInstructions object (read-modify-write over the saved
// config).

// Counts follow the UI language (getLocale), read at render so a language switch applies.
const countLabel = n => Number.isFinite(INSTRUCTIONS_MAX_CHARS) ? `${n.toLocaleString(getLocale())} / ${INSTRUCTIONS_MAX_CHARS.toLocaleString(getLocale())}` : tn(n, '{count} character', '{count} characters', { count: n.toLocaleString(getLocale()) });
const baseName = p => (p === '/' ? '/' : p.split('/').filter(Boolean).at(-1) || p);
// Paths read ~-abbreviated, as on the Commands and Cores pages (the full path stays in the title).
const homePath = p => String(p || '').replace(/^\/Users\/[^/]+(?=\/|$)/, '~');
// 'AGENTS.md and CLAUDE.md' / 'GEMINI.md': the distinct file names a core reads, joined in the UI language.
export const instructionFileNames = files => {
  const names = [...new Set(files.map(file => baseName(file.path)))];
  try { return new Intl.ListFormat(getLocale(), { type: 'conjunction' }).format(names); } catch { return names.join(', '); }
};
const sizeLabel = bytes => (bytes < 1024 ? tn(bytes, '{count} byte', '{count} bytes') : `${(bytes / 1024).toFixed(1)} KB`);
export const GLOBAL_NOTE = {
  deepseek: t('This is the whole system prompt. Leave empty to use the built-in default. {{model}} and {{cwd}} are filled in.'),
  codex: t('Added to Codex’s built-in prompt for every project. The Codex core can’t replace its own system prompt.'),
};
export const TOOLS_NOTE = t('Your text replaces the built-in tool guidance too. Tools stay available to the agent, but it may use them less well without that guidance.');
export const WHEN_IT_APPLIES = {
  deepseek: t('Changes apply from your next message in any session, including sessions that are already open.'),
  codex: t('Changes apply to new sessions and to sessions reopened after a restart.'),
};

/** Large manual-save textarea (SourceProfileSetting pattern) with a character count. */
export function InstructionsEditor({ label, value, onSave, placeholder, disabled = false, seed = null, actions = null }) {
  const [draft, setDraft] = useState(value), [status, setStatus] = useState({ saving: false, error: '' });
  const latest = useRef({ value, onSave }), edited = useRef(false), owner = useRef(null), field = useRef(null);
  const countId = useId(), errorId = useId(); latest.current = { value, onSave };
  useLayoutEffect(() => {
    const controller = createManualTextSave({
      save: text => latest.current.onSave(text),
      validate: text => { if (text.length > INSTRUCTIONS_MAX_CHARS) throw new Error(t('Instructions must be {limit} characters or fewer.', { limit: LIMIT_LABEL })); },
      onState: setStatus,
    });
    owner.current = controller; return () => { controller.dispose(); owner.current = null; };
  }, []);
  useEffect(() => { setDraft(current => { if (!edited.current) return value; if (current === value) edited.current = false; return current; }); }, [value]);
  // seed {text, n}: replace the draft (unsaved) with text, e.g. the built-in default to start from.
  useEffect(() => { if (!seed) return; edited.current = seed.text !== latest.current.value; setDraft(seed.text); owner.current?.edit(); field.current?.focus(); }, [seed?.n]);
  const dirty = draft !== value, over = draft.length > INSTRUCTIONS_MAX_CHARS;
  // c0db37792 Wt: the size warning (ot) shows only near the limit (here from 80%); with no limit there's no counter.
  const nearLimit = Number.isFinite(INSTRUCTIONS_MAX_CHARS) && draft.length >= INSTRUCTIONS_MAX_CHARS * 0.8;
  return <form className="ss-profile-setting ins-editor" onSubmit={event => { event.preventDefault(); event.stopPropagation(); if (dirty) void owner.current?.submit(draft); }}>
    <textarea ref={field} data-cds="TextArea" className="ins-textarea" aria-label={label} rows={3} spellCheck={false} value={draft} placeholder={placeholder} disabled={disabled}
      aria-invalid={status.error || over ? true : undefined} data-invalid={status.error || over ? '' : undefined}
      aria-describedby={[nearLimit ? countId : '', status.error ? errorId : ''].filter(Boolean).join(' ') || undefined}
      onChange={event => { edited.current = status.saving || event.currentTarget.value !== latest.current.value; setDraft(event.currentTarget.value); owner.current?.edit(); }}
      onKeyDown={event => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
    {(nearLimit || dirty || actions) && <div className="ins-editor-footer">
      {nearLimit ? <span id={countId} className="ins-count" data-over={over || undefined}>{countLabel(draft.length)}</span> : <span/>}
      {actions && !dirty && <div className="ss-profile-actions ins-editor-actions" data-size="sm">{actions}</div>}
      {dirty && <div className="ss-profile-actions" data-size="sm">
        <SourceSettingsButton variant="ghost" size="sm" disabled={status.saving} onClick={() => { owner.current?.edit(); edited.current = false; setDraft(latest.current.value); field.current?.focus(); }}>{t('Revert')}</SourceSettingsButton>
        <SourceSettingsButton type="submit" variant="primary" size="sm" busy={status.saving} disabled={over}>{t('Save')}</SourceSettingsButton>
      </div>}
    </div>}
    {status.error && <span id={errorId} className="ss-row-error" role="alert" title={status.error}>{t('Couldn’t save the setting. Try again.')}</span>}
  </form>;
}

export function SourceInstructionsSettings({ config = {}, boot = null, engine, desktopCall, onSave, cwd, threadId = null, model }) {
  const saved = normalizeInstructions(config.customInstructions);
  const [optimistic, setOptimistic] = useState(null), [rowErrors, setRowErrors] = useState({});
  const shown = optimistic ?? saved;
  const projects = instructionsProjectList(cwd, config.threadMetadata);
  const [project, setProject] = useState(() => projects[0] ?? null);
  useEffect(() => { if (project === null && projects[0]) setProject(projects[0]); }, [projects[0]]);
  const [preview, setPreview] = useState(null), [previewError, setPreviewError] = useState(''), [fileBusy, setFileBusy] = useState('');
  const savedKey = JSON.stringify(config.customInstructions ?? null);
  const previewSeq = useRef(0);
  const refresh = async () => {
    const seq = ++previewSeq.current;
    if (!project || !desktopCall) { setPreview(null); return; }
    try {
      const result = await desktopCall('instructions', { op: 'preview', cwd: project });
      if (seq === previewSeq.current) { setPreview(result); setPreviewError(''); }
    } catch (error) {
      if (seq === previewSeq.current) { setPreview(null); setPreviewError(error?.message || String(error)); }
    }
  };
  useEffect(() => { void refresh(); }, [project, savedKey]);
  // The instruction files the running core loads itself (instructions-service coreInstructionFiles), for the project:
  // the DeepSeek core's AGENTS.md / CLAUDE.md chain, Qwen's QWEN.md, Gemini's GEMINI.md, Codex's, MiniMax's, OpenCode's
  // and MiMo's AGENTS.md / CLAUDE.md. The service answers [] for a core it doesn't know, which hides the group.
  const coreFamily = coreSupports(engine, 'harnessProfile') ? 'deepseek' : coreForEngine(typeof engine === 'string' ? engine : engine?.engine).id;
  const filesCore = coreFamily === 'deepseek' ? null : coreName(engine);
  const [coreFiles, setCoreFiles] = useState([]), [coreFileBusy, setCoreFileBusy] = useState('');
  useEffect(() => {
    if (!desktopCall) { setCoreFiles([]); return undefined; }
    let live = true;
    Promise.resolve(desktopCall('instructions', { op: 'core-files', cwd: project || cwd })).then((value) => { if (live) setCoreFiles(Array.isArray(value?.files) ? value.files : []); }, () => { if (live) setCoreFiles([]); });
    return () => { live = false; };
  }, [coreFamily, project]);
  const coreFileOp = async (op, file) => {
    setCoreFileBusy(`${op}:${file.path}`);
    try { const value = await desktopCall('instructions', { op, cwd: project || cwd, path: file.path }); if (Array.isArray(value?.files)) setCoreFiles(value.files); }
    catch (error) { setRowErrors((all) => ({ ...all, 'instructions-core-files': error?.message || String(error) })); }
    finally { setCoreFileBusy(''); }
  };

  // DeepSeek: the exact system prompt the core assembles for the project (codeDesktop/systemPrompt/preview).
  // A core with capabilities.customization takes the whole system prompt (codeDesktop.customization); others get
  // the instructions appended to developerInstructions.
  // A core that appends instead (capabilities.systemPromptReplace false: MiniMax writes them into its AGENTS.md) gets the
  // appended copy, no built-in-default seed and no exact-prompt preview.
  const deepseek = coreSupports(engine, 'customization') && coreCapabilities(engine).systemPromptReplace !== false;
  // The preview asks the running core: not while it isn't connected (a failed start, a restart, a core switch).
  const disconnected = boot?.connected === false;
  const disconnectedNote = t('Connect {core} to preview its system prompt.', { core: coreName(engine) });
  const coreLabel = coreName(engine), appendOnly = !deepseek && coreForEngine(typeof engine === 'string' ? engine : engine?.engine).id !== 'codex';
  const [prompt, setPrompt] = useState({ open: false, busy: '', result: null, error: '' }), [copied, setCopied] = useState('');
  const [seed, setSeed] = useState(null);
  const promptSeq = useRef(0);
  const readPrompt = async (purpose) => {
    if (!project || !desktopCall) return null;
    const seq = ++promptSeq.current;
    setPrompt(v => ({ ...v, busy: purpose, error: '', failed: '' }));
    try {
      const result = await desktopCall('instructions', { op: 'system-prompt', cwd: project, ...(threadId && project === cwd ? { threadId } : {}), ...(typeof model === 'string' && model ? { model } : {}) });
      if (seq === promptSeq.current) setPrompt(v => ({ ...v, busy: '', result, error: '', open: v.open || purpose === 'preview' }));
      return result;
    } catch (error) {
      if (seq === promptSeq.current) setPrompt(v => ({ ...v, busy: '', error: error?.message || String(error), failed: purpose, open: v.open || purpose === 'preview' }));
      return null;
    }
  };
  useEffect(() => { if (deepseek && prompt.open) void readPrompt('refresh'); }, [project, savedKey]);
  const startFromDefault = async () => {
    const result = await readPrompt('default');
    if (result?.defaultTemplate) setSeed(v => ({ text: result.defaultTemplate, n: (v?.n ?? 0) + 1 }));
  };
  const copyPrompt = async () => {
    try { await navigator.clipboard.writeText(prompt.result?.text ?? ''); setCopied('Copied'); }
    catch { setCopied(t('Couldn’t copy to the clipboard. Try again.')); }
    setTimeout(() => setCopied(''), 2000);
  };

  // Whole-object writes. A failed write drops the optimistic value and shows the row error.
  const write = async (rowId, next) => {
    setOptimistic(next); setRowErrors(v => ({ ...v, [rowId]: null }));
    try { await onSave({ customInstructions: next }); }
    catch (error) { console.warn(`Couldn’t save the ${rowId} setting:`, error); setRowErrors(v => ({ ...v, [rowId]: error?.message || String(error) })); throw error; }
    finally { setOptimistic(null); }
  };
  const quiet = promise => promise.catch(() => {});
  const entry = projectInstructionsFor(shown, project);
  const root = entry?.root ?? project;
  const saveProject = (rowId, patch) => write(rowId, withProjectInstructions(shown, root, { text: entry?.text ?? '', useFile: entry?.useFile !== false, ...patch }));
  // Text editors report their own failure under the field; they skip the row error.
  const persist = next => onSave({ customInstructions: next });
  const savedEntry = projectInstructionsFor(saved, project);
  const fileOp = async op => {
    if (fileBusy || !project) return;
    setFileBusy(op); setRowErrors(v => ({ ...v, 'instructions-file': null }));
    try { const result = await desktopCall('instructions', { op, cwd: project }); if (result && typeof result === 'object') setPreview(result); else void refresh(); }
    catch (error) { setRowErrors(v => ({ ...v, 'instructions-file': error?.message || String(error) })); }
    finally { setFileBusy(''); }
  };
  const isDefault = !shown.global && shown.enabled && !Object.keys(shown.projects).length;
  const file = preview?.file;
  const useFile = entry?.useFile !== false;
  // When it applies follows how the text is delivered, not whether it replaces the prompt: every customization core gets
  // codeDesktop.customization on each turn/start (instructions-service decorateCoreParams), so its next message uses the
  // new text even in an open session (MiniMax/Kimi append it); only developerInstructions (Codex) wait for a new thread.
  const note = WHEN_IT_APPLIES[coreSupports(engine, 'customization') ? 'deepseek' : 'codex'];
  const customPrompt = deepseek && shown.enabled && Boolean(saved.global.trim());

  const globalRows = [
    settingRow('instructions-enabled', t('Use custom instructions'), deepseek
      ? t('Use your global instructions as the system prompt and add project instructions. Turn off to use the built-in prompt without losing your text.')
      : t('Append your instructions to the agent’s system prompt. Turn off to pause them without losing the text.'),
      <SourceSwitch label={t('Use custom instructions')} checked={shown.enabled} onChange={value => quiet(write('instructions-enabled', { ...shown, enabled: value }))} />),
    settingRow('instructions-global', t('Global instructions'), appendOnly ? t('Added to {core}’s built-in prompt for every project. {core} keeps its own system prompt.', { core: coreLabel }) : GLOBAL_NOTE[deepseek ? 'deepseek' : 'codex'], null,
      { below: <>
        <InstructionsEditor label={t('Global instructions')} value={saved.global} seed={seed}
          placeholder={deepseek ? t('Empty: the built-in system prompt is used.\ne.g. You are a careful coding agent working in {{cwd}}. Answer in English.') : t('e.g. Answer in English. Prefer small, focused commits.')}
          onSave={text => persist({ ...saved, global: text })}
          actions={deepseek ? <>
            <SourceSettingsButton size="sm" variant="ghost" busy={prompt.busy === 'default'} disabled={!project || disconnected} title={disconnected ? disconnectedNote : undefined} onClick={() => void startFromDefault()}>{t('Start from built-in default')}</SourceSettingsButton>
            <SourceSettingsButton size="sm" variant="secondary" disabled={!saved.global} onClick={() => { if (window.confirm(t('Clear your global instructions? The built-in system prompt will be used again.'))) void quiet(write('instructions-global', { ...saved, global: '' })); }}>{t('Reset')}</SourceSettingsButton>
          </> : null} />
        {prompt.error && prompt.failed === 'default' && <span className="ss-row-error" role="alert">{prompt.error}</span>}
        {customPrompt && <p className="ins-warning" role="note">{TOOLS_NOTE}</p>}
        {/* MiniMax drops its whole global AGENTS.md past 32 KB (static-prompt-reader.ts GLOBAL_INSTRUCTIONS_MAX_BYTES), so the
            bridge (agents/minimax.js minimaxGlobalInstructions) keeps the user's own file and cuts these to fit. */}
        {coreForEngine(typeof engine === 'string' ? engine : engine?.engine).id === 'minimax' && new TextEncoder().encode(saved.global || '').length > 30 * 1024
          && <p className="ins-warning" role="note">{t('MiniMax reads at most 32 KB of global instructions, its own AGENTS.md included. Longer instructions are cut to fit; shorten them to keep all of them.')}</p>}
      </> }),
  ];
  const projectRows = project ? [
    settingRow('instructions-project', t('Project'), entry && entry.root !== project ? t('Saved for {folder} and its subfolders.', { folder: entry.root }) : t('Instructions apply to this folder and its subfolders.'),
      <SourceSelect label={t('Project')} align="end" className="sselect-width-160" value={project} title={project} onChange={setProject}
        items={projects.map(value => ({ value, label: baseName(value), description: value }))} />),
    settingRow('instructions-file', t('Use .code-desktop/instructions.md'), t('Read the nearest instructions file in this project, checked into your repository so the whole team shares it.'),
      <SourceSwitch label={t('Use .code-desktop/instructions.md')} checked={useFile} onChange={value => quiet(saveProject('instructions-file', { useFile: value }))} />,
      { below: <div className="ins-file" data-exists={file?.exists || undefined}>
        <span className="ins-file-path" title={file?.path || ''}>{file ? homePath(file.path) : t('Checking…')}</span>
        <span className="ins-file-status">{!file ? '' : file.exists ? sizeLabel(file.bytes) : t('Not created')}</span>
        {file && <span className="ins-file-actions">
          {file.exists
            ? <><SourceSettingsButton size="sm" busy={fileBusy === 'open-file'} onClick={() => fileOp('open-file')}>{t('Open file')}</SourceSettingsButton>
              <SourceSettingsButton size="sm" variant="ghost" busy={fileBusy === 'reveal-file'} onClick={() => fileOp('reveal-file')}>{t('Show in Finder')}</SourceSettingsButton></>
            : <SourceSettingsButton size="sm" busy={fileBusy === 'create-file'} onClick={() => fileOp('create-file')}>{t('Create file')}</SourceSettingsButton>}
        </span>}
      </div> }),
    settingRow('instructions-project-text', t('Project instructions'), t('Stored in OpenClaude Desktop only, after the file’s instructions.'), null,
      { below: <InstructionsEditor key={root} label={t('Project instructions')} value={savedEntry?.text ?? ''} placeholder={t('e.g. Use pnpm. Run the unit tests before finishing.')}
        onSave={text => persist(withProjectInstructions(saved, savedEntry?.root ?? project, { useFile: savedEntry?.useFile !== false, text }))} /> }),
  ] : [settingRow('instructions-project', t('Project'), t('Choose a folder for a session to add project instructions.'), null)];
  const systemPromptRows = [
    settingRow('instructions-system-prompt', t('Final system prompt'), prompt.result
      ? `${tn(prompt.result.text.length, '{count} character', '{count} characters', { count: prompt.result.text.length.toLocaleString('en-US') })} · ${prompt.result.custom ? t('your global instructions') : t('built-in')}${prompt.result.model ? ` · ${prompt.result.model}` : ''}${project ? ` · ${t('for {project}', { project: baseName(project) })}` : ''}${prompt.result.exact ? ` · ${t('open session')}` : ''}`
      : disconnected ? disconnectedNote
      // The instruction files this core actually reads (GEMINI.md, QWEN.md, AGENTS.md…), named from its own list.
      : coreFiles.length > 0 ? t('The system prompt sent to the model for this project. {files} files and tools are sent separately.', { files: instructionFileNames(coreFiles) }) : t('The exact text sent to the model for this project. Tools are sent separately.'),
      <span className="ins-file-actions">
        {prompt.open && prompt.result && <SourceSettingsButton size="sm" variant="ghost" onClick={() => void copyPrompt()}>{copied === 'Copied' ? t('Copied') : t('Copy')}</SourceSettingsButton>}
        <SourceSettingsButton size="sm" variant={prompt.open ? 'ghost' : 'secondary'} busy={prompt.busy === 'preview' || prompt.busy === 'refresh'} disabled={!project || disconnected}
          title={disconnected ? disconnectedNote : undefined} onClick={() => void readPrompt('preview')}>{prompt.open ? t('Refresh') : t('Preview final system prompt')}</SourceSettingsButton>
      </span>,
      { below: prompt.open ? <>
        <pre className="ins-preview ins-system-prompt" aria-label={t('Final system prompt')} tabIndex={0} data-empty={!prompt.result?.text || undefined}>{prompt.error ? `${t('The preview is unavailable.')} ${prompt.error}` : prompt.result ? (prompt.result.text || t('The system prompt is empty.')) : t('Loading…')}</pre>
        {copied && copied !== 'Copied' && <span className="ss-row-error" role="alert">{copied}</span>}
      </> : null }),
  ];
  const previewRows = [
    settingRow('instructions-preview', t('Final text'), preview
      ? `${preview.chars ? tn(preview.chars, '{count} character', '{count} characters', { count: preview.chars.toLocaleString('en-US') }) : t('Nothing is added')}${preview.truncated ? ` · ${t('truncated to 40,000 characters')}` : ''}${project ? ` · ${t('for {project}', { project: baseName(project) })}` : ''}`
      : (previewError ? t('The preview is unavailable.') : t('Loading…')),
      <SourceSettingsButton size="sm" variant="ghost" onClick={() => void refresh()}>{t('Refresh')}</SourceSettingsButton>,
      { below: <pre className="ins-preview" aria-label={t('Final instructions text')} tabIndex={0} data-empty={!preview?.text || undefined}>{preview?.text || (previewError ? previewError : t('No custom instructions are added to the system prompt.'))}</pre> }),
    settingRow('instructions-applies', t('When it applies'), note, null),
  ];
  return <div className="ins-page" data-engine={coreForEngine(typeof engine === 'string' ? engine : engine?.engine).id}>
    <SettingsGroup title={t('Global instructions')} rows={globalRows} rowErrors={rowErrors} />
    <SettingsGroup title={t('Project instructions')} rows={projectRows} rowErrors={rowErrors} />
    {coreFiles.length > 0 && <SettingsGroup title={filesCore ? t('Files {core} reads', { core: filesCore }) : t('Files DeepSeek reads')} rowErrors={rowErrors} rows={coreFiles.map((file) => settingRow(`instructions-core-${file.path}`,
      // Qwen's rule files (rule: true; paths: the globs that load it, null = always) and its personal QWEN.local.md
      // (local: true, kept out of the project's shared files) say what they are.
      file.rule ? t('Rule {file}', { file: baseName(file.path) }) : file.local ? t('Personal {file}', { file: baseName(file.path) })
        : file.scope === 'global' ? (baseName(file.path) === 'AGENTS.md' ? t('Global AGENTS.md') : t('Global {file}', { file: baseName(file.path) })) : baseName(file.path),
      // The path as its own block line (and who it applies to); the status sits with the actions in the control slot.
      <><span className="ss-path" title={file.path}>{homePath(file.path)}</span>
        {file.rule && Array.isArray(file.paths) && file.paths.length > 0 && <span>{t('Applies to {paths}', { paths: file.paths.slice(0, 6).join(', ') + (file.paths.length > 6 ? ', …' : '') })}</span>}
        {file.local && <span>{t('Only on this computer: not shared with the project')}</span>}
        {file.scope === 'global' && !(file.rule && Array.isArray(file.paths) && file.paths.length) && <span>{filesCore ? t('For every {core} session', { core: filesCore }) : t('For every DeepSeek session')}</span>}</>,
      <span className="ins-file-actions">
        <span className="ss-control-status">{file.exists ? sizeLabel(file.bytes) : t('Not created')}</span>
        {file.exists
          ? <><SourceSettingsButton size="sm" busy={coreFileBusy === `core-file-open:${file.path}`} onClick={() => void coreFileOp('core-file-open', file)}>{t('Open file')}</SourceSettingsButton>
            <SourceSettingsButton size="sm" variant="ghost" busy={coreFileBusy === `core-file-reveal:${file.path}`} onClick={() => void coreFileOp('core-file-reveal', file)}>{t('Show in Finder')}</SourceSettingsButton></>
          : file.scope === 'global' && <SourceSettingsButton size="sm" busy={coreFileBusy === `core-file-create:${file.path}`} onClick={() => void coreFileOp('core-file-create', file)}>{t('Create file')}</SourceSettingsButton>}
      </span>))} />}
    {deepseek
      ? <SettingsGroup title={t('Preview')} rows={[...systemPromptRows, previewRows[1]]} rowErrors={rowErrors} />
      : <SettingsGroup title={t('Preview')} rows={previewRows} rowErrors={rowErrors} />}
    <SettingsGroup title={t('Reset')} rowErrors={rowErrors} rows={[settingRow('instructions-reset', t('Reset instructions'), t('Remove your global text and every project override. Files in your projects are not changed.'),
      <SourceSettingsButton size="sm" variant="secondary" disabled={isDefault} onClick={() => { if (window.confirm(t('Reset all custom instructions? Your global text and project overrides will be removed.'))) void quiet(write('instructions-reset', null)); }}>{t('Reset')}</SourceSettingsButton>)]} />
  </div>;
}
