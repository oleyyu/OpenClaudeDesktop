import test from 'node:test';
import assert from 'node:assert/strict';
import { proxyCredentials, providerDomains } from '../electron/cowork-runtime/proxy-credentials.mjs';
test('first-party proxy receives only credentials for its own domains', () => {
  const env = { ANTHROPIC_API_KEY: 'api', ANTHROPIC_AUTH_TOKEN: 'auth' };
  for (const base of [undefined, 'https://api.anthropic.com', 'https://claude.com', 'https://API.ANTHROPIC.COM:443']) {
    assert.deepEqual(proxyCredentials({ ...env, ANTHROPIC_BASE_URL: base }), ['api', 'auth']);
  }
  for (const base of ['http://172.16.10.254:3000', 'https://api.deepseek.com/anthropic', 'https://anthropic.com.example.org', 'https://notanthropic.com', 'invalid']) {
    assert.deepEqual(proxyCredentials({ ...env, ANTHROPIC_BASE_URL: base }), []);
  }
});
test('OAuth approval is explicit and duplicate tokens are removed', () => {
  assert.deepEqual(proxyCredentials({ CLAUDE_CODE_OAUTH_TOKEN: 'token', ANTHROPIC_API_KEY: 'token' }), ['token']);
  assert.deepEqual(proxyCredentials({}), []);
});

test('VM egress allows only the selected API host and port', () => {
  assert.deepEqual(providerDomains({}), ['api.anthropic.com:443']);
  assert.deepEqual(providerDomains({ ANTHROPIC_BASE_URL: 'https://api.deepseek.com/anthropic' }), ['api.deepseek.com:443']);
  assert.deepEqual(providerDomains({ ANTHROPIC_BASE_URL: 'http://172.16.10.254:3456' }), ['172.16.10.254:3456']);
  for (const url of ['file:///tmp/socket', 'https://user:secret@example.org', 'invalid']) assert.throws(() => providerDomains({ ANTHROPIC_BASE_URL: url }));
});
