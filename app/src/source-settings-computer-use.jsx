// Settings › This computer › System › Computer use. The official section (2.42304.0 c71860c77 `ii`, under the System
// group of /settings/desktop): the "Computer use" title with a neutral Beta badge, the section description, and the
// "Enable computer use" switch (config.agentComputerUse here; the official preference is chicagoEnabled). With it off,
// the computer-use tools leave every session's tool list (main.cjs agentToolGroupEnabled "computer-use").
//
// "Unhide apps when Claude finishes" (official chicagoAutoUnhide, Ess7TkMY61 / T7z5SKWO2K): the apps hidden before
// full-screen actions come back when the turn ends (config.computerUseAutoUnhide; unset reads as on).
//
// Two local rows the official section doesn't have (user's call, 2026-10-20):
//   Allowed apps  what sessions allowed right now ("Allow for this session" lasts until the app quits), each removable.
//                 Drawn exactly as the official Denied apps block (`Xr`): chips in flex flex-wrap gap-1.5, each with its
//                 name and a ghost xxs X button; the empty text in text-footnote text-secondary.
//   Teach mode    whether the guided walkthrough can run here (useComputerUseProbe: the native module and the
//                 Accessibility / Screen Recording permissions, from computer-use:probe). No control: the official app has
//                 no teach entry in Settings at all — the agent offers a walkthrough (request_teach_access) when the user
//                 asks to be taught, and its card asks before it starts.
// W14-code r2-shared-10 / r2-shared-11 (3.6556.2 c71860c77-BH7EuJ1o.js Zt): the switch's description is the official S
// branch "Let Claude see and act in the apps you allow, working in the background or with full control of your screen."
// (Derf4fJ5+V) with the Learn more link (TdTXXf940t, ce2191564 `t` = support.claude.com/en/articles/14128542); Denied apps
// (Bt, 3cNJSty9kF: chicagoUserDeniedBundleIds here config.computerUseDeniedBundleIds, enforced by grants.cjs) follows the
// preferred mode; the Accessibility / Screen recording rows (`d && R`: the probe answered) close the section, each a
// Badge (Xt variant, size lg, Yt label) and, unless granted, Open System Settings (U/a2e7uAwk).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '../electron/i18n/index.mjs';
import { SourceSwitch as SettingSwitch } from './source-switch.jsx';
import { SourceSegments } from './source-segments.jsx';
// W14-code r6 sh6-03: c71860c77 `_` (Open System Settings, chip remove X) is shared-frame Uu = CdsButton.
import { CdsBadge, CdsButton, CdsDialog, CdsDropdown, CdsIcon, CdsTextLink } from './generated/view-tabs/index.js';

/** The apps every session has allowed right now (service.cjs allGrants) and a revoke that refreshes them. */
export function useComputerUseGrants(desktopCall, active) {
  const [apps, setApps] = useState(null);
  const load = useCallback(async () => {
    try {
      const answer = await desktopCall('computer-use:all-grants', {});
      setApps(answer?.ok && Array.isArray(answer.result?.apps) ? answer.result.apps : []);
    } catch { setApps([]); }
  }, [desktopCall]);
  useEffect(() => { if (active) void load(); }, [active, load]);
  const revoke = useCallback(async (bundleId) => {
    await desktopCall('computer-use:revoke', { bundleId });
    await load();
  }, [desktopCall, load]);
  return { apps, revoke, reload: load };
}

/**
 * computer-use:probe read once per activation: { teachStatus, permissions }. teachStatus: whether teach mode can run on
 * this computer, "available", "permissions" (Accessibility or Screen Recording is off) or "unavailable" (no native
 * module); null while it is being read. permissions: null until the probe answers (and when it can't: no native module,
 * official tccState null), else { accessibility, screenRecording } booleans.
 */
