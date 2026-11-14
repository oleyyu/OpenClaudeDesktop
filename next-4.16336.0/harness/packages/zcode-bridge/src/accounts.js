/**
 * Signing in to ZCode, the way ZCode itself does it.
 *
 * Two kinds of access exist (packages/provider in the ZCode source):
 *  - API-key providers in the user's personal provider config (~/.zcode/v2/provider_config.json): a Z.ai /
 *    BigModel Coding Plan key (templates `zai-api`, `bigmodel-api`), a standard Z.ai/BigModel API key, or any
 *    other provider template. ZCode reads the key itself.
 *  - The Coding Plan account sign-in (`zcode login [zai|bigmodel]`, browser OAuth through zcode.z.ai). The CLI keeps
 *    the result in its encrypted credential store (~/.zcode/v2/credentials.json, aes-256-gcm with the CLI's own
 *    key derivation) and, as the agent's host, the bridge does what the ZCode desktop does for an `app-server`
 *    child: it tells the agent which account providers are entitled (`provider/updateAccountConfig`) and answers
 *    `interaction/requestProviderRuntimeHeaders` with the account's request key.
 * Coding Plan quotas (5-hour and weekly windows with reset times) come from the platform's quota endpoint, the
 * same one the plan's own usage page reads.
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// ------------------------------------------------------------------ credential store (adapters/src/auth)

const ENCRYPTED_PREFIX = 'enc:v1:'

function credentialKey(env = process.env) {
  let secret = env.ZCODE_CREDENTIAL_SECRET?.trim()
  if (!secret) {
    let username = 'unknown'
    try { username = os.userInfo().username } catch {}
    secret = `zcode-credential-fallback:${os.platform()}:${os.homedir()}:${username}`
  }
  return crypto.createHash('sha256').update(secret).digest()
}

export function decryptCredential(value, env) {
  if (typeof value !== 'string' || !value.startsWith(ENCRYPTED_PREFIX)) return value
  const [iv, tag, data] = value.slice(ENCRYPTED_PREFIX.length).split('.')
  const decipher = crypto.createDecipheriv('aes-256-gcm', credentialKey(env), Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8')
}

export function encryptCredential(value, env) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', credentialKey(env), iv)
  const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return `${ENCRYPTED_PREFIX}${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${data.toString('base64url')}`
}

export function readCredentials(file, env) {
  let raw
  try { raw = JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return {} }
  const out = {}
  for (const [key, value] of Object.entries(raw ?? {})) {
    try { out[key] = decryptCredential(value, env) } catch {}
  }
  return out
}

const identityKey = (providerId) => `account-provider:${providerId}:identity`
const apiKeyKey = (providerId, identity) => `account-provider:coding-plan:${providerId}:account:${encodeURIComponent(identity)}:api-key`

// ------------------------------------------------------------------ provider configs

export function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return null }
}

/** Individual Coding Plan account providers of the shipped catalog ({providerId, family, modelId}). */
export function codingPlanProviders(builtin) {
  return (builtin?.config?.providerConfigRules?.providerRules ?? []).flatMap((rule) => {
    const access = rule.config?.access
    const modelId = rule.config?.builtinModelIds?.[0]
    return access?.type === 'zhipu-account' && access.mode === 'individual-coding-plan' && access.accountType && modelId
      ? [{ providerId: rule.providerId, family: access.accountType, modelId, baseUrl: rule.config?.api?.baseUrl ?? null, name: rule.providerName ?? rule.providerId }]
      : []
  })
}

/** Signed-in Coding Plan accounts: provider id → {apiKey, identity, family}. */
export function signedInAccounts(builtin, credentials) {
  const accounts = {}
  for (const provider of codingPlanProviders(builtin)) {
    const identity = credentials[identityKey(provider.providerId)]?.trim()
    const apiKey = identity ? credentials[apiKeyKey(provider.providerId, identity)]?.trim() : null
    if (identity && apiKey) accounts[provider.providerId] = { ...provider, identity, apiKey }
  }
  return accounts
}

