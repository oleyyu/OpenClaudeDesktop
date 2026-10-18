// Account menu header and sidebar footer labels. Original sidebar-rows tV
// renders the identity line, then an org line `orgPrimary · orgSecondary`
// (or orgPrimary alone); the footer pw shows `identity · orgPrimary`. Code
// Desktop has one organisation, the DeepSeek API, and the account kind is
// the secondary part (never "DeepSeek · DeepSeek").
import { t, getAssistantName } from "../electron/i18n/index.mjs";
import { allCores, coreAssistant, coreForEngine, coreName } from "../electron/core-registry.mjs";
import { deepseekKeyDescription, usesCustomEndpoint } from "./account-settings-model.mjs";
import { planLabel } from "./usage-model.mjs";

// boot.core (or a serverInfo), or a core id / engine string (config.core before the first connect).
const engineOf = (core) => (typeof core === "string" ? core : core?.engine);

// Before boot arrives (init waits for the core to connect) no core is passed, but the window already runs one: the
// preload's first-paint appearance set the assistant name (settings-model windowCore). Its id, or null (DeepSeek).
function windowCoreId() {
  const name = getAssistantName();
  return allCores().find((core) => core.available !== false && coreAssistant(core) === name)?.id ?? null;
}

/**
 * @param {object | null | undefined} accountRead - account/read (boot.account)
 * @returns {{orgPrimary: string, orgSecondary: string | null}}
 */
export function accountMenuLines(accountRead, reported) {
  // The running core's provider: "DeepSeek API" for the DeepSeek core, else its name. Before any core reports, the
  // window's own core (so a Kimi or Codex window never reads "DeepSeek API" while its core starts).
  const core = reported || windowCoreId();
  const id = core ? coreForEngine(engineOf(core)).id : "deepseek";
  // The secondary part: the account kind for a key, the signed-in email for a browser sign-in (Codex's ChatGPT account).
  const account = accountRead?.account;
  const email = typeof account?.email === "string" && account.email.trim() ? account.email.trim() : null;
  return { orgPrimary: id === "deepseek" ? (customProvidersOnly(accountRead) ? t("Custom provider") : "DeepSeek API") : coreName(core),
    orgSecondary: account?.type === "apiKey" ? t("API key") : email };
}

// The DeepSeek core running on custom providers only (setup's Connect a model: GLM, Kimi…): an account is reported,
// but no DeepSeek key is configured and no Platform sign-in is stored, so "DeepSeek API" would name a vendor never chosen.
function customProvidersOnly(accountRead) {
  const deepseek = accountRead?.deepseek;
  return !!accountRead?.account && !!deepseek && typeof deepseek === "object" && deepseek.apiKey?.configured !== true && deepseek.platform !== "credential-stored";
}

/** The header's org line text. */
export function accountOrgLine({ orgPrimary, orgSecondary }) {
  return orgSecondary ? `${orgPrimary} · ${orgSecondary}` : orgPrimary;
}

/**
 * Footer and menu-header identity, after shared-21 IO (sidebar-rows.js:8597-8613): identity is the
 * principal's display name, else the provider label; with a principal the org line is the label plus
 * the subtitle, without one it is the subtitle alone. Locally the principal is the preferred name
 * (Settings › Profile), the provider label 'DeepSeek API' and the subtitle the account kind.
 * @param {string | null | undefined} displayName
 * @param {object | null | undefined} accountRead - account/read (boot.account)
 * @returns {{identity: string, orgPrimary: string | null, orgSecondary: string | null}}
 */
export function accountIdentity(displayName, accountRead, core) {
  const { orgPrimary: label, orgSecondary: subtitle } = accountMenuLines(accountRead, core);
  const name = typeof displayName === "string" ? displayName.trim() : "";
  return name ? { identity: name, orgPrimary: label, orgSecondary: subtitle } : { identity: label, orgPrimary: subtitle, orgSecondary: null };
}

/**
 * The sidebar footer account button (shared-19 E0), user ruling 2026-10-18: the CDS Avatar of the principal's name
 * (C0 = pp{name: x0 full_name||display_name||email_address}: its initials, "OY"), the name's first word (VWt
 * `display_name || name.split(/\s+/)[0]`, "Oley"), then `· plan`. The plan: "API" for an API-key account; the plan
 * account/read reports (planLabel: Codex's ChatGPT Plus / Pro, a bridge's own sign-in name); a subscription sign-in
 * without one, or no account at all, falls back to the core / provider label ("DeepSeek API", "Codex").
 * @param {string | null | undefined} displayName - the preferred name (Settings › Profile)
 * @param {object | null | undefined} accountRead - account/read (boot.account)
 * @returns {{avatarName: string, name: string, plan: string}}
 */