export function useComputerUseProbe(desktopCall, active) {
  const [state, setState] = useState({ teachStatus: null, permissions: null });
  useEffect(() => {
    if (!active) return undefined;
    let live = true;
    (async () => {
      let next = { teachStatus: 'unavailable', permissions: null };
      try {
        const answer = await desktopCall('computer-use:probe', {});
        if (answer?.ok) {
          const accessibility = answer.result?.axTrusted === true, screenRecording = answer.result?.screenCapture === true;
          next = { teachStatus: accessibility && screenRecording ? 'available' : 'permissions', permissions: { accessibility, screenRecording } };
        }
      } catch { /* unavailable */ }
      if (live) setState(next);
    })();
    return () => { live = false; };
  }, [desktopCall, active]);
  return state;
}

export const COMPUTER_USE_LEARN_MORE_URL = 'https://support.claude.com/en/articles/14128542'; // ce2191564 `t`

/**
 * The installed apps for Denied apps' Add app menu (official de.listInstalledApps: {bundleId, displayName}), read when
 * the section is shown; [] until then or when they can't be listed.
 */
export function useComputerUseInstalledApps(desktopCall, active) {
  const [apps, setApps] = useState([]);
  useEffect(() => {
    if (!active) return undefined;
    let live = true;
    Promise.resolve(desktopCall('computer-use:installed-apps', {})).then((answer) => {
      if (live) setApps(Array.isArray(answer?.apps) ? answer.apps.filter((app) => typeof app?.bundleId === 'string' && typeof app?.displayName === 'string') : []);
    }, () => { if (live) setApps([]); });
    return () => { live = false; };
  }, [desktopCall, active]);
  return apps;
}

/**
 * Official Bt: the Add app dropdown over the installed apps not denied yet (sorted by name, Vt), then the denied apps as
 * chips (the official `Xr` branch, each with its "Remove {app} from deny list" X) or the empty line.
 */
export function ComputerUseDeniedAppsControl({ denied, installed, disabled, onChange }) {
  const deniedSet = new Set(denied);
  const choices = installed.filter((app) => !deniedSet.has(app.bundleId)).sort((a, b) => a.displayName.localeCompare(b.displayName));
  return <CdsDropdown variant="secondary" size="sm" disabled={disabled || choices.length === 0} label={t('Add app')}
    items={choices.map((app) => ({ label: app.displayName, onSelect: () => onChange([...denied, app.bundleId]) }))}/>;
}
export function ComputerUseDeniedApps({ denied, installed, disabled, onChange }) {
  if (!denied.length) return <p className="text-footnote text-secondary">{t('No apps denied. Add an app to automatically reject DeepSeek’s requests for it.')}</p>;
  const names = new Map(installed.map((app) => [app.bundleId, app.displayName]));
  return <div className="flex flex-wrap gap-1.5" data-computer-use-denied="">
    {denied.map((bundleId) => {
      const name = names.get(bundleId) ?? bundleId;
      return <div key={bundleId} className="bg-surface-0 border-border-300 flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm">
        <span className="text-primary">{name}</span>
        <CdsButton variant="ghost" size="xxs" iconOnly icon="X" flush="end" disabled={disabled}
          aria-label={t('Remove {app} from deny list', { app: name })} onClick={() => onChange(denied.filter((id) => id !== bundleId))}/>
      </div>;
    })}
  </div>;
}

/**
 * W14-code r8 sh8-01: the tccState of c71860c77 Zt (`d`) from the probe. The main process (asar mqi.getState) answers
 * NotSupported for both when the native module did not load; locally that is the probe failing (teachStatus
 * "unavailable"). Otherwise the probe's booleans: Granted, or NotDetermined ("Not requested"). null while unread.
 */
export function computerUseTccState({ teachStatus = null, permissions = null } = {}) {
  if (permissions) return { accessibility: permissions.accessibility ? 'granted' : 'notDetermined', screenRecording: permissions.screenRecording ? 'granted' : 'notDetermined' };
  return teachStatus === 'unavailable' ? { accessibility: 'notSupported', screenRecording: 'notSupported' } : null;
}
/** c7f132ac0 x `case "permissions": return t && i !== null && (i.accessibility !== n.NotSupported || i.screenRecording !== n.NotSupported)`. */
export const computerUsePermissionRowsShown = (tcc) => tcc !== null && (tcc.accessibility !== 'notSupported' || tcc.screenRecording !== 'notSupported');
// c71860c77 Yt: the badge text per state (Granted zY+piDAXZv, Not requested HGIy99VgLZ, Not supported +FiyOTaUCW; Denied /
// Restricted have no local probe answer).
const permissionBadge = (status) => status === 'granted' ? t('Granted') : status === 'notSupported' ? t('Not supported') : t('Not requested');