/** The signed-in user ZCode's login stored (Z.ai or BigModel profile). */
export function loginUser(credentials) {
  const active = credentials['oauth:active_provider'] ?? null
  const parse = (value) => { try { return JSON.parse(value) } catch { return null } }
  const zai = parse(credentials['oauth:zai:user_info'])
  const bigmodel = parse(credentials['oauth:bigmodel:user_info'])
  const user = active === 'bigmodel' ? bigmodel?.rawProfile ?? bigmodel : zai ?? bigmodel?.rawProfile ?? null
  if (!user) return null
  return { provider: active ?? (zai ? 'zai' : 'bigmodel'), email: user.email ?? null, name: user.name ?? user.displayName ?? user.username ?? null, userId: user.user_id ?? user.id ?? null }
}

// ------------------------------------------------------------------ official MCP services (Z.ai plugins)

export const DEFAULT_ZCODE_ENDPOINT_ORIGIN = 'https://zcode.z.ai'

const httpsOrigin = (value) => {
  try { const url = new URL(String(value).trim()); return url.protocol === 'https:' && !url.username && !url.password ? url.origin : null } catch { return null }
}
const loopbackOrigin = (value) => {
  try {
    const url = new URL(String(value).trim())
    return url.protocol === 'http:' && !url.username && !url.password && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ? url.origin : null
  } catch { return null }
}

/**
 * Whether ZCode may send the user's identity to an official MCP server at `origin` (isOfficialMcpOriginTrusted in
 * @zcode/shared): only the ZCode API origin (https; ZCODE_BASE_URL / ZCODE_ENDPOINT_ORIGIN, default zcode.z.ai), or an
 * http loopback origin listed in ZCODE_OFFICIAL_MCP_DEV_TRUSTED_ORIGINS (ZCode's own local test switch).
 */
export function officialMcpOriginTrusted(origin, env = process.env) {
  const target = String(origin ?? '').trim()
  if (!target) return false
  const loopback = loopbackOrigin(target)
  if (loopback && String(env.ZCODE_OFFICIAL_MCP_DEV_TRUSTED_ORIGINS ?? '').split(',').some((entry) => entry.trim() && loopbackOrigin(entry) === loopback)) return true
  const configured = env.ZCODE_BASE_URL?.trim() || env.ZCODE_ENDPOINT_ORIGIN?.trim() || DEFAULT_ZCODE_ENDPOINT_ORIGIN
  const expected = httpsOrigin(configured)
  return !!expected && httpsOrigin(target) === expected
}

/**
 * interaction/requestOfficialMcpAuthHeaders: the identity headers an official Z.ai MCP service (a plugin's
 * `auth: {type: "zcode_official"}` server: finance data, video tools, …) needs, built as the ZCode desktop builds them
 * (services/src/official-mcp/officialMcpCredentials.ts):
 *   Authorization             Bearer <ZCode login JWT>                       always, once signed in
 *   X-Bigmodel-Authorization  Bearer <oauth:<family>:access_token>           with the signed-in Coding Plan
 *   Bigmodel-Target-Type      PERSONAL                                       (Individual Coding Plan)
 * The Coding Plan is that of the family the login is active for, never the other family's. Failures are ZCode's
 * enumerated reasons (the agent marks the server failed with it): official_auth_unavailable (no browser sign-in, or
 * an incomplete one), official_mcp_origin_untrusted (not the ZCode API origin).
 * @param {{ origin: string, credentials: Record<string,string>, signedIn: Record<string,{family:string}>, env?: object }} input
 */
export function officialMcpAuthHeaders({ origin, credentials, signedIn, env = process.env }) {
  if (!officialMcpOriginTrusted(origin, env)) return { ok: false, reason: 'official_mcp_origin_untrusted' }
  const active = credentials['oauth:active_provider']?.trim()
  const jwt = credentials.zcodejwttoken?.trim()
  if ((active !== 'zai' && active !== 'bigmodel') || !jwt) return { ok: false, reason: 'official_auth_unavailable' }
  const headers = { Authorization: `Bearer ${jwt}` }
  const plans = Object.values(signedIn ?? {})
  // No Coding Plan: the identity alone (ZCode's identity-only outcome); the service decides what that account may use.
  if (!plans.length) return { ok: true, headers }
  const plan = plans.find((entry) => entry.family === active)
  if (!plan) return { ok: false, reason: 'official_auth_unavailable' }
  const maas = credentials[`oauth:${plan.family}:access_token`]?.trim()
  if (!maas) return { ok: false, reason: 'official_auth_unavailable' }
  return { ok: true, headers: { ...headers, 'X-Bigmodel-Authorization': `Bearer ${maas}`, 'Bigmodel-Target-Type': 'PERSONAL' } }
}

