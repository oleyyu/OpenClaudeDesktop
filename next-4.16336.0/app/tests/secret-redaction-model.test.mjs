import test from "node:test";
import assert from "node:assert/strict";
import { detectSecrets, maskSecret, maskSecrets, secretLabel, SECRET_PATTERNS, SECRET_SCAN_LIMIT } from "../src/secret-redaction-model.mjs";

// Fixture secrets are assembled at runtime so no literal key sits in the repository.
const hex32 = "0123456789abcdef".repeat(2);
const deepseek = "sk-" + hex32;
const samples = {
  anthropic: "sk-ant-" + "api03_".padEnd(24, "A"),
  openai_proj: "sk-proj-" + "Z".repeat(24),
  openai: deepseek,
  github: "ghp_" + "a1".repeat(12),
  aws: "AKIA" + "ABCDEFGHIJKLMNOP",
  slack: "xoxb-" + "1234567890-abc",
  google: "AIza" + "B".repeat(35),
  stripe: "sk_live_" + "c".repeat(24),
  stripe_webhook: "whsec_" + "d".repeat(24),
  age: "AGE-SECRET-KEY-1" + "Q".repeat(58),
  jwt: "eyJ" + "a".repeat(12) + ".eyJ" + "b".repeat(12) + "." + "c".repeat(12),
  private_key: "-----BEGIN RSA PRIVATE KEY-----\nMIIBOgIBAAJBAKj34GkxFhD9\n-----END RSA PRIVATE KEY-----",
};

test("every ported pattern is detected with its id, including a DeepSeek-style sk-<32 hex> key", () => {
  assert.deepEqual(SECRET_PATTERNS.map((pattern) => pattern.id), Object.keys(samples));
  for (const [id, value] of Object.entries(samples)) {
    const text = `key = "${value}";`;
    const matches = detectSecrets(text);
    assert.equal(matches.length, 1, id);
    assert.deepEqual(matches[0], { start: 7, end: 7 + value.length, value, patternId: id }, id);
  }
  assert.equal(detectSecrets(`DEEPSEEK_API_KEY=${deepseek}`)[0].patternId, "openai");
  assert.equal(secretLabel("openai"), "OpenAI API key");
  assert.equal(secretLabel("private_key"), "private key");
  assert.equal(secretLabel("nope"), "secret");
});

test("the boundary guard rejects keys glued to identifier characters; short look-alikes are ignored", () => {
  assert.deepEqual(detectSecrets("xsk-" + hex32), []);
  assert.deepEqual(detectSecrets("_" + deepseek), []);
  assert.deepEqual(detectSecrets("-" + deepseek), []);
  assert.equal(detectSecrets("(" + deepseek + ")").length, 1);
  assert.deepEqual(detectSecrets("sk-short"), []);
  assert.deepEqual(detectSecrets("const task-ant = 1;"), []);
  assert.deepEqual(detectSecrets(""), []);
  assert.deepEqual(detectSecrets(null), []);
});

test("matches are sorted and overlaps merge; texts over the 262144 cap are not scanned", () => {
  const text = `b=${samples.github} a=${deepseek}`;
  const matches = detectSecrets(text);
  assert.deepEqual(matches.map((match) => match.patternId), ["github", "openai"]);
  assert.ok(matches[0].end <= matches[1].start);
  // sk-ant-… also satisfies the generic sk- shape over a prefix: one merged match.
  const merged = detectSecrets(samples.anthropic);
  assert.equal(merged.length, 1); assert.equal(merged[0].patternId, "anthropic");
  assert.equal(merged[0].end, samples.anthropic.length);
  const capped = deepseek + " ".repeat(SECRET_SCAN_LIMIT);
  assert.deepEqual(detectSecrets(capped), []);
  assert.equal(detectSecrets(deepseek + " ".repeat(SECRET_SCAN_LIMIT - deepseek.length)).length, 1);
});

test("zero-width characters cannot hide a key (shadow scan maps back to raw offsets)", () => {
  const hidden = "sk-0123​456789abcdef0123456789abcdef";
  const text = `x ${hidden} y`;
  const [match] = detectSecrets(text);
  assert.equal(match.start, 2); assert.equal(match.end, 2 + hidden.length);
  assert.equal(match.value, hidden);
});

test("masking keeps 8 characters of a long value, hides short ones, and preserves PEM framing", () => {
  assert.equal(maskSecret(deepseek), "sk-01234" + "•".repeat(deepseek.length - 8));
  assert.equal(maskSecret("AKIAABCD"), "•".repeat(8));
  const pem = maskSecret(samples.private_key);
  assert.ok(pem.startsWith("-----BEGIN RSA PRIVATE KEY-----\n"));
  assert.ok(pem.endsWith("\n-----END RSA PRIVATE KEY-----"));
  assert.ok(!pem.includes("MIIB"));
  assert.equal(pem.split("\n").length, 3);
  const text = `curl -H "Authorization: Bearer ${deepseek}" https://api.deepseek.com`;
  const masked = maskSecrets(text);
  assert.equal(masked.length, text.length);
  assert.ok(!masked.includes(hex32));
  assert.ok(masked.includes("Bearer sk-01234•"));
  assert.equal(maskSecrets("no secrets here"), "no secrets here");
});
