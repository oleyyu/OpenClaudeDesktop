// w13-coworkfn-engine (research/w13-coworkfn.md O-1~O-3, cwf-01/02): whether Cowork is available on this computer and
// which engine runs a new Cowork session.
//
// Availability follows the official yukonSilver check of 3.6556.2 (asar/.vite/build/index.chunk-jPKPzV-P.js
// `function UPr(){let e=process.platform;…}` and the override table `function mFr(){switch(dFr){…}}`): a platform other
// than macOS or Windows, a CPU other than x64/arm64, macOS before 14 (Lk().major from process.getSystemVersion()) or
// Windows before build 19041 is unsupported, with the official copy word for word. The VM-only checks that follow in
// UPr (MSIX installer, HCS services, the virtualization entitlement, a corrupted installation) gate the official VM and
// have no counterpart for the host loop, so they are not ported. CODE_DESKTOP_COWORK=0 is OpenClaude's own off switch
// (plan-w13 E60), reported with the official `disabled_by_user` code and a local sentence (the official one names the
// secureVmFeaturesEnabled preference, which this app does not have).
//
// The engine follows the official 3P deployment (`this.type = "3p"`, `keepsSessionCliOnHost(){return !0}`, jPK:117242/
// 117900-117925): the session's agent runs on this computer, on the connected core ('local-core'). The Cowork VM engine
// (cowork-runtime/session-service.mjs, COWORK_ENGINE 'cowork-vm', the official 1P path) is only chosen with
// CODE_DESKTOP_COWORK_ENGINE=vm and only while its reference assets are present (reference.mjs inspectCoworkReference).

export const LOCAL_CORE_ENGINE = 'local-core';
// = session-service.mjs COWORK_ENGINE (not imported here: this module stays free of the VM runtime's imports).
export const VM_ENGINE = 'cowork-vm';

// index.chunk-jPKPzV-P.js UPr (formatMessage defaultMessage, ids gX/JCYf2fo, aM9WCiUXzZ, jOY1Gy+4Ti, 7BkU20KRFT).
export const UNSUPPORTED_PLATFORM = 'Cowork is not currently supported on {platform}';
export const UNSUPPORTED_ARCHITECTURE = 'Cowork is not currently supported on {platform} with an {arch} CPU';
export const UNSUPPORTED_MACOS = 'Cowork requires macOS 14.0 (Sonoma) or later. Update your operating system to use this feature.';
export const UNSUPPORTED_WINDOWS = 'Cowork requires Windows 10 build 2004 or later. Update your operating system to use this feature.';
// Local: CODE_DESKTOP_COWORK=0.
export const TURNED_OFF = 'Cowork is turned off for this app. Remove CODE_DESKTOP_COWORK=0 from the environment to use it.';

// The official build names its own platform (yPn=()=>"macOS" in the macOS build).
const PLATFORM_NAMES = { darwin: 'macOS', win32: 'Windows', linux: 'Linux' };
export const platformName = platform => PLATFORM_NAMES[platform] ?? String(platform || 'this platform');

/** Lk(): process.getSystemVersion() as {major, minor, patch}; an unexpected format is major 0 (official). */
export function systemVersionParts(value) {
  const parts = typeof value === 'string' ? value.split('.') : [];
  if (parts.length < 2) return { major: 0, minor: 0 };
  const major = parseInt(parts[0], 10), minor = parseInt(parts[1], 10);
  const patch = parts[2] ? (parts[2].match(/^(\d+)/) ? parseInt(parts[2].match(/^(\d+)/)[1], 10) : undefined) : undefined;
  return { major, minor, patch };
}

/** The engine a new Cowork session asks for: 'cowork-vm' only with CODE_DESKTOP_COWORK_ENGINE=vm. */
export const coworkEngine = (env = {}) => env?.CODE_DESKTOP_COWORK_ENGINE === 'vm' ? VM_ENGINE : LOCAL_CORE_ENGINE;

/** The VM engine only while its reference assets are present; otherwise the connected core. */
export async function selectCoworkEngine({ env = {}, inspect } = {}) {
  if (coworkEngine(env) !== VM_ENGINE || typeof inspect !== 'function') return LOCAL_CORE_ENGINE;
  try { return (await inspect())?.assetsAvailable === true ? VM_ENGINE : LOCAL_CORE_ENGINE; } catch { return LOCAL_CORE_ENGINE; }
}

const unsupported = (unsupportedCode, text, values, engine) => ({
  status: 'unsupported', unsupportedCode, engine,
  // reason: the English sentence (official shape); reasonMessage: its source and values, for i18n.t.
  reason: values ? text.replace(/\{(\w+)\}/g, (match, key) => Object.hasOwn(values, key) ? String(values[key]) : match) : text,
  reasonMessage: { text, ...(values ? { values } : {}) },
});

/**
 * { status: 'supported' | 'unsupported', reason?, reasonMessage?, unsupportedCode?, engine }.
 * systemVersion is Electron's process.getSystemVersion() ("14.5.0" on macOS 14.5).
 */
export function coworkAvailability({ platform = process.platform, arch = process.arch, systemVersion, env = {} } = {}) {
  const engine = coworkEngine(env);
  if (env?.CODE_DESKTOP_COWORK === '0') return unsupported('disabled_by_user', TURNED_OFF, null, engine);
  if (platform !== 'darwin' && platform !== 'win32') return unsupported('unsupported_platform', UNSUPPORTED_PLATFORM, { platform: platformName(platform) }, engine);
  if (arch !== 'x64' && arch !== 'arm64') return unsupported('unsupported_architecture', UNSUPPORTED_ARCHITECTURE, { platform: platformName(platform), arch }, engine);
  const version = systemVersionParts(systemVersion);
  if (platform === 'win32' && (version.patch === undefined || version.patch < 19041)) return unsupported('unsupported_os_version', UNSUPPORTED_WINDOWS, null, engine);
  if (platform === 'darwin' && version.major < 14) return unsupported('unsupported_os_version', UNSUPPORTED_MACOS, null, engine);
  return { status: 'supported', engine };
}
