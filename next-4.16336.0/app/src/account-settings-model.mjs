// Preferences › <core> account: which account rows the settings page renders.
// The DeepSeek core's account/read carries a `deepseek` extension (harness
// account.js) describing the API key without its value; that core has no
// ChatGPT sign-in, sign-out or device code, so those rows never appear there.
// Codex keeps the legacy ChatGPT rows, except on a custom endpoint (Settings ›
// Models), which needs no sign-in at all. Every other core (bridges, Extension
// Pack cores, native or not) gets its own account row plus the sign-in options its
// descriptor lists (core-registry.mjs `login`), none when it lists none.
import { t } from "../electron/i18n/index.mjs";
import { coreForEngine, coreSupports } from "../electron/core-registry.mjs";

export const DEEPSEEK_KEYS_URL = "https://platform.deepseek.com/api_keys";

/** The key row's description for account/read's `deepseek` facts. */
export function deepseekKeyDescription(deepseek, account) {
  const key = deepseek?.apiKey;
  if (key?.configured === true) {
    if (key.source === "file") return t("Saved in DeepSeek Harness (~/.dsh)");
    if (key.source === "env") return t("From the DEEPSEEK_API_KEY environment variable");
    return t("Configured in DeepSeek Harness");
  }
  if (deepseek?.platform === "credential-stored") return t("Signed in to the DeepSeek Platform");
  // No DeepSeek key, yet the core reports an account: it runs on custom providers (setup's Connect a model saves one,
  // and the bridge reports an apiKey account for its key), so sessions work without DeepSeek.
  if (deepseek && account) return t("Using your custom providers (Settings › Models). Add a DeepSeek API key to use DeepSeek’s models too.");
  // A DeepSeek core answering without the extension: only the account itself is known.
  if (!deepseek && account) return t("Configured in DeepSeek Harness");
  return t("No API key. Add one in Settings › Models, in DeepSeek Harness, or with DEEPSEEK_API_KEY.");
}

/**
 * Whether the running core is Codex on a custom endpoint (Settings › Models): its account/read
 * then reports requiresOpenaiAuth false and no account, and no ChatGPT sign-in applies.
 * @param {object | null | undefined} snapshot - account/read (boot.account)
 * @param {object | string | undefined} core - boot.core, or an engine/core id
 */
export function usesCustomEndpoint(snapshot, core) {
  return !!snapshot && typeof snapshot === "object" && snapshot.requiresOpenaiAuth === false && !snapshot.account && !snapshot.deepseek
    && coreSupports(core, "codexProvider");
}

/**
 * A core's sign-in options from its descriptor `login` (core-registry.mjs): browser sign-ins (a provider each, or a
 * type), device codes (a type, optionally a provider; a browser option with deviceCode: true also offers one for its
 * provider) and API keys (a template each, or none for a single key).
 * @param {object | string | undefined} engine - boot.core, or an engine/core id
 */
export function signInOptions(engine) {
  const descriptor = coreForEngine(typeof engine === "string" ? engine : engine?.engine);
  const login = descriptor.login ?? {};
  const list = (value) => (Array.isArray(value) ? value : []);
  return { name: descriptor.name, browser: list(login.browser), deviceCode: list(login.deviceCode), apiKey: list(login.apiKey) };
}

/**
 * @param {object | null | undefined} snapshot - account/read (boot.account)
 * @param {{engine?: object | string}} [options] - boot.core (reported capabilities win), or an engine/core id
 * @returns {{kind: "legacy", customEndpoint?: true} | {kind: "bridge", name: string, browser: object[], deviceCode: object[], apiKey: object[]}
 *   | {kind: "deepseek", label: string, description: string, showSignOut: false, showSignIn: false, manageUrl: string}}
 */
export function accountSettingsPlan(snapshot, { engine } = {}) {
  const descriptor = coreForEngine(typeof engine === "string" ? engine : engine?.engine);
  const deepseek = snapshot?.deepseek && typeof snapshot.deepseek === "object" ? snapshot.deepseek : null;
  if (!deepseek && !coreSupports(engine, "providerSettings")) {
    // Codex (no engine reported is Codex too): the ChatGPT rows, or none on a custom endpoint.
    if (descriptor.id === "codex" || coreSupports(engine, "codexProvider"))
      return usesCustomEndpoint(snapshot, engine) ? { kind: "legacy", customEndpoint: true } : { kind: "legacy" };
    // Any other core: its own account and the sign-ins its descriptor lists (ZCode's providers, Kimi's device code),
    // or none (Qwen Code, a pack core without login) — never Codex's ChatGPT sign-in.
    return { kind: "bridge", ...signInOptions(engine) };
  }
  return {
    kind: "deepseek",
    label: t("DeepSeek API key"),
    description: snapshot == null ? t("Account unavailable") : deepseekKeyDescription(deepseek, snapshot.account),
    showSignOut: false,
    showSignIn: false,
    manageUrl: DEEPSEEK_KEYS_URL,
  };
}

/**
 * Whether the sidebar account menu offers Sign out: exactly when Settings › Preferences shows its Sign out button
 * (source-account-settings.jsx accountRow), i.e. the running core reports a signed-in account of its own. The
 * DeepSeek core (a key, no sign-in) and Codex on a custom endpoint (no account) have none.
 * @param {object | null | undefined} snapshot - account/read (boot.account)
 * @param {{engine?: object | string, connected?: boolean}} [options]
 */
export function accountMenuSignOut(snapshot, { engine, connected = false } = {}) {
  if (!connected || !snapshot?.account) return false;
  const plan = accountSettingsPlan(snapshot, { engine });
  return plan.kind !== "deepseek" && !plan.customEndpoint;
}
