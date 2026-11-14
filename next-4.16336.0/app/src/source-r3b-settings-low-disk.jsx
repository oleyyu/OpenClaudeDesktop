// cov0-04: where the 2.42304.0 shell mounts the low-disk toast (shared-23 O6, rendered once by the frame C9):
//   let e = tE(); return cy() && e && za?.getFreeDiskSpace ? <G componentName="DesktopLowDiskToastMount" fallback={null}>
//     <D6.Component onManageStorage={e} /></G> : null
// cy (shared-2 qp) waits for the first route paint; tE (shared-20 jA) is the "open storage" navigation, defined only when
// the storage settings are available (shared-3 Sk: desktop, DeviceStorage.getUsage and `cai_polished_volcano`), and pushes
// /settings/desktop?open_storage=true; za is shared-0 DeviceStorage. D6 lazy-loads cf615570b (T3, fail-open).
// Host: `ready` is the app's first boot (the local stand-in for the first route paint); onManageStorage opens Settings ›
// General with the Storage dialog (the local System page's Storage › Manage, which exists unconditionally here, so the
// storage gate reads as on); the module is imported directly instead of lazily (it is ~1 KB). The boundary keeps a
// failing toast from taking the app down, as G with fallback null does.
import React, { Component } from 'react';
import { DeviceStorage, LowDiskToastStore } from './source-r3b-settings-adapters.jsx';
import { DesktopLowDiskToast } from './generated/r3b-settings/low-disk-toast.mjs';

class LowDiskToastBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.warn('[DesktopLowDiskToastMount]', error); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function DesktopLowDiskToastMount({ ready, toasts, onManageStorage }) {
  if (!ready || !toasts || !onManageStorage || !DeviceStorage.getFreeDiskSpace) return null;
  return <LowDiskToastStore.Provider value={toasts}>
    <LowDiskToastBoundary><DesktopLowDiskToast onManageStorage={onManageStorage} /></LowDiskToastBoundary>
  </LowDiskToastStore.Provider>;
}
