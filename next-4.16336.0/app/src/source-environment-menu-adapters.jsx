// Host answers for the 3.6556.2 environment picker pieces that scripts/extract-code-ui-current.mjs generates
// (generated/code-current/environment-menu-rows.mjs: cc43287c9-Me-M2ucD m8/Rae/zae/uoe, 2.42304.0 k0/A0/j0/e2;
// environment-machine-variables.mjs: c3f9f1667-DnyzRZCB L, 2.42304.0 Me). The rows, their actions, the star keys and
// the machine-variable query are original bindings; this
// module supplies what they import from the official runtime: the CDS Menu they render into, the starred-environments
// store's toggle, the desktop bridge's local-environment API and its save revision.
import React, { forwardRef, useSyncExternalStore } from 'react';
import { SourceMenu } from './source-menu.jsx';

const rootDirection = () => (typeof document !== 'undefined' && document.documentElement?.dir === 'rtl' ? 'rtl' : 'ltr');

// shared-frame GT (exported Jo, the CDS Menu; m8's K) as the rows use it (Item, Separator). Its Item dT hands labelDir
// to uT, which only acts in a right-to-left root: the label span reads dir="auto" + rtl:text-right (`e === "auto" && t`);
// this host's locales are left-to-right. m8, uoe and zae pass icon names ("Laptop", "Add", the row's item.icon, which
// the host menu body sets to "Laptop"); SourceMenu.Item draws its row icon from the name, as dT's _s does.
const PickerItem = forwardRef(function PickerItem({ labelDir, icon, children, ...props }, ref) {
  const auto = labelDir === 'auto' && rootDirection() === 'rtl';
  return <SourceMenu.Item ref={ref} icon={icon} {...props}>{auto ? <span dir="auto" className="rtl:text-right">{children}</span> : children}</SourceMenu.Item>;
});
export const EnvironmentPickerMenu = Object.freeze({ ...SourceMenu, Item: PickerItem });

// shared-46 aS (exported So, m8's Ta; 2.42304.0 shared-19 cV) over Kx, the persisted "epitaxy-starred-environments"
// store: star a place when none of its key forms is starred, else unstar them all. Here the starred list lives in the
// saved-environments file (electron/saved-environments.mjs), which stores one form per place (preset:<id>,
// local:this-computer) and whose `star` op toggles it: the open picker binds that op (savedEnvironments.run({op:'star',
// id})), so aS collapses to a toggle of the place the key names. The official store's 10-id cap
// (`Hn("epitaxy-starred-environments", { maxIds: 10 })`) has no host counterpart.
const starHost = { toggle: null };
export function bindEnvironmentStars(toggle) { starHost.toggle = toggle ?? null; }
export function toggleEnvironmentStar(key) {
  if (typeof key !== 'string' || !starHost.toggle) return;
  starHost.toggle(key === 'local:this-computer' ? key : key.slice(key.indexOf(':') + 1));
}

// shared-0 lh (globalThis["claude.web"]?.LocalSessionEnvironment, c3f9f1667's f and the picker body N8's An; 2.42304.0
// shared-0 Em, h2's Ye): the desktop bridge's
// local-environment API. Its get() is desktop:call local-environment {op:'get'} (electron/local-environment.cjs),
// answering the saved variables; without the desktop bridge (a browser preview, tests) there is no get.
export const localSessionEnvironment = Object.freeze({
  get get() {
    const call = globalThis.desktop?.call;
    return typeof call === 'function' ? () => call('local-environment', { op: 'get' }).then(result => result?.variables ?? {}) : undefined;
  },
});
/** N8 `!!An`: whether this window has the local-environment API (uoe settingsOffered). */
export function localEnvironmentAvailable() {
  return typeof globalThis.desktop?.call === 'function';
}

// c3f9f1667 F (exported f; 2.42304.0 je; a zustand store {revision, bump}): bumped after the "Edit local environment" dialog saves, so an open
// picker re-reads whether this machine has variables. Selector hook plus getState(), as the store is used there.
let revisionState;
const revisionListeners = new Set();
revisionState = {
  revision: 0,
  bump() { revisionState = { ...revisionState, revision: revisionState.revision + 1 }; for (const listener of revisionListeners) listener(); },
};
const subscribeRevision = listener => { revisionListeners.add(listener); return () => revisionListeners.delete(listener); };
const readRevision = () => revisionState;
export function localEnvironmentRevision(selector) {
  return selector(useSyncExternalStore(subscribeRevision, readRevision, readRevision));
}
localEnvironmentRevision.getState = readRevision;
