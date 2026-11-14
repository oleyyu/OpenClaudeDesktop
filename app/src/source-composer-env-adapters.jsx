// Host answers for the 4.16336.0 composer environment bar (scripts/extract-composer-env-v4.mjs, surfaces-prod-2
// composer-env). The bar shows paths the way 4.16336.0 does: cc43287c9 `Yg(path, labelContext)` (shared-3 rn = VM, sliced
// once by the code-start-v4 surface: src/generated/code-start-v4/shared-3.mjs).
//
// The label context is the official one, linked (D1: one instance): 4.16336.0 Jge reads `ae = rT()` (cd8a7d7c0 export i
// = y, useHomeLabelContext `{ home }`) over that chunk's module store `u = $v(l())`, l() = window.desktopHomePath (a
// non-empty string, else undefined), and takes `oe = localKind ? ae : iT` (iT = cd8a7d7c0 export n = p, the empty
// context: paths in full). Its owner is src/generated/code-routines-v4/cd8a7d7c0-DuH0T8rm.mjs (bindings l, u, d, f, p, y;
// the 4.16336.0 cowork-scheduled graph links its u too); the composer-env generator lists it in linkedAreas and pins
// Jge's rT / iT to it. The host sets window.desktopHomePath in electron/preload.cjs (the official mainView preload's
// managed-config homePath, app.getPath("home")), before the renderer evaluates u. OpenClaude's environments are all
// local, so `localKind` is always true here: the bar reads y().
import { p as officialNoHomeLabelContext, y as officialHomeLabelContext } from './generated/code-routines-v4/cd8a7d7c0-DuH0T8rm.mjs';
import { VM as officialPathLabel } from './generated/code-start-v4/shared-3.mjs';

/** cd8a7d7c0 y (export i, Jge `rT()`): `{ home }` from the official home store u (window.desktopHomePath). A hook. */
export const useHomeLabelContext = officialHomeLabelContext;

/** cd8a7d7c0 p (export n, Jge `iT`): the context without a home — paths read in full. */
export const noHomeLabelContext = officialNoHomeLabelContext;

/** cc43287c9 Yg (shared-3 VM): a path as the user reads it, ~-relative under the label context's home. */
export function environmentPathLabel(path, labelContext = noHomeLabelContext) {
  return typeof path === 'string' && path !== '' ? officialPathLabel(path, labelContext) : path;
}
