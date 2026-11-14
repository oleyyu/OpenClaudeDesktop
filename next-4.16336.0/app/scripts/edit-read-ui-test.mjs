import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chooseSetting } from "./select-test-helpers.mjs";

// File tools acceptance: approval-current:4164–4238,6370–6390,6784–6837
// (UO inCard for classic group rows, m8 :54035-54063; outlined card standalone);
// cf6ae6197:6903–6962/6986–7031/16245–16440. Protocol fixture only,
// isolated data + CODEX_HOME, 1324x768, verified build, full clipboard restore.
const project = path.resolve(import.meta.dirname, "../..");
const root = path.join(project, "app");
const evidence = path.join(project, "analysis/batch-20260920");
await fs.mkdir(evidence, { recursive: true });
const startedAt = new Date().toISOString();
const directory = path.join(evidence, `edit-read-ui-${startedAt.replaceAll(":", "-")}`);
await fs.mkdir(directory, { recursive: true });
const profile = await fs.mkdtemp(path.join(directory, "profile-"));
const workspace = path.join(profile, "workspace");
await fs.mkdir(workspace);


const RC = 'file-tool-thread', now = Math.floor(Date.now()/1000);
const file = path.join(workspace,'app.ts');
await fs.writeFile(file,'export const localFile = true;\n');
const linkedFile = path.join(workspace, 'My linked file.ts');
await fs.writeFile(linkedFile, 'export const firstLinkLine = 1;\nexport const secondLinkLine = 2;\nexport const linkedTarget = true;\n');
const patch = '--- a/app.ts\n+++ b/app.ts\n@@ -1 +1,2 @@\n-old\n+new\n+more\n';
const read = (id, text, extra={}) => ({id,type:'commandExecution',status:'completed',command:'cat -n app.ts',cwd:workspace,commandActions:[{type:'read',path:file,name:'app.ts'}],aggregatedOutput:text,...extra});
const change = (id, kind, filename='app.ts', extra={}) => ({id,type:'fileChange',status:'completed',changes:[{path:path.join(workspace,filename),kind:{type:kind},diff:patch}],...extra});
const turns=[{id:'ft-turn',status:'completed',items:[
 {id:'ft-user',type:'userMessage',content:[{type:'text',text:'FILE_TOOL_FIXTURE'}]},
 read('read-a','  12\texport const first = true;\n'), read('read-b','  13\texport const second = false;\n'),
 change('edit-a','update'),
 change('add-a','add','created.ts',{changes:[{path:path.join(workspace,'created.ts'),kind:{type:'add'},diff:'--- /dev/null\n+++ b/created.ts\n@@ -0,0 +1,2 @@\n+alpha\n+beta\n'}]}),
 change('multi','update','a',{changes:[{path:'a',kind:{type:'add'},diff:'a\n'}, {path:'b',kind:{type:'update'},diff:patch},{path:'c',kind:{type:'update'},diff:patch}]}),
 read('search','TODO app.ts:1',{command:'rg TODO',commandActions:[{type:'search',query:'TODO',path:'src'}]}),
 read('list','app.ts',{command:'ls src',commandActions:[{type:'listFiles',path:'src'}]}),
 read('failed','cannot read file',{status:'failed',commandActions:[{type:'read',path:path.join(workspace,'missing.ts')}]}),
 read('mixed','1: alpha\nno prefix',{commandActions:[{type:'read',path:path.join(workspace,'mixed.ts')}]}),
 read('long',Array.from({length:100},(_,i)=>`${i+1}\tline_${i}`).join('\n'),{commandActions:[{type:'read',path:path.join(workspace,'long.ts')}]}),
 {id:'output-style',type:'agentMessage',text:'# Output style\n\nA paragraph with **weight** and `inline code`.\n\n## Details\n\n- First item\n- Second item\n\n> Quoted text\n\n| Name | Value |\n| --- | --- |\n| alpha | 1 |'},
]}];
// Response interactions use real-shaped protocol items, never injected DOM.
const wideHead = Array.from({length:12},(_,i)=>`Column ${i+1}`).join(' | ');
const wideRule = Array.from({length:12},()=> '---').join(' | ');
const wideCells = Array.from({length:12},(_,i)=>i===0?`\`${file}:1\``:`Value ${i+1}`).join(' | ');
turns[0].items.push({id:'wide-table-output',type:'agentMessage',text:`## Expanded results\n\n| ${wideHead} |\n| ${wideRule} |\n| ${wideCells} |\n\nRead \`${file}:1\` to inspect the implementation.`});
// Source markdown-current:5418–5422 + vendor-markdown oo: a colon before
// any slash is a protocol, so line-qualified relative paths require './'.
// Keep a bare counterpart to assert that the original sanitizer stays intact.
turns[0].items.push({id:'response-link-output',type:'agentMessage',text:`[Open linked file](${pathToFileURL(linkedFile).href}#L3-L2) and [app.ts](./app.ts:1). [Bare path](app.ts:1). [Documentation](https://example.test/docs)`});
// One Read after prose is not grouped (groupFileTools): the standalone UO card.
turns[0].items.push(read('solo-read','SOLO_READ_LINE\n',{command:'cat solo.ts',commandActions:[{type:'read',path:path.join(workspace,'solo.ts'),name:'solo.ts'}]}));
// F07: a DeepSeek-bridge search action forwards the call's raw arguments (projection.js toolItem).
turns[0].items.push({id:'search-args-note',type:'agentMessage',text:'SEARCH_ARGS_NOTE'},
  read('grep-args','app.ts:1:TODO',{command:'Grep TODO',commandActions:[{type:'search',command:'Grep TODO',query:'TODO',path:null,arguments:{pattern:'TODO',glob:'*.ts',output_mode:'content'}}]}));
