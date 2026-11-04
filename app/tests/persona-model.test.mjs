import test from "node:test";
import assert from "node:assert/strict";
import { normalizePersona, validatePersona, PERSONA_DEFAULT, isSparkImage } from "../electron/prefs/persona.mjs";
import { settingsPatch } from "../electron/preferences.mjs";
import { assistantName, escapeRegExp, getPersona, setPersona, subscribe } from "../src/persona-store.mjs";
import { approvalAnnouncement, approvalCardModel } from "../src/approval-card-model.mjs";
import { responseHeading } from "../src/transcript-feed-nav.mjs";

const PNG = "data:image/png;base64,iVBORw0KGgo=";
const command = params => ({ id: 7, method: "item/commandExecution/requestApproval", params });

test("validate: whole object, trimmed strings, null resets, strict errors", () => {
  assert.equal(validatePersona(null), null);
  assert.deepEqual(validatePersona({}), { ...PERSONA_DEFAULT });
  assert.deepEqual(validatePersona({ assistantName: "  Ada " }),
    { assistantName: "Ada", sparkIcon: "spark", sparkImage: "" });
  // W14-code r5 cleanup R5DC-01: the home greeting template is gone; a `greeting` from an older preferences.json is
  // dropped on write instead of failing the whole save.
  assert.deepEqual(validatePersona({ assistantName: "Ada", greeting: " Hi {name}! " }), { assistantName: "Ada", sparkIcon: "spark", sparkImage: "" });
  for (const bad of [[], "x", 3, { assistantName: "x".repeat(41) }, { assistantName: "<b>" }, { assistantName: "a\nb" },
    { sparkIcon: "crab" }, { sparkIcon: "custom" },
    { sparkImage: "data:image/gif;base64,AAAA" }, { sparkImage: "data:image/png;base64," + "A".repeat(350001) }, { extra: 1 }])
    assert.throws(() => validatePersona(bad), Error, JSON.stringify(bad).slice(0, 40));
  assert.deepEqual(validatePersona({ sparkIcon: "custom", sparkImage: PNG }).sparkIcon, "custom");
  assert.equal(isSparkImage("data:image/svg+xml;base64,PHN2Zz4="), true);
});

test("normalize is lenient: bad fields fall back; custom without image is spark", () => {
  assert.deepEqual(normalizePersona(undefined), { ...PERSONA_DEFAULT });
  assert.deepEqual(normalizePersona({ assistantName: 7, greeting: "x".repeat(500), sparkIcon: "custom", sparkImage: "nope" }), { ...PERSONA_DEFAULT });
  assert.equal("greeting" in normalizePersona({ greeting: "Hi {name}" }), false, "R5DC-01: an old greeting is ignored on read");
  assert.deepEqual(normalizePersona({ assistantName: "Ada", sparkIcon: "star" }), { ...PERSONA_DEFAULT, assistantName: "Ada", sparkIcon: "star" });
});

test("settingsPatch stores, replaces and resets the persona key", () => {
  const saved = settingsPatch({ displayName: "x" }, { persona: { assistantName: "Ada", sparkIcon: "lightning" } });
  assert.deepEqual(saved.persona, { assistantName: "Ada", sparkIcon: "lightning", sparkImage: "" });
  assert.equal(saved.displayName, "x");
  assert.equal("persona" in settingsPatch(saved, { persona: null }), false);
  assert.throws(() => settingsPatch({}, { persona: { assistantName: "<x>" } }));
  assert.deepEqual(settingsPatch(saved, { theme: "dark" }).persona, saved.persona);
});

test("store: default copy is byte-identical; a name flows into titles, headings and the announcement", () => {
  setPersona(undefined);
  assert.equal(assistantName(), "DeepSeek");
  assert.equal(approvalCardModel(command({ command: "ls" })).title, "Allow DeepSeek to run?");
  assert.equal(responseHeading("Done. More."), "DeepSeek responded: Done.");
  let calls = 0; const off = subscribe(() => calls++);
  setPersona({ assistantName: "Ada (bot)" });
  setPersona({ assistantName: "Ada (bot)" }); // unchanged → no second notification
  assert.equal(calls, 1);
  assert.equal(getPersona().assistantName, "Ada (bot)");
  const model = approvalCardModel(command({ command: "ls" }));
  assert.equal(model.title, "Allow Ada (bot) to run?");
  assert.equal(approvalAnnouncement(model), "Permission requested: run. ls");
  const heading = approvalCardModel(command({ command: "ls" }), { type: "commandExecution", command: "ls", description: "List" });
  assert.equal(heading.title, "Allow Ada (bot) to run List?");
  assert.equal(approvalCardModel(command({ kind: "writeStdin" })).title, "Allow Ada (bot) to send input to this terminal?");
  assert.equal(responseHeading("Done. More."), "Ada (bot) responded: Done.");
  assert.equal(escapeRegExp("a.b(c)"), "a\\.b\\(c\\)");
  off(); setPersona(null);
  assert.equal(assistantName(), "DeepSeek");
});

test("desktop notification bodies use a valid persona name and fall back to the running core's assistant", async () => {
  const { EventEmitter } = await import("node:events");
  const { default: desktop } = await import("../electron/desktop-settings.cjs");
  const bodies = name => {
    const config = { threadIds: ["t"], archivedThreadIds: [], keepAwake: false, persona: { assistantName: name } }, seen = [];
    class Notice extends EventEmitter { static isSupported() { return true; } constructor(options) { super(); seen.push(options.body); } show() {} close() {} }
    const win = new EventEmitter(); win.isFocused = () => false;
    const service = desktop.createDesktopSettings({ app: { dock: { setBadge() {}, bounce() {} } }, powerMonitor: Object.assign(new EventEmitter(), { isOnBatteryPower: () => false }),
      powerSaveBlocker: { start: () => 1, stop() {} }, Notification: Notice, getConfig: () => config, getClient: () => ({ request: async () => ({}) }),
      sessionOperations: {}, save() {}, emit() {}, getWindow: () => win, gitStatus: async () => ({}) });
    service.observe({ method: "turn/started", params: { threadId: "t", turn: { id: "a" } } });
    service.observe({ method: "turn/completed", params: { threadId: "t", turn: { id: "a", status: "completed" } } });
    service.observe({ kind: "request", method: "item/tool/requestUserInput", params: { threadId: "t" } });
    service.dispose();
    return seen;
  };
  assert.deepEqual(bodies(" Ada "), ["Ada finished and is waiting for your input.", "Ada is asking you to choose between options."]);
  assert.deepEqual(bodies(""), ["DeepSeek finished and is waiting for your input.", "DeepSeek is asking you to choose between options."]);
  assert.equal(bodies("<x>")[0], "DeepSeek finished and is waiting for your input.");
  assert.equal(bodies("x".repeat(41))[0], "DeepSeek finished and is waiting for your input.");
  // Without a persona name the banner names the running core's assistant, not a literal DeepSeek.
  const { setAssistantName } = await import("../electron/i18n/index.mjs");
  try {
    setAssistantName("GLM");
    assert.deepEqual(bodies(""), ["GLM finished and is waiting for your input.", "GLM is asking you to choose between options."]);
    assert.equal(bodies("<x>")[0], "GLM finished and is waiting for your input.");
    assert.equal(bodies(" Ada ")[0], "Ada finished and is waiting for your input.", "a persona name still wins");
  } finally { setAssistantName("DeepSeek"); }
});
