import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {_electron as electron} from '../../tools/node_modules/playwright/index.mjs'

// F09 home stats from the core (suite key "home-account-usage"). The isolated protocol
// fixture plays the DeepSeek bridge: its initialize lists capabilities.codeStats
// (fixture-core.json) and codeDesktop/stats/read answers the original getCodeStats object
// (fixture-usage.json, held behind release gates). Checks:
// 1) the presets home shows no stats card (R4DC-N2, E95) while codeDesktop/stats/read is read once;
// 2) the result is kept in the profile;
// 3) the next launch's fresh fold replaces it;
// 4) a DeepSeek core without a key shows the key card, and no generic connection card.
const root = path.resolve(import.meta.dirname, '..'), project = path.dirname(root), evidence = path.join(project, 'analysis/batch-20260920')
const directory = await fs.mkdtemp(path.join(evidence, 'home-account-usage-ui-')), profile = path.join(directory, 'profile'), workspace = path.join(profile, 'workspace')
await fs.mkdir(workspace, {recursive: true})
await fs.mkdir(path.join(profile, 'codex-home'))
const dayKey = offset => {const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() - offset); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`}
const T0 = dayKey(0), T1 = dayKey(1), T40 = dayKey(40)
const usage = (inputTokens, outputTokens) => ({inputTokens, outputTokens, cacheReadInputTokens: 0, cacheCreationInputTokens: 0})
// Full-history stats: 40 days back is outside the ledger's window entirely.
const statsA = {
  dailyActivity: [
    {date: T40, messageCount: 30, sessionCount: 2, toolCallCount: 9},
    {date: T1, messageCount: 8, sessionCount: 1, toolCallCount: 3},
    {date: T0, messageCount: 4, sessionCount: 0, toolCallCount: 1},
  ],
  dailyModelTokens: [
    {date: T40, tokensByModel: {fixture: 900000}},
    {date: T1, tokensByModel: {'fixture-1': 60000}},
    {date: T0, tokensByModel: {'fixture-1': 40000, fixture: 1000}},
  ],
  modelUsage: {fixture: usage(800000, 101000), 'fixture-1': usage(90000, 10000)},
  peakActivityHour: 15,
}
const statsB = {...statsA, dailyActivity: [...statsA.dailyActivity.slice(0, 2), {date: T0, messageCount: 10, sessionCount: 1, toolCallCount: 1}]}
// A ledger that would read very differently: it must not reach the card.
const ledger = {startedAt: new Date().toISOString(), days: {[T0]: {v: 2, messages: 999, sessions: 99, tokens: 5, hours: {3: 999}, models: {'fixture-5': 5}}}}
await fs.writeFile(path.join(profile, 'preferences.json'), JSON.stringify({cwd: workspace, theme: 'light', mode: 'code', threadIds: [], activity: ledger, stats: {}, onboarded: true /* first-run setup (source-onboarding.jsx) already done; this suite is about the home card */}))
await fs.writeFile(path.join(profile, 'fixture-core.json'), JSON.stringify({capabilities: {codeStats: true}}))
const writeAtomic = async (file, value) => {await fs.writeFile(file + '.tmp', JSON.stringify(value)); await fs.rename(file + '.tmp', file)}
const usageFixture = value => writeAtomic(path.join(profile, 'fixture-usage.json'), value)
const gate = name => path.join(profile, `fixture-usage-${name}`)
const exists = file => fs.access(file).then(() => true, () => false)
async function poll(check, label, timeout = 10000) {
  const end = Date.now() + timeout
  while (Date.now() < end) {if (await check()) return; await new Promise(resolve => setTimeout(resolve, 25))}
  throw new Error(`Timed out: ${label}`)
}
const env = {...process.env, CODE_DESKTOP_DATA: profile, CODEX_HOME: path.join(profile, 'codex-home'), CODEX_BINARY: path.join(root, 'tests/fixtures/codex-server.cjs')}
delete env.ELECTRON_RUN_AS_NODE
delete env.CODE_DESKTOP_DEV_URL
const build = JSON.parse(await fs.readFile(path.join(root, 'dist/build-info.json'), 'utf8')), sha = bytes => createHash('sha256').update(bytes).digest('hex')
const integrity = async () => {
  assert.equal(sha(JSON.stringify(build.sources)), build.sourceSha256)
  for (const file of build.sources) assert.equal(sha(await fs.readFile(path.join(root, file.path))), file.sha256, `Build is stale: ${file.path}`)
}
const report = {at: new Date().toISOString(), directory, build: {version: build.version, sourceSha256: build.sourceSha256}, checks: [], metrics: {}, rendererErrors: [], passed: false}
let app, page
async function launch() {
  app = await electron.launch({args: [root], executablePath: path.join(root, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'), env, timeout: 20000})
  page = await app.firstWindow()
  page.setDefaultTimeout(10000)
  page.on('pageerror', error => report.rendererErrors.push(error.message))
  await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].setContentSize(1324, 768))
  await page.waitForFunction(() => innerWidth === 1324 && innerHeight === 768)
}
const requests = () => fs.readFile(path.join(profile, 'fixture-requests.jsonl'), 'utf8').then(text => text.trim().split('\n').map(line => JSON.parse(line)), () => [])
const color = css => page.evaluate(css => {const probe = document.createElement('span'); probe.style.backgroundColor = css; document.querySelector('.cds-root').append(probe); const value = getComputedStyle(probe).backgroundColor; probe.remove(); return value}, css)

try {
  await integrity()
  // ------------------------------------------------------------ launch 1: held RPC
  // W14-code r4 closeout R4DC-N2 (E95): 3.6556.2's Code home is the presets start card (shared-20 sh); the 2.x stats
  // card (hold skeleton, tiles, tabs, heatmap) is deleted. The core's stats are still read once and kept in the profile
  // (they feed the composer's first-run placeholder), so this launch checks the read and the kept result only.
  await usageFixture({'codeDesktop/stats/read': {result: statsA, hold: 'stats1'}})
  await launch()
  await page.locator('[data-cds="ChatComposerEditor"] [role="textbox"]').first().waitFor()
  assert.equal(await page.getByTestId('epitaxy-stats-hold').count(), 0, 'no stats hold skeleton on the presets home')
  assert.equal(await page.locator('.connection-card').count(), 0, 'no connection card while the stats are held')
  await poll(() => exists(gate('stats1') + '-held.json'), 'stats request held')
  await fs.writeFile(gate('stats1') + '-release', '')
  await poll(async () => JSON.parse(await fs.readFile(path.join(profile, 'preferences.json'), 'utf8')).codeStats?.dailyActivity?.length === 3, 'first result kept')
  assert.equal(await page.getByTestId('epitaxy-stats-card').count(), 0, 'no stats card on the presets home')
  const prefs = JSON.parse(await fs.readFile(path.join(profile, 'preferences.json'), 'utf8'))
  assert.deepEqual(prefs.codeStats, statsA, 'the last core result is kept for the next launch')
  assert.equal(prefs.codeStatsCore, `override:${env.CODEX_BINARY}`, 'F09 review: tagged with the core that produced it')
  const statsReads = (await requests()).filter(entry => entry.method === 'codeDesktop/stats/read')
  assert.equal(statsReads.length, 1); assert.deepEqual(statsReads[0].params, {})
  assert.equal((await requests()).filter(entry => entry.method === 'account/usage/read').length, 0, 'the home no longer reads account usage')
  await page.screenshot({path: path.join(directory, 'home-core-stats.png')})
  report.checks.push('codeDesktop/stats/read is read once with empty params and its result kept in the profile (tagged with the core); the presets home shows no stats card or hold skeleton and no connection card')
  await app.close(); app = null

  // ------------------------------------------------------------ launch 2: fresh fold replaces the kept result
  await usageFixture({'codeDesktop/stats/read': {result: statsB, hold: 'stats2'}})
  await launch()
  await poll(() => exists(gate('stats2') + '-held.json'), 'second stats request held')
  await fs.writeFile(gate('stats2') + '-release', '')
  await poll(async () => JSON.parse(await fs.readFile(path.join(profile, 'preferences.json'), 'utf8')).codeStats?.dailyActivity?.[2]?.messageCount === 10, 'fresh result kept')
  report.checks.push('Next launch: the fresh fold replaces the kept result in the profile')

  // ------------------------------------------------------------ DeepSeek core without a key
  // harness account.js shape: the home asks for a key, never for ChatGPT; Refresh re-reads account/read.
  const deepseek = configured => ({result: {account: configured ? {type: 'apiKey'} : null, requiresOpenaiAuth: false, deepseek: {apiKey: {configured, source: configured ? 'file' : null}, platform: 'signed-out', links: null}}})
  await usageFixture({'account/read': deepseek(false)})
  await page.evaluate(() => window.desktop.call('account-auth', {operation: 'refresh'}))
  const keyCard = page.getByTestId('deepseek-key-card')
  await keyCard.waitFor()
  // R02: the Lw outline card (code-home.js:13752-13754) with a Jw text-body title and CDS Buttons (sm; Get an API key primary).
  const keyShape = await keyCard.evaluate(node => {
    const style = getComputedStyle(node), title = node.querySelector('.connection-card-title'), body = node.querySelector('.connection-card-body')
    return {outline: node.matches('.sh-card.is-outline'), padding: style.padding, radius: style.borderRadius, maxWidth: style.maxWidth, ring: style.boxShadow,
      title: [title.textContent, getComputedStyle(title).fontSize, getComputedStyle(title).color], body: [body.textContent, getComputedStyle(body).color],
      buttons: [...node.querySelectorAll('button')].map(button => [button.textContent.trim(), button.dataset.cds, button.dataset.variant, button.dataset.size ?? null])}
  })
  assert.deepEqual({...keyShape, ring: undefined}, {outline: true, padding: '8px 12px 12px', radius: '8px', maxWidth: '480px', ring: undefined,
    title: ['Add your DeepSeek API key', '13px', await color('var(--cds-text-primary)')], body: ['Choose Add key and paste your key to start. A key saved in DeepSeek Harness or set as DEEPSEEK_API_KEY also works; refresh after adding one there.', await color('var(--cds-text-secondary)')],
    buttons: [['Refresh', 'Button', 'secondary', 'sm'], ['Get an API key', 'Button', 'secondary', 'sm'], ['Add key', 'Button', 'primary', 'sm']]})
  assert.match(keyShape.ring, /0px 0px 0px 1px/, 'epitaxy-card-outline ring')
  report.metrics.keyCard = keyShape
  // The composer warns instead of letting a doomed send reach turn/start; Enter keeps the draft and starts nothing.
  const warningRow = page.locator('[data-cds-composer-warning]')
  await warningRow.waitFor()
  assert.equal(await warningRow.locator('.sc-warning-text').textContent(), 'Add a DeepSeek API key to start a session.')
  const composerBox = page.getByRole('textbox', {name: 'Prompt'})
  await composerBox.click()
  await page.keyboard.type('hello without a key')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(400)
  assert.equal((await composerBox.textContent()).trim(), 'hello without a key', 'the draft stays')
  assert.equal((await requests()).filter(entry => ['thread/start', 'turn/start'].includes(entry.method)).length, 0, 'no thread/start or turn/start without a key')
  assert.equal(await page.getByText('Continue with your ChatGPT account.', {exact: true}).count(), 0)
  assert.equal(await page.locator('.connection-card').count(), 1, 'only the key card')
  await page.screenshot({path: path.join(directory, 'home-deepseek-no-key.png')})
  await usageFixture({'account/read': deepseek(true)})
  await keyCard.getByRole('button', {name: 'Refresh', exact: true}).click()
  await keyCard.waitFor({state: 'detached'})
  await warningRow.waitFor({state: 'detached'})
  report.checks.push('DeepSeek account/read without a key shows the Add your DeepSeek API key card on the Lw outline (8/12/12, radius 8, 1px ring, 13px primary title, secondary body, sm CDS Buttons Refresh secondary / Get an API key primary), no ChatGPT card and no generic connection card; the composer warns "Add a DeepSeek API key to start a session." and Enter keeps the draft with no thread/start or turn/start; Refresh re-reads account/read and the card and warning leave once a key is configured')

  assert.equal((await requests()).filter(entry => ['turn/start', 'thread/resume', 'account/login/start', 'account/logout'].includes(entry.method)).length, 0)
  assert.deepEqual(report.rendererErrors, [])
  await integrity()
  report.checks.push('Read-only integration sends no turn/start, resume, login or logout; no renderer errors and built source integrity unchanged')
  report.passed = true
} catch (error) {
  report.error = error.stack
  process.exitCode = 1
  if (page) await page.screenshot({path: path.join(directory, 'failure.png')}).catch(() => {})
} finally {
  await app?.close()
  await fs.writeFile(path.join(directory, 'report.json'), JSON.stringify(report, null, 2) + '\n')
  await fs.writeFile(path.join(evidence, 'home-account-usage-ui-report.json'), JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
}
