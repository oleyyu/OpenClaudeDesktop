// B34 Changes "View image" (2.31226 c44d00c7f Ta/Ea/Da/Oa/Pa/Fa, shared-100 Ya/Va/Ba, shared-3 hb): pure helpers for
// the before/after image viewer of a changed image file in the Changes pane.
import { getLocale, t } from "../electron/i18n/index.mjs";

// shared-100 Ba (+ Va "avif"); Ya(path) without allowSvg. The main side (git-status.cjs IMAGE_TYPES) reads the same set.
export const DIFF_IMAGE_EXTENSIONS = Object.freeze(["png", "jpg", "jpeg", "gif", "bmp", "webp", "avif"]);

/** Ya/qa: the lower-cased text after the last dot names a raster image. */
export function isDiffImagePath(path) {
  if (typeof path !== "string") return false;
  const dot = path.lastIndexOf(".");
  return dot >= 0 && DIFF_IMAGE_EXTENSIONS.includes(path.slice(dot + 1).toLowerCase());
}

/** Da: the header's image button is offered only for an image file whose row has no text body. */
export function diffImageButtonShown(path, hasBody) {
  return !hasBody && isDiffImagePath(path);
}

/** Ea: only an image data URL is shown; anything else is "not available". */
export function acceptDiffImage(value) {
  return typeof value === "string" && value.startsWith("data:image/") ? value : null;
}

/** Oa: the decoded byte size of a base64 data URL, or null. */
export function dataUrlByteSize(value) {
  if (typeof value !== "string") return null;
  const comma = value.indexOf(",");
  const head = comma < 0 ? value : value.slice(0, comma);
  if (!head.startsWith("data:") || !head.endsWith(";base64")) return null;
  const body = value.slice(head.length + 1);
  const padding = body.endsWith("==") ? 2 : body.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((body.length * 3) / 4) - padding);
}

const UNITS = ["byte", "kilobyte", "megabyte", "gigabyte"];
/** shared-3 hb(intl, bytes, "short"): 1000-based units, bytes spelled long, one decimal above bytes. */
export function formatImageBytes(bytes, locale = getLocale()) {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  const index = bytes < 1000 ? 0 : Math.min(UNITS.length - 1, Math.floor(Math.log(bytes) / Math.log(1000)));
  try {
    return new Intl.NumberFormat(locale, { style: "unit", unit: UNITS[index], unitDisplay: index === 0 ? "long" : "short",
      maximumFractionDigits: index === 0 ? 0 : 1 }).format(bytes / 1000 ** index);
  } catch {
    return `${bytes} B`;
  }
}

/** The Changes file's status in the reference's terms (added / removed / modified). */
function fileStatus(file) {
  return file?.status === "added" ? "added" : file?.status === "deleted" ? "removed" : "modified";
}
/** The path the "before" image is read at: the previous name of a rename (previous_filename ?? filename). */
export function diffImagePreviousPath(file) {
  const previous = file?.renamedFrom || file?.oldPath;
  return typeof previous === "string" && previous && previous !== file?.path ? previous : file?.path;
}

/** Ta(before, after): fetches both sides of a changed image; an added file has no before, a removed one no after, a
 * failed read is null. `read({ path, side })` resolves to a data URL (or null). */
export function fetchDiffFileImages(read) {
  const one = (path, side) => Promise.resolve().then(() => read({ path, side })).then(acceptDiffImage, () => null);
  return async (file) => {
    const status = fileStatus(file);
    const [before, after] = await Promise.all([
      status === "added" ? null : one(diffImagePreviousPath(file), "before"),
      status === "removed" ? null : one(file.path, "after"),
    ]);
    return { before, after };
  };
}

/** Pa: the dialog title (basename), its description (the folder) and the figures with their labels and alt text.
 * A modified file shows Before | After side by side; an added one only Added, a removed one only Deleted. */
export function diffImageViewer(file) {
  const path = file?.path || "";
  const slash = path.lastIndexOf("/") + 1;
  const status = fileStatus(file);
  const figures = [];
  if (status !== "added") {
    figures.push({ side: "before", label: status === "removed" ? t("Deleted") : t("Before"),
      alt: status === "removed" ? path : t("{name} before the change", { name: diffImagePreviousPath(file) || path }) });
  }
  if (status !== "removed") {
    figures.push({ side: "after", label: status === "added" ? t("Added") : t("After"),
      alt: status === "added" ? path : t("{name} after the change", { name: path }) });
  }
  return { title: path.slice(slash), description: slash > 0 ? path.slice(0, slash - 1) : undefined, columns: figures.length > 1 ? 2 : 1, figures };
}
