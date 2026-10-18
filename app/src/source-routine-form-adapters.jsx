import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { dm } from './generated/chat/shared-19-CjdiaR4X.js';
import { useNativeFieldControlProps } from './source-field-adapters.jsx';
import { RoutineContext, sourceRoutine, useRoutineIntl } from './source-routine-adapters.jsx';
import { SourceDialog, SourceDialogFooter, SourceConfirmationDialog } from './source-dialog.jsx';
import { SourceSelect } from './source-select.jsx';
import { SourceSettingsButton as Button } from './source-settings-button.jsx';
import { PERMISSION_OPTIONS } from './source-permission-menu.jsx';
import { routinePermissionDescription } from './source-routine-detail-adapters.jsx';
import { t } from '../electron/i18n/index.mjs';
export { useRoutineIntl };
export { useHomeNow as useFormNow } from './source-home-adapters.jsx';
export const falseFeature = () => false;
export const noFormData = () => undefined;
export const noFormEffect = () => {};
export const identity = value => value;
export const noLocalConstraint = () => null;
export const localSource = () => 'local';
export const alreadyAcknowledged = () => true;
export const UnavailableFormBranch = () => null;
export const formBridgeAvailable = { createScheduledTask: true };
export const formFeature = name => ['yukon_silver_raw_clocks_main', '__gb__97400171', '__gb__1538169943'].includes(name);
export const useFormCopy = () => ({ ...dm, jitterHint: { defaultMessage: 'Uses this computer’s local time zone. Tasks run while the app is open and this computer is awake.', id: 'local-schedule-clock' } });
export const useFormPreferences = () => ({ showScheduledTaskExactTimeOption: false });
export const useFormAnalytics = () => ({ track() {} });
const otherNames = new Set();
export const useOtherRoutineNames = () => otherNames;
export const hasRoutineName = (names, value) => names.has(value);
export const useNoAccount = () => ({});
export const useNoProjectAccess = () => ({ enabled: false, loading: false });
export const useFormRouter = () => ({ push() {} });
export const formPermissionStore = { getState: () => ({ resolveUnsupervisedModeWarning() {} }) };
export const formSeedVersion = () => 0;
export const invokeFormOperation = operation => operation();
// No Claude model aliases apply to the local provider; the original form falls
// through to nameFor/model labels from the host catalog.
export const formModelName = () => undefined;
export function useFormMessages() {
  const host = useContext(RoutineContext);
  return { addError: (message, detail) => host.error(detail?.error?.message ?? message), addSuccess() {} };
}
export function useFormModels() {
  const host = useContext(RoutineContext);
  return useMemo(() => {
    const models = host.models.map(model => ({ ...model, id: model.model ?? model.id, name: model.displayName ?? model.name ?? model.model ?? model.id }));
    return { models, selectableModels: models, nameFor: id => models.find(model => model.id === id)?.name,
      requiresAutoMode: () => false, isNonSelectable: () => false, disabledReasonFor: () => undefined };
  }, [host.models]);
}
export const useModelUnavailable = models => id => !!id && !models.models.some(model => model.id === id);
export const toFormPermission = value => ({ ask: 'default', bypass: 'bypassPermissions' }[value] ?? value);
const toHostPermission = value => ({ default: 'ask', bypassPermissions: 'bypass' }[value] ?? value);
export function useFormPermissions() {
  const host = useContext(RoutineContext);
  return useMemo(() => new Set(PERMISSION_OPTIONS.filter(option => option.value !== 'bypass' || host.bypassEnabled || host.editingTask?.options?.permission === 'bypass').map(option => toFormPermission(option.value))), [host.bypassEnabled, host.editingTask]);
}
export const formPermissionValue = value => toHostPermission(value);
export const formPermissionItems = (_, availability) => ['default', 'auto', 'acceptEdits', 'plan', ...(availability.bypass ? ['bypassPermissions'] : [])];
export const formPermissionDescription = ({ mode }) => routinePermissionDescription({ mode: toHostPermission(mode) });
export const usePermissionSelection = callback => useCallback(value => callback(value, false), [callback]);
export function useFormBridge() {
  const host = useContext(RoutineContext);
  return useMemo(() => {
    const save = (data, existing) => host.mutate({ action: existing ? 'update' : 'create', id: existing?.id,
      name: data.displayName ?? existing?.name ?? data.name, description: data.description, prompt: data.prompt ?? existing?.prompt,
      folder: data.userSelectedFolders?.[0], cron: data.cronExpression ?? '',
      fireAt: Object.hasOwn(data, 'fireAt') ? data.fireAt : data.cronExpression ? null : existing?.fireAt,
      execution: { model: Object.hasOwn(data, 'model') ? data.model ?? host.executionProfile.model : existing?.options.model ?? host.executionProfile.model,
        permission: data.permissionMode ?? existing?.options.permission ?? host.executionProfile.permission },
    }).then(sourceRoutine);
    return { localTasksOff: false, createScheduledTask: data => save(data),
      updateScheduledTask: data => save(data, host.editingTask) };
  }, [host.mutate, host.editingTask, host.executionProfile]);
}
export function useManualDraft({ setName, setInstructions }) {
  return useMemo(() => ({ setName, setInstructions, onNameBlur() {}, onInstructionsSeeded() {}, stop() {}, reset() {}, isDrafting: false, drafted: false, instructionsByUser: true }), [setName, setInstructions]);
}
export function useStableFormEvent(callback) {
  const latest = useRef(callback); latest.current = callback;
  return useCallback((...args) => latest.current(...args), []);
}
export function useFormDebounce(callback, delay) {
  const event = useStableFormEvent(callback);
  return useMemo(() => {
    let timer, args;
    const run = (...next) => { args = next; clearTimeout(timer); timer = setTimeout(() => { timer = null; event(...args); }, delay); };
    run.cancel = () => { clearTimeout(timer); timer = null; };
    run.flush = () => { if (timer) { run.cancel(); event(...args); } };
    return run;
  }, [event, delay]);
}
export function useFormMedia(query) {
  const [matches, setMatches] = useState(() => matchMedia(query).matches);
  React.useEffect(() => { const media = matchMedia(query), update = () => setMatches(media.matches); media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, [query]);
  return matches;
}

export function FormSelect({ items, value, onChange, className, disabled, renderTriggerValue, searchable, fullWidth, variant }) {
  const { disabled: fieldDisabled, ...triggerProps } = useNativeFieldControlProps({ disabled });
  return <SourceSelect items={items} value={value} onChange={onChange} disabled={fieldDisabled} className={className}
    searchable={searchable} fullWidth={fullWidth} variant={variant} renderTriggerValue={renderTriggerValue} triggerProps={triggerProps} />;
}
export function FormCatalogPicker({ catalog, state, onStateChange, disabled }) {
  return <SourceSelect label={t('Model')} items={catalog.models.map(model => ({ value: model.id, label: model.name, disabled: model.disabled }))}
    value={state.model} disabled={disabled} onChange={model => onStateChange({ model })} />;
}
export function FormFolderPicker({ controlledSelection, labelledBy, disabled, placeholder }) {
  const host = useContext(RoutineContext);
  const choose = async () => {
    try { const folder = await host.call('folder', { additional: true }); if (folder) controlledSelection.addSelectedFolder(folder); }
    catch (error) { host.error(error.message); }
  };
  return <Button variant="ghost" icon="Folder" disabled={disabled} aria-labelledby={labelledBy} onClick={choose}>
    {controlledSelection.selectedFolders[0]?.split('/').at(-1) || placeholder}
  </Button>;
}
export function FormNotice({ children, variant, ...props }) {
  return <div {...props} role="status" className={`rounded-card px-lg py-md text-body ${variant === 'warning' ? 'text-warning' : 'text-secondary'}`}>{children}</div>;
}
export function FormConfirmation({ onOpenChange, description, initialFocus, ...props }) {
  return <SourceConfirmationDialog {...props} initialFocus={initialFocus} body={description} onCancel={() => onOpenChange(false)} />;
}
const DialogContext = createContext(null);
function Root({ open, onOpenChange, onOpenChangeComplete, disablePointerDismissal, children }) {
  return <DialogContext.Provider value={{ open, onOpenChange, onOpenChangeComplete, disablePointerDismissal }}>{children}</DialogContext.Provider>;
}
function Header() { return null; }
function Footer(props) { return <SourceDialogFooter {...props} />; }
function Popup({ children, size, className, ...props }) {
  const host = useContext(RoutineContext), dialog = useContext(DialogContext);
  const nodes = React.Children.toArray(children), header = nodes.find(child => child.type === Header);
  return <SourceDialog {...props} sourceVersion="2.31226.0" open={dialog.open} size={size} className={className} density="comfortable" title={header?.props.children} description={header?.props.description}
    onClose={reason => { if (reason !== 'outside-press' || !dialog.disablePointerDismissal) dialog.onOpenChange(false, { reason }); }}
    onExited={() => dialog.onOpenChangeComplete?.(false)}>
    {host.formError && <p role="alert" className="mb-3 text-body text-danger">{host.formError}</p>}
    {host.editingTask?.template?.connectors?.length > 0 && <p role="status" className="mb-3 text-body text-secondary">{t('Calendar and email connections are not available yet. Edit these instructions to use files in your selected folder.')}</p>}
    {nodes.filter(child => child !== header)}
  </SourceDialog>;
}
export const FormDialog = { Root, Header, Footer, Popup };

export const useCurrentFormCopy = () => ({ ...useContext(RoutineContext).copy, jitterHint: useFormCopy().jitterHint });
export function FormMessage({ defaultMessage, id, values }) {
  return useRoutineIntl().formatMessage({ defaultMessage, id }, values);
}
// 2.42304.0 shared-frame Cd (TextLink, exported as Xc; the routine form c97b955f1 imports it as Zt):
// _d = `${hd} ${gd} inline` (hd "cds-reset cds-text-link", gd "cds-text-link-underline"); inheritColor adds vd
// (text-inherit, the underline resting at 35% instead of .cds-text-link's 60%); the link's className is
// X(X(_d, p && vd), "cursor-pointer", className) and p adds data-inherit-color="". view-tabs has no TextLink
// semantic name, so the two class strings are restated here and pinned against the official chunk by
// tests/r4e-small-routine-link.test.mjs. Every utility is compiled in the loaded c6a992d55 CSS.
export const TEXT_LINK_CLASS = 'cds-reset cds-text-link cds-text-link-underline inline';
export const TEXT_LINK_INHERIT_COLOR_CLASS = 'text-inherit [transition-property:text-decoration-color,box-shadow] [&:not(:hover,:focus-visible)]:[--_text-link-line:color-mix(in_srgb,currentColor,transparent_35%)]';
export const formLinkClassName = (inheritColor, className = '') =>
  [TEXT_LINK_CLASS, inheritColor && TEXT_LINK_INHERIT_COLOR_CLASS, 'cursor-pointer', className].filter(Boolean).join(' ');
export function FormLink({ external, inheritColor, href, children, className = '', ...props }) {
  const host = useContext(RoutineContext);
  return <a {...props} data-cds="TextLink" data-inherit-color={inheritColor ? '' : undefined} href={href} className={formLinkClassName(inheritColor, className)}
    onClick={event => { event.preventDefault(); host.call('external', { url: href }).catch(error => host.error(error.message)); }}>{children}</a>;
}
export const useNoRoutineReview = () => ({ holdsForReview: false, heldForReview: false });
export const useNoRoutineTools = () => ({ stillAllowed: async () => [], isLoading: false });
export const useNoRoutineNotifications = () => ({ shown: false });
export const formErrorMessage = error => error?.message;
export const UnusedCodeContext = createContext(false);

export const formCatalogConfig = {};
