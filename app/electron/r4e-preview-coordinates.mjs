// R4e-preview (preview-15) and R4f-preview-coords (F2): the host side of the 2.42304.0 coordinate handling
// (generated/r4e-preview-coordinates.mjs, extracted from main index.chunk-muI2IV6k.js by scripts/extract-r4e-preview.mjs).
// preview-service.cjs records a tab's frame and geometry when the agent takes a screenshot; a click, hover or scroll
// given a point then checks the record, checks the point against the frame, and maps it to the page's CSS pixels.
//
// The original (C4i, c4i, h4i, m2 and their d2 / f2 maps, one entry per tab; k4i around them):
// - a screenshot records its frame and the page's viewport with it (c4i: d2 ← { viewportWidth, viewportHeight from
//   h4i (innerWidth × innerHeight over a zoom above 1), screenshotWidth, screenshotHeight (the frame), visible }, and
//   f2 ← false). A record counts only with a frame size (C4i's i());
// - before a `coordinate` is used, C4i asks _4i whether the geometry moved since (scale beyond 0.5 %, width or height
//   beyond g4i(scale)). If it did, the record goes and the tab is marked changed (m2(e, t, !0)), and the action fails
//   with `${action}: the page's zoom or size has changed; take a new screenshot …` (errorClass needs_screenshot);
// - with no record, a tab marked changed fails with `${action}: this tab's page, zoom or size has changed; …` until the
//   next screenshot;
// - with a record, k4i asks S4i whether the point is inside the frame (x4i px of slack; and inside the visible part of
//   a zoomed-in page) and fails with `${action}: ${message}` (errorClass coordinate_out_of_bounds); otherwise it
//   dispatches b4i's point: y4i's × viewportWidth / screenshotWidth (rounded), clamped to the viewport.
// What stands in for it here:
// - Cvi (readVisualViewportGeometry, the page's visual viewport): the tab's emulated viewport, which is what changes
//   the page's size or zoom in this preview — its CSS width and height, and the emulation's scale (the fit-to-pane
//   factor of a device preset). The local check also compares deviceScaleFactor (a preset's 2 for mobile, else the
//   display's), which the original's geometry has no field for. The preview never pinch-zooms (Electron leaves visual
//   zoom off), so the geometry's layout size is its size: v4i finds no visible part, and S4i's second check (past the
//   visible part of a zoomed-in page) does not arise here.
// - h4i's innerWidth × innerHeight: the same emulated viewport (CSS pixels), not read from the page.
// - The frame: the screenshot's own pixel size, read from the image CDP returned (imageSize). A screenshot whose size
//   can't be read leaves no record, as in C4i.
// - The original's names for its tools in the needs_screenshot messages (`computer{action:"screenshot"}`,
//   `coordinate`) become this app's (`screenshot`, `x`/`y`); the rest of the message is the original's. S4i's message
//   is the original's as it is.
// - Without a record (no screenshot yet), the original builds one from the frame the pane shows, or fails with
//   "requires a prior screenshot". This preview shows the page itself, not a frame, so the point is used as it is (the
//   page's CSS pixels), as before.
import { createPreviewCoordinateCheck } from "./generated/r4e-preview-coordinates.mjs";

const OFFICIAL_SCREENSHOT = 'computer{action:"screenshot"}';
const OFFICIAL_COORDINATE = "`coordinate`";
function hostWording(message) {
  if (!message.includes(OFFICIAL_SCREENSHOT) || !message.includes(OFFICIAL_COORDINATE)) throw new Error(`r4e-preview: the original's message changed: ${message}`);
  return message.split(OFFICIAL_SCREENSHOT).join("screenshot").split(OFFICIAL_COORDINATE).join("`x`/`y`");
}
const needsScreenshot = (message) => Object.assign(new Error(hostWording(message)), { code: "needs_screenshot" });

