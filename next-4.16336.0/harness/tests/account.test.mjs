import test from 'node:test'
import assert from 'node:assert/strict'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { DEEPSEEK_KEY_REF, accountReadResponse, providerAccountResponse } from '../packages/codex-app-server/src/account.js'

const links = { usageUrl: 'https://platform.deepseek.com/usage', topUpUrl: 'https://platform.deepseek.com/top_up' }

test('account/read reports a DeepSeek key only when the credential reference resolves', () => {
  const none = accountReadResponse({ keyInfo: { configured: false, writable: true } })
  assert.equal(none.account, null)
  assert.equal(none.requiresOpenaiAuth, false, 'no ChatGPT sign-in on this core')
  assert.deepEqual(none.deepseek, { apiKey: { configured: false, source: null }, platform: null, links: null })

  const file = accountReadResponse({ keyInfo: { configured: true, source: 'file', writable: true }, platformState: { status: 'signed-out', links, attempt: null } })
  assert.deepEqual(file.account, { type: 'apiKey' })
  assert.equal(file.deepseek.apiKey.source, 'file')
  assert.equal(file.deepseek.platform, 'signed-out')
  assert.deepEqual(file.deepseek.links, links)
  assert.equal('provider' in file, false, 'the provider list is no longer consulted')

  assert.equal(accountReadResponse({ keyInfo: { configured: true, source: 'env' } }).deepseek.apiKey.source, 'env')
})

test('a stored DeepSeek Platform sign-in alone counts as configured; missing services read as unconfigured', () => {
  const platform = accountReadResponse({ keyInfo: { configured: false }, platformState: { status: 'credential-stored', links, attempt: null } })
  assert.deepEqual(platform.account, { type: 'apiKey' })
  assert.deepEqual(platform.deepseek.apiKey, { configured: false, source: null })
  assert.equal(platform.deepseek.platform, 'credential-stored')
  for (const input of [undefined, {}, { keyInfo: null, platformState: null }, { keyInfo: { configured: 'yes' } }]) {
    const response = accountReadResponse(input)
    assert.equal(response.account, null)
    assert.equal(response.deepseek.apiKey.configured, false)
  }
})

test('without a credentials service the provider list answers, never asking for ChatGPT', () => {
  assert.deepEqual(providerAccountResponse([{ name: 'DeepSeek' }, { name: 'DeepSeek Platform' }]), { account: { type: 'apiKey' }, requiresOpenaiAuth: false, provider: 'DeepSeek, DeepSeek Platform' })
  assert.deepEqual(providerAccountResponse([]), { account: null, requiresOpenaiAuth: false })
  assert.deepEqual(providerAccountResponse(undefined), { account: null, requiresOpenaiAuth: false })
})

test('the key reference is the one llm-deepseek-api-key resolves by default', () => {
  assert.equal(DEEPSEEK_KEY_REF, 'DEEPSEEK_API_KEY')
  assert.equal(String(credentialRef(DEEPSEEK_KEY_REF)), 'DEEPSEEK_API_KEY')
})

test('a custom provider key alone counts as configured; the DeepSeek key still reads as missing', () => {
  const custom = accountReadResponse({ keyInfo: { configured: false }, otherProviders: true })
  assert.deepEqual(custom.account, { type: 'apiKey' })
  assert.deepEqual(custom.deepseek.apiKey, { configured: false, source: null })
  assert.equal(accountReadResponse({ keyInfo: { configured: false }, otherProviders: 'yes' }).account, null)
})