/**
 * provider/updateAccountConfig params: every Individual Coding Plan provider, entitled when signed in.
 * `builtinRevision` is the agent's revision of the catalog file it reads (see builtinRevision()).
 */
export function accountOverlay(builtin, accounts, builtinRevision) {
  const providers = {}
  const states = {}
  for (const provider of codingPlanProviders(builtin)) {
    const entitled = !!accounts[provider.providerId]
    providers[provider.providerId] = { access: { type: 'zhipu-account', entitled } }
    states[provider.providerId] = entitled ? { availability: 'available', entitled: true, current: true } : { availability: 'unavailable', entitled: false }
  }
  const revision = crypto.createHash('sha256').update(JSON.stringify({ providers, builtinRevision })).digest('hex')
  return { revision: `code-desktop:${revision}`, basedOnZCodeBuiltinRevision: builtinRevision, providers, states }
}

/** The revision ZCode gives a catalog file: zcode-builtin:<release revision>:<sha256 of its absolute path>. */
export function builtinRevision(builtin, file) {
  return `zcode-builtin:${builtin?.revision ?? 0}:${crypto.createHash('sha256').update(path.resolve(file)).digest('hex')}`
}

/** API-key providers in the personal config: [{providerId, name, templateId, apiType, baseUrl, keyed}]. */
export function apiKeyProviders(personal) {
  return (personal?.config?.providerConfigRules?.providerRules ?? []).map((rule) => ({
    providerId: rule.providerId, name: rule.providerName ?? rule.providerId, templateId: rule.templateId ?? null, enabled: rule.enabled !== false,
    apiType: rule.config?.api?.type ?? null, baseUrl: rule.config?.api?.baseUrl ?? null,
    keyed: typeof rule.config?.access?.apiKey === 'string' && rule.config.access.apiKey.trim().length > 0,
    apiKey: rule.config?.access?.apiKey ?? null,
  }))
}

/**
 * Add or replace an API-key provider from a shipped template (default: Z.ai Coding Plan).
 * @returns {{ providerId: string }}
 */
export function saveApiKeyProvider({ personalFile, builtin, apiKey, templateId = 'zai-api', baseUrl = null, models = null }) {
  const template = (builtin?.config?.providerConfigRules?.templateRules ?? []).find((rule) => rule.templateId === templateId)
  if (!template) throw new Error(`Unknown ZCode provider template: ${templateId}`)
  const document = readJson(personalFile) ?? { schemaVersion: 1, config: { providerConfigRules: { providerRules: [] }, modelConfigRules: { providerModelRules: [], manualProviderModelRules: [] } } }
  document.config ??= {}
  document.config.providerConfigRules ??= { providerRules: [] }
  document.config.modelConfigRules ??= { providerModelRules: [], manualProviderModelRules: [] }
  const rules = document.config.providerConfigRules.providerRules
  const providerId = `code-desktop-${templateId}`
  const accessType = template.config?.access?.type ?? 'api-key'
  const rule = {
    providerId, templateId, providerName: template.templateNameMap?.['en-US'] ?? templateId, enabled: true,
    config: {
      group: 'standard-personal',
      access: { type: accessType, apiKey },
      api: { type: template.config?.api?.type ?? 'anthropic-messages', baseUrl: baseUrl ?? template.config?.api?.baseUrl },
      ...(Array.isArray(models) && models.length ? { personalModelIds: models } : {}),
    },
  }
  const index = rules.findIndex((candidate) => candidate.providerId === providerId)
  if (index >= 0) rules[index] = rule
  else rules.push(rule)
  if (!document.config.defaultModelSelection) {
    const modelId = (Array.isArray(models) && models[0]) || template.config?.builtinModelIds?.[0]
    if (modelId) document.config.defaultModelSelection = { providerId, modelId }
  }
  writePrivate(personalFile, document)
  return { providerId }
}

