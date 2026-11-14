/**
 * account/read on the DeepSeek core. Harness registers its DeepSeek provider
 * routes whether or not a key exists (requests then fail with
 * MISSING_CREDENTIAL), so a non-empty provider list says nothing about the
 * account. The answer comes from the credentials service instead: whether the
 * DEEPSEEK_API_KEY reference resolves (ctx.credentials.describe, never the
 * value) or a DeepSeek Platform sign-in is stored (deepseekAccount.getState).
 * Pure: index.js reads the services and passes their values in.
 *
 *   account             {type:'apiKey'} when either is configured, else null
 *   requiresOpenaiAuth  always false: there is no ChatGPT sign-in on this core
 *   deepseek            bridge extension the app keys its DeepSeek copy on:
 *                       {apiKey: {configured, source}, platform, links}
 */

/** The reference llm-deepseek-api-key resolves by default (its apiKeyEnv). */
export const DEEPSEEK_KEY_REF = 'DEEPSEEK_API_KEY'

/**
 * @param {{keyInfo?: {configured?: boolean, source?: string} | null, platformState?: {status?: string, links?: object} | null}} input
 *   keyInfo: CredentialInfo of DEEPSEEK_API_KEY; platformState: the DeepSeek
 *   account's AccountView (status 'signed-out' | 'credential-stored').
 */
export function accountReadResponse({ keyInfo, platformState, otherProviders = false } = {}) {
  const keyConfigured = keyInfo?.configured === true
  // otherProviders: an OpenClaude Desktop custom provider has a key (CODE_DESKTOP_PROVIDER_KEY_*), so a session can
  // run on it without a DeepSeek key.
  const configured = keyConfigured || platformState?.status === 'credential-stored' || otherProviders === true
  return {
    account: configured ? { type: 'apiKey' } : null,
    requiresOpenaiAuth: false,
    deepseek: {
      apiKey: { configured: keyConfigured, source: typeof keyInfo?.source === 'string' ? keyInfo.source : null },
      platform: typeof platformState?.status === 'string' ? platformState.status : null,
      links: platformState?.links ?? null,
    },
  }
}

/**
 * Without a credentials service (never in dsh-base) only the provider list is
 * known: the pre-credentials answer, minus the ChatGPT sign-in request.
 * @param {{name?: string}[]} providers - ctx.llm.listProviders()
 */
export function providerAccountResponse(providers) {
  const list = Array.isArray(providers) ? providers : []
  return list.length > 0
    ? { account: { type: 'apiKey' }, requiresOpenaiAuth: false, provider: list.map((provider) => provider.name).join(', ') }
    : { account: null, requiresOpenaiAuth: false }
}
