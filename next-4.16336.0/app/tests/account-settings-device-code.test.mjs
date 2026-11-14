import test from "node:test";
import assert from "node:assert/strict";
import { accountSettingsPlan, signInOptions } from "../src/account-settings-model.mjs";
import { allCores } from "../electron/core-registry.mjs";
import { dictionary } from "../electron/i18n/index.mjs";

// Settings › Account for a bridge core that signs in with a device code only (the ACP bridge's Kimi and MiniMax,
// descriptor login.deviceCode). The plan must carry those options so the page renders a Sign in row (and, while
// waiting, the user code with Open browser / Cancel sign-in); dropping them leaves "Not signed in" with no way in.
const deviceCodeCores = () => allCores().filter((core) => core.login?.deviceCode?.length && core.id !== "deepseek" && core.id !== "codex");

test("every device-code core gets a bridge plan with its device-code options", () => {
  const cores = deviceCodeCores();
  assert.ok(cores.some((core) => core.id === "kimi") && cores.some((core) => core.id === "minimax"), "Kimi and MiniMax sign in with a device code");
  for (const core of cores) {
    for (const snapshot of [null, { account: null, requiresOpenaiAuth: true }]) {
      const plan = accountSettingsPlan(snapshot, { engine: core.engine });
      assert.equal(plan.kind, "bridge", `${core.id}: bridge plan`);
      assert.deepEqual(plan.deviceCode, [...core.login.deviceCode], `${core.id}: device-code options reach the page`);
      assert.ok(plan.deviceCode.every((option) => (option.type || "chatgptDeviceCode") === "chatgptDeviceCode"), `${core.id}: the type account/login/start accepts`);
      assert.equal(plan.name, core.name);
    }
    // A boot.core object resolves the same way as the engine id.
    assert.deepEqual(accountSettingsPlan(null, { engine: { engine: core.engine } }).deviceCode, [...core.login.deviceCode], `${core.id}: boot.core form`);
    assert.deepEqual(signInOptions(core.engine).deviceCode, [...core.login.deviceCode]);
  }
});

test("a device-code-only core is never left with no sign-in control", () => {
  for (const core of allCores()) {
    if (!core.login || core.id === "deepseek" || core.id === "codex") continue;
    const plan = accountSettingsPlan(null, { engine: core.engine });
    const controls = plan.browser.length + plan.deviceCode.length + plan.apiKey.length;
    // A core may deliberately offer none (keys live in its own config), but one that lists device codes must keep them.
    if (core.login.deviceCode?.length) assert.ok(controls >= core.login.deviceCode.length, `${core.id}: sign-in rows`);
  }
});

test("the device-code row's copy is translated", () => {
  const zh = dictionary("zh-CN");
  for (const text of ["Shows a code to enter on the sign-in page.", "Enter this code on the sign-in page.", "Finish signing in in your browser.", "Sign-in code", "Open browser", "Cancel sign-in", "Sign in"])
    assert.ok(Object.hasOwn(zh, text), text);
  for (const core of deviceCodeCores()) for (const option of core.login.deviceCode) assert.ok(Object.hasOwn(zh, option.label), `${core.id}: ${option.label}`);
});
