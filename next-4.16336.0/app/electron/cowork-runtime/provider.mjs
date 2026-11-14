// Resolve only settings belonging to OpenClaude Desktop. No Claude account,
// Keychain slot, ~/.claude settings or session credential is imported.
export function coworkProvider({ model, providers = [], connection = {}, keys = {}, inherited = {}, officialKeySlot, relayKeySlot, officialBaseURL }) {
  if (typeof model !== 'string' || !model.trim()) throw new Error('Choose a model in Settings → Models before starting Cowork.');
  const qualified = providers.filter(provider => provider.models.some(id => `${provider.route}/${id}` === model));
  const matches = qualified.length ? qualified : providers.filter(provider => provider.models.includes(model));
  if (matches.length > 1) throw new Error('Choose a provider-qualified model for Cowork.');
  let base, key, selected = model;
  if (matches.length) {
    const provider = matches[0];
    if (provider.api !== 'anthropic-messages') throw new Error('This Cowork SDK requires an Anthropic Messages-compatible provider. Choose one in Settings → Models.');
    base = provider.baseURL; key = keys[provider.route] || inherited[provider.keyEnv];
    if (qualified.length) selected = model.slice(provider.route.length + 1);
  } else {
    if (selected.startsWith('deepseek/')) selected = selected.slice(9);
    const relay = connection.mode === 'relay';
    if (!/^deepseek[-\w.]*$/.test(selected) && !(relay && connection.relayModels?.includes(selected)))
      throw new Error('Configure this model as an Anthropic Messages provider in Settings → Models to use it with Cowork.');
    base = relay ? connection.relayBaseURL : inherited.DEEPSEEK_BASE_URL || officialBaseURL;
    key = keys[relay ? relayKeySlot : officialKeySlot] || inherited.DEEPSEEK_API_KEY;
  }
  if (!key) throw new Error('Save an API key for this provider in Settings → Models before starting Cowork.');
  const url = new URL(base);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid Cowork provider endpoint.');
  if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('The Cowork VM cannot use a loopback-only model endpoint. Configure an endpoint reachable from the VM.');
  return { model: selected, env: { ANTHROPIC_BASE_URL: base.replace(/\/+$/, ''), ANTHROPIC_API_KEY: key } };
}
