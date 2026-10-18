// Host answers for the 2.42304.0 environment picker pieces that scripts/extract-code-ui-current.mjs generates
// (generated/code-current/environment-menu-rows.mjs: cc43287c9 k0/A0/j0/e2; environment-machine-variables.mjs:
// c3f9f1667 Me). The rows, their actions, the star keys and the machine-variable query are original bindings; this
// module supplies what they import from the official runtime: the CDS Menu they render into, the starred-environments
// store's toggle, the desktop bridge's local-environment API and its save revision.
import React, { forwardRef, isValidElement, useSyncExternalStore } from 'react';
import { SourceMenu } from './source-menu.jsx';
import { StartIcon } from './source-code-start-adapters.jsx';

const rootDirection = () => (typeof document !== 'undefined' && document.documentElement?.dir === 'rtl' ? 'rtl' : 'ltr');

// shared-frame qa (EC, the CDS Menu) as the rows use it (Item, Separator). XS's labelDir "auto" (YS) only acts in a
// right-to-left root, where the label span reads dir="auto" + rtl:text-right; this host's locales are left-to-right.
// k0 passes its icon as an Icon element (Zu, the host StartIcon); SourceMenu.Item draws its row icon from the name.
const PickerItem = forwardRef(function PickerItem({ labelDir, icon, children, ...props }, ref) {
  const name = isValidElement(icon) && icon.type === StartIcon ? icon.props.name : icon;
  const auto = labelDir === 'auto' && rootDirection() === 'rtl';
  return <SourceMenu.Item ref={ref} icon={name} {...props}>{auto ? <span dir="auto" className="rtl:text-right">{children}</span> : children}</SourceMenu.Item>;
});
export const EnvironmentPickerMenu = Object.freeze({ ...SourceMenu, Item: PickerItem });

// shared-19 cV (exported `al`, k0's Zr) over XB, the persisted "epitaxy-starred-environments" store: star a place when
// none of its key forms is starred, else unstar them all. Here the starred list lives in the saved-environments file
// (electron/saved-environments.mjs), which stores one form per place (preset:<id>, local:this-computer) and whose
// `star` op toggles it: the open picker binds that op (savedEnvironments.run({op:'star', id})), so cV collapses to a
// toggle of the place the key names. The official store's 10-id cap (Rl maxIds) has no host counterpart.
const starHost = { toggle: null };
export function bindEnvironmentStars(toggle) { starHost.toggle = toggle ?? null; }
export function toggleEnvironmentStar(key) {
  if (typeof key !== 'string' || !starHost.toggle) return;
  starHost.toggle(key === 'local:this-computer' ? key : key.slice(key.indexOf(':') + 1));
}

// shared-0 Em (globalThis["claude.web"]?.LocalSessionEnvironment, c3f9f1667's f and h2's Ye): the desktop bridge's
// local-environment API. Its get() is desktop:call local-environment {op:'get'} (electron/local-environment.cjs),
// answering the saved variables; without the desktop bridge (a browser preview, tests) there is no get.
export const localSessionEnvironment = Object.freeze({
  get get() {
    const call = globalThis.desktop?.call;
    return typeof call === 'function' ? () => call('local-environment', { op: 'get' }).then(result => result?.variables ?? {}) : undefined;
  },
});
/** h2 `!!Ye`: whether this window has the local-environment API (e2 settingsOffered). */
export function localEnvironmentAvailable() {
  return typeof globalThis.desktop?.call === 'function';
}

// c3f9f1667 je (a zustand store {revision, bump}): bumped after the "Edit local environment" dialog saves, so an open
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
