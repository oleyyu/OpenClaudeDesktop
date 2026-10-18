// Local services for the 2.42304.0 originals in generated/files-changes (scripts/extract-files-changes.mjs): this module
// answers the imports that generator maps to the host. Nothing here re-implements an official binding; each export is
// the local stand-in for a runtime service the desktop app provides.
import { useCallback, useContext, useSyncExternalStore, version } from "react";
import { cdsClassNames, CdsButton, CdsIcon, CdsContextMenu, CdsDensityContext } from "./generated/view-tabs/shared-frame-BfjMqbuN.js";
import { clsx, cva, DirectionContext } from "./generated/view-tabs/vendor-frame-DfPJ1QmD.js";
import { createPersistedValues } from "./tile-layout-store.mjs";
import { useStartIntl } from "./source-code-start-adapters.jsx";

// vendor-frame Eo (`re = "19.2.4"`): the React version the bundle was built with. shared-frame Km/qm read it to pick
// `inert: true` (React 19+) over `inert: ""`; locally that is the React this renderer runs.
export const reactVersion = version;

// shared-frame xd (X, tailwind-merge over clsx): the view-tabs graph's copy (D1 semantic name), so the generated
// components merge classes with the same configured instance as every other CDS component.
export { cdsClassNames };

// vendor-intl l (react-intl FormattedMessage) and p (useIntl): the English defaultMessage is looked up in the local
// catalog by t() (zh-CN) and formatted with ICU syntax ({name}, plurals) by react-intl's createIntl, as the start card's
// messages are (source-code-start-adapters.jsx useStartIntl). R3-files FT-16: the compact tree's "{count, plural, …}".
export function FormattedMessage({ values, ...message }) {
  return useStartIntl().formatMessage(message, values);
}
export { useStartIntl as useIntl } from "./source-code-start-adapters.jsx";
// vendor-intl f (react-intl defineMessages): the identity (`function tn(e){return e}`).
export const defineMessages = (messages) => messages;

// shared-28 gs/cs/_s/as (2.42304.0 Xf/Gf/qf/Wf) over the persisted values in tile-layout-store.mjs: localStorage
// `persisted.<key>`, the same key the official renderer writes, without the desktop preferences bucket. Storage is read
// lazily, so a window (or a test) that sets localStorage up later still gets it; other windows' writes arrive through
// the `storage` event.
const storage = () => { try { return globalThis.localStorage ?? null; } catch { return null; } };
const subscribeStorage = (listener) => {
  const target = globalThis.window;
  if (typeof target?.addEventListener !== "function") return () => {};
  target.addEventListener("storage", listener);
  return () => target.removeEventListener("storage", listener);
};
export const persistedValues = createPersistedValues({ storage, subscribeStorage });
/** gs (Xf): the stored value of `key` (else `fallback`), re-rendering when it changes in this or another window. */
export function usePersistedValue(key, fallback) {
  const subscribe = useCallback((listener) => persistedValues.subscribe(key, listener), [key]);
  return useSyncExternalStore(subscribe, () => persistedValues.read(key, fallback), () => fallback);
}
/** cs (Gf): the stored value of `key`, else `fallback`. */
export function readPersistedValue(key, fallback) {
  return persistedValues.read(key, fallback);
}
/** _s (qf): store a value, or an updater of the stored one (read with `fallback`). */
export function writePersistedValue(key, value, fallback) {
  persistedValues.write(key, value, fallback);
}
/** as (Wf): whether the desktop preferences bucket is still loading. Local storage is synchronous: never. */
export function persistedValuesLoading() {
  return false;
}

// shared-9 V_/H_ (B_ registry): code that forgets per-session state when a session is evicted (c03935b01 lc, the
// session's delete). c03935b01 registers `$e((e) => Rn(e, "branch"))` at module scope; source-diff-scope.jsx makes the
// same call, and main.jsx's delete notifies.
const evictionListeners = new Set();
export function onSessionEvicted(listener) {
  evictionListeners.add(listener);
  return () => evictionListeners.delete(listener);
}
export function notifySessionEvicted(sessionId) {
  for (const listener of evictionListeners) listener(sessionId);
}

// ---- R3-files (FT-03 / FT-05): the services the Files pane originals read. ----

