// Live, offscreen verification of Code Desktop on the DeepSeek core.
// Windows are hidden offscreen (bootstrap.cjs); nothing takes the user's screen.
// Usage: node live.mjs [label]
import { _electron as electron } from '../../tools/node_modules/playwright/index.mjs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const here = import.meta.dirname
const root = path.resolve(here, '../..')
const appRoot = path.join(root, 'app')
const workspace = path.join(root, 'workspace')
const label = process.argv[2] || 'run'
const out = path.join(here, `${label}-${Date.now().toString(36)}`)
const profile = path.join(out, 'profile')
const launcher = path.join(out, 'launcher')
await fs.mkdir(profile, { recursive: true })
await fs.mkdir(launcher, { recursive: true })
await fs.copyFile(path.join(here, 'bootstrap.cjs'), path.join(launcher, 'bootstrap.cjs'))
await fs.copyFile(path.join(here, 'memory-clipboard.cjs'), path.join(launcher, 'memory-clipboard.cjs'))
await fs.writeFile(path.join(launcher, 'package.json'), JSON.stringify({ name: 'code-desktop-deepseek-live', version: '0.0.0', main: 'bootstrap.cjs' }))
await fs.writeFile(path.join(workspace, 'ui-smoke.txt'), 'CODE_DESKTOP_SMOKE_OK\n')
// PREFERENCES (JSON) is merged over the default profile, e.g. to seed remembered sessions.
// CUSTOM_INSTRUCTIONS (text): seeds the C1 global custom instructions in this throwaway profile.
await fs.writeFile(path.join(profile, 'preferences.json'), JSON.stringify({ cwd: workspace, theme: process.env.THEME || 'light', mode: 'code', effort: 'low', threadIds: [], ...(process.env.CUSTOM_INSTRUCTIONS ? { customInstructions: { enabled: true, global: process.env.CUSTOM_INSTRUCTIONS, projects: {} } } : {}), ...(process.env.PREFERENCES ? JSON.parse(process.env.PREFERENCES) : {}) }))

const env = { ...process.env, CODE_DESKTOP_DATA: profile, CODE_DESKTOP_VERIFY_ROOT: appRoot, CODE_DESKTOP_OFFSCREEN_SCALE: '2', CODE_DESKTOP_OFFSCREEN_LAUNCH: launcher, CODE_DESKTOP_MEMORY_CLIPBOARD: '0' }
delete env.ELECTRON_RUN_AS_NODE
delete env.CODEX_BINARY
delete env.CODE_DESKTOP_CORE

