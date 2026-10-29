'use strict';
// V3-w12b-settings-dialogs (S3): the default browser's display name for "Open in {browserName}", as Claude Desktop
// 3.6556.2 reads it in the main process (asar/.vite/build/index.chunk-jPKPzV-P.js, DesktopInfo
// `getDefaultBrowserName(){return Dtr()}`):
//   var Str=40;function Ctr(e){let t=e.trim().replace(/\.app$/i,"").trim();return!t||t.length>Str||/^url:/i.test(t)||
//     /\.(desktop|exe)$/i.test(t)||/[\\/]/.test(t)?null:t}
//   var wtr=3e4,Ttr=null;function Etr(){try{return Ctr(a.app.getApplicationNameForProtocol("https://"))}catch(e){return
//     N.warn("Failed to query default https handler: %o",e),null}}
//   function Dtr(){let e=Date.now();return(!Ttr||e-Ttr.at>=wtr)&&(Ttr={value:Etr(),at:e}),Ttr.value}
// The renderer side (c8ae173c6, src/default-browser-name.mjs) asks again on window focus; a null name shows the generic
// "Open in default browser".
const MAX_NAME_LENGTH = 40; // Str
const CACHE_MS = 3e4; // wtr

/** Ctr: the protocol handler's application name, without ".app"; null for an empty, long, url:, .desktop/.exe or path-like name. */
function cleanBrowserName(raw) {
  const name = String(raw ?? "").trim().replace(/\.app$/i, "").trim();
  return !name || name.length > MAX_NAME_LENGTH || /^url:/i.test(name) || /\.(desktop|exe)$/i.test(name) || /[\\/]/.test(name) ? null : name;
}

/**
 * Dtr over Etr: `app` is Electron's app (getApplicationNameForProtocol), `now` the clock, `warn` the logger. The value
 * is read at most once per 30 s.
 */
function createDefaultBrowserName({ app, now = Date.now, warn = (...args) => console.warn(...args) } = {}) {
  let cached = null; // Ttr
  const read = () => { // Etr
    try {
      return cleanBrowserName(app.getApplicationNameForProtocol("https://"));
    } catch (error) {
      warn("Failed to query default https handler: %o", error);
      return null;
    }
  };
  return function defaultBrowserName() {
    const at = now();
    if (!cached || at - cached.at >= CACHE_MS) cached = { value: read(), at };
    return cached.value;
  };
}

module.exports = { cleanBrowserName, createDefaultBrowserName, DEFAULT_BROWSER_NAME_CACHE_MS: CACHE_MS };
