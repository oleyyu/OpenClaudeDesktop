import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

// All lifecycle mutations originate in the isolated raw protocol fixture. The
// test host only delays actual IPC delivery or rejects once BEFORE dispatch.
// No production hook, account, profile or executable command is used.
const root = path.resolve(import.meta.dirname, "..");
const evidence = path.join(root, "../analysis/batch-20260920");
const startedAt = new Date().toISOString();
const directory = path.join(
  evidence,
  `approval-transport-ui-${startedAt.replaceAll(":", "-")}`,
);
await fs.mkdir(directory, { recursive: true });
const profile = await fs.mkdtemp(path.join(directory, "profile-"));
const workspace = path.join(profile, "workspace");
const threadA = "approval-thread-a",
  threadB = "approval-thread-b",
  controlThread = "approval-control";
const checks = [],
  screenshots = [],
  rendererErrors = [],
  metrics = {};
let app,
  page,
  build,
  runtime,
  failure,
  hostRecords = [];
let serial = 0;
const card = (request) =>
  page.locator(
    `[data-approval-instance=${JSON.stringify(request.bridgeApproval.instanceId)}]`,
  );
const cards = () => page.locator(".sac-card, .source-question-card");
const custom = (request) => card(request).locator("[data-cds=\"TextArea\"], input[type=password]");
async function call(action, params = {}) {
  return page.evaluate(
    ({ action, params }) => window.desktop.call(action, params),
    { action, params },
  );
}
async function rpc(method, params) {
  return call("rpc", { method, params });
}
async function control(params) {
  await rpc("thread/resume", { threadId: controlThread });
  return rpc("turn/start", {
    threadId: controlThread,
    input: [
      {
        type: "text",
        text: "APPROVAL_TEST:" + JSON.stringify(params),
        text_elements: [],
      },
    ],
  });
}
async function snapshot() {
  const boot = await call("init");
  assert.ok(
    boot.approvalSnapshot,
    "init must return the serializable approval envelope",
  );
  assert.doesNotThrow(() => JSON.stringify(boot.approvalSnapshot));
  for (const request of boot.approvalSnapshot.pending) {
    assert.equal(Object.hasOwn(request, "approvalSnapshot"), false);
    for (const forbidden of ["connection", "child", "reader", "event", "phase"])
      assert.equal(
        Object.hasOwn(request, forbidden),
        false,
        `Private ledger field leaked: ${forbidden}`,
      );
  }
  return boot.approvalSnapshot;
}
async function requestFor(id) {
  const request = (await snapshot()).pending.find((request) =>
    Object.is(request.id, id),
  );
  assert.ok(request, `Missing fixture request ${typeof id}:${id}`);
  return request;
}
function rawRequest(id, kind = "command", threadId = threadA, extra = {}) {
  const methods = {
    command: "item/commandExecution/requestApproval",
    file: "item/fileChange/requestApproval",
    permissions: "item/permissions/requestApproval",
    question: "item/tool/requestUserInput",
  };
  const params = {
    threadId,
    turnId: `approval-turn-${++serial}`,
    itemId: `approval-item-${serial}`,
    reason: "Isolated approval fixture. No command or tool runs.",
    cwd: workspace,
    ...extra,
  };
  if (kind === "command") params.command = `printf isolated-${serial}`;
  if (kind === "file") params.grantRoot = workspace;
  if (kind === "permissions")
    params.permissions = { network: { enabled: true } };
  return { id, method: methods[kind], params };
}
async function emit(request) {
  await control({ op: "emit", request });
  return requestFor(request.id);
}
async function select(id) {
  await page
    .locator(
      `[data-source-session-id=${JSON.stringify(id)}] .source-session-open`,
    )
    .click();
  await page.locator(".loading-state").waitFor({ state: "hidden" });
  await page.waitForFunction(
    (id) =>
      document
        .querySelector(`[data-source-session-id="${id}"] .source-session-open`)
        ?.getAttribute("aria-current") === "page",
    id,
  );
}
async function lines(filename) {
  try {
    return (await fs.readFile(path.join(profile, filename), "utf8"))
      .split("\n")
      .filter(Boolean)
      .map(JSON.parse);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}
const responses = () => lines("approval-responses.jsonl");
async function waitFor(probe, message, timeout = 6000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const result = await probe();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.fail(message);
}
async function awaitResponses(count) {
  return waitFor(async () => {
    const rows = await responses();
    return rows.length >= count ? rows : false;
  }, `Expected ${count} actual fixture responses`);
}
async function action(request, value) {
  await card(request).waitFor();
  if (["accept", "acceptForSession", "allow"].includes(value))
    await page.waitForTimeout(430);
  await card(request)
    .locator(`[data-approval-action=${JSON.stringify(value)}]`)
    .click();
}
async function chooseOther(request) {
  // W12 (c9ed5627b dt Qn): the Other row's button carries the label and the digit keycap; a single-select Other has no
  // aria-pressed, so choosing it shows as its field taking tabIndex 0.
  const other = card(request).getByRole("button", { name: /^Other\b/ });
  await other.focus();
  await other.press("Space");
  assert.equal(await custom(request).getAttribute("tabindex"), "0");
}
async function screenshot(name) {
  const filename = path.join(directory, name);
  await page.screenshot({ path: filename });
  screenshots.push(filename);
}
async function arm(gate) {
  await app.evaluate(
    (_, gate) => globalThis.approvalUiFixture.armed.push(gate),
    gate,
  );
}
async function held(id) {
  await waitFor(
    () =>
      app.evaluate((_, id) => globalThis.approvalUiFixture.held.has(id), id),
    `IPC did not reach gate ${id}`,
  );
}
async function release(id) {
  await app.evaluate(
    (_, id) => globalThis.approvalUiFixture.held.get(id)?.(),
    id,
  );
  await waitFor(
    () =>
      app.evaluate(
        (_, id) => globalThis.approvalUiFixture.delivered.includes(id),
        id,
      ),
    `IPC gate ${id} did not release`,
  );
  await page.waitForTimeout(120);
}
async function reconnect() {
  const result = await call("reconnect");
  assert.equal(result.connected, true);
  assert.ok(result.approvalSnapshot);
  return result.approvalSnapshot;
}

try {
  const manifest = JSON.parse(
    await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"),
  );
  const pkg = JSON.parse(
    await fs.readFile(path.join(root, "package.json"), "utf8"),
  );
  build = {
    version: manifest.version,
    builtAt: manifest.builtAt,
    sourceSha256: manifest.sourceSha256,
  };
  assert.equal(pkg.version, manifest.version);
  assert.equal(
    createHash("sha256").update(JSON.stringify(manifest.sources)).digest("hex"),
    manifest.sourceSha256,
  );
  for (const entry of manifest.sources)
    assert.equal(
      createHash("sha256")
        .update(await fs.readFile(path.join(root, entry.path)))
        .digest("hex"),
      entry.sha256,
      `Build is stale: ${entry.path}`,
    );
  assert.ok(
    manifest.sources.some(
      (entry) => entry.path === "electron/approval-transport.cjs",
    ),
  );
  await fs.mkdir(workspace);
  await fs.writeFile(
    path.join(profile, "approval-fixture.marker"),
    "isolated-approval-test\n",
  );
  const now = Math.floor(Date.now() / 1000);
  const threads = Object.fromEntries(
    [
      [threadA, "Approval fixture A"],
      [threadB, "Approval fixture B"],
      [controlThread, "Approval fixture control"],
    ].map(([id, name]) => [
      id,
      {
        id,
        name,
        cwd: workspace,
        createdAt: now,
        updatedAt: now,
        archived: false,
        turns: [],
      },
    ]),
  );
  await fs.writeFile(
    path.join(profile, "fixture-threads.json"),
    JSON.stringify({ next: 100, threads }),
  );
  await fs.writeFile(
    path.join(profile, "preferences.json"),
    JSON.stringify({
      cwd: workspace,
      theme: "light",
      mode: "code",
      model: "approval-fixture",
      threadIds: Object.keys(threads),
      threadMetadata: threads,
      sidebarWidth: 288,
    }),
  );
  const env = {
    ...process.env,
    CODE_DESKTOP_DATA: profile,
    CODEX_BINARY: path.join(root, "tests/fixtures/approval-server.cjs"),
  };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.CODE_DESKTOP_DEV_URL;
  app = await electron.launch({
    executablePath:
      process.env.TEST_ELECTRON_BINARY ||
      path.join(
        root,
        "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron",
      ),
    args: [root],
    env,
  });
  page = await app.firstWindow();
  page.on("pageerror", (error) => rendererErrors.push(error.message));
  runtime = await app.evaluate(({ app }) => ({
    version: app.getVersion(),
    electron: process.versions.electron,
    node: process.versions.node,
  }));
  assert.equal(runtime.version, build.version);
  await page
    .getByRole("button", { name: "Model", exact: true })
    .filter({ hasText: "Approval fixture" })
    .waitFor();
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setContentSize(1468, 852),
  );
  await select(threadA);

  await app.evaluate(({ ipcMain, BrowserWindow }) => {
    const channel = "desktop:call",
      original = ipcMain._invokeHandlers?.get(channel);
    if (typeof original !== "function")
      throw new Error("Cannot inspect the isolated Electron IPC handler.");
    const contents = BrowserWindow.getAllWindows()[0].webContents;
    const send = contents.send;
    const fixture = {
      armed: [],
      held: new Map(),
      delivered: [],
      records: [],
      events: [],
    };
    globalThis.approvalUiFixture = fixture;
    contents.send = function (channel, ...args) {
      if (channel === "desktop:event")
        fixture.events.push(structuredClone(args[0]));
      return send.call(this, channel, ...args);
    };
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, async (event, action, params = {}) => {
      const record = {
        action,
        id: params.id,
        expected: params.expected,
        at: Date.now(),
        dispatched: false,
      };
      if (["respond", "init", "reconnect"].includes(action))
        fixture.records.push(record);
      const index = fixture.armed.findIndex(
        (gate) =>
          gate.action === action &&
          (gate.instanceId === undefined ||
            gate.instanceId === params.expected?.instanceId),
      );
      const gate = index < 0 ? null : fixture.armed.splice(index, 1)[0];
      const pause = async () => {
        await new Promise((resolve) => fixture.held.set(gate.id, resolve));
        fixture.held.delete(gate.id);
        fixture.delivered.push(gate.id);
      };
      if (gate?.phase === "before") {
        await pause();
        if (gate.reject)
          return {
            ok: false,
            error: {
              code: "transport_error",
              message: "Isolated pre-dispatch rejection",
            },
          };
      }
      record.dispatched = true;
      const result = await original(event, action, params);
      if (gate?.phase === "after") await pause();
      return result;
    });
    fixture.restore = () => {
      fixture.held.forEach((resolve) => resolve());
      fixture.armed = [];
      contents.send = send;
      ipcMain.removeHandler(channel);
      ipcMain.handle(channel, original);
    };
  });

  // Actual Electron serialization and typed IDs, not hand-injected DOM events.
  const numeric = await emit(rawRequest(7));
  const string = await emit(rawRequest("7"));
  await card(numeric).waitFor();
  // R07 one card at a time (cc43287c9 :31744 om; c57f8fcae je): the newer request waits.
  assert.equal(await card(string).count(), 0);
  assert.equal(await cards().count(), 1);
  assert.notEqual(
    numeric.bridgeApproval.instanceId,
    string.bridgeApproval.instanceId,
  );
  const beforeTyped = (await responses()).length;
  assert.equal(
    (await call("respond", { id: 7, decision: "accept" })).error.code,
    "identity_required",
  );
  assert.equal(
    (
      await call("respond", {
        id: 7,
        expected: string.bridgeApproval,
        decision: "accept",
      })
    ).error.code,
    "stale_request",
  );
  assert.equal((await responses()).length, beforeTyped);
  assert.equal(
    (
      await call("respond", {
        id: 7,
        expected: numeric.bridgeApproval,
        decision: "decline",
      })
    ).ok,
    true,
  );
  await card(numeric).waitFor({ state: "detached" });
  await card(string).waitFor();
  await action(string, "decline");
  const typedRows = (await awaitResponses(beforeTyped + 2)).slice(-2);
  assert.deepEqual(
    typedRows.map((row) => row.wire),
    [
      { id: 7, result: { decision: "decline" } },
      { id: "7", result: { decision: "decline" } },
    ],
  );
  checks.push(
    "Electron clones only serializable main-issued snapshots; missing/mismatched nonce writes nothing; numeric 7 and string '7' remain independent and exact raw response IDs survive IPC",
  );

  const old = await emit(rawRequest("reconnect-id"));
  await card(old).waitFor();
  const newConnection = await reconnect();
  assert.notEqual(newConnection.connectionId, old.bridgeApproval.connectionId);
  assert.ok(newConnection.connectionEpoch > old.approvalConnectionEpoch);
  await card(old).waitFor({ state: "detached" });
  const current = await emit(rawRequest("reconnect-id"));
  const beforeStale = (await responses()).length;
  const stale = await call("respond", {
    id: old.id,
    expected: old.bridgeApproval,
    decision: "accept",
  });
  assert.equal(stale.error.code, "stale_request");
  assert.equal((await responses()).length, beforeStale);
  await card(current).waitFor();
  await action(current, "decline");
  await awaitResponses(beforeStale + 1);
  checks.push(
    "Manual reconnect clears the old card; its retained expected identity cannot answer the replacement server's same wire ID; the current card still works",
  );

  // Reload means requests genuinely predate this renderer's subscription.
  const reloadA = await emit(rawRequest("reload-A"));
  await arm({ id: "init-add", action: "init", phase: "after" });
  await page.reload();
  await held("init-add");
  await control({ op: "emit", request: rawRequest("reload-B") });
  await release("init-add");
  await select(threadA);
  const reloadB = await requestFor("reload-B");
  await card(reloadA).waitFor();
  // R07 one card at a time: B is recovered too but shows once A is resolved.
  assert.equal(await card(reloadB).count(), 0);
  await control({ op: "resolve", id: "reload-A" });
  await card(reloadB).waitFor();
  await control({ op: "resolve", id: "reload-B" });
  await card(reloadB).waitFor({ state: "detached" });
  const resolveA = await emit(rawRequest("reload-resolve-A"));
  const retainB = await emit(rawRequest("reload-retain-B"));
  await arm({ id: "init-resolve", action: "init", phase: "after" });
  await page.reload();
  await held("init-resolve");
  await control({ op: "resolve", id: resolveA.id });
  await release("init-resolve");
  await select(threadA);
  assert.equal(await card(resolveA).count(), 0);
  await card(retainB).waitFor();
  await control({ op: "resolve", id: retainB.id });
  checks.push(
    "Two real renderer reloads with delayed actual init replies recover missed pending requests after a newer add or resolution, without reviving resolved cards",
  );

  const oldTurn = await emit(rawRequest("old-turn"));
  const newTurn = await emit(rawRequest("current-turn"));
  await control({
    op: "complete",
    threadId: threadA,
    turnId: oldTurn.params.turnId,
  });
  await card(oldTurn).waitFor({ state: "detached" });
  await card(newTurn).waitFor();
  await action(newTurn, "decline");
  await card(newTurn).waitFor({ state: "detached" });
  await page.waitForTimeout(100);
  const resolutionCount = await app.evaluate(
    (_, instanceId) =>
      globalThis.approvalUiFixture.events.filter(
        (event) =>
          event.kind === "resolved" &&
          event.bridgeApproval?.instanceId === instanceId,
      ).length,
    newTurn.bridgeApproval.instanceId,
  );
  assert.equal(resolutionCount, 1);
  const answeredOld = await emit(rawRequest("late-reply-id"));
  await arm({
    id: "late-success",
    action: "respond",
    phase: "after",
    instanceId: answeredOld.bridgeApproval.instanceId,
  });
  await action(answeredOld, "decline");
  await held("late-success");
  await card(answeredOld).waitFor({ state: "detached" });
  const replacement = await emit(rawRequest("late-reply-id"));
  await card(replacement).waitFor();
  await release("late-success");
  await card(replacement).waitFor();
  assert.notEqual(await card(replacement).getAttribute("aria-busy"), "true");
  await action(replacement, "decline");
  checks.push(
    "Completing an older turn expires only its own approval; local response plus server resolution deletes once; an older card's delayed actual invoke success cannot delete or lock a new nonce sharing its ID",
  );

  const questions = [
    {
      id: "choice",
      header: "Choice",
      question: "Choose the fixture approach",
      isOther: true,
      isSecret: false,
      options: [
        { label: "First", description: "First fixture option" },
        { label: "Second", description: "Second fixture option" },
      ],
    },
    {
      id: "notes",
      header: "Notes",
      question: "Add a fixture note",
      isOther: false,
      isSecret: false,
      options: null,
    },
  ];
  const malformed = await emit(
    rawRequest("malformed-question", "question", threadA, {
      questions: [null],
    }),
  );
  await card(malformed).locator("[role=alert]").waitFor();
  assert.equal(await card(malformed).getAttribute("data-approval-invalid"), "");
  assert.equal(await card(malformed).locator(".justify-end > button:last-child").count(), 0);
  assert.deepEqual(rendererErrors, []);
  const qa = await emit(
    rawRequest("question-A", "question", threadA, { questions }),
  );
  const qb = await emit(
    rawRequest("question-B", "question", threadB, {
      questions: [questions[0]],
    }),
  );
  await card(qa).waitFor();
  metrics.questionGeometry = await card(qa).evaluate((node) => {
    const style = getComputedStyle(node);
    const footer = node.querySelector(".justify-end");
    const footerStyle = getComputedStyle(footer);
    const button = footer.querySelector(".justify-end > button:last-child");
    const other = node.querySelector(".gap-0\\.75 > div");
    const otherStyle = getComputedStyle(other);
    const input = other.querySelector("[data-cds=\"TextArea\"], input[type=password]");
    const inputStyle = getComputedStyle(input);
    const px = (value) => Number.parseFloat(value);
    const edges = (s, prefix, suffix = "") =>
      ["Top", "Right", "Bottom", "Left"].map((side) =>
        px(s[prefix + side + suffix]),
      );
    return {
      padding: edges(style, "padding"),
      border: edges(style, "border", "Width"),
      gap: style.gap,
      maxHeight: style.maxHeight,
      fontSize: px(style.fontSize),
      lineHeight: px(style.lineHeight),
      footerMargin: edges(footerStyle, "margin"),
      footerPadding: edges(footerStyle, "padding"),
      footerSeparation:
        footer.getBoundingClientRect().top -
        footer.previousElementSibling.getBoundingClientRect().bottom,
      buttonInsetTop:
        button.getBoundingClientRect().top - footer.getBoundingClientRect().top,
      buttonHeight: button.getBoundingClientRect().height,
      otherGridTemplateColumns: otherStyle.gridTemplateColumns,
      otherColumnGap: px(otherStyle.columnGap),
      otherInputInset:
        input.getBoundingClientRect().left -
        other.getBoundingClientRect().left -
        px(otherStyle.borderLeftWidth) -
        px(otherStyle.paddingLeft),
      inputMinHeight: px(inputStyle.minHeight),
      inputFontSize: px(inputStyle.fontSize),
      inputLineHeight: px(inputStyle.lineHeight),
    };
  });
  const geometry = metrics.questionGeometry;
  assert.deepEqual(geometry.padding, [0, 0, 0, 0]);
  assert.deepEqual(geometry.border, [0, 0, 0, 0]);
  assert.equal(geometry.gap, "0px");
  assert.equal(geometry.maxHeight, "none");
  assert.equal(geometry.fontSize, 13);
  assert.equal(geometry.lineHeight, 19);
  assert.deepEqual(geometry.footerMargin, [0, 0, 0, 0]);
  assert.deepEqual(geometry.footerPadding, [8, 12, 12, 12]);
  assert.ok(Math.abs(geometry.footerSeparation) < 0.25);
  assert.ok(Math.abs(geometry.buttonInsetTop - 8) < 0.25);
  assert.ok(Math.abs(geometry.buttonHeight - 24) < 0.25);
  assert.equal(geometry.otherColumnGap, 12);
  assert.ok(
    Math.abs(
      geometry.otherInputInset -
        Number.parseFloat(geometry.otherGridTemplateColumns) -
        12,
    ) < 0.25,
  );
  assert.equal(geometry.inputMinHeight, 31);
  assert.equal(geometry.inputFontSize, 13);
  assert.equal(geometry.inputLineHeight, 19);
  // approval-current.js:7790-7800 _se preselects options[0], so Next starts enabled (product
  // correction in 0.2.115; previously asserted disabled).
  assert.equal(await card(qa).locator(".justify-end > button:last-child").isDisabled(), false);
  assert.equal(
    await card(qa)
      .locator(".gap-0\\.75 > button")
      .filter({ hasText: "First fixture option" })
      .getAttribute("aria-pressed"),
    "true",
  );
  await chooseOther(qa);
  await custom(qa).fill("A custom choice");
  await card(qa)
    .locator(".gap-0\\.75 > button")
    .filter({ hasText: "First fixture option" })
    .click();
  await chooseOther(qa);
  assert.equal(await custom(qa).inputValue(), "A custom choice");
  await card(qa).locator(".justify-end > button:last-child").click();
  await card(qa)
    .locator("[data-question-stop-name]")
    .filter({ hasText: "Add a fixture note" })
    .waitFor();
  await custom(qa).fill("A retained note");
  await select(threadB);
  await card(qb).waitFor();
  await chooseOther(qb);
  await custom(qb).fill("B separate choice");
  await select(threadA);
  await card(qa).waitFor();
  assert.deepEqual((await requestFor(qa.id)).bridgeApproval, qa.bridgeApproval,
    "Resume replay retains the question identity and its draft");
  assert.deepEqual((await requestFor(qb.id)).bridgeApproval, qb.bridgeApproval,
    "The other thread's replay also retains its question identity");
  assert.equal(
    await card(qa).locator("[data-question-stop-name]").textContent(),
    "Add a fixture note",
  );
  assert.equal(await custom(qa).inputValue(), "A retained note");
  await card(qa)
    .getByRole("button", { name: "Back", exact: true })
    .click();
  assert.equal(await custom(qa).inputValue(), "A custom choice");
  await card(qa).locator(".justify-end > button:last-child").click();
  const buttonBefore = await card(qa).locator(".justify-end > button:last-child").boundingBox();
  const beforeQuestion = (await responses()).length;
  await arm({
    id: "question-failure",
    action: "respond",
    phase: "before",
    reject: true,
    instanceId: qa.bridgeApproval.instanceId,
  });
  await card(qa).locator(".justify-end > button:last-child").click();
  await held("question-failure");
  assert.equal(await card(qa).getAttribute("aria-busy"), "true");
  const buttonBusy = await card(qa).locator(".justify-end > button:last-child").boundingBox();
  assert.equal(buttonBefore.width, buttonBusy.width);
  assert.equal(buttonBefore.height, buttonBusy.height);
  metrics.questionSubmit = {
    width: buttonBusy.width,
    height: buttonBusy.height,
  };
  await card(qa).locator(".justify-end > button:last-child").dispatchEvent("click");
  await card(qa)
    .locator(".justify-end > button:last-child")
    .dispatchEvent("keydown", { key: "Enter", repeat: true });
  const pendingCalls = await app.evaluate(
    (_, instanceId) =>
      globalThis.approvalUiFixture.records.filter(
        (record) =>
          record.action === "respond" &&
          record.expected?.instanceId === instanceId,
      ),
    qa.bridgeApproval.instanceId,
  );
  assert.equal(pendingCalls.length, 1);
  assert.equal(pendingCalls[0].dispatched, false);
  assert.equal((await responses()).length, beforeQuestion);
  await release("question-failure");
  await card(qa)
    .locator("[role=alert]")
    .filter({ hasText: "Isolated pre-dispatch rejection" })
    .waitFor();
  assert.equal(await custom(qa).inputValue(), "A retained note");
  await screenshot("question-retained-after-failure.png");
  await card(qa).locator(".justify-end > button:last-child").click();
  await card(qa).waitFor({ state: "detached" });
  const questionResponse = (await awaitResponses(beforeQuestion + 1)).at(
    -1,
  ).wire;
  assert.deepEqual(questionResponse, {
    id: qa.id,
    result: {
      answers: {
        choice: { answers: ["A custom choice"] },
        notes: { answers: ["A retained note"] },
      },
    },
  });
  await card(malformed).locator("[role=alert]").waitFor();
  assert.equal(
    (await responses()).some((row) => row.wire.id === malformed.id),
    false,
  );
  await control({ op: "resolve", id: malformed.id });
  await card(malformed).waitFor({ state: "detached" });
  checks.push(
    "Malformed question schema displays a non-submittable error card without crashing the App or blocking a valid request; question card, footer, button and actual Other grid metrics preserve the scoped source geometry",
  );
  const background = await emit(
    rawRequest("question-background", "question", threadA, {
      questions: [questions[1]],
    }),
  );
  await custom(background).fill("Background retained note");
  await arm({
    id: "background-failure",
    action: "respond",
    phase: "before",
    reject: true,
    instanceId: background.bridgeApproval.instanceId,
  });
  await card(background).locator(".justify-end > button:last-child").click();
  await held("background-failure");
  await select(threadB);
  await card(qb).waitFor();
  const errorBefore = await page.locator(".composer-error").allTextContents();
  await release("background-failure");
  assert.deepEqual(
    await page.locator(".composer-error").allTextContents(),
    errorBefore,
  );
  assert.equal(await card(qb).locator("[role=alert]").count(), 0);
  assert.equal(await custom(qb).inputValue(), "B separate choice");
  await card(qb).locator(".justify-end > button:last-child").click();
  await card(qb).waitFor({ state: "detached" });
  await select(threadA);
  await card(background).locator("[role=alert]").waitFor();
  assert.equal(
    await custom(background).inputValue(),
    "Background retained note",
  );
  await control({ op: "resolve", id: background.id });
  checks.push(
    "Questions retain identity and per-session choice/custom text/page across real resume replays A→B→A and Other→normal→Other; busy duplicate events dispatch once; pre-dispatch failure preserves a complete single-valued draft for retry; late background failure cannot alter the visible session's error or draft",
  );

  const secret = await emit(
    rawRequest("secret-memory-only", "question", threadA, {
      questions: [
        {
          id: "private",
          header: "Private fixture value",
          question: "Enter a synthetic private value",
          isOther: false,
          isSecret: true,
          options: null,
        },
      ],
    }),
  );
  assert.equal(await custom(secret).getAttribute("type"), "password");
  const secretMarker = "SYNTHETIC_PRIVATE_VALUE_NOT_A_CREDENTIAL";
  await custom(secret).fill(secretMarker);
  await select(threadB);
  await select(threadA);
  // Only length is asserted/reported, never the synthetic secret's value.
  assert.equal(
    await custom(secret).evaluate((node) => node.value.length),
    secretMarker.length,
  );
  await control({ op: "resolve", id: secret.id });
  await card(secret).waitFor({ state: "detached" });
  assert.equal(
    (await responses()).some((row) => row.wire.id === secret.id),
    false,
  );
  checks.push(
    "A synthetic secret uses a password control, survives session switching in memory, and is cleared on exact resolution without being submitted, logged or captured in a screenshot",
  );

  for (const [kind, actionName, result] of [
    ["command", "accept", { decision: "accept" }],
    ["command", "acceptForSession", { decision: "acceptForSession" }],
    ["file", "decline", { decision: "decline" }],
    ["file", "acceptForSession", { decision: "acceptForSession" }],
    [
      "permissions",
      "allow",
      { permissions: { network: { enabled: true } }, scope: "turn" },
    ],
    ["permissions", "deny", { permissions: {}, scope: "turn" }],
  ]) {
    const request = await emit(
      rawRequest(`mapping-${kind}-${actionName}`, kind),
    );
    const before = (await responses()).length;
    await action(request, actionName);
    await card(request).waitFor({ state: "detached" });
    const response = (await awaitResponses(before + 1)).at(-1).wire;
    assert.deepEqual(response, { id: request.id, result });
  }
  const restricted = await emit(
    rawRequest("restricted-question", "question", threadA, {
      questions: [{ ...questions[0], isOther: false }],
    }),
  );
  assert.equal(await custom(restricted).count(), 0);
  const beforeInvalid = (await responses()).length;
  for (const answers of [
    { choice: { answers: ["invented"] } },
    { choice: { answers: ["First", "Second"] } },
    { unknown: { answers: ["First"] } },
  ]) {
    const result = await call("respond", {
      id: restricted.id,
      expected: restricted.bridgeApproval,
      answers,
    });
    assert.equal(result.error.code, "invalid_response");
  }
  assert.equal((await responses()).length, beforeInvalid);
  await card(restricted)
    .locator(".gap-0\\.75 > button")
    .filter({ hasText: "First fixture option" })
    .click();
  await card(restricted).locator(".justify-end > button:last-child").click();
  await card(restricted).waitFor({ state: "detached" });
  checks.push(
    "Real IPC preserves command/file decisions and turn-only permission grant/deny payloads with no bridge fields; question mapping rejects unknown IDs, disallowed Other and multi-valued answers before writing",
  );

  const broken = await emit(rawRequest("pipe-break"));
  const beforePipe = (await responses()).length;
  const processCount = (await lines("approval-processes.jsonl")).length;
  await control({ op: "break-stdin" });
  await waitFor(
    () =>
      app.evaluate(() =>
        globalThis.approvalUiFixture.events.some(
          (event) => event.method === "fixture/stdin-closed",
        ),
      ),
    "Fixture did not close its actual stdin pipe",
  );
  const pipeResult = await call("respond", {
    id: broken.id,
    expected: broken.bridgeApproval,
    decision: "decline",
  });
  assert.ok(pipeResult.ok || pipeResult.error?.code === "transport_error");
  await waitFor(
    () =>
      app.evaluate(
        (_, connectionId) =>
          globalThis.approvalUiFixture.events.some(
            (event) =>
              event.kind === "approval-invalidated" &&
              event.connectionId === connectionId,
          ),
        broken.bridgeApproval.connectionId,
      ),
    "Pipe error did not invalidate the approval connection",
  );
  await card(broken).waitFor({ state: "detached" });
  await page.waitForTimeout(250);
  assert.equal((await responses()).length, beforePipe);
  assert.equal(
    (await lines("approval-processes.jsonl")).length,
    processCount,
    "A pipe failure must not automatically reconnect or retry an approval",
  );
  await reconnect();
  const afterPipe = await emit(rawRequest("after-pipe"));
  await action(afterPipe, "decline");
  await awaitResponses(beforePipe + 1);
  const natural = await emit(rawRequest("natural-disconnect"));
  await control({ op: "exit" });
  await card(natural).waitFor({ state: "detached" });
  await waitFor(
    () =>
      app.evaluate(
        (_, connectionId) =>
          globalThis.approvalUiFixture.events.some(
            (event) =>
              event.kind === "approval-invalidated" &&
              event.connectionId === connectionId,
          ),
        natural.bridgeApproval.connectionId,
      ),
    "Natural exit did not invalidate pending approvals",
  );
  await reconnect();
  assert.deepEqual((await snapshot()).pending, []);
  checks.push(
    "A real broken stdin pipe invalidates the connection with zero response delivery and no automatic retry/reconnect; explicit reconnect restores operation, and natural server exit clears its pending card",
  );
  assert.deepEqual(rendererErrors, []);
  await screenshot("completed.png");
} catch (error) {
  failure = error;
  // Password controls are masked. No DOM HTML, input values or response dumps
  // are captured on failure; reports contain only nonsecret assertion details.
  if (page) await screenshot("failure.png").catch(() => {});
} finally {
  if (app) {
    hostRecords = await app
      .evaluate(() => globalThis.approvalUiFixture?.records || [])
      .catch(() => []);
    await app
      .evaluate(() => globalThis.approvalUiFixture?.restore())
      .catch(() => {});
    await app.close().catch((error) => {
      failure ||= error;
    });
  }
  const report = {
    passed: !failure,
    fixture: true,
    at: new Date().toISOString(),
    startedAt,
    build,
    runtime,
    profile,
    checks,
    metrics,
    screenshots,
    rendererErrors,
    hostRecords,
    responseCount: (await responses()).length,
    ...(failure ? { error: failure.stack || String(failure) } : {}),
  };
  await fs.writeFile(
    path.join(directory, "report.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  await fs.writeFile(
    path.join(evidence, "approval-transport-ui-test.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      {
        passed: report.passed,
        build,
        checks,
        screenshots,
        error: report.error,
      },
      null,
      2,
    ),
  );
}
if (failure) throw failure;
