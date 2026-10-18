import { t } from "../electron/i18n/index.mjs";

// Files pane viewer cards for files that open without a text body (2.2553.1
// ion-dist/assets/v1/cd2efac6e-CAi4fxTN.js, prettier-formatted): the jo
// unavailable card To/Un (:3602-3740, role "alert" unless the typed
// unsupported card, no icon, the reason body followed by the requested path),
// the binary card (:4604-4612, title only, with Xo's xxs secondary "View as
// text anyway" :4874-4897) and the empty card (:4336-4346, title only).
// The reasons are the classified results of electron/files.cjs readFile.
export const FILE_UNAVAILABLE_REASONS = Object.freeze(["missing", "outside_root", "too_large", "read_error", "binary", "empty"]);
export const VIEW_AS_TEXT_LABEL = t("View as text anyway");

const COPY = Object.freeze({
  missing: { title: t("Couldn’t find this file"), body: t("It may have been deleted or moved."), role: "alert", showsPath: true },
  outside_root: { title: t("This file is outside the working directory"), body: t("It can’t be opened here, but it may still exist on disk."), role: "alert", showsPath: true },
  too_large: { title: t("Preview isn’t available for this file"), body: t("It’s too large to preview here."), role: "alert", showsPath: true },
  read_error: { title: t("Couldn’t read this file"), body: t("It may be unreadable, or the session’s connection may have dropped."), role: "alert", showsPath: true },
  binary: { title: t("This file looks like binary data and can’t be previewed as text"), body: null, role: undefined, showsPath: false, action: "view-as-text" },
  empty: { title: t("This file is empty"), body: null, role: undefined, showsPath: false },
});

// Media read without their bytes (electron/files.cjs): the viewer shows them
// from their file:// URL (cd2efac6e nr/ir) instead of a card.
// B13: "pdf" too (electron/files.cjs), shown in Chromium's PDF viewer.
export const FILE_MEDIA_KINDS = Object.freeze(["image", "video", "audio", "pdf"]);
// The Un card of a media file that failed to load (cd2efac6e :4527-4599, the
// local-reader branch "Couldn’t load this file"): no role, no path, with Xo's
// "View as text anyway" (Uc). nr picks the image body; video and audio share
// the media one.
export function fileMediaErrorCopy(kind) {
  return {
    title: t("Couldn’t load this file"),
    body: kind === "image"
      ? t("This image couldn’t be loaded. It may be too large, or it may have been deleted or moved.")
      : t("This file couldn’t be loaded for preview. It may be too large to preview inline, in a format this browser can’t play, or it may have been deleted or moved."),
    role: undefined, showsPath: false, action: "view-as-text",
  };
}

// A tab's body state: the read result's `unavailable` reason (a media kind
// included), an empty text body, or null for a renderable (or still loading)
// file.
export function fileTabReason(tab) {
  if (!tab) return null;
  if (FILE_MEDIA_KINDS.includes(tab.unavailable)) return tab.unavailable;
  if (typeof tab.unavailable === "string") return Object.hasOwn(COPY, tab.unavailable) ? tab.unavailable : "read_error";
  if (tab.text === "") return "empty";
  return null;
}

// R4g-files FV1 (files-03): 2.42304.0 cd2efac6e-C1jvGOgh.js shows the empty card over a shown preview when
// `(J==="markdown"||J==="text")&&Fp===void 0&&(q?.contents===""||!Sc&&q?.contents.trim()==="")` with
// `Sc=q?.truncated===!0`: an empty body, or an untruncated whitespace-only one. Only the preview kinds; a
// whitespace-only source file keeps its code view (fileTabReason is unchanged). The sandbox arm (Hl: html, svg) has
// its own card, `Hu=X!==null&&(X.content===""||…byteLength===0)` with X = {mime:Yn, content:q?.contents}: only a
// body that is exactly empty. Locally there is no "text" arm (hn: .txt/.text in the document presentation), no
// native-preview X and no Fp render override.
export function filePreviewEmpty(kind, tab) {
  const text = tab?.text;
  if (typeof text !== "string") return false;
  if (kind === "html" || kind === "svg") return text === "";
  if (kind !== "markdown" && kind !== "text") return false;
  return text === "" || (tab.truncated !== true && text.trim() === "");
}