export function accountFooter(displayName, accountRead, core) {
  const { orgPrimary: provider } = accountMenuLines(accountRead, core);
  const account = accountRead?.account;
  const plan = account?.type === "apiKey" || (!account && accountRead?.deepseek?.apiKey?.configured === true) ? "API"
    : planLabel(account?.planType) || provider;
  const full = typeof displayName === "string" ? displayName.trim() : "";
  const email = typeof account?.email === "string" ? account.email.trim() : "";
  const name = full.split(/\s+/)[0] || email || provider;
  return { avatarName: full || email || provider, name, plan: plan === name ? "" : plan };
}

/** The footer 'Connection settings' menu header (a retained local control) names the running core. */
export function connectionMenuHeader(engine, connected) {
  // engine: a core id or boot.core (core-registry.mjs).
  const name = coreName(engine);
  return connected ? t("{name} connected", { name }) : t("{name} disconnected", { name });
}

/**
 * The Home card and composer warning that ask to sign in to the running core, or null. Shown when account/read
 * reports no account and the core's descriptor lists sign-in options (core-registry `login`), unless the core runs
 * without one: the DeepSeek key flow has its own card, Codex on a custom endpoint needs none (requiresOpenaiAuth
 * false), and a bridge reporting a free tier under its own id (OpenCode Zen, MiMo Auto) works signed out.
 * A native core (Codex) is trusted on requiresOpenaiAuth; a bridge's false only says it has no ChatGPT sign-in
 * (ZCode and the ACP agents always report false), so there the missing account decides.
 * @param {object | null | undefined} accountRead - account/read (boot.account)
 * @param {object | string | undefined} core - boot.core, or a core id
 * @returns {null | {name: string, action: "login" | "settings"}} action "login": the core's one browser sign-in
 *   (account/login/start, Codex's ChatGPT); "settings": Settings › Account lists the core's sign-ins and keys.
 */
export function coreSignInPrompt(accountRead, core) {
  if (!accountRead || typeof accountRead !== "object" || accountRead.account || accountRead.deepseek) return null;
  const descriptor = coreForEngine(engineOf(core));
  const login = descriptor.login;
  const browser = Array.isArray(login?.browser) ? login.browser : [];
  const options = browser.length + (Array.isArray(login?.deviceCode) ? login.deviceCode.length : 0) + (Array.isArray(login?.apiKey) ? login.apiKey.length : 0);
  if (!options || usesCustomEndpoint(accountRead, core)) return null;
  const required = accountRead.requiresOpenaiAuth === true
    || (descriptor.kind !== "native" && !accountRead[descriptor.id]?.freeTier);
  if (!required) return null;
  // A native core's browser sign-in starts from the card; a bridge's (one of several providers) is chosen in Settings.
  return { name: coreName(core), action: descriptor.kind === "native" && browser.length ? "login" : "settings" };
}

/**
 * The /status Account row when account/read reports no account. Only Codex on a custom endpoint (requiresOpenaiAuth
 * false, codexProvider) is a 'Custom endpoint': the DeepSeek core describes its key (no key yet: where to add one), a
 * bridge on its free tier (OpenCode Zen, MiMo Auto: account/read[core.id].freeTier) names it, and any other core that
 * lists sign-ins is 'Not signed in'. A core with no sign-in options, or no answer at all, stays 'Unavailable'.
 * @param {object | null | undefined} accountRead - account/read (boot.account)
 * @param {object | string | undefined} core - boot.core, or a core id / engine
 */
export function signedOutAccountLabel(accountRead, core) {
  if (!accountRead || typeof accountRead !== "object") return t("Unavailable");
  if (usesCustomEndpoint(accountRead, core)) return t("Custom endpoint");
  if (accountRead.deepseek && typeof accountRead.deepseek === "object") return deepseekKeyDescription(accountRead.deepseek, accountRead.account);
  const descriptor = coreForEngine(engineOf(core));
  const free = accountRead[descriptor.id]?.freeTier;
  if (free && typeof free === "object") return t("{name} (free)", { name: free.name || free.provider || coreName(core) });
  const login = descriptor.login ?? {};
  const options = ["browser", "deviceCode", "apiKey"].some((kind) => Array.isArray(login[kind]) && login[kind].length > 0);
  return options || accountRead.requiresOpenaiAuth === true ? t("Not signed in") : t("Unavailable");
}