/** Official Accessibility / Screen recording control: the status Badge (Yt / Xt: neutral for these states) and Open System
 * Settings unless granted or not supported (`d.accessibility !== J.Granted && d.accessibility !== J.NotSupported`). */
export function ComputerUsePermissionControl({ status, onOpen }) {
  return <div className="flex items-center gap-2">
    <CdsBadge variant="neutral" size="lg">{permissionBadge(status)}</CdsBadge>
    {status === 'granted' || status === 'notSupported' ? null : <CdsButton variant="secondary" size="sm" onClick={onOpen}>{t('Open System Settings')}</CdsButton>}
  </div>;
}

/** The teach row's text for a status (null — still reading — reads as available). */
export function computerUseTeachDescription(status) {
  if (status === 'permissions') return t('DeepSeek can guide you step by step through the apps you allow once this app has Accessibility and Screen Recording permission (System Settings › Privacy & Security).');
  if (status === 'unavailable') return t('Teach mode can’t run on this computer: computer use’s native part isn’t available.');
  return t('DeepSeek can guide you step by step through the apps you allow: ask it to teach you or show you how. A card asks before the walkthrough starts, and you can exit anytime.');
}

/** The preferred mode (background / full_control) and a setter that persists it (main.cjs computer-use:*-preferred-mode). */
export function useComputerUsePreferredMode(desktopCall, active) {
  const [mode, setModeState] = useState('background');
  const load = useCallback(async () => {
    try {
      const answer = await desktopCall('computer-use:preferred-mode', {});
      if (answer?.ok && (answer.result?.mode === 'background' || answer.result?.mode === 'full_control')) setModeState(answer.result.mode);
    } catch { /* leave the default */ }
  }, [desktopCall]);
  useEffect(() => { if (active) void load(); }, [active, load]);
  const setMode = useCallback(async (next) => {
    setModeState(next);
    try { await desktopCall('computer-use:set-preferred-mode', { mode: next }); } catch { await load(); }
  }, [desktopCall, load]);
  return { mode, setMode };
}

/**
 * The preferred-mode control (official c71860c77 `ii`): the segmented control Background / Full control in the row's
 * control slot, labelled by the row ("How Claude uses the apps you allow").
 */
export function ComputerUsePreferredMode({ mode, onChange, disabled }) {
  return <SourceSegments label={t('How DeepSeek uses the apps you allow')} value={mode} disabled={disabled}
    options={[{ value: 'background', label: t('Background') }, { value: 'full_control', label: t('Full control') }]}
    onChange={onChange}/>;
}

/** The official Denied apps chips (`Xr`), for the allowed ones. */
export function ComputerUseAllowedApps({ apps, onRemove, busy }) {
  if (!apps?.length) {
    return <p className="text-footnote text-secondary">{t('No apps allowed right now. DeepSeek asks before it uses an app, and what you allow lasts until the app quits.')}</p>;
  }
  return <div className="flex flex-wrap gap-1.5" data-computer-use-allowed="">
    {apps.map((app) => {
      const name = app.displayName || app.bundleId;
      return <div key={app.bundleId} className="bg-surface-0 border-border-300 flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm" title={app.bundleId}>
        <span className="text-primary">{name}</span>
        <CdsButton variant="ghost" size="xxs" iconOnly icon="X" flush="end" disabled={busy}
          aria-label={t('Remove {app} from allowed apps', { app: name })} onClick={() => onRemove(app.bundleId)}/>
      </div>;
    })}
  </div>;
}