const prompts = process.env.PROMPTS ? JSON.parse(process.env.PROMPTS) : [
  'Read ui-smoke.txt with a tool and reply with its exact contents. Do not modify any files.',
  '用中文用两三句话介绍你自己，然后给出一个 Python 的 hello world 代码块，再列一个三行的 markdown 表格对比 Python 和 JavaScript。',
]
// ANSWERS (JSON {questionId: optionLabel}): question cards with those ids are
// answered while a turn waits on them (e.g. {"plan-review":"Approve"}).
const answers = process.env.ANSWERS ? JSON.parse(process.env.ANSWERS) : {}
// APPROVE (an approval action key, e.g. "accept"): approval cards are recorded
// (title, reason, context, detail, actions; screenshot 0Na-<n>) and answered with it.
const approve = process.env.APPROVE || null
// IMAGE=1: paste a red PNG into the composer before the first prompt (the
// clipboard lane: the main process stages it) and record the user bubbles.
// ROWS=1: after each prompt, expand the tool rows and record their labels.
// THINKING=1: sample the status label while each turn runs (text, button,
// shimmer), click the first "show in transcript" toggle (toast, rows), and
// after the prompts record the reasoning rows and the Plan pane markup.
// MENU=1: after the prompts, record the model menu and the Effort trigger
// name, then pick a text-only model and paste the PNG again (refusal notice).
const imagePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFklEQVR4nGO4IyJCEmIY1TCqYfhqAAACcQQQFwFJQgAAAABJRU5ErkJggg==', 'base64')
const pasteImage = () => page.evaluate((bytes) => {
  const transfer = new DataTransfer()
  transfer.items.add(new File([Uint8Array.from(atob(bytes), (c) => c.charCodeAt(0))], 'red-square.png', { type: 'image/png' }))
  const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: transfer })
  document.querySelector('.sc-input').dispatchEvent(event)
  return event.defaultPrevented
}, imagePng.toString('base64'))
const userBubbles = () => page.evaluate(() => Array.from(document.querySelectorAll('.source-user-message')).map((node) => ({
  text: node.querySelector('.source-user-bubble')?.textContent ?? '',
  tiles: Array.from(node.querySelectorAll('.source-user-attachment-image img')).map((img) => ({ loaded: img.complete && img.naturalWidth > 0, width: img.naturalWidth, store: /\/attachments\/v1\/objects\//.test(decodeURI(img.src)) })),
  tileGlyphs: node.querySelectorAll('.source-user-attachment-image .source-user-attachment-glyph').length,
  files: Array.from(node.querySelectorAll('.source-user-attachment-file')).map((card) => card.textContent),
})))
const report = { out, steps: [], errors: [] }
const app = await electron.launch({
  executablePath: path.join(appRoot, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),
  args: [launcher],
  env,
  timeout: 30000,
})
const page = await app.firstWindow()
page.on('pageerror', (error) => report.errors.push(error.message))
page.on('console', (message) => { if (message.type() === 'error') report.errors.push('console: ' + message.text()) })
await page.setViewportSize({ width: 1280, height: 860 }).catch(() => {})
const shot = async (name) => {
  const file = path.join(out, `${name}.png`)
  await page.screenshot({ path: file })
  report.steps.push({ shot: file })
}
try {
  await page.waitForFunction(() => !!document.querySelector('.sc-model-trigger') && document.querySelector('.sc-model-trigger').textContent !== 'Default model', {}, { timeout: 90000 })
  report.model = await page.evaluate(() => document.querySelector('.sc-model-trigger')?.textContent)
  await page.waitForTimeout(800)
  report.sidebarNotice = await page.evaluate(() => document.querySelector('[data-sidebar-notice]')?.textContent ?? null)
  // ACCOUNT=1: the stats card's account usage row, the home setup cards and
  // the account menu header against the live core (no model calls).
  if (process.env.ACCOUNT) {
    await page.waitForFunction(() => !document.querySelector('.sh-account-source') || !/Loading account usage/.test(document.querySelector('.sh-account-source').textContent), {}, { timeout: 30000 }).catch(() => {})
    report.home = await page.evaluate(() => ({
      statsCard: !!document.querySelector('[data-testid="epitaxy-stats-card"]'),
      accountSource: document.querySelector('.sh-account-source [role="status"]')?.textContent ?? null,
      totalTokensTile: [...document.querySelectorAll('.sh-grid > *')].map((node) => node.textContent).find((text) => text.startsWith('Total tokens')) ?? null,
      keyCard: document.querySelector('[data-testid="deepseek-key-card"]')?.textContent ?? null,
      cards: [...document.querySelectorAll('.connection-card .connection-card-title')].map((node) => node.textContent),
      composerWarning: document.querySelector('[data-cds-composer-warning] .sc-warning-text')?.textContent ?? null,
      footer: document.querySelector('[data-testid="user-menu-button"]')?.textContent ?? null,
    }))
    await page.getByTestId('user-menu-button').click()
    // R02: the org line is absent without a preferred name and without a key (IO no-principal branch).
    await page.getByTestId('user-menu-header').waitFor({ timeout: 5000 })
    report.home.menuHeader = await page.evaluate(() => [document.querySelector('[data-testid="user-menu-header"]')?.textContent, document.querySelector('[data-testid="user-menu-header-org"]')?.textContent ?? null])
    report.home.menuItems = await page.evaluate(() => [...document.querySelectorAll('[role="menu"][aria-label="Account menu"] [role^="menuitem"]')].map((node) => node.dataset.label ?? node.textContent))
    await shot('01-account-menu')
    await page.keyboard.press('Escape')
    // R02: the footer Connection settings menu names the running core.
    await page.getByRole('button', { name: 'Connection settings', exact: true }).click()
    await page.getByRole('menu').first().waitFor({ timeout: 5000 })
    report.home.connectionHeader = await page.evaluate(() => document.querySelector('[role="menu"] [role="presentation"]')?.textContent ?? null)
    await page.keyboard.press('Escape')
  }
  await shot('01-home')
  let index = 0
  for (const prompt of prompts) {
    index++
    const box = page.getByRole('textbox', { name: 'Message DeepSeek' })
    await box.click()
    await box.fill(prompt)
    if (process.env.IMAGE && index === 1) {
      report.pasted = await pasteImage()
      await page.locator('[data-cds-attachment][data-status="ready"]').first().waitFor({ timeout: 15000 })
      await shot('01b-image-staged')
    }
    await page.getByRole('button', { name: 'Send message', exact: true }).click()
    const started = Date.now()
    // Wait for the turn to start and then settle (no Stop button).
    await page.waitForFunction(() => document.querySelectorAll('.assistant-message').length > 0 || !!document.querySelector('[aria-label="Stop"]'), {}, { timeout: 60000 }).catch(() => {})
    await page.waitForTimeout(1500)
    await shot(`0${index + 1}a-streaming`)
    const answered = []
    const approvals = []
    const statusLabels = []
    const deadline = Date.now() + 240000
    while (Date.now() < deadline) {
      if (process.env.THINKING) {
        const seen = await page.evaluate(() => {
          const node = document.querySelector('[data-testid="code-transcript-status"] .sts-activity')
          return node ? { text: node.textContent, button: node.tagName === 'BUTTON', aria: node.getAttribute('aria-label'), shimmer: node.classList.contains('source-shimmer') } : null
        })
        const last = statusLabels.at(-1)
        if (seen && (!last || last.text !== seen.text || last.button !== seen.button)) statusLabels.push({ at: Date.now() - started, ...seen })
        if (seen?.button && !report.toggled) {
          await shot(`0${index + 1}t-thinking`)
          await page.locator('[data-testid="code-transcript-status"] button.sts-thinking-toggle').click().catch(() => {})
          await page.waitForTimeout(700)
          report.toggled = await page.evaluate(() => ({
            toasts: Array.from(document.querySelectorAll('.source-toast-message')).map((node) => node.textContent),
            reasoningRows: document.querySelectorAll('.source-reasoning').length,
            aria: document.querySelector('[data-testid="code-transcript-status"] .sts-activity')?.getAttribute('aria-label') ?? null,
          }))
          await shot(`0${index + 1}t-thinking-shown`)
        }
      }
      if (await page.evaluate(() => !document.querySelector('button[aria-label="Stop"], button[aria-label="Stop response"]'))) break
      const card = page.locator('[data-approval-question-id]').first()
      const questionId = await card.getAttribute('data-approval-question-id', { timeout: 500 }).catch(() => null)
      const label = questionId && answers[questionId]
      const instance = label ? await card.getAttribute('data-approval-instance', { timeout: 500 }).catch(() => null) : null
      const approval = approve ? page.locator('.sac-card[data-approval-method]').first() : null
      const approvalInstance = approval ? await approval.getAttribute('data-approval-instance', { timeout: 500 }).catch(() => null) : null
      if (approvalInstance && !approvals.some((entry) => entry.instance === approvalInstance)) {
        await page.waitForTimeout(600) // the 400 ms allow-click grace
        await shot(`0${index + 1}a-${approvals.length + 1}`)
        const seen = await approval.evaluate((node) => ({
          method: node.getAttribute('data-approval-method'),
          title: node.querySelector('.sac-heading')?.textContent ?? null,
          ems: Array.from(node.querySelectorAll('.sac-em')).map((em) => em.textContent),
          reason: node.querySelector('.sac-reason')?.textContent ?? null,
          context: Array.from(node.querySelectorAll('.sac-context')).map((part) => part.textContent),
          detail: (node.querySelector('.sac-details')?.textContent ?? '').slice(0, 300),
          actions: Array.from(node.querySelectorAll('[data-approval-action]')).map((button) => button.getAttribute('data-approval-action')),
        }))
        await approval.locator(`[data-approval-action="${approve}"]`).click()
        await page.waitForTimeout(800)
        approvals.push({ instance: approvalInstance, ...seen })
        continue
      }
      // R07: the plan review is the plan card (Rse); ANSWERS {"plan-review": "<button label>"}, e.g.
      // "Accept and allow edits", "Accept" or "Reject", clicks that button.
      const plan = answers['plan-review'] ? page.locator('.sac-card[data-approval-kind="plan"]').first() : null
      const planInstance = plan ? await plan.getAttribute('data-approval-instance', { timeout: 500 }).catch(() => null) : null
      if (planInstance && !answered.some((entry) => entry.instance === planInstance)) {
        await page.waitForTimeout(600) // the 400 ms allow-click grace
        await shot(`0${index + 1}q-plan-review`)
        const permissionBefore = await page.evaluate(() => document.querySelector('.sc-permission')?.textContent ?? null)
        const buttons = await plan.locator('.sac-button-label').allTextContents()
        await plan.getByRole('button', { name: answers['plan-review'], exact: true }).click()
        await page.waitForTimeout(1000)
        answered.push({ instance: planInstance, questionId: 'plan-review', label: answers['plan-review'], buttons, permissionBefore, permissionAfter: await page.evaluate(() => document.querySelector('.sc-permission')?.textContent ?? null) })
        continue
      }
      if (instance && !answered.some((entry) => entry.instance === instance)) {
        await shot(`0${index + 1}q-${questionId}`)
        const permissionBefore = await page.evaluate(() => document.querySelector('.sc-permission')?.textContent ?? null)
        await card.locator('.sq-option', { hasText: label }).first().click()
        await card.locator('.sq-submit').click()
        await page.waitForTimeout(1000)
        answered.push({ instance, questionId, label, permissionBefore, permissionAfter: await page.evaluate(() => document.querySelector('.sc-permission')?.textContent ?? null) })
        continue
      }
      await page.waitForTimeout(process.env.THINKING ? 200 : 500)
    }
    await page.waitForTimeout(1500)
    const text = await page.evaluate(() => Array.from(document.querySelectorAll('.assistant-message')).map((node) => node.textContent).join('\n---\n'))
    const alerts = await page.evaluate(() => Array.from(document.querySelectorAll('[role="alert"]')).map((node) => node.textContent).filter(Boolean))
    const permission = await page.evaluate(() => document.querySelector('.sc-permission')?.textContent ?? null)
    report.steps.push({ prompt, ms: Date.now() - started, assistant: text.slice(-600), alerts, permission, ...(answered.length ? { answered: answered.map(({ instance, ...entry }) => entry) } : {}), ...(approvals.length ? { approvals: approvals.map(({ instance, ...entry }) => entry) } : {}), ...(process.env.IMAGE ? { users: await userBubbles() } : {}), ...(process.env.THINKING ? { statusLabels } : {}) })
    // ROWS=1: open the tool groups and the generic tool rows, then record each
    // step row (state, label, meta, whether it can expand), the todo_write
    // checklist items and whether a JSON details body is shown.
    if (process.env.ROWS) {
      const step = report.steps.at(-1)
      // Element handles: a locator list is re-queried and would skip every other row once one opens.
      for (const trigger of await page.locator('.stg-trigger[aria-expanded="false"]').elementHandles()) await trigger.click().catch(() => {})
      await page.waitForTimeout(500)
      for (const trigger of await page.locator('.source-generic-step .source-step-trigger[aria-expanded="false"]').elementHandles()) await trigger.click().catch(() => {})
      await page.waitForTimeout(500)
      step.groups = await page.evaluate(() => Array.from(document.querySelectorAll('.stg-summary')).map((node) => node.textContent))
      step.rows = await page.evaluate(() => Array.from(document.querySelectorAll('[data-cds="TurnStatusStep"]')).map((node) => ({
        state: node.dataset.state,
        label: node.querySelector('.source-step-label')?.textContent ?? null,
        meta: node.querySelector('.source-step-meta')?.textContent ?? null,
        expandable: node.querySelector('.source-step-trigger')?.getAttribute('aria-expanded') ?? null,
        todos: Array.from(node.querySelectorAll('.source-plan-list-inline li')).map((li) => `${li.dataset.state}: ${li.querySelector('.source-plan-step')?.textContent ?? ''}`),
        json: !!node.querySelector('.sgt-details'),
      })))
      await shot(`0${index + 1}r-rows`)
    }
    await shot(`0${index + 1}b-done`)
  }
  if (process.env.THINKING) {
    report.reasoning = await page.evaluate(() => Array.from(document.querySelectorAll('.source-reasoning')).map((node) => ({
      kind: node.matches('.source-reasoning-step') ? 'step' : 'block',
      label: node.querySelector('.source-step-label')?.textContent ?? null,
      expanded: node.querySelector('.source-step-trigger')?.getAttribute('aria-expanded') ?? null,
      italic: getComputedStyle(node.querySelector('.source-reasoning-text') ?? node).fontStyle,
      copy: !!node.querySelector('button[aria-label="Copy as quote"]'),
      text: (node.querySelector('.source-reasoning-text, .source-reasoning-step-text')?.textContent ?? '').slice(0, 80),
    })))
    await shot('09-reasoning')
    await page.getByRole('button', { name: 'Session options', exact: true }).click()
    const planItem = page.getByRole('menuitemcheckbox', { name: 'Plan', exact: true })
    if (await planItem.count()) {
      await planItem.click()
      await page.locator('.source-plan').waitFor({ timeout: 10000 })
      await page.waitForTimeout(500)
      report.plan = await page.evaluate(() => {
        const pane = document.querySelector('.source-plan')
        return { heading: pane.querySelector('h2')?.textContent ?? null, headingTransform: getComputedStyle(pane.querySelector('h2')).textTransform,
          rows: Array.from(pane.querySelectorAll('li')).map((li) => ({ state: li.dataset.state, text: li.querySelector('.source-plan-step')?.textContent ?? '',
            sr: li.querySelector('.sr-only')?.textContent ?? null, lineThrough: getComputedStyle(li).textDecorationLine, spinner: !!li.querySelector('[data-cds="Spinner"]') })) }
      })
      await shot('10-plan')
    } else {
      report.plan = null
      await page.keyboard.press('Escape')
    }
  }
  // UNLOAD=1: leaving a session releases its Harness write lock. A second core
  // (own bridge store, same ~/.dsh) cannot resume it while it is open here,
  // can once the app goes home (thread/unsubscribe), and the app reopens it.
  if (process.env.UNLOAD) {
    const threadId = JSON.parse(await fs.readFile(path.join(profile, 'preferences.json'), 'utf8')).threadIds?.[0]
    const { CodexClient } = createRequire(import.meta.url)(path.join(appRoot, 'electron/codex.cjs'))
    const other = new CodexClient({ binary: path.join(root, 'harness/bin/codex-app-server.mjs'), initializeTimeout: 60000, env: { CODE_DESKTOP_CORE_STATE: path.join(out, 'other-core-state') } })
    const tryResume = () => other.request('thread/resume', { threadId }).then(() => 'resolved', (error) => `${error.code} ${error.data?.codexErrorInfo ?? error.message}`)
    report.unload = { threadId }
    try {
      await other.start()
      report.unload.whileOpen = await tryResume()
      await page.locator('.source-sidebar-nav-row', { hasText: 'New' }).first().click()
      let outcome = report.unload.whileOpen
      const left = Date.now()
      while (outcome !== 'resolved' && Date.now() - left < 10000) {
        await page.waitForTimeout(250)
        outcome = await tryResume()
      }
      report.unload.afterLeaving = outcome
      report.unload.releasedMs = Date.now() - left
      await other.request('thread/unsubscribe', { threadId })
    } finally {
      await other.stopAndWait()
    }
    await shot('0u-home')
    await page.locator(`[data-source-session-id="${threadId}"] [data-row-main-button]`).click()
    await page.waitForFunction(() => document.querySelectorAll('.assistant-message').length > 0, {}, { timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(1000)
    report.unload.reopened = await page.evaluate(() => ({
      messages: document.querySelectorAll('.assistant-message').length,
      alerts: Array.from(document.querySelectorAll('[role="alert"]')).map((node) => node.textContent).filter(Boolean),
    }))
    await shot('0u-reopened')
  }
  if (process.env.MENU) {
    report.menu = { effortTrigger: await page.locator('.sc-effort-trigger').getAttribute('aria-label').catch(() => null) }
    await page.locator('.sc-model-trigger').click()
    const models = page.getByRole('menu', { name: 'Models', exact: true })
    await models.waitFor({ timeout: 10000 })
    await shot('0m-model-menu')
    Object.assign(report.menu, await models.evaluate((node) => ({
      rows: Array.from(node.querySelectorAll('[data-model-id]')).map((row) => ({ id: row.dataset.modelId, name: row.querySelector('.sm-model-label')?.textContent ?? null, description: row.querySelector('.smenu-description')?.textContent ?? null, badges: Array.from(row.querySelectorAll('.sm-model-badge')).map((badge) => badge.textContent) })),
      fast: /Fast mode/.test(node.textContent),
      headers: Array.from(node.querySelectorAll('.sm-model-header')).map((header) => header.textContent),
    })))
    await models.locator('[data-model-id="deepseek-v4-pro"]').click()
    await page.waitForFunction(() => /V4-Pro/.test(document.querySelector('.sc-model-trigger')?.textContent ?? ''), {}, { timeout: 10000 })
    await page.getByRole('textbox', { name: 'Message DeepSeek' }).click()
    report.menu.textOnlyPaste = { prevented: await pasteImage() }
    await page.waitForTimeout(800)
    report.menu.textOnlyPaste.pills = await page.locator('[data-cds-attachment]').count()
    report.menu.textOnlyPaste.alerts = await page.evaluate(() => Array.from(document.querySelectorAll('[role="alert"]')).map((node) => node.textContent).filter(Boolean))
    await shot('0m-text-only-paste')
  }
  // ACCOUNT=1: Settings › Preferences account row and the Usage page.
  if (process.env.ACCOUNT) {
    await page.keyboard.press('Meta+,')
    const dialog = page.locator('.ss-settings-dialog')
    await dialog.waitFor({ timeout: 15000 })
    const nav = dialog.getByRole('navigation', { name: 'Settings', exact: true })
    await nav.getByRole('button', { name: 'Preferences', exact: true }).click()
    await page.waitForTimeout(600)
    const accountRow = dialog.locator('[data-setting-id="account"]')
    await accountRow.scrollIntoViewIfNeeded().catch(() => {})
    await shot('s-account')
    report.account = await dialog.evaluate((node) => {
      const row = node.querySelector('[data-setting-id="account"]')
      return { label: row?.querySelector('.settings-row-title')?.textContent ?? null, description: row?.querySelector('[data-settings-desc]')?.textContent ?? null,
        buttons: [...(row?.querySelectorAll('button') ?? [])].map((button) => button.textContent), signInRow: !!node.querySelector('[data-setting-id="signin"]'),
        chatgpt: /ChatGPT/.test(node.textContent), alerts: [...node.querySelectorAll('[role="alert"]')].map((entry) => entry.textContent) }
    })
    await nav.getByRole('button', { name: 'Usage', exact: true }).click()
    await page.waitForFunction(() => !document.querySelector('.su-loading'), {}, { timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(600)
    await shot('s-usage')
    report.usage = await dialog.evaluate((node) => ({
      empty: node.querySelector('.su-empty')?.textContent ?? null,
      dailyRows: [...node.querySelectorAll('.su-daily tbody tr')].map((row) => row.textContent),
      errors: [...node.querySelectorAll('.su-error, .su-note')].map((entry) => entry.textContent),
    }))
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
  }
  // SETTINGS=1: after the prompts, open Settings (⌘,) and record the Code,
  // Developer and Customize pages against the live core (no model calls).
  if (process.env.SETTINGS) {
    await page.keyboard.press('Meta+,')
    const dialog = page.locator('.ss-settings-dialog')
    await dialog.waitFor({ timeout: 15000 })
    report.settings = []
    const pages = [['code', 'Code'], ['developer', 'Developer'], ['skills', 'Skills'], ['connectors', 'Connectors'], ['plugins', 'Plugins']]
    for (const [name, label] of pages) {
      await dialog.getByRole('navigation', { name: 'Settings', exact: true }).getByRole('button', { name: label, exact: true }).click()
      // Customize pages: wait out the catalog skeleton; settings pages: the desktop read.
      await page.waitForFunction(() => !document.querySelector('[data-cz-skeleton], .ss-mcp-skeleton'), {}, { timeout: 30000 }).catch(() => {})
      await page.waitForTimeout(1200)
      await shot(`s-${name}`)
      report.settings.push(await dialog.evaluate((node, name) => {
        const texts = (selector) => Array.from(node.querySelectorAll(selector)).map((entry) => entry.textContent.trim()).filter(Boolean)
        const sandbox = node.querySelector('[data-setting-id="sandbox"]')
        return {
          page: name,
          alerts: texts('[role="alert"]'),
          connectionNotices: texts('.ss-connection-notice'),
          notices: texts('.cz-notice, .cz-config-hint p, .cz-empty'),
          sandbox: sandbox ? sandbox.textContent.trim() : null,
          rows: node.querySelectorAll('.cz-table tbody tr').length,
          firstRows: texts('.cz-table tbody tr td:first-child').slice(0, 3),
          authors: [...new Set(texts('.cz-table tbody tr td:last-child'))].slice(0, 4),
          buttons: texts('.cz-header button, .cz-config-hint button, .ss-mcp-empty button').slice(0, 6),
          mcpEmpty: texts('.ss-mcp-empty p'),
          codexPaths: node.textContent.includes('~/.codex'),
        }
      }, name))
    }
    // Skill detail: the read-only Enabled switch and its notice.
    await dialog.getByRole('navigation', { name: 'Settings', exact: true }).getByRole('button', { name: 'Skills', exact: true }).click()
    const firstSkill = dialog.locator('.cz-table tbody tr[data-row-id]').first()
    if (await firstSkill.count()) {
      await firstSkill.click()
      await dialog.locator('[data-cz-detail="skill"]').waitFor({ timeout: 10000 })
      await page.waitForTimeout(800)
      await shot('s-skill-detail')
      report.skillDetail = await dialog.evaluate((node) => {
        const toggle = node.querySelector('[data-cz-detail="skill"] [role="switch"]')
        return { name: node.querySelector('.cz-skill-head h3')?.textContent ?? null, switchDisabled: toggle?.disabled ?? null, switchChecked: toggle?.getAttribute('aria-checked') ?? null,
          reason: node.querySelector('[data-cz-detail="skill"] [data-cds-disabled-reason]')?.textContent ?? null, notice: node.querySelector('.cz-skill-detail > .cz-muted')?.textContent ?? null }
      })
    }
  }
  // CUSTOM_SETTINGS=1: after the prompts, open the customization pages
  // (Preferences/Persona, Theme, Instructions, Commands, Models, Harness) and
  // screenshot each one (no model calls). Screenshots are prefixed with THEME.
  if (process.env.CUSTOM_SETTINGS) {
    await page.keyboard.press('Meta+,')
    const dialog = page.locator('.ss-settings-dialog')
    await dialog.waitFor({ timeout: 15000 })
    report.customSettings = []
    const tone = process.env.THEME || 'light'
    for (const [name, label] of [['preferences', 'Preferences'], ['theme', 'Theme'], ['instructions', 'Instructions'], ['commands', 'Commands'], ['models', 'Models'], ['harness', 'Harness']]) {
      await dialog.getByRole('navigation', { name: 'Settings', exact: true }).getByRole('button', { name: label, exact: true }).click()
      await page.waitForTimeout(1500)
      if (name === 'preferences') await dialog.getByText('Persona', { exact: true }).first().scrollIntoViewIfNeeded().catch(() => {})
      await shot(`c-${tone}-${name}`)
      if (name === 'theme') {
        await dialog.locator('[data-setting-id="themeFontScale"]').scrollIntoViewIfNeeded().catch(() => {})
        await page.waitForTimeout(400)
        await shot(`c-${tone}-theme-scale`)
      }
      report.customSettings.push(await dialog.evaluate((node, name) => ({
        page: name,
        headings: Array.from(node.querySelectorAll('h2, h3')).map((entry) => entry.textContent.trim()).filter(Boolean).slice(0, 12),
        alerts: Array.from(node.querySelectorAll('[role="alert"]')).map((entry) => entry.textContent.trim()).filter(Boolean),
        textareas: Array.from(node.querySelectorAll('textarea')).map((entry) => entry.value.slice(0, 80)),
      }), name))
    }
  }
  // SYSTEM_PROMPT=1: record the last reply, then open Settings › Instructions,
  // press "Preview final system prompt" and record/screenshot the exact text
  // (prefix sp-<THEME>-). Pair with CUSTOM_INSTRUCTIONS to check a custom prompt.
  if (process.env.SYSTEM_PROMPT) {
    report.lastReply = await page.evaluate(() => Array.from(document.querySelectorAll('.assistant-message')).at(-1)?.textContent ?? null)
    await page.keyboard.press('Meta+,')
    const dialog = page.locator('.ss-settings-dialog')
    await dialog.waitFor({ timeout: 15000 })
    const tone = process.env.THEME || 'light'
    await dialog.getByRole('navigation', { name: 'Settings', exact: true }).getByRole('button', { name: 'Instructions', exact: true }).click()
    await page.waitForTimeout(1200)
    await shot(`sp-${tone}-instructions`)
    await dialog.getByRole('button', { name: 'Preview final system prompt', exact: true }).click()
    const pre = dialog.locator('pre[aria-label="Final system prompt"]')
    await pre.waitFor({ timeout: 15000 })
    await page.waitForFunction(() => !/^Loading/.test(document.querySelector('pre[aria-label="Final system prompt"]')?.textContent ?? 'Loading'), {}, { timeout: 30000 }).catch(() => {})
    await pre.scrollIntoViewIfNeeded().catch(() => {})
    await page.waitForTimeout(500)
    await shot(`sp-${tone}-preview`)
    report.systemPrompt = await dialog.evaluate((node) => ({
      preview: node.querySelector('pre[aria-label="Final system prompt"]')?.textContent ?? null,
      summary: node.querySelector('[data-setting-id="instructions-system-prompt"] [data-settings-desc]')?.textContent ?? null,
      globalNote: node.querySelector('[data-setting-id="instructions-global"] [data-settings-desc]')?.textContent ?? null,
      warning: node.querySelector('.ins-warning')?.textContent ?? null,
      alerts: Array.from(node.querySelectorAll('[role="alert"]')).map((entry) => entry.textContent.trim()).filter(Boolean),
    }))
    // SEED=1: "Start from built-in default" fills the (unsaved) editor with the built-in template.
    if (process.env.SEED) {
      await dialog.getByRole('button', { name: 'Start from built-in default', exact: true }).click()
      await page.waitForFunction(() => (document.querySelector('textarea[aria-label="Global instructions"]')?.value ?? '').length > 0, {}, { timeout: 30000 }).catch(() => {})
      await page.waitForTimeout(500)
      await shot(`sp-${tone}-seeded`)
      report.systemPrompt.seeded = await dialog.evaluate((node) => {
        const value = node.querySelector('textarea[aria-label="Global instructions"]')?.value ?? ''
        return { chars: value.length, start: value.slice(0, 200), hasModelRef: value.includes('{{model}}'), hasCwdRef: value.includes('{{cwd}}'),
          saveVisible: Array.from(node.querySelectorAll('[data-setting-id="instructions-global"] button')).some((b) => b.textContent === 'Save') }
      })
    }
  }
} catch (error) {
  report.errors.push(error.stack || String(error))
  await shot('99-error').catch(() => {})
} finally {
  report.windows = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map((w) => ({ visible: w.isVisible(), offscreen: w.webContents.isOffscreen() }))).catch(() => null)
  await app.close().catch(() => {})
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
}
