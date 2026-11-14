// Menu bar context menu (main NOr/M5n/tOr/sOr in index.chunk-D6ATlqeD):
// Show App, the account's greyed plan/usage rows, then Quit {appName}. The rich
// usage popover is a native Swift module with no local equivalent, so this is
// the source's own fallback menu branch.
import { usagePresentation, isPlanId } from './usage-model.mjs';
import { t, getLocale } from './i18n/index.mjs';

// QDr: rows only for a signed-in account with a plan. API-key and Bedrock
// credentials have no plan usage, so they get none rather than "unavailable".
export function trayUsageEligible(account) {
  return ['chatgpt', 'chatgptAuthTokens'].includes(account?.account?.type);
}

// The app's UI language (preferences locale): menu-bar.cjs formats the rows in it, not in the OS locale.
export const uiLocale = () => getLocale();
export function trayUsageRows({ account, limits, limitsFailed }, locale = getLocale()) {
  if (!trayUsageEligible(account)) return [];
  const { rows, plan } = usagePresentation({ account, limits }, { locale });
  const result = [];
  // A Codex plan id reads 'Pro plan'; a bridge's own sign-in name ('Z.ai Coding Plan') is shown as it is.
  const rawPlan = account?.account?.planType;
  if (plan) result.push({ label: isPlanId(rawPlan) || (!rawPlan && plan) ? t('{plan} plan', { plan }) : plan, enabled: false });
  // sOr: without any snapshot a failed read is "unavailable"; never read is none.
  if (!limits && limitsFailed) result.push({ label: t('Usage unavailable'), enabled: false });
  const peak = rows.reduce((max, row) => max === null ? row.used : Math.max(max, row.used), null);
  if (peak !== null) {
    const pct = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(Math.round(peak) / 100);
    result.push({ label: t('Usage: {percent}', { percent: pct }), enabled: false });
  }
  return result;
}

// M5n: drop hidden items, leading/doubled separators and trailing separators.
export function collapseSeparators(items) {
  const result = [];
  for (const item of items) {
    if (item.visible === false) continue;
    if (item.type === 'separator' && (result.length === 0 || result.at(-1).type === 'separator')) continue;
    result.push(item);
  }
  while (result.at(-1)?.type === 'separator') result.pop();
  return result;
}

export function trayMenuTemplate({ appName, rows }) {
  return collapseSeparators([
    { id: 'show', label: t('Show App') },
    { type: 'separator' },
    ...rows,
    { type: 'separator' },
    { id: 'quit', label: t('Quit {appName}', { appName }) },
  ]);
}