// shared-0 Om (`globalThis["claude.web"]?.LocalSessions`): the desktop's local-session bridge. The gone hook (c856385e2 V)
// only reads isSessionPathGone, and skips the check when it is undefined (no desktop: SSR, tests, a plain browser), so
// the method exists only while the preload's desktop bridge does. Main answers `file:gone` (electron/files.cjs
// createSessionPathGone, the local stand-in for LocalSessions isSessionPathGone / judgeSessionPathGone).
export const LocalSessions = Object.freeze({
  get isSessionPathGone() {
    const call = globalThis.window?.desktop?.call;
    return typeof call === "function"
      ? (sessionId, path) => Promise.resolve(call("file:gone", { sessionId, path })).then((gone) => gone === true)
      : undefined;
  },
  // R3-files FT-14: getGitInfo(folder), read by shared-11 Rd/zd (git-info-query.mjs) for cccc2cf0a zx's `select: (e) =>
  // e?.root`. The desktop answers it from its git service; locally main's "repo-identities" (git-status.cjs
  // repoIdentity: `rev-parse --show-toplevel` on the realpath, cached per folder) gives the repository root. Only
  // {isRepo, root, repo} are filled: zx reads root alone. Undefined without the desktop bridge (the query stays disabled).
  get getGitInfo() {
    const call = globalThis.window?.desktop?.call;
    return typeof call === "function"
      ? (folder) => Promise.resolve(call("repo-identities", { cwds: [folder] })).then((identities) => {
        const identity = identities?.[folder];
        return identity?.isRepo === true && typeof identity.toplevel === "string"
          ? { isRepo: true, root: identity.toplevel, repo: identity.owner ? `${identity.owner}/${identity.name}` : identity.name ?? "" }
          : { isRepo: false };
      })
      : undefined;
  },
});

// shared-0 my (Za: GrowthBook `isOn`) and gy (no: the evaluated value). OpenClaude has no GrowthBook; these are the
// answers of a client that never loaded (Za returns false, no() undefined), so a kill switch such as "__gb__3212098161"
// stays off and a rollout gate such as "__gb__3508862586" (`n(s) !== false`) keeps its default.
export function growthBookOn() {
  return false;
}
export function growthBookValue() {
  return undefined;
}

// c856385e2 B (session id -> {id, type}): the original tells a CLI session (shared-11 Ao prefix) and a local one
// ("local_" id prefix) from a remote one. Every OpenClaude session runs in the local engine on this machine, and its ids
// carry no such prefix, so each is local here.
export function localSessionTarget(id) {
  return { id, type: "local" };
}

// ---- R3-files (FT-16): the breadcrumb folder popover (cfac349aa Pt/Nt/Lt) and its compact tree (ca7840910 ie). ----

// View-tabs semantic names (D1): vendor-frame za (clsx), shared-frame cl (CdsButton, the Try again button), Hl (CdsIcon,
// the caret and file icons), Ii (CdsContextMenu, the tree rows' menu when a caller gives contextMenuItems).
export { clsx, CdsButton, CdsIcon, CdsContextMenu };
// R3-files FT-14: vendor-frame Ea (class-variance-authority), the view-tabs graph's `cva` (shared-frame Cx's `g`).
export { cva };
// vendor-frame Wn = Td (Base UI useDirection): `function Td(){return N(wd)?.direction??"ltr"}` over view-tabs
// DirectionContext (wd). extract-files-changes.mjs adapterChecks pins the restated text.
export function useDirection() {
  return useContext(DirectionContext)?.direction ?? "ltr";
}
// shared-frame su = ja (`function ja(){return W(la)}`): the CDS density, the view-tabs CdsDensityContext (la).
export function useCdsDensity() {
  return useContext(CdsDensityContext);
}
// shared-frame Jl = lo (a template `calc(${e/16}rem * var(${io}, 1))`, io = "--cds-rem-scale"): a px length as rem-scaled CSS.
export const cdsRem = (px) => `calc(${px / 16}rem * var(--cds-rem-scale, 1))`;
// shared-frame du = Na (`Pa()??"light"`): the CDS mode from an enclosing CdsRoot's mode store (Pa: `W(da)??fa`). The host
// renders no CdsRoot, so the original's answer here is fa's undefined snapshot, i.e. "light". (Only the colored
// file-type icon set reads it, and that set is behind GrowthBook "__gb__2954460583", off locally.)
export function useCdsMode() {
  return "light";
}
// shared-frame Oc (CdsTooltip): the Files pane's tooltip, SourceTooltip (content / multiline / side / align / open /
// className, function content resolved at open). The breadcrumb shell (code-current breadcrumb-file.mjs) uses it too.
export { SourceTooltip as FilesTooltip } from "./source-tooltip.jsx";
// shared-frame Zi (CDS Popover), tl (SkeletonGroup), $c (Skeleton with .Rows): see source-breadcrumb-adapters.jsx.
export { FolderPopover as FilesPopover, FolderSkeletonGroup as FilesSkeletonGroup, FolderSkeleton as FilesSkeleton } from "./source-breadcrumb-adapters.jsx";