const size = (width, height) => (width > 0 && height > 0 ? { width, height } : null);
/** The pixel size of a JPEG or PNG image (the screenshot CDP returned), or null when it isn't one. */
export function imageSize(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 24) return null;
  const b = bytes;
  // PNG: the signature, then IHDR's width and height.
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
    return size(view.getUint32(16), view.getUint32(20));
  }
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  // JPEG: the first frame header (SOF0–SOF15 but DHT, JPG and DAC) gives height, then width.
  for (let i = 2; i + 9 < b.length;) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    if (marker === 0xff) { i += 1; continue; }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) { i += 2; continue; }
    if (marker === 0xd9 || marker === 0xda) return null;
    const length = (b[i + 2] << 8) | b[i + 3];
    if (length < 2) return null;
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return size((b[i + 7] << 8) | b[i + 8], (b[i + 5] << 8) | b[i + 6]);
    i += 2 + length;
  }
  return null;
}

/**
 * `geometry(tab)` → { width, height, scale, deviceScaleFactor, layoutWidth, layoutHeight }: the tab's viewport as the
 * page has it now (CSS pixels).
 */
export function createPreviewCoordinateGuard({ geometry }) {
  const policy = createPreviewCoordinateCheck({ Cvi: (tab) => geometry(tab) });
  const shots = new WeakMap(); // d2: tab → { viewportWidth, viewportHeight, screenshotWidth, screenshotHeight, visible }
  const changed = new WeakMap(); // f2: tab → true once its record was dropped for a change, false after a screenshot
  // C4i's i(): a record counts only with its frame's size.
  const recorded = (tab) => {
    const shot = shots.get(tab);
    return shot && shot.screenshotWidth > 0 && shot.screenshotHeight > 0 ? shot : undefined;
  };
  /** C4i, before `action` uses a point: throws needs_screenshot when the tab's zoom or size changed since. */
  async function check(tab, action) {
    const shot = recorded(tab);
    if (shot) {
      const moved = await policy.zoomOrSizeChanged(tab, undefined, shot) || (shot.visible !== null && geometry(tab).deviceScaleFactor !== shot.visible.deviceScaleFactor);
      if (!moved) return shot;
      // m2(e, t, !0)
      shots.delete(tab);
      if (changed.has(tab)) changed.set(tab, true);
      throw needsScreenshot(policy.zoomChangedError(action));
    }
    if (changed.get(tab) === true) throw needsScreenshot(policy.pageChangedError(action));
    return null;
  }
  return {
    /** c4i: the agent's screenshot of this tab, `frame` ({ width, height } pixels, or null), at the tab's current geometry. */
    remember(tab, frame) {
      // h4i: the viewport in CSS pixels over a zoom above 1, and the geometry it was read at.
      const visible = { ...geometry(tab) };
      const zoom = Math.max(1, visible.scale);
      const view = { w: visible.width / zoom, h: visible.height / zoom, visible };
      const shot = {
        viewportWidth: view.w || 1280, viewportHeight: view.h || 800,
        screenshotWidth: frame?.width ?? 0, screenshotHeight: frame?.height ?? 0,
        visible: view.visible.width > 0 && view.visible.height > 0 ? view.visible : null,
      };
      shots.set(tab, shot);
      changed.set(tab, false);
      return shot;
    },
    check,
    /**
     * k4i for a point `(x, y)` given to `action`: C4i, then S4i (coordinate_out_of_bounds), then b4i — the point in the
     * page's CSS pixels. Without a record the point is the page's already, and is returned as it is.
     */
    async point(tab, action, x, y) {
      const dims = await check(tab, action);
      if (!dims) return { x, y };
      const problem = policy.coordinateProblem(dims, x, y);
      if (problem) throw Object.assign(new Error(`${action}: ${problem}`), { code: "coordinate_out_of_bounds" });
      const [px, py] = policy.dispatchPoint(dims, x, y);
      return { x: px, y: py };
    },
    sizeTolerance: policy.sizeTolerance,
  };
}
