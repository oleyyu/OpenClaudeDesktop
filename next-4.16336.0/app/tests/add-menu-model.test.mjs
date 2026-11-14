import test from "node:test";
import assert from "node:assert/strict";
import { addConnectorsEntry, addPluginsEntry } from "../src/add-menu-model.mjs";

const row = (name, kind) => ({ id: name, name, title: name, kind });
const types = (entry) => entry.items.map((item) => `${item.type}${item.row ? `:${item.row.name}` : ""}`);

// ca80fca8d jN re (:12093-12290).
test("Connectors: loading row, plain Manage row, or the submenu with connected, reconnect and connecting rows", () => {
  assert.deepEqual(addConnectorsEntry({ rows: [], status: "loading" }), { kind: "loading" });
  assert.deepEqual(addConnectorsEntry({ rows: [], status: "ready" }), { kind: "manage" });
  assert.deepEqual(addConnectorsEntry({ rows: [row("down", "unreachable"), row("idle", "notStarted")], status: "ready" }), { kind: "manage" },
    "servers that are not connected are left out (`!r.isConnected`)");
  const entry = addConnectorsEntry({ rows: [row("auth", "signIn"), row("live", "connected"), row("wait", "connecting")], status: "loading" });
  assert.equal(entry.kind, "submenu");
  assert.deepEqual(types(entry), ["link:live", "reconnect:auth"], "rows first, then reconnects; connecting servers are only counted");
  assert.equal(entry.reconnectCount, 1);
  assert.deepEqual(types(addConnectorsEntry({ rows: [row("wait", "connecting")], status: "loading" })), ["connecting"], "only connecting → 'Connecting…'");
});

test("Connectors: a switchable connector stays listed whatever its status (local on/off)", () => {
  const settings = { off: { enabled: false, editable: true }, live: { enabled: true, editable: true } };
  const entry = addConnectorsEntry({ rows: [row("off", "disabled"), row("live", "connected"), row("auth", "signIn")], settingFor: (r) => settings[r.name] ?? null });
  assert.deepEqual(types(entry), ["toggle:off", "toggle:live", "reconnect:auth"]);
  assert.equal(entry.items[0].setting.enabled, false);
});

// ca80fca8d jN oe (:12313-12440).
test("Plugins: submenu with plugin skills, a skeleton while loading, else a plain Add plugins row", () => {
  assert.deepEqual(addPluginsEntry({ loading: true, groups: [{ id: "p" }] }), { kind: "submenu" }, "rows already loaded win over loading");
  assert.deepEqual(addPluginsEntry({ loading: true, status: "loading", groups: [] }), { kind: "loading" });
  assert.deepEqual(addPluginsEntry({ status: "ready", groups: [] }), { kind: "add" }, "on this device (Es 'local', not 'org'): 'Add plugins'");
  assert.deepEqual(addPluginsEntry({ status: "error", groups: [] }), { kind: "hidden" }, "a core without a plugin list shows nothing");
});
