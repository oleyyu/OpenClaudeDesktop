// Installed Desktop 2.31226.0: Kyn/qyn/Jyn approve first-party credentials
// for the guest's first-party proxy. Third-party keys stay scoped to their API.
export function proxyCredentials(env) {
  const tokens = new Set([env.CLAUDE_CODE_OAUTH_TOKEN]);
  let firstParty = !env.ANTHROPIC_BASE_URL;
  if (!firstParty) {
    try {
      const host = new URL(env.ANTHROPIC_BASE_URL).hostname.toLowerCase();
      firstParty = ['anthropic.com', 'claude.com'].some(domain => host === domain || host.endsWith(`.${domain}`));
    } catch { /* Invalid provider URLs are rejected by model settings. */ }
  }
  if (firstParty) for (const name of ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN']) tokens.add(env[name]);
  return [...tokens].filter(token => typeof token === 'string' && token.length > 0);
}

// Permit the selected API endpoint through the VM's existing egress policy.
// This does not grant arbitrary browsing or a wildcard network rule.
export function providerDomains(env) {
  const endpoint = new URL(env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com');
  if (!['https:', 'http:'].includes(endpoint.protocol) || endpoint.username || endpoint.password) throw new Error('Invalid Cowork API endpoint.');
  return [`${endpoint.hostname}:${endpoint.port || (endpoint.protocol === 'http:' ? '80' : '443')}`];
}
