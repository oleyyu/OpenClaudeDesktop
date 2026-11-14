// General > Menu bar (c71860c77) drives main dji: the Tray exists only while
// menuBarEnabled is on (source default true). Left click is pji (4.16336.0
// rTo): it toggles Quick Entry (quick-entry/window.cjs), and shows the main
// window when Quick Entry cannot open. Right click pops NOr's menu built from
// the current account.
const REFRESH_WAIT_MS = 800;
// pK / KK: restore a minimized window, focus a visible one, otherwise show it.
// The tray's Show App and Window > Show Main Window share it.
function showWindow(window) {
  if (!window || window.isDestroyed()) return;
  if (window.isMinimized()) { window.restore(); window.focus(); }
  else if (window.isVisible()) window.focus();
  else window.show();
}

function createMenuBar({ Tray, Menu, nativeImage, app, iconPath, menuModel, getWindow, getEnabled, getAccount, getClient, quickEntry = null }) {
  let tray = null, disposed = false;
  // Last successful account/rateLimits/read for one client + identity. The
  // sparse account/rateLimits/updated notification is not merged; each menu
  // open refetches instead, as that notification's contract allows.
  let cache = { client: null, key: null, limits: null, failed: false }, reading = null;
  const identity = () => {
    const account = getAccount()?.account;
    return account ? JSON.stringify([account.type, account.email ?? null]) : null;
  };
  const owns = (client, key) => cache.client === client && cache.key === key;

  function showApp() { showWindow(getWindow()); }
  // pji fallback when no Quick Entry window is shown: show and focus.
  function showFallback() {
    const window = getWindow();
    if (!window || window.isDestroyed()) return;
    if (window.isMinimized()) window.restore(); else window.show();
    window.focus();
  }
  // rTo: `!await activateQuickEntryWindow() && mainWindow && (restore, show, focus)`.
  function click() {
    if (!quickEntry) { showFallback(); return; }
    Promise.resolve().then(quickEntry).then((shown) => { if (!shown) showFallback(); }, () => showFallback());
  }

  function refresh() {
    const client = getClient(), key = identity();
    if (!client || !key) return Promise.resolve();
    // A different connection or account never reuses another's numbers.
    if (!owns(client, key)) cache = { client, key, limits: null, failed: false };
    if (reading?.client === client && reading.key === key) return reading.promise;
    const promise = client.request('account/rateLimits/read', {}, 15000).then(
      limits => { if (owns(client, key)) cache = { ...cache, limits, failed: false }; },
      () => { if (owns(client, key)) cache = { ...cache, failed: true }; },
    ).finally(() => { if (reading?.promise === promise) reading = null; });
    reading = { client, key, promise };
    return promise;
  }

  async function popUp() {
    const account = getAccount();
    if (menuModel.trayUsageEligible(account)) {
      let timer;
      await Promise.race([refresh(), new Promise(resolve => { timer = setTimeout(resolve, REFRESH_WAIT_MS); })]);
      clearTimeout(timer);
    }
    if (disposed || !tray || tray.isDestroyed()) return;
    const owned = owns(getClient(), identity());
    const rows = menuModel.trayUsageRows({ account: getAccount(), limits: owned ? cache.limits : null, limitsFailed: owned && cache.failed }, menuModel.uiLocale?.() || app.getLocale());
    const template = menuModel.trayMenuTemplate({ appName: app.name, rows }).map(item =>
      item.id === 'show' ? { ...item, click: showApp } : item.id === 'quit' ? { ...item, click: () => app.quit() } : item);
    tray.popUpContextMenu(Menu.buildFromTemplate(template));
  }

  function update() {
    if (disposed) return;
    if (!getEnabled()) {
      if (tray && !tray.isDestroyed()) tray.destroy();
      tray = null;
      return;
    }
    if (tray && !tray.isDestroyed()) return;
    tray = new Tray(nativeImage.createFromPath(iconPath));
    tray.setToolTip(app.name);
    tray.on('click', click);
    tray.on('right-click', () => { popUp().catch(() => {}); });
  }

  function dispose() {
    disposed = true;
    if (tray && !tray.isDestroyed()) tray.destroy();
    tray = null;
  }

  return { update, dispose, popUp, showApp, active: () => !!tray && !tray.isDestroyed() };
}

module.exports = { createMenuBar, showWindow };