/** Remove the API-key providers OpenClaude Desktop added (other providers the user configured in ZCode stay). */
export function removeApiKeyProviders(personalFile) {
  const document = readJson(personalFile)
  const rules = document?.config?.providerConfigRules?.providerRules
  if (!Array.isArray(rules)) return 0
  const kept = rules.filter((rule) => !String(rule.providerId).startsWith('code-desktop-'))
  const removed = rules.length - kept.length
  if (!removed) return 0
  document.config.providerConfigRules.providerRules = kept
  if (String(document.config.defaultModelSelection?.providerId ?? '').startsWith('code-desktop-')) delete document.config.defaultModelSelection
  writePrivate(personalFile, document)
  return removed
}

/** The personal provider config as it is on disk (null when there is none), to put back with restorePersonalText. */
export function readPersonalText(file) {
  try { return fs.readFileSync(file, 'utf8') } catch { return null }
}

export function restorePersonalText(file, text) {
  if (text === null) { fs.rmSync(file, { force: true }); return }
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const temp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(temp, text, { mode: 0o600 })
  fs.renameSync(temp, file)
}

function writePrivate(file, document) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const temp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(temp, JSON.stringify(document, null, 2), { mode: 0o600 })
  fs.renameSync(temp, file)
}

// ------------------------------------------------------------------ Coding Plan quota

/** The platform host whose quota endpoint covers a provider base URL (api.z.ai → intl, bigmodel → CN). */
export function quotaUrl(baseUrl) {
  let url
  try { url = new URL(baseUrl) } catch { return null }
  if (/(^|\.)z\.ai$/.test(url.hostname)) return 'https://api.z.ai/api/monitor/usage/quota/limit'
  if (/(^|\.)bigmodel\.cn$/.test(url.hostname)) return 'https://open.bigmodel.cn/api/monitor/usage/quota/limit'
  if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return `${url.origin}/api/monitor/usage/quota/limit`
  return null
}

// The quota's windows by unit and number, as ZCode reads them (packages/ui/src/lib/codingPlanQuotaPresentation.ts
// findCodingPlanQuotaLimit): unit 3 is hours (number 5: the 5-hour window), unit 6 weeks, unit 5 months (TIME_LIMIT
// unit 5 number 1: the monthly MCP and web tool quota). A Z.ai Team plan reports its token windows as CREDIT_LIMIT.
const TOKEN_LIMIT_TYPES = new Set(['TOKENS_LIMIT', 'CREDIT_LIMIT'])
const UNIT_MINUTES = { 3: 60, 4: 1440, 5: 43200, 6: 10080 }
const windowMinutes = (limit) => {
  const unit = Number(limit?.unit), count = Number.isInteger(limit?.number) && limit.number > 0 ? limit.number : 1
  if (UNIT_MINUTES[unit]) return UNIT_MINUTES[unit] * count
  // An older envelope without a unit: number 5 was the 5-hour window and 7 the week.
  if (limit?.unit === undefined || limit?.unit === null) return limit?.number === 5 ? 300 : limit?.number === 7 ? 10080 : null
  return null
}
const PLAN_LEVELS = { lite: 'Lite', pro: 'Pro', max: 'Max' }

/**
 * account/rateLimits/read from the quota envelope ({data:{level, limits:[{type, unit, number, usage, currentValue,
 * remaining, percentage, nextResetTime}]}}): the 5-hour token window (primary), the weekly one (secondary), and the
 * monthly tool quota as its own bucket, 'zcode-mcp'.
 */
