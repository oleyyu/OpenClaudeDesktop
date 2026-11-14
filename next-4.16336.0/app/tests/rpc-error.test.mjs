import test from "node:test";
import assert from "node:assert/strict";
import { rpcResult } from "../src/rpc-error.mjs";
import { isNotSteerable } from "../src/queued-messages-model.mjs";

test("a core JSON-RPC error survives IPC with its code and CodexErrorInfo", () => {
  const value = { __codeDesktopRpcError: { message: "No active turn to steer.", code: -32600, data: { codexErrorInfo: "activeTurnNotSteerable" } } };
  let caught;
  try { rpcResult(value); } catch (error) { caught = error; }
  assert.ok(caught instanceof Error);
  assert.equal(caught.message, "No active turn to steer.");
  assert.equal(caught.code, -32600);
  assert.deepEqual(caught.data, { codexErrorInfo: "activeTurnNotSteerable" });
  assert.equal(isNotSteerable(caught), true);
});

test("ordinary results pass through untouched", () => {
  const result = { data: [], nextCursor: null };
  assert.equal(rpcResult(result), result);
  assert.equal(rpcResult(null), null);
  assert.deepEqual(rpcResult({}), {});
  assert.throws(() => rpcResult({ __codeDesktopRpcError: { code: -32601 } }), (error) => error.code === -32601 && error.data === null && error.message === "The request failed.");
});
