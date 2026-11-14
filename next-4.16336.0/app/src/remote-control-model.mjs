// Codex Remote Control (app-server remoteControl/*, `codex remote-control start|stop|pair`): this Mac's Codex sessions
// reachable from the ChatGPT app on another device. Settings › Code › Remote control shows its status
// (RemoteControlConnectionStatus disabled|connecting|connected|errored), pairs a device with a short-lived code
// (pairing/start → pairingCode, manualPairingCode, expiresAt; pairing/status → claimed) and lists the paired devices
// (client/list) with Revoke (client/revoke).
import { t } from "../electron/i18n/index.mjs";

const STATUS = { disabled: "Off", connecting: "Connecting…", connected: "On", errored: "Couldn’t connect" };
export const remoteStatusLabel = (status) => t(STATUS[status] ?? "Off");
export const remoteEnabled = (status) => status === "connecting" || status === "connected" || status === "errored";

/** expiresAt (seconds, or milliseconds when it is that large) as milliseconds since the epoch; null when unusable. */
export function expiryMs(expiresAt) {
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) return null;
  return expiresAt > 1e12 ? expiresAt : expiresAt * 1000;
}

/** What is left of a pairing code, as 'm:ss'; null once it expired. */
export function pairingTimeLeft(expiresAt, now = Date.now()) {
  const at = expiryMs(expiresAt);
  if (at === null) return null;
  const left = Math.ceil((at - now) / 1000);
  if (left <= 0) return null;
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
}

/** A paired device's name: its display name, else its model or platform. */
export function deviceName(client) {
  const pick = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);
  return pick(client?.displayName) ?? pick(client?.deviceModel) ?? pick(client?.platform) ?? t("Device");
}

/** A paired device's details: platform and version, app version, when it was last seen. */
export function deviceDetail(client, locale, now = Date.now()) {
  const pick = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);
  const platform = [pick(client?.platform), pick(client?.osVersion)].filter(Boolean).join(" ");
  const app = pick(client?.appVersion) ? t("App {version}", { version: pick(client.appVersion) }) : null;
  const seen = expiryMs(client?.lastSeenAt);
  let when = null;
  if (seen !== null) {
    const minutes = Math.max(0, Math.round((now - seen) / 60000));
    when = minutes < 1 ? t("Last seen just now")
      : minutes < 60 ? t("Last seen {count} min ago", { count: minutes })
        : t("Last seen {date}", { date: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(seen)) });
  }
  return [platform, app, when].filter(Boolean).join(" · ");
}