await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({cwd:workspace,theme:'light',mode:'code',model:'fixture',effort:'low',threadIds:[RC],sidebarWidth:288}));
await fs.writeFile(path.join(profile,'fixture-threads.json'),JSON.stringify({next:800,threads:{[RC]:{id:RC,name:'File tools fixture',cwd:workspace,createdAt:now,updatedAt:now,archived:false,turns}}}));
const env = { ...process.env, CODE_DESKTOP_DATA: profile, CODEX_HOME:path.join(profile,'codex-home'), CODEX_BINARY: path.join(root, 'tests/fixtures/codex-server.cjs') };
await fs.mkdir(env.CODEX_HOME);
delete env.ELECTRON_RUN_AS_NODE; delete env.CODE_DESKTOP_DEV_URL;
const executablePath = process.env.TEST_ELECTRON_BINARY || path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron');
const checks=[],metrics={},rendererErrors=[];
let app,page,build,failure,runtime,clipboardSaved=false,clipboardRestored=false,profileRemoved=false;
const testSources=['scripts/edit-read-ui-test.mjs','tests/fixtures/codex-server.cjs','src/file-tool-model.mjs'];
let testSourceHashes;
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
async function verifySource() {
  assert.ok(build && Array.isArray(build.sources) && build.sources.length, "Build must contain a source manifest");
  assert.equal(sha(JSON.stringify(build.sources)), build.sourceSha256, "Build source digest must be internally consistent");
  const current = JSON.parse(await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"));
  assert.equal(current.sourceSha256, build.sourceSha256, "Build changed during this test");
  assert.equal(current.builtAt, build.builtAt, "Build was replaced during this test");
  assert.equal(JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8")).version, build.version, "Package version must match build");
  for (const entry of build.sources) assert.equal(sha(await fs.readFile(path.join(root, entry.path))), entry.sha256, `Build is stale: ${entry.path}`);
  for (const required of ["src/command-summary.mjs", "src/ansi-model.mjs", "src/command-row-model.mjs",
    "src/source-command.jsx", "src/source-command.css", "src/source-session.jsx", "src/source-session.css",
    "src/state.js", "src/main.jsx", "electron/main.cjs", "src/source-file-tool.jsx", "src/source-file-tool.css", "src/file-tool-model.mjs", "src/source-tool-group.jsx", "src/source-tool-group.css"])
    assert.ok(build.sources.some(entry => entry.path === required), `Build does not identify ${required}`);
  const hashes = Object.fromEntries(await Promise.all(testSources.map(async file => [file, sha(await fs.readFile(path.join(root, file)))])));
  if (testSourceHashes) assert.deepEqual(hashes, testSourceHashes, "Test or protocol fixture changed during this run");
  else testSourceHashes = hashes;
}
async function poll(check, label, timeout = 12000) {
  const until = Date.now() + timeout;
  for (;;) {
    try { const value = await check(); if (value) return value; } catch {}
    if (Date.now() > until) throw new Error(`Timed out: ${label}`);
    await new Promise(resolve => setTimeout(resolve, 40));
  }
}
const row = id => page.locator(`.source-step[data-transcript-item-id="${id}"]`);
// .sft-outer is one UO body in both branches (outlined card / inCard).
const body = id => row(id).locator(".sft-outer");
async function expand(id) {
  const trigger = row(id).locator(".source-step-trigger");
  if (await trigger.getAttribute("aria-expanded") !== "true") { await trigger.focus(); await trigger.press("Enter"); }
  await row(id).locator(".source-step-detail").waitFor();
}
async function collapse(id) {
  const trigger = row(id).locator(".source-step-trigger");
  if (await trigger.getAttribute("aria-expanded") === "true") { await trigger.focus(); await trigger.press("Enter"); }
}
async function send(text) {
  await page.getByRole("textbox", { name: /^(?:Prompt|Message DeepSeek)$/ }).fill(text);
  await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
}
// Resolve a CDS token to the colour the renderer actually paints.
async function tokenColor(name) {
  return page.evaluate(name => {
    const probe = document.createElement("span");
    probe.style.color = `var(${name})`;
    document.body.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  }, name);
}
// Resolved inside a transcript body: density scopes remap CDS lengths there.
async function tokenLength(name, host) {
  return host.evaluate((node, name) => {
    const probe = document.createElement("div");
    probe.style.cssText = `position:absolute;width:var(${name})`;
    node.append(probe);
    const value = getComputedStyle(probe).width;
    probe.remove();
    return value;
  }, name);
}
// Resolve a CDS duration token to the computed transition-duration.
async function tokenDuration(name, host) {
  return host.evaluate((node, name) => {
    const probe = document.createElement("div");
    probe.style.cssText = `position:absolute;transition-duration:var(${name})`;
    node.append(probe);
    const value = getComputedStyle(probe).transitionDuration;
    probe.remove();
    return value;
  }, name);
}
// Standalone classic row: zv geometry (c425fb3cf:143-144 Y, approval-current.js:17298)
// and the Ue caret / He verb colours (:17099-17101, c425fb3cf:149-153).
const classicStyle = id => row(id).evaluate(node => {
  const trigger = node.querySelector(":scope > .source-step-trigger"), caret = trigger.querySelector(".source-step-caret");
  const s = getComputedStyle(trigger), c = getComputedStyle(caret);
  return { inGroupRow: !!node.closest(".stg-row"), classic: node.classList.contains("source-step-classic"), state: node.dataset.state,
    padding: [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft], margin: [s.marginLeft, s.marginRight],
    minHeight: s.minHeight, maxWidth: s.maxWidth, gap: s.gap, radius: s.borderTopLeftRadius, cursor: s.cursor,
    height: trigger.getBoundingClientRect().height, caretColor: c.color, caretOpacity: c.opacity,
    caretTransitionProperty: c.transitionProperty, caretTransitionDuration: c.transitionDuration, caretTransitionEasing: c.transitionTimingFunction,
    labelColor: getComputedStyle(trigger.querySelector(".source-step-label")).color,
    focusVisible: trigger.matches(":focus-visible"), boxShadow: s.boxShadow, outlineStyle: s.outlineStyle };
});
async function assertClassicGeometry(id, tokens) {
  const style = await classicStyle(id);
  // approval-current.js:17298 / c425fb3cf:143: py-0, no min-height, no overhang,
  // max-w-full, gap-0.75, rounded-sm. The pre-0.2.123 26px/-4px geometry was the
  // non-tool TurnStatusStep's, not zv's.
  assert.equal(style.inGroupRow, false, `${id} is a standalone row`);
  assert.equal(style.classic, true);
  assert.deepEqual(style.padding, ["0px", "0px", "0px", "0px"], `${id} zv py-0 and no inline padding`);
  assert.deepEqual(style.margin, ["0px", "0px"], `${id} has no negative overhang`);
  assert.ok(["0px", "auto"].includes(style.minHeight), `${id} min-height ${style.minHeight}`);
  assert.equal(style.maxWidth, "100%");
  assert.equal(style.gap, "3px");
  // rounded-sm = c6a992d55 var(--radius-sm) (.25rem); guard against an unresolved token.
  assert.notEqual(tokens.radiusSm, "0px", "--radius-sm resolves");
  assert.equal(style.radius, tokens.radiusSm, "rounded-sm");
  assert.equal(style.height, tokens.leadingBody, `${id} is one transcript text-body line`);
  // R08: `${zv} cursor-pointer` is an arrow under :root[data-dframe] (desktop-layout.css:1026-1032).
  assert.equal(style.cursor, "default");
  assert.equal(style.caretOpacity, "1", "the caret is always visible");
  assert.equal(style.caretTransitionProperty, tokens.transitionProperty ?? "transform");
  assert.equal(style.caretTransitionDuration, tokens.durFast, "duration-fast");
  // ie `transition-transform`: shipped .transition-transform easing resolves
  // --default-transition-timing-function = cubic-bezier(.4,0,.2,1), not the `ease` default.
  assert.equal(style.caretTransitionEasing, tokens.easing ?? "cubic-bezier(0.4, 0, 0.2, 1)", "transition-transform easing");
  return style;
}
// Settled (Ve) caret: Jv muted -> secondary on hover and keyboard focus; ey when expanded.
async function assertSettledCaret(id, colors) {
  const trigger = row(id).locator(".source-step-trigger").first();
  // Toggle by keyboard: a pointer click could land on a nested control (ToolPath).
  if (await trigger.getAttribute("aria-expanded") === "true") { await trigger.focus(); await trigger.press("Enter"); }
  await trigger.evaluate(node => node.blur());
  await page.mouse.move(2, 2);
  const states = {};
  states.rest = await classicStyle(id);
  assert.equal(states.rest.caretColor, colors.muted, `${id} settled caret is muted`);
  assert.equal(states.rest.labelColor, colors.muted, `${id} settled verb is muted`);
  await trigger.hover();
  states.hover = await classicStyle(id);
  assert.equal(states.hover.caretColor, colors.secondary, `${id} caret group-hover secondary`);
  assert.equal(states.hover.labelColor, colors.secondary, `${id} verb group-hover secondary`);
  await page.mouse.move(2, 2);
  await trigger.focus();
  // The trusted Shift+Tab records keyboard modality; Tab itself cannot come back here, since a Tab inside the
  // transcript moves to the composer (cc43287c9 :45157-45164, main.jsx paneKey).
  await page.keyboard.press("Shift+Tab");
  await trigger.focus();
  states.focus = await classicStyle(id);
  assert.equal(states.focus.focusVisible, true, "keyboard focus is focus-visible");
  assert.equal(states.focus.caretColor, colors.secondary, `${id} caret group-focus-visible secondary`);
  assert.equal(states.focus.outlineStyle, "none");
  assert.equal(states.focus.boxShadow, colors.focusShadow, "focus-visible:shadow-focus");
  await page.keyboard.press("Enter");
  await trigger.evaluate(node => node.blur());
  states.expanded = await classicStyle(id);
  assert.equal(await trigger.getAttribute("aria-expanded"), "true");
  assert.equal(states.expanded.caretColor, colors.secondary, `${id} expanded caret ey text-secondary`);
  await trigger.focus(); await trigger.press("Enter");
  assert.equal(await trigger.getAttribute("aria-expanded"), "false");
  await trigger.evaluate(node => node.blur());
  await page.mouse.move(2, 2);
  return states;
}
async function classicTokens(host) {
  // One transcript text-body line: inside the transcript c6a992d55
  // `.epitaxy-transcript-typography :where(.text-body)` remaps the zv verb's text-body
  // to --chat-body / --chat-leading (local source-transcript.css), so the bare
  // --cds-leading-body token (chrome 19px) is not the row's line. Measured as laid out.
  const leadingBody = await host.evaluate(node => {
    const probe = document.createElement("div"); probe.style.cssText = "position:absolute;height:calc(var(--chat-body) * var(--chat-leading))";
    node.append(probe); const value = probe.getBoundingClientRect().height; probe.remove(); return value;
  });
  return { radiusSm: await tokenLength("--radius-sm", host), leadingBody,
    durFast: await tokenDuration("--cds-dur-fast", host) };
}
async function classicColors(host) {
  const focusShadow = await host.evaluate(node => {
    const probe = document.createElement("div"); probe.style.cssText = "position:absolute;box-shadow:var(--cds-focus-shadow)";
    node.append(probe); const value = getComputedStyle(probe).boxShadow; probe.remove(); return value;
  });
  return { muted: await tokenColor("--cds-text-muted"), secondary: await tokenColor("--cds-text-secondary"),
    primary: await tokenColor("--cds-text-primary"), focusShadow };
}

// UO geometry: wrapper, header, code box and (standalone only) the card.
const uoGeometry = node => {
  const style = element => getComputedStyle(element);
  const header = node.querySelector(':scope .sft-header'), code = node.querySelector(':scope .sft-code'), card = node.querySelector(':scope > .sft-card');
  return {
    inCard: node.hasAttribute('data-in-card'),
    headerOutsideCode: header.parentElement === code.parentElement && header.nextElementSibling === code,
    headerParent: header.parentElement === node ? 'wrapper' : header.parentElement.className,
    wrapper: { paddingTop: style(node).paddingTop, paddingBottom: style(node).paddingBottom, display: style(node).display, flexDirection: style(node).flexDirection, boxShadow: style(node).boxShadow },
    header: { paddingTop: style(header).paddingTop, paddingRight: style(header).paddingRight, paddingBottom: style(header).paddingBottom, paddingLeft: style(header).paddingLeft, gap: style(header).gap },
    code: { radius: style(code).borderTopLeftRadius, background: style(code).backgroundColor, boxShadow: style(code).boxShadow, overflowX: style(code).overflowX, overflowY: style(code).overflowY, maxHeight: style(code).maxHeight, minHeight: style(code).minHeight },
    card: card ? { radius: style(card).borderTopLeftRadius, background: style(card).backgroundColor, boxShadow: style(card).boxShadow } : null,
  };
};
const readClipboard = () => app.evaluate(({ clipboard }) => clipboard.readText());

try {
  build = JSON.parse(await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"));
  await verifySource();
  app = await electron.launch({ executablePath, args: [root], env });
  runtime = await app.evaluate(({ app }) => ({ version: app.getVersion(), electron: process.versions.electron, chrome: process.versions.chrome }));
  assert.equal(runtime.version, build.version, "Runtime version must match the verified source build");
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  page.on("pageerror", error => rendererErrors.push(error.message));
  // The clipboard is the user's; save it before the Copy checks and restore it
  // in the finally block whatever happens.
  metrics.clipboardApi = await app.evaluate(async ({ clipboard, ClipboardItem }) => {
    if (typeof clipboard.read !== "function" || typeof clipboard.write !== "function" || typeof ClipboardItem !== "function")
      throw new Error("All-format clipboard backup is required");
    const originals = await clipboard.read();
    globalThis.rcClipboardBackup = await Promise.all(originals.map(async item =>
      new ClipboardItem(Object.fromEntries(await Promise.all(item.types.map(async type => [type, await item.getType(type)]))))));
    return "all-formats";
  });
  clipboardSaved = true;
  await page.locator(`[data-source-session-id="${RC}"]`).waitFor();
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1324, 768));
  await page.waitForFunction(() => innerWidth === 1324 && innerHeight === 768);
  await page.mouse.move(100, 700);
  await page.locator(`[data-source-session-id="${RC}"] .source-session-open`).click();
  await page.locator('.stg-trigger').waitFor();
  assert.equal(await page.locator('.stg-trigger').getAttribute('aria-expanded'),'false');
  assert.equal(await page.locator('.stg-list').count(),0,'group body first mounts on expansion');
  metrics.groupSummary=await page.locator('.stg-trigger').textContent();
  // R08 dframe cursor policy: <html data-dframe>, and the group trigger is an arrow like the original.
  assert.equal(await page.evaluate(()=>document.documentElement.hasAttribute('data-dframe')),true);
  assert.equal(await page.locator('.stg-trigger').first().evaluate(n=>getComputedStyle(n).cursor),'default');
  assert.equal(await page.locator('.stg-summary').textContent(),'Read 4 files (1 failed), edited 3 files, created 2 files, searched code, listed files');
  assert.equal(await page.locator('.stg-counts').textContent(),'+9-3');
  await page.screenshot({path:path.join(directory,'group-collapsed.png')});
  await page.locator('.stg-trigger').click();
  await row("mixed").waitFor();
  assert.equal(await page.locator('.stg-row').count(),9,'coalesced Reads occupy one row; remaining protocol tools keep their order');
  const groupGeometry=await page.locator('.stg-row').nth(1).evaluate(node=>({padding:getComputedStyle(node).padding,border:getComputedStyle(node).borderTopWidth}));
  assert.deepEqual(groupGeometry,{padding:'8px 10px',border:'1px'});
  // c425fb3cf Gv:155 py-md (8+8), 1px divider, inherited source
  // 14px/1.42857 typography at the original Retina DPR 2. Offscreen defaults
  // to DPR 1; the isolated adapter must use offscreen.deviceScaleFactor=2.
  // Verify an independent source line box and preserve the original exact row.
  const sourceLineHeight=await page.evaluate(()=>{const probe=document.createElement('div');Object.assign(probe.style,{position:'fixed',fontSize:'14px',lineHeight:'1.42857'});probe.textContent='Source line';document.body.append(probe);const height=probe.getBoundingClientRect().height;probe.remove();return height;});
  assert.equal(sourceLineHeight,19.9921875);
  assert.equal(await page.locator('.stg-row').nth(1).evaluate(node=>node.getBoundingClientRect().height),36.9921875,'Gv source padding + line box + divider, with no leaked message margin');
  checks.push('Classic group starts collapsed, summarizes real path/category counts, expands to 9 source-sized divided rows and plain +9/-3 counts');
  await page.screenshot({path:path.join(directory,'group-expanded.png')});
  // Npe:53908–53926: 1 failed out of 4 Reads keeps the category neutral.
  assert.equal(await page.locator('.stg-summary [data-summary-error=true]').count(),0);
  // sN/pN retain explicit group intent and preserve mounted body after collapse.
  await page.locator('.stg-trigger').focus();await page.keyboard.press('Space');
  assert.equal(await page.locator('.stg-trigger').getAttribute('aria-expanded'),'false');
  assert.equal(await page.locator('.stg-list').count(),1);
  assert.equal(await page.locator('.stg-body').isVisible(),false);
  await page.keyboard.press('Enter');assert.equal(await page.locator('.stg-body').isVisible(),true);

  await page.locator(".loading-state").waitFor({ state: "detached" });
  await page.evaluate(() => document.fonts.ready);


  assert.equal(await row('read-b').count(),0,'adjacent same-path Reads coalesce');
  assert.equal(await row('read-a').locator('.source-step-label').textContent(),'Read');
  assert.equal(await row('read-a').locator('.source-step-meta').textContent(),'app.ts');
  assert.equal(await row('read-a').locator('.source-step-meta').getAttribute('title'),file);
  await expand('read-a');
  assert.equal(await body('read-a').count(),2);
  assert.deepEqual(await row('read-a').locator('.sft-read').allTextContents(),['export const first = true;\n','export const second = false;\n']);
  assert.equal(await row('read-a').locator('.sft-code').first().evaluate(node=>getComputedStyle(node).maxHeight),'400px');
  assert.equal(await row('read-a').getByText('Exit code').count(),0);
  checks.push('Read basename/full title; adjacent same-tool same-path merge; exact extracted output and 400px code group');
  // Classic group rows pass inCard (m8 :54035-54063 -> FN -> gN -> KO), so
  // Read (Yoe :7211-7234) and Edit (KO :7007-7026) use UO's inCard branch
  // :6784-6837: header 'flex items-center gap-1 pb-xs' outside a rounded-lg
  // Tv code box, wrapper 'flex w-full flex-col pt-xs', no outline layer.
  const padXs=await tokenLength('--cds-pad-xs', body('read-a').first()),padSm=await tokenLength('--cds-pad-sm', body('read-a').first()),padMd=await tokenLength('--cds-pad-md', body('read-a').first());
  metrics.tokenLengths={padXs,padSm,padMd};
  await expand('solo-read');
  metrics.standaloneRead=await body('solo-read').evaluate(uoGeometry);
  metrics.groupedRead=await body('read-a').first().evaluate(uoGeometry);
  await expand('edit-a');
  metrics.groupedEdit=await body('edit-a').evaluate(uoGeometry);
  for(const [name,geometry] of [['Read',metrics.groupedRead],['Edit',metrics.groupedEdit]]){
    assert.equal(geometry.inCard,true,`grouped ${name} is inCard`);
    assert.equal(geometry.card,null,`grouped ${name} has no outlined card`);
    assert.equal(geometry.headerParent,'wrapper',`grouped ${name} header sits in the UO wrapper`);
    assert.equal(geometry.headerOutsideCode,true,`grouped ${name} header precedes the code box as a sibling`);
    assert.deepEqual(geometry.wrapper,{paddingTop:padXs,paddingBottom:'0px',display:'flex',flexDirection:'column',boxShadow:'none'});
    assert.deepEqual(geometry.header,{paddingTop:'0px',paddingRight:'0px',paddingBottom:padXs,paddingLeft:'0px',gap:'4px'});
    // F07 design-system.css:56758-56768: the default Claude Light/Dark code themes ring every
    // non-fence code box (0 0 0 1px var(--cds-border)); on purpose, was 'none' before.
    assert.equal(geometry.code.radius,'8px');assert.match(geometry.code.boxShadow,/ 0px 0px 0px 1px$/);
    assert.equal(geometry.code.background,metrics.standaloneRead.card.background,`grouped ${name} code box paints the standalone card's Tv background`);
    assert.equal(geometry.code.maxHeight,'400px');assert.equal(geometry.code.overflowY,'auto');assert.notEqual(geometry.code.overflowX,'visible');
    assert.notEqual(geometry.code.minHeight,'0px','min-height reserve kept');
  }
  // Standalone UO: py-md wrapper, outlined Tv card, px-md py-sm header inside.
  assert.equal(metrics.standaloneRead.inCard,false);
  assert.equal(metrics.standaloneRead.headerParent,'sft-card');
  assert.equal(metrics.standaloneRead.wrapper.paddingTop,padMd);assert.equal(metrics.standaloneRead.wrapper.paddingBottom,padMd);
  assert.deepEqual(metrics.standaloneRead.header,{paddingTop:padSm,paddingRight:padMd,paddingBottom:padSm,paddingLeft:padMd,gap:'4px'});
  assert.equal(metrics.standaloneRead.card.radius,'8px');assert.match(metrics.standaloneRead.card.boxShadow,/ 0px 0px 0px 1px inset$/);
  // The standalone card clips its code box's ring to the header/code hairline (overflow clip).
  assert.match(metrics.standaloneRead.code.boxShadow,/ 0px 0px 0px 1px$/);
  metrics.codeThemeAttributes=await page.evaluate(()=>({light:document.documentElement.dataset.codeThemeLight,dark:document.documentElement.dataset.codeThemeDark}));
  assert.deepEqual(metrics.codeThemeAttributes,{light:'claude-light',dark:'claude-dark'});
  metrics.ringColor=await body('read-a').first().evaluate(node=>{const probe=document.createElement('span');probe.style.color='var(--cds-border)';node.append(probe);const color=getComputedStyle(probe).color;probe.remove();return color;});
  assert.ok(metrics.groupedEdit.code.boxShadow.startsWith(metrics.ringColor),`ring uses --cds-border (${metrics.groupedEdit.code.boxShadow})`);
  assert.notEqual(metrics.standaloneRead.card.background,'rgba(0, 0, 0, 0)');
  await row('read-a').scrollIntoViewIfNeeded();await page.mouse.move(2,2);
  await page.screenshot({path:path.join(directory,'group-incard-light.png')});
  await row('solo-read').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(directory,'standalone-read-light.png')});
  await collapse('solo-read');await collapse('edit-a');
  // Standalone Read (sft-step, classic): zv geometry and settled Ue/He colours
  // (c425fb3cf:143-153, approval-current.js:17099-17101,17298).
  metrics.classicTokens=await classicTokens(row('solo-read'));metrics.classicColors=await classicColors(row('solo-read'));
  metrics.classicSolo=await assertClassicGeometry('solo-read',metrics.classicTokens);
  metrics.classicSoloStates=await assertSettledCaret('solo-read',metrics.classicColors);
  checks.push('Standalone Read row: zv padding 0, no margin, min-height 0, rounded-sm, one text-body line, always-visible caret with duration-fast transform; muted caret/verb, secondary on hover, keyboard focus-visible (shadow-focus) and expanded');
  checks.push('Grouped Read/Edit use UO inCard: pt-xs column wrapper, header (px 0, pb-xs) outside an 8px Tv code box without outline; standalone Read keeps the py-md outlined card with the px-md py-sm header inside');
  // Read options keep source line numbers; paint is applied with the selected
  // theme rather than merely attaching unused custom properties (Yoe/kn).
  await row('read-a').locator('.sft-read[data-highlighted]').first().waitFor();
  assert.equal(await row('read-a').locator('.sft-read-number').first().getAttribute('data-number'),'1');
  assert.ok(await row('read-a').locator('[data-code-token]').count()>0);
  const tokenPaint=await row('read-a').locator('[data-code-token]').first().evaluate(e=>({paint:getComputedStyle(e).color,source:e.style.getPropertyValue('--sch-light')}));
  assert.ok(tokenPaint.source);assert.equal(tokenPaint.paint,await page.evaluate(color=>{const e=document.createElement('i');e.style.color=color;document.body.append(e);const result=getComputedStyle(e).color;e.remove();return result;},tokenPaint.source));
  // c19e90103-B6esh4pG.css response branch, not file-prose heading sizes.
  const prose=page.locator('.source-markdown').filter({has:page.getByRole('heading',{name:'Output style',exact:true})});
  assert.equal(await prose.getByRole('heading',{name:'Output style',exact:true}).evaluate(e=>getComputedStyle(e).fontSize),'16px');
  assert.equal(await prose.locator('ul').evaluate(e=>getComputedStyle(e).paddingLeft),'20px');
  assert.equal(await prose.locator('table').evaluate(e=>getComputedStyle(e).borderSpacing),'2px');
  assert.equal(await prose.locator('td').first().evaluate(e=>getComputedStyle(e).borderBottomWidth),'0px');
  assert.equal(await prose.locator('.source-table-scroll').evaluate(e=>getComputedStyle(e).overflowX),'auto');
  checks.push('Source response headings/lists/table surfaces and real syntax paint on line-numbered Read output');
  // markdown-current:3388–3534: Expand only when overflowing, capture the
  // preceding heading/rows, preserve source geometry and return keyboard focus.
  const wide=page.locator('[data-transcript-item-id="wide-table-output"]');
  const expandTable=wide.getByRole('button',{name:'Expand table',exact:true});await expandTable.waitFor();
  assert.equal(await prose.getByRole('button',{name:'Expand table',exact:true}).count(),0);
  await expandTable.click();const tableDialog=page.getByRole('dialog',{name:'Expanded results',exact:true});await tableDialog.waitFor();
  assert.equal(await tableDialog.locator('tbody td').count(),12);assert.equal(await tableDialog.locator('tbody td').nth(11).textContent(),'Value 12');
  assert.equal(await page.locator('#root').evaluate(e=>e.inert),true);
  assert.equal(await tableDialog.evaluate(e=>e.getBoundingClientRect().width<=innerWidth-48),true);
  await page.keyboard.press('Shift+Tab');assert.equal(await tableDialog.evaluate(e=>e.contains(document.activeElement)),true);
  await page.keyboard.press('Escape');await tableDialog.waitFor({state:'detached'});assert.equal(await expandTable.evaluate(e=>document.activeElement===e),true);
  const responseFile=wide.locator('.smd-file-ref').last();await responseFile.focus();await page.keyboard.press('Enter');
  await page.getByText('export const localFile = true;', {exact:false}).last().waitFor();
  checks.push('Wide response table expands with all 12 actual cells, heading and modal keyboard/focus ownership; response file chip opens Files pane');

  // Source Uc/Qe/Kn: actual Markdown file URLs open the Files pane with
  // decoded paths and normalized line ranges; external links stay anchors.
  const links = page.locator('[data-transcript-item-id="response-link-output"]');
  const fileLink = links.getByRole('button', { name: 'Open linked file', exact: true });
  assert.equal(await fileLink.getAttribute('data-file-ref'), linkedFile);
  assert.equal(await fileLink.getAttribute('data-file-line'), '2');
  assert.equal(await fileLink.getAttribute('data-file-end-line'), '3');
  await fileLink.focus(); await page.keyboard.press('Space');
  const filesPanel = page.getByRole('complementary', { name: 'Files panel', exact: true });
  await filesPanel.getByText('export const linkedTarget = true;', { exact: false }).waitFor();
  await filesPanel.locator('[data-active-line="2"][data-active-end-line="3"]').waitFor();
  const relative = links.getByRole('button', { name: 'app.ts', exact: true });
  assert.equal(await links.getByRole('button', { name: 'Bare path', exact: true }).count(), 0, 'Source default sanitizer rejects bare colon as an unsupported scheme');
  assert.equal(await links.getByRole('link', { name: 'Bare path', exact: true }).count(), 0);
  await relative.click();
  await filesPanel.getByText('export const localFile = true;', { exact: false }).waitFor();
  const external = links.getByRole('link', { name: 'Documentation', exact: true });
  assert.equal(await external.getAttribute('target'), '_blank');
  assert.equal(await external.getAttribute('rel'), 'noreferrer');
  // R08: only real links keep the pointer (desktop-layout.css:1033-1039 a[href] exception); file links are controls.
  assert.equal(await external.evaluate(n => getComputedStyle(n).cursor), 'pointer', 'markdown a[href] keeps the pointer');
  assert.equal(await relative.evaluate(n => getComputedStyle(n).cursor), 'default', 'file reference control is an arrow');
  checks.push('Markdown file URL and relative href keyboard/mouse controls open real file contents; line range is preserved and ordinary external link attributes match source');

  const meta=row('read-a').locator('.source-step-meta [role=button]');
  assert.equal(await meta.evaluate(n=>[n.classList.contains('sft-path'),getComputedStyle(n).cursor].join(' ')),'true default','R08: .sft-path is an arrow under dframe');
  await meta.focus(); await page.keyboard.press('Enter');
  await page.getByText('export const localFile = true;', {exact:false}).last().waitFor();
  assert.equal(await row('read-a').locator('.source-step-trigger').getAttribute('aria-expanded'),'true','nested path activation does not toggle the row');
  checks.push('Keyboard path activation opens real Files pane and does not toggle the containing row');
  await body('read-a').first().hover();
  await body('read-a').first().getByRole('button',{name:'Copy',exact:true}).click();
  await poll(async()=>await readClipboard()==='export const first = true;\n','read copy payload');
  await expand('mixed'); assert.equal(await row('mixed').locator('.sft-read').textContent(),'1: alpha\nno prefix');
  checks.push('Copy is the extracted read content; mixed numbered/plain lines preserve all prefixes');
  assert.equal(await row('add-a').locator('.source-step-label').textContent(),'Created');
  await expand('add-a');
  assert.equal(await row('add-a').locator('[data-pure-side=added]').count(),1);
  // F07 YO (approval-current.js:7189-7210): a pure addition puts the sign in the gutter before the
  // number ('+ 1', git colour) with no separate sign column; the paired Edit keeps number + sign.
  metrics.pureGutter=await row('add-a').locator('.sft-diff[data-pure-side]').evaluate(node=>{const number=node.querySelector('.sft-number'),sign=number.querySelector('.sft-number-sign');
    const probe=document.createElement('span');probe.style.color='var(--cds-text-git-added)';node.append(probe);const added=getComputedStyle(probe).color;probe.remove();
    return {first:number.textContent,all:[...node.querySelectorAll('.sft-number')].map(n=>n.textContent),signs:node.querySelectorAll('.sft-sign').length,signColor:getComputedStyle(sign).color,added,signWidth:sign.getBoundingClientRect().width};});
  assert.equal(metrics.pureGutter.first,'+ 1');assert.deepEqual(metrics.pureGutter.all,['+ 1','+ 2']);
  assert.equal(metrics.pureGutter.signs,0);assert.equal(metrics.pureGutter.signColor,metrics.pureGutter.added);assert.ok(metrics.pureGutter.signWidth>0);
  assert.equal(await row('add-a').locator('.sft-counts').textContent(),'2 added, 0 removed+2-0');
  await expand('edit-a');
  assert.equal(await row('edit-a').locator('.sft-counts').textContent(),'2 added, 1 removed+2-1');
  assert.equal(await row('edit-a').locator('.sft-diff-line[data-kind=added]').count(),2);
  assert.equal(await row('edit-a').locator('.sft-sign').count(),3,'paired edits keep the separate sign column');
  assert.equal(await row('edit-a').locator('.sft-number-sign').count(),0);
  await row('edit-a').locator('.sft-hunk[data-highlighted]').waitFor();assert.ok(await row('edit-a').locator('[data-code-token]').count()>0);
  await row('edit-a').locator('.sft-hunk[data-word-diff]').waitFor();
  assert.deepEqual(await row('edit-a').locator('[data-diff-span]').allTextContents(),['old','new']);
  assert.equal(await row('edit-a').locator('.sft-diff-line[data-kind=added]').last().locator('[data-diff-span]').count(),0);
  assert.ok(await row('edit-a').locator('[data-diff-span] [data-code-token]').count()>0);
  assert.equal(await row('edit-a').locator('[data-diff-span]').first().evaluate(el=>getComputedStyle(el).borderRadius),'3px');
  assert.notEqual(await row('edit-a').locator('[data-diff-span]').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');

  await body('edit-a').hover(); await body('edit-a').getByRole('button',{name:'Copy',exact:true}).click();
  await poll(async()=>await readClipboard()===patch,'diff copy is exact patch, not invented new file');
  checks.push('Created and Edited verbs, settled diff counts, pure additions, headerless unified body and exact Copy diff');
  assert.equal(await row('multi').locator('.source-step-label').textContent(),'Created a file, edited 2 files');
  assert.equal(await row('multi').locator('.source-step-meta').count(),0); await expand('multi'); assert.equal(await body('multi').count(),3);
  assert.equal(await row('failed').locator('.source-step-label').textContent(),'Failed to read');
  checks.push('Multi-file patch uses grouped verbs with three ordered cards, and failed read uses authoritative failed status');
  // F07 qO (approval-current.js:7099-7150): a search row lists the call's inputs (pattern:, path:),
  // never a synthesized 'command:' fact; the bridge's raw arguments win when present.
  for(const [id,label,facts] of [['search','Searched TODO',['pattern:','path:']],['list','Listed src',['path:']],['grep-args','Searched TODO',['pattern:','glob:','output_mode:']]]) {
    assert.equal(await row(id).locator('.source-step-label').textContent(),label);
    assert.equal(await row(id).locator('.source-step-meta').count(),0);await expand(id);
    const details=row(id).getByRole('group',{name:'Tool call details'});
    assert.deepEqual(await details.locator('.sft-key').allTextContents(),facts);
    assert.doesNotMatch(await details.textContent(),/command:/);
  }
  assert.equal(await row('search').locator('.sft-key').first().evaluate(node=>node.nextElementSibling.className),'sft-command','pattern is code-styled');
  checks.push('Grep/LS protocol actions use muted labels; their details list pattern:/path: (or the forwarded raw arguments) with no command: fact');
  await meta.click({button:'right'});
  // Context menus can mount underneath the pointer. Explicitly leave before
  // entering Copy so this tests a real pointerenter (source-menu 100ms hover).
  await page.mouse.move(100,700);
  await page.getByRole('menuitem',{name:'Copy',exact:true}).hover();
  await page.getByRole('menuitem',{name:'Filename',exact:true}).waitFor();
  assert.equal(await page.getByRole('menuitem',{name:'Absolute path',exact:true}).count(),1);
  assert.equal(await page.getByRole('menuitem',{name:'Relative path',exact:true}).count(),1);
  await page.getByRole('menuitem',{name:'Filename',exact:true}).click();
  await poll(async()=>await readClipboard()==='app.ts','filename copy');
  assert.equal(await row('read-a').locator('.source-step-trigger').getAttribute('aria-expanded'),'true','portal menu selection must not toggle the owning row');
  checks.push('Real context menu Copy submenu exposes scoped path choices and writes Filename without toggling the row');
  await send('fixture:file-tool-approval');
  const approvalId=await poll(async()=> (await page.locator('.sft-step').evaluateAll(nodes=>nodes.map(n=>n.dataset.transcriptItemId))).find(id=>id.startsWith('file-tool-')),'file approval row');
  await poll(async()=>await row(approvalId).getAttribute('data-state')==='blocked','file item blocked');
  assert.equal(await row(approvalId).locator('.sft-counts').count(),0);
  await page.locator('[data-approval-card-root] [data-approval-action=decline]').click();
  await poll(async()=>await row(approvalId).getAttribute('data-state')==='denied','file declined');
  checks.push('File approval blocks only its item, suppresses premature counts, and real decline settles Denied');
  await send('fixture:patch');
  const patchId=await poll(async()=> (await page.locator('.sft-step').evaluateAll(nodes=>nodes.map(n=>n.dataset.transcriptItemId))).find(id=>id.startsWith('patch-')),'patch row');
  await expand(patchId); await poll(async()=>await body(patchId).count()===3,'patchUpdated replaces cards');
  assert.equal(await row(patchId).locator('.source-step-label').textContent(),'Editing 3 files');
  assert.equal(await row(patchId).locator('.sft-counts').count(),0);
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').click();
  await poll(async()=>await row(patchId).getAttribute('data-state')==='stopped','patch stops');
  checks.push('Real patchUpdated replaces three cards while busy with no counts; interrupt waits for terminal status');
  await expand('long');
  const longCode=row('long').locator('.sft-code');
  await longCode.evaluate(node=>{node.scrollTop=120;});
  const beforeScroll=await longCode.evaluate(node=>node.scrollTop); assert.equal(beforeScroll,120);
  await collapse('long'); await expand('long'); assert.equal(await longCode.evaluate(node=>node.scrollTop),beforeScroll,'retained body preserves real overflow offset');
  const deniedReveal=await page.evaluate(async ({threadId,file})=>window.desktop.call('reveal-tool-file',{sessionId:threadId,path:file}).then(()=>null,error=>error.message),{threadId:RC,file:process.execPath});
  assert.match(deniedReveal,/outside the selected workspace/,'Finder IPC refuses existing files outside server-known cwd');
  await collapse('edit-a'); assert.equal(await row('edit-a').locator('.source-step-detail').getAttribute('hidden'),'');
  await expand('edit-a');
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await body('edit-a').locator('.src-cmd-copy').evaluate(node=>getComputedStyle(node).transitionDuration),'0s');
  metrics.scrollbar=await page.evaluate(()=>{const p=document.createElement('div');Object.assign(p.style,{overflow:'scroll',width:'100px',height:'100px',position:'fixed'});document.body.append(p);const gutter=p.offsetWidth-p.clientWidth;p.remove();return gutter;});
  await page.screenshot({path:path.join(directory,'light.png')});
  await page.evaluate(()=>{document.documentElement.dataset.mode='dark';}); // no appearance row in the account menu (shared-21 $B)
  await page.waitForFunction(()=>document.documentElement.dataset.mode==='dark');
  await page.screenshot({path:path.join(directory,'dark.png')});
  await expand('solo-read');
  metrics.darkStandaloneRead=await body('solo-read').evaluate(uoGeometry);metrics.darkGroupedEdit=await body('edit-a').evaluate(uoGeometry);
  assert.equal(metrics.darkGroupedEdit.code.background,metrics.darkStandaloneRead.card.background,'dark grouped code box matches the dark standalone card');
  assert.equal(metrics.darkGroupedEdit.card,null);assert.equal(metrics.darkGroupedEdit.header.paddingLeft,'0px');
  assert.match(metrics.darkGroupedEdit.code.boxShadow,/ 0px 0px 0px 1px$/,'Claude Dark rings the code box too');
  // A non-Claude code theme drops the ring (the attribute pair no longer matches).
  await page.keyboard.press('Meta+,');await page.getByRole('dialog',{name:'Settings',exact:true}).waitFor();
  await page.getByRole('navigation',{name:'Settings',exact:true}).getByRole('button',{name:'Code',exact:true}).click();
  await chooseSetting(page,'Dark code theme','github-dark');
  await page.getByRole('dialog',{name:'Settings',exact:true}).getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('dialog',{name:'Settings',exact:true}).waitFor({state:'detached'});
  await page.waitForFunction(()=>document.documentElement.dataset.codeThemeDark==='github-dark');
  metrics.nonClaudeRing=await body('edit-a').evaluate(node=>getComputedStyle(node.querySelector('.sft-code')).boxShadow);
  assert.equal(metrics.nonClaudeRing,'none');
  await page.keyboard.press('Meta+,');await page.getByRole('dialog',{name:'Settings',exact:true}).waitFor();
  await page.getByRole('navigation',{name:'Settings',exact:true}).getByRole('button',{name:'Code',exact:true}).click();
  await chooseSetting(page,'Dark code theme','claude-dark');
  await page.getByRole('dialog',{name:'Settings',exact:true}).getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('dialog',{name:'Settings',exact:true}).waitFor({state:'detached'});
  await page.waitForFunction(()=>document.documentElement.dataset.codeThemeDark==='claude-dark');
  assert.match(await body('edit-a').evaluate(node=>getComputedStyle(node.querySelector('.sft-code')).boxShadow),/ 0px 0px 0px 1px$/);
  checks.push('F07 code-box ring: html carries data-code-theme-light/-dark; Claude Light and Claude Dark ring the in-card code box with --cds-border (standalone: clipped hairline); GitHub Dark drops it and Claude Dark restores it');
  await row('edit-a').scrollIntoViewIfNeeded();await page.mouse.move(2,2);
  await page.screenshot({path:path.join(directory,'group-incard-dark.png')});
  await row('solo-read').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(directory,'standalone-read-dark.png')});
  await collapse('solo-read');
  // Dark: same zv geometry and settled colour states against dark tokens. The
  // reduced-motion emulation above is still active, so the caret transition is
  // removed (c425fb3cf ie motion-reduce:transition-none).
  metrics.darkClassicColors=await classicColors(row('solo-read'));
  assert.notEqual(metrics.darkClassicColors.secondary,metrics.classicColors.secondary,'dark tokens really apply (text-muted is the same grey in both)');
  metrics.darkClassicSolo=await assertClassicGeometry('solo-read',{...metrics.classicTokens,durFast:'0s',transitionProperty:'none',easing:'ease'});
  metrics.darkClassicSoloStates=await assertSettledCaret('solo-read',metrics.darkClassicColors);
  checks.push('Bodies remain mounted while hidden; reduced motion removes Copy transition; light/dark screenshots recorded');
  // User screenshot /0.2.72 contract: repeated reads compact even across
  // invisible reasoning and blank messages; actual prose still separates groups.
  await page.evaluate(()=>{
    window.compactReadSamples=[];
    window.compactReadObserver=new MutationObserver(()=>window.compactReadSamples.push(document.querySelectorAll('[data-tool-group^="compact-same"],.sft-step[data-transcript-item-id^="compact-same"]').length));
    window.compactReadObserver.observe(document.querySelector('.source-transcript-content'),{childList:true,subtree:true});
  });
  await send('fixture:compact-reads');await page.getByText('COMPACT_READ_DONE',{exact:true}).waitFor();
  const compact=page.locator('[data-tool-group^="compact-same"]'),distinct=page.locator('[data-tool-group^="compact-distinct"]');
  await poll(async()=>await compact.locator('.stg-summary').textContent()==='Read a file (6 reads)','six reads aggregate');
  assert.equal(await distinct.locator('.stg-summary').textContent(),'Read 3 files');
  const samples=await page.evaluate(()=>{window.compactReadObserver.disconnect();return window.compactReadSamples;});assert.ok(samples.length>0);assert.ok(samples.every(count=>count<=1),'arriving same-path reads occupy at most one collapsed row');
  assert.equal(await compact.locator('.stg-trigger').getAttribute('aria-expanded'),'false');assert.equal(await compact.evaluate(node=>node.getBoundingClientRect().height),19.9921875);
  await page.getByText('COMPACT_READ_PROGRESS: the first file checks are complete.',{exact:true}).waitFor();
  await compact.locator('.stg-trigger').click();assert.equal(await compact.locator('.stg-row').count(),1);await compact.locator('.source-step-trigger').focus();await compact.locator('.source-step-trigger').press('Enter');await compact.locator('.sft-read').first().waitFor();
  assert.deepEqual(await compact.locator('.sft-read').allTextContents(),Array.from({length:6},(_,i)=>`COMPACT_OUTPUT_${i}\n`));
  await distinct.locator('.stg-trigger').click();assert.equal(await distinct.locator('.stg-row').count(),3);
  const persisted=JSON.parse(await fs.readFile(path.join(profile,'fixture-threads.json'),'utf8')).threads[RC].turns.at(-1);
  assert.equal(persisted.items.filter(item=>item.type==='commandExecution').length,9);assert.equal(persisted.items.filter(item=>item.type==='reasoning').length,9);assert.equal(persisted.items.filter(item=>item.type==='agentMessage'&&!item.text.trim()).length,6);
  await compact.locator('.stg-trigger').click();await distinct.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(directory,'live-read-compaction.png')});
  checks.push('Real turn/start and9 read notifications: six same-file reads across hidden reasoning/blank text occupy one19.9921875px row throughout arrival, preserve all6outputs, and prose separates the following Read3files group; fixture history retains all records');
  assert.deepEqual(rendererErrors,[]);
} catch (error) {
  failure = error;
  await page?.screenshot({ path: path.join(directory, "failure.png") }).catch(() => {});
} finally {
  if (app && clipboardSaved) {
    try {
      await app.evaluate(async ({ clipboard }) => {
        const saved = globalThis.rcClipboardBackup;
        if (!saved) throw new Error("Clipboard backup unavailable");
        if (saved.length) await clipboard.write(saved); else await clipboard.clear();
        delete globalThis.rcClipboardBackup;
      });
      clipboardRestored = true;
    } catch (error) { metrics.clipboardRestoreError = String(error); failure ||= error; }
  }
  await app?.close().catch(error => { failure ||= error; });
  if (build) await verifySource().catch(error => { failure ||= error; });
  await fs.rm(profile, { recursive: true, force: true }).then(() => { profileRemoved = true; }).catch(error => { failure ||= error; });
  const report = { schemaVersion: 1, suite: "edit-read-ui", passed: !failure, startedAt, at: new Date().toISOString(), fixture: true, directory, profile, profileRemoved,
    build: build ? { version: build.version, builtAt: build.builtAt, sourceSha256: build.sourceSha256, verifiedSourceFiles: build.sources?.length } : null,
    runtime, testSourceHashes, executablePath, checks, metrics, clipboardSaved, clipboardRestored, rendererErrors, ...(failure ? { error: failure.stack || String(failure) } : {}) };
  await fs.writeFile(path.join(directory, "report.json"), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(evidence, "edit-read-ui-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, profile: undefined }, null, 2));
}
if (failure) throw failure;