export function rateLimitsFromQuota(envelope) {
  const limits = envelope?.data?.limits
  if (!Array.isArray(limits)) return null
  const window = (limit) => {
    const total = Number(limit.usage)
    const used = Number(limit.currentValue)
    const remaining = Number(limit.remaining)
    let usedPercent = Number(limit.percentage)
    if (Number.isFinite(total) && total > 0 && Number.isFinite(remaining)) usedPercent = 100 - (remaining / total) * 100
    else if (Number.isFinite(total) && total > 0 && Number.isFinite(used)) usedPercent = (used / total) * 100
    if (!Number.isFinite(usedPercent)) return null
    const reset = Number(limit.nextResetTime)
    return { usedPercent: Math.max(0, Math.min(100, Math.round(usedPercent))), windowDurationMins: windowMinutes(limit), resetsAt: Number.isFinite(reset) && reset > 0 ? Math.floor(reset / 1000) : null }
  }
  const tokens = limits.filter((limit) => TOKEN_LIMIT_TYPES.has(limit?.type))
  const primary = tokens.find((limit) => windowMinutes(limit) === 300) ?? tokens.find((limit) => windowMinutes(limit) !== 10080) ?? null
  const secondary = tokens.find((limit) => limit !== primary && windowMinutes(limit) === 10080) ?? tokens.find((limit) => limit !== primary) ?? null
  const primaryWindow = primary ? window(primary) : null
  const secondaryWindow = secondary ? window(secondary) : null
  const raw = typeof envelope.data.level === 'string' ? envelope.data.level.trim() : ''
  const level = raw ? `GLM Coding Plan ${PLAN_LEVELS[raw.toLowerCase()] ?? raw}` : null
  // A token window used up: the turn's usage-limit error and the Usage page say so (Codex's rate_limit_reached).
  const reached = [primaryWindow, secondaryWindow].some((value) => value && value.usedPercent >= 100)
  const snapshot = {
    limitId: 'codex', limitName: 'GLM Coding Plan', primary: primaryWindow, secondary: secondaryWindow,
    credits: null, individualLimit: null, spendControlReached: null, planType: level, rateLimitReachedType: reached ? 'rate_limit_reached' : null,
  }
  const byId = { codex: snapshot }
  // The monthly MCP and web tool quota (TIME_LIMIT unit 5 number 1): 'MCP & web tools', a name the app translates.
  const mcp = limits.find((limit) => limit?.type === 'TIME_LIMIT' && Number(limit.unit) === 5) ?? limits.find((limit) => limit?.type === 'TIME_LIMIT' || limit?.type === 'MCP_LIMIT')
  if (mcp) {
    const monthly = window(mcp)
    if (monthly) byId['zcode-mcp'] = { ...snapshot, limitId: 'zcode-mcp', limitName: 'MCP & web tools', primary: { ...monthly, windowDurationMins: monthly.windowDurationMins ?? 43200 }, secondary: null, rateLimitReachedType: null }
  }
  return { rateLimits: snapshot, rateLimitsByLimitId: byId }
}

// ------------------------------------------------------------------ Coding Plan resets

// ZCode's earned usage resets (packages/shared/src/coding-plan-reset.ts, services bigmodelUsageQuotaProvider.ts):
// GET <ZCode API>/api/v1/coding-plan/reset/status lists the available 5-hour and weekly resets; POST …/use redeems one.
export const CODING_PLAN_RESET_PATH = '/api/v1/coding-plan/reset'
export const RESET_TYPES = Object.freeze({ FIVE_HOUR: { title: '5-hour reset', description: 'Resets your 5-hour usage window now.' }, WEEK: { title: 'Weekly reset', description: 'Resets your weekly usage window now.' } })

/**
 * The ZCode API origin the resets live at: the platform origin the bridge uses for ZCode's gateway
 * (CODE_DESKTOP_ZCODE_PLATFORM_ORIGIN, provider-proxy.js), else ZCODE_BASE_URL / ZCODE_ENDPOINT_ORIGIN (https, or
 * loopback), else zcode.z.ai.
 */
export function zcodeApiOrigin(env = process.env) {
  const configured = env.CODE_DESKTOP_ZCODE_PLATFORM_ORIGIN?.trim() || env.ZCODE_BASE_URL?.trim() || env.ZCODE_ENDPOINT_ORIGIN?.trim() || DEFAULT_ZCODE_ENDPOINT_ORIGIN
  return httpsOrigin(configured) ?? loopbackOrigin(configured)
}