// W14-code r4 shell r4-shared-11 (E95): turning computer use on asks first, as c71860c77 Zt's switch (`D`: off → `x(!0)`,
// the dialog `_t`; on → chicagoEnabled false) over ce2191564 _ ("Turn on computer use?", FL22V2dlmY). ce2191564 is not
// in any generated area (its permission step reads shared-26's TCC store and shared-6 UN's request calls, which this host
// does not have), so it is written here with the original's classes and copy (E84 #2): the warning step for the
// background-capable host (`backgroundSupported` b: this host has the Background / Full control modes), Cancel / Turn on
// ("confirmation-modal-confirm"); Turn on saves the switch (`tn`) and, unless the permissions are unknown or all granted
// (`x || D === null || O`), moves to "Grant macOS permissions" with shared-6 UN's rows (RN / IN) and Done. E83: the
// official "Claude" acting in the copy is the assistant, so those keys say DeepSeek (i18n named() swaps in the persona).
// W14-code r5-shared-03: so do the page's own rows (c71860c77 Zt / Bt / ii copy); "restart Claude" names the app, so it
// is "restart OpenClaude Desktop" (the key Record a skill's permission row uses, source-watch-record.jsx).

/** shared-6 IN: one permission row (label, Granted / Not yet granted, description, a secondary Request unless granted). */
function ComputerUsePermissionRequestRow({ label, description, granted, onRequest }) {
  return <div className="p-3 flex items-start justify-between gap-3">
    <div className="flex flex-col gap-0.5 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-sm text-secondary font-medium">{label}</span>
        {granted
          ? <span className="inline-flex items-center gap-1 text-xs text-success"><CdsIcon name="CheckCircle" customSize={14} className="shrink-0"/>{t('Granted')}</span>
          : <span data-tone="danger" className="inline-flex items-center gap-1 text-xs text-danger"><CdsIcon name="XCircle" customSize={14} className="shrink-0"/>{t('Not yet granted')}</span>}
      </div>
      <p className="text-xs text-muted-as-secondary">{description}</p>
    </div>
    {granted ? null : <CdsButton variant="secondary" onClick={onRequest} className="flex-shrink-0">{t('Request')}</CdsButton>}
  </div>;
}

/** ce2191564 _'s body under the header: the warning step (body, Keep in mind:, the research-preview line, Cancel / Turn on)
 * or the permissions step (shared-6 UN's rows, Done). */
export function ComputerUseTurnOnBody({ step = 'warning', permissions = null, cancelRef, onClose, onConfirm, onOpenSystemSettings = () => {}, onLearnMore = () => {} }) {
  const safeUse = <CdsTextLink href={COMPUTER_USE_LEARN_MORE_URL} target="_blank" rel="noopener noreferrer"
    onClick={(event) => { event.preventDefault(); onLearnMore(COMPUTER_USE_LEARN_MORE_URL); }}>{t('Read safe use tips')}</CdsTextLink>;
  const [before, after = ''] = t('This is a research preview. Start with tasks where mistakes are easy to fix. <link>Read safe use tips</link>').split(/<link>.*?<\/link>/);
  return step === 'warning' ? <>
    <div className="text-secondary">
      <div className="flex flex-col gap-3 pt-1">
        <p>{t('DeepSeek will see the apps you approve and click and type in them, working in the background while you keep using your computer or taking full control of your screen. Which of those DeepSeek does by default is set under Settings → This computer → Computer use. You’ll approve each app, but not confirm each step DeepSeek performs.')}</p>
        <div>
          <div className="font-semibold mb-1.5">{t('Keep in mind:')}</div>
          <ul className="list-disc ps-5 flex flex-col gap-1">
            <li>{t('Some actions can’t be undone.')}</li>
            <li>{t('Apps you approve could open other apps that you haven’t approved.')}</li>
            <li>{t('Websites and docs could contain malicious instructions that misdirect DeepSeek.')}</li>
            <li>{t('Close anything sensitive. DeepSeek can see what’s on screen in the apps you approve, and your whole screen when DeepSeek has full control.')}</li>
          </ul>
        </div>
        <p>{before}{safeUse}{after}</p>
      </div>
    </div>
    <CdsDialog.Footer>
      <CdsButton ref={cancelRef} variant="secondary" onClick={onClose}>{t('Cancel')}</CdsButton>
      <CdsButton variant="primary" onClick={onConfirm} data-testid="confirmation-modal-confirm">{t('Turn on')}</CdsButton>
    </CdsDialog.Footer>
  </> : <>
    <div className="text-secondary">
      <p className="mb-3">{t('Computer use is on. To finish setup, grant the macOS permissions below.')}</p>
      <div className="border border-border-300 rounded-lg divide-y divide-border-300 ">
        <ComputerUsePermissionRequestRow label={t('Accessibility')} description={t('Required for mouse and keyboard tracking and control.')}
          granted={!!permissions?.accessibility} onRequest={() => onOpenSystemSettings('accessibility')}/>
        <ComputerUsePermissionRequestRow label={t('Screen recording')} description={t('Required for screen visibility. macOS may ask you to restart OpenClaude Desktop.')}
          granted={!!permissions?.screenRecording} onRequest={() => onOpenSystemSettings('screenRecording')}/>
      </div>
    </div>
    <CdsDialog.Footer>
      <CdsButton variant="primary" onClick={onClose} autoFocus>{t('Done')}</CdsButton>
    </CdsDialog.Footer>
  </>;
}