/** {title, body, role, showsPath, action} for a reason; unknown reasons read as read_error. */
export function fileUnavailableCopy(reason) {
  const copy = COPY[reason] ?? COPY.read_error;
  return { title: copy.title, body: copy.body, role: copy.role, showsPath: copy.showsPath, action: copy.action ?? null };
}

// B32: the card actions of 2.31226.0 cd2efac6e (readable): mp/fp "Try again" (:5181-5185, :5146-5151), bp/Cp/wp/Tp
// "Create file" (:5195-5225), tp/pp the outside-root "Add folder" offer (:5114-5180), Gl the outside-root reveal
// (:6735-6748 via :4237-4256) and uc, Br's reveal item, on the binary and media cards (cu :7179-7203).
export const FILE_CARD_LABELS = Object.freeze({
  tryAgain: t("Try again"),
  tryingAgain: t("Trying again…"),
  createFile: t("Create file"),
  creatingFile: t("Creating file…"),
  addFolder: t("Add folder"),
  addingFolder: t("Adding folder…"),
  showInFinder: t("Show in Finder"),
  revealFailed: t("Couldn’t show this file in its folder."),
});
export const createFileFailedMessage = (name) => t("Couldn’t create {name}. You can select Create file again or ask Claude to create it.", { name });
export const addFolderFailedMessage = (folder) => t("Couldn’t add {folder} to this session.", { folder });

// Gt (shared-28-MgJrblDu Ak): a name Create file may make — not an office, archive, binary, font or media type
// (kk), nor an image (mk).
const NOT_CREATABLE = /\.(doc[xm]?|xls[xm]?|ppt[xm]?|od[tsp]|rtf|epub|mobi|pages|numbers|zip|t?gz|tar|bz2|xz|zst|7z|rar|jar|war|dmg|iso|deb|rpm|apk|msi|pkg|img|wasm|exe|dll|so(?:\.\d+)*|dylib|bin|class|pyc|o|a|db|sqlite3?|parquet|woff2?|ttf|otf|eot|pdf|mp4|webm|m4v|mov|ogv|avi|mkv|wmv|flv|mpe?g|m2ts|3gp|mp3|m4a|aac|flac|wav|ogg|oga|opus|aiff?|wma|midi?|ico|tiff?|heic|heif|jfif|psd|tga|dng|svgz)$/i;
const IMAGE_NAME = /\.(png|jpe?g|gif|bmp|webp|avif)$/i;
export function canCreateFileNamed(path) {
  const value = String(path ?? "");
  return value !== "" && !/[\\/]$/.test(value) && !NOT_CREATABLE.test(value) && !IMAGE_NAME.test(value);
}

// fe(tp, homePath) then rp: the offered folder with the home folder shown as "~", unless that leaves only "~".
export function offeredFolderLabel(folder, home) {
  const value = String(folder ?? ""), base = String(home ?? "").replace(/[\\/]+$/, "");
  if (!base || (value !== base && !value.startsWith(`${base}/`))) return value;
  return value === base ? value : `~${value.slice(base.length)}`;
}

/**
 * The card for a reason with its actions (pure). writable: the session can write files here (Fo); creatable: the
 * read's "parent folder exists" answer (Qo); canAskClaude: the session takes messages (Ld); folderOffer: the folder
 * suggestion for an outside-root file (tp); canReveal: a reveal target exists for this card (Gl for outside_root, Br's
 * revealItem uc for binary). Returns the copy plus {retry, create, offer, reveal, viewAsText}.
 */
export function fileCardPlan(reason, { path = "", writable = false, creatable, canAskClaude = false, folderOffer = null, canReveal = false, canViewAsText = false } = {}) {
  const copy = fileUnavailableCopy(reason);
  const missing = reason === "missing";
  const named = missing && writable && canCreateFileNamed(path);
  const offer = reason === "outside_root" && typeof folderOffer === "string" && folderOffer !== "" ? folderOffer : null;
  const plan = { ...copy, retry: missing, create: named && creatable === true, offer,
    reveal: canReveal && (reason === "outside_root" || reason === "binary"),
    viewAsText: copy.action === "view-as-text" && canViewAsText };
  if (named && creatable === false && canAskClaude) plan.body = t("It can’t be created from here. Ask Claude to create it.");
  if (offer) Object.assign(plan, { title: t("This file is outside this session’s folders"), body: null, showsPath: false });
  return plan;
}