/**
 * The reset requests' headers, as ZCode builds them (resolveCodingPlanResetAuthorization): the ZCode login JWT as a
 * Bearer, the active family's Coding Plan token as is (no Bearer: the backend's contract) and the personal scope.
 * null without a browser sign-in to a Coding Plan of the active family.
 */
export function codingPlanResetHeaders({ credentials, signedIn }) {
  const active = credentials?.['oauth:active_provider']?.trim()
  const jwt = credentials?.zcodejwttoken?.trim()
  if ((active !== 'zai' && active !== 'bigmodel') || !jwt) return null
  const plan = Object.values(signedIn ?? {}).find((entry) => entry.family === active)
  const maas = plan ? credentials[`oauth:${plan.family}:access_token`]?.trim() : null
  if (!maas) return null
  return { Authorization: /^Bearer\s/i.test(jwt) ? jwt : `Bearer ${jwt}`, 'X-Bigmodel-Authorization': maas, 'Bigmodel-Target-Type': 'PERSONAL' }
}

/**
 * Codex RateLimitResetCreditsSummary from the reset status ({available_five_hour_resets: [{expire_at}], available_week_resets}).
 * Like ZCode (isCodingPlanQuotaLimitFull), a reset of a window nothing has been used in yet is left out: it would
 * change nothing. Expired ones are dropped. Each credit's id is '<FIVE_HOUR|WEEK>:<expire_at ms>'.
 */
export function resetCreditsFromStatus(data, { fiveHour = null, week = null } = {}, now = Date.now()) {
  if (!data || typeof data !== 'object') return null
  const credits = []
  const add = (list, type, window) => {
    if (window && !(window.usedPercent > 0)) return
    for (const item of Array.isArray(list) ? list : []) {
      const expireAt = Number(item?.expire_at)
      if (Number.isFinite(expireAt) && expireAt <= now) continue
      credits.push({ id: `${type}:${Number.isFinite(expireAt) ? expireAt : 0}`, resetType: 'codexRateLimits', status: 'available', grantedAt: 0,
        expiresAt: Number.isFinite(expireAt) ? Math.floor(expireAt / 1000) : null, title: RESET_TYPES[type].title, description: RESET_TYPES[type].description })
    }
  }
  add(data.available_five_hour_resets, 'FIVE_HOUR', fiveHour)
  add(data.available_week_resets, 'WEEK', week)
  return { availableCount: credits.length, credits }
}

/** The reset type a credit id names ('FIVE_HOUR:…' → FIVE_HOUR), or null. */
export function resetTypeOf(creditId) {
  const type = /^(FIVE_HOUR|WEEK):/.exec(String(creditId ?? ''))?.[1]
  return type ?? null
}

/** An idempotency key the reset service takes (64 characters at most): longer keys are hashed. */
export function resetIdempotencyKey(value) {
  const key = String(value ?? '').trim()
  if (!key) return crypto.randomUUID()
  return key.length <= 64 ? key : crypto.createHash('sha256').update(key).digest('hex')
}

/** One reset request; resolves with the envelope's data ({code: 0, data}), throws with the backend code otherwise. */
export async function codingPlanResetRequest(origin, route, headers, { method = 'GET', body = null, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(`${origin}${CODING_PLAN_RESET_PATH}/${route}`, {
    method, headers: { accept: 'application/json', ...headers, ...(body ? { 'content-type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`The reset service answered ${response.status}.`)
  let envelope
  try { envelope = JSON.parse(text) } catch { throw new Error('The reset service sent an unreadable answer.') }
  if (envelope?.code !== 0) throw Object.assign(new Error(`The reset service refused the request (${envelope?.code ?? 'unknown'}${envelope?.msg ? `: ${envelope.msg}` : ''}).`), { code: envelope?.code })
  return envelope.data
}

export async function fetchQuota(url, apiKey, fetchImpl = fetch) {
  const response = await fetchImpl(url, { headers: { accept: 'application/json', authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(8000) })
  const text = await response.text()
  if (!response.ok) throw new Error(`The quota service answered ${response.status}.`)
  return JSON.parse(text)
}