/** ce2191564 _ (exported `n` as g, keyed on open): the two-step confirmation before computer use turns on. */
export function ComputerUseTurnOnDialog({ isOpen, onClose, onConfirm, permissions = null, onOpenSystemSettings = () => {}, onLearnMore = () => {} }) {
  const [step, setStep] = useState('warning');
  const cancel = useRef(null);
  useEffect(() => { if (isOpen) setStep('warning'); }, [isOpen]);
  const confirm = () => {
    onConfirm();
    if (permissions === null || (permissions.accessibility && permissions.screenRecording)) { onClose(); return; }
    setStep('permissions');
  };
  return <CdsDialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <CdsDialog.Popup initialFocus={cancel}>
      <CdsDialog.Header>{step === 'warning' ? t('Turn on computer use?') : t('Grant macOS permissions')}</CdsDialog.Header>
      <ComputerUseTurnOnBody step={step} permissions={permissions} cancelRef={cancel} onClose={onClose} onConfirm={confirm}
        onOpenSystemSettings={onOpenSystemSettings} onLearnMore={onLearnMore}/>
    </CdsDialog.Popup>
  </CdsDialog.Root>;
}

/** c71860c77 Zt's switch `D` with its dialog `se`: off asks first (the dialog), on turns off at once. */
export function ComputerUseEnableSwitch({ checked, onChange, permissions = null, onOpenSystemSettings, onLearnMore }) {
  const [asking, setAsking] = useState(false);
  return <>
    <SettingSwitch label={t('Enable computer use')} checked={checked} onChange={(value) => { if (!checked && value) { setAsking(true); return; } onChange(false); }}/>
    <ComputerUseTurnOnDialog isOpen={asking} onClose={() => setAsking(false)} onConfirm={() => onChange(true)} permissions={permissions}
      onOpenSystemSettings={onOpenSystemSettings} onLearnMore={onLearnMore}/>
  </>;
}

/**
 * The group for source-settings.jsx `groups`: {tab, title, badge, description, rows}.
 * row(id, label, description, control) and the rest are source-settings.jsx's own helpers.
 */
export function computerUseSettingsGroup({ row, shownValue, config, save, grants, revoke, busy, preferredMode, onPreferredMode, teachStatus = null,
  permissions = null, installedApps = [], onOpenSystemSettings = () => {}, onLearnMore = () => {} }) {
  // W14-code r4 shell r4-shared-11 (E95): off unless turned on (c71860c77 Zt `v = g && (t.chicagoEnabled ?? !1)`).
  const enabled = shownValue('agentComputerUse', config.agentComputerUse) === true;
  const tcc = computerUseTccState({ teachStatus, permissions });
  const enableDescription = t('Let DeepSeek see and act in the apps you allow, working in the background or with full control of your screen.');
  const denied = (shownValue('computerUseDeniedBundleIds', config.computerUseDeniedBundleIds) ?? []).filter((id) => typeof id === 'string');
  const saveDenied = (next) => save('computerUseDeniedBundleIds', next);
  const deniedDisabled = !enabled || busy;
  return {
    tab: 'general', title: 'Computer use', badge: t('Beta'),
    description: t('Not available in cloud Code sessions, which don’t run on this computer.'),
    rows: [
      row('agentComputerUse', t('Enable computer use'),
        <>{enableDescription}{' '}<CdsTextLink href={COMPUTER_USE_LEARN_MORE_URL} target="_blank" rel="noopener noreferrer"
          onClick={(event) => { event.preventDefault(); onLearnMore(COMPUTER_USE_LEARN_MORE_URL); }}>{t('Learn more')}</CdsTextLink></>,
        <ComputerUseEnableSwitch checked={enabled} onChange={(value) => save('agentComputerUse', value)} permissions={permissions}
          onOpenSystemSettings={onOpenSystemSettings} onLearnMore={onLearnMore}/>, enableDescription),
      // W14-code r4 shell r4-shared-9 (E95): c71860c77 Zt draws Unhide (`disabled: !v`) and the preferred mode (`disabled:
      // !v || !S`) whenever the section is available, disabled while computer use is off.
      row('computerUseAutoUnhide', t('Unhide apps when DeepSeek finishes'),
        t('When DeepSeek has full control of your screen, apps hidden during a task are restored when DeepSeek stops.'),
        <SettingSwitch label={t('Unhide apps when DeepSeek finishes')} checked={shownValue('computerUseAutoUnhide', config.computerUseAutoUnhide) !== false}
          disabled={!enabled} onChange={(value) => save('computerUseAutoUnhide', value)}/>),
      row('computer-use-preferred-mode', t('How DeepSeek uses the apps you allow'),
        // Official c71860c77 `ii` (hlErDsqOX5): the whole sentence, both modes.
        t('Background: DeepSeek works inside the apps you allow while you keep using your computer, and asks your permission before taking full control of your screen. Full control: DeepSeek takes control of your screen, mouse, and keyboard by default whenever DeepSeek uses an app you allow, without asking again.'),
        <ComputerUsePreferredMode mode={preferredMode} disabled={!enabled || busy} onChange={onPreferredMode}/>),
      // Official c71860c77 Zt: Denied apps (`r(Bt,{deniedBundleIds:i,disabled:c})`, c = !v) renders whenever the section is
      // available (g), disabled while computer use is off; the permission rows (`d&&R`) follow tccState, not the switch.
      { ...row('computer-use-denied-apps', t('Denied apps'),
        t('Any request DeepSeek makes to access these apps is automatically rejected. DeepSeek may still affect them indirectly through actions in allowed apps.'),
        <ComputerUseDeniedAppsControl denied={denied} installed={installedApps} disabled={deniedDisabled} onChange={saveDenied}/>),
        below: <ComputerUseDeniedApps denied={denied} installed={installedApps} disabled={deniedDisabled} onChange={saveDenied}/> },
      ...(enabled ? [
        { ...row('computer-use-allowed-apps', t('Allowed apps'), t('Apps a session allowed. Removing one takes it away from every session; DeepSeek has to ask again before it uses it.'), null),
          below: <ComputerUseAllowedApps apps={grants} busy={busy} onRemove={revoke}/> },
        row('computer-use-teach', t('Teach mode'), computerUseTeachDescription(teachStatus), null),
      ] : []),
      // Zt `d && R`: R is c7f132ac0 x("permissions") (hidden while unread, and when both are NotSupported).
      ...(computerUsePermissionRowsShown(tcc) ? [
        row('computer-use-accessibility', t('Accessibility'), '',
          <ComputerUsePermissionControl status={tcc.accessibility} onOpen={() => onOpenSystemSettings('accessibility')}/>),
        row('computer-use-screen-recording', t('Screen recording'), '',
          <ComputerUsePermissionControl status={tcc.screenRecording} onOpen={() => onOpenSystemSettings('screenRecording')}/>),
      ] : []),
    ],
  };
}
