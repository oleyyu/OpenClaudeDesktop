import test from "node:test";
import assert from "node:assert/strict";
import { parseOrdinaryUserSegments as parse, userCodeDisplayText, USER_SEGMENT_LIMITS } from "../src/user-segments-model.mjs";

const visible = (text) => parse(text).segments.filter(segment => segment.kind === "code" || segment.text);
const codes = (text) => visible(text).filter(segment => segment.kind === "code");

test("ordinary user prose stays literal, while canonical input and raw ranges are lossless", () => {
  const input = '  @person **bold** `inline` [site](javascript:alert(1))\n  # heading  ';
  const result = parse(input);
  assert.equal(result.canonicalText, input);
  assert.equal(result.segments.length, 1);
  assert.equal(result.segments[0].text, input.trim());
  assert.equal(result.segments[0].raw, input);
});

test("five requested language samples split without interpreting ordinary Markdown or adding controls", () => {
  const samples = [['js','const n = 1;'],['ts','type User = {name:string};'],['json','{"ok":true}'],
    ['python','def greet():\n    return "hi"'],['bash','echo "hello"']];
  const input = 'Reply with these samples:\n' + samples.map(([language, code]) => `\`\`\`${language}\n${code}\n\`\`\``).join('\n') + '\nDone.';
  const result = visible(input);
  assert.equal(result[0].text, 'Reply with these samples:');
  assert.deepEqual(result.filter(s => s.kind === 'code').map(s => [s.language,s.text]), samples);
  assert.equal(result.at(-1).text, 'Done.');
  assert.equal(parse(input).segments.map(s => s.raw).join(''), input);
});

test("unclosed fences, tildes, info-string spaces, nested and indented inner fences stay text", () => {
  for (const input of ['```js\nlet x = 1;', '~~~js\nx\n~~~', '```js title\nx\n```',
    'before\n  ```js\nx\n  ```', '> ```js\n> x\n> ```', '```js\r\nx\r\n```']) {
    assert.equal(codes(input).length, 0, input);
    assert.equal(parse(input).segments.map(s => s.raw).join(''), input);
  }
  // Source trims outside whitespace before splitting; this is not indentation support.
  assert.equal(codes('  ```js\nx\n```  ')[0].text, 'x');
});

test("closing boundary is exact, but source greedy backtracking can leave opening ticks in language", () => {
  assert.equal(codes('```js\nx\n````').length, 0);
  assert.deepEqual(codes('````js\nx\n```').map(s => [s.delimiterLength,s.language,s.text]), [[3,'`js','x']]);
  assert.equal(codes('```js\nx\n``` trailing').length, 0);
  assert.equal(codes('```js\nx\n``` \t\nnext')[0].text, 'x');
  assert.equal(codes('````js\nx\n```\ny\n````')[0].text, 'x\n```\ny');
});

test("source requires a body boundary LF even for empty fences and preserves code whitespace", () => {
  assert.equal(codes('```\n```').length, 0);
  assert.equal(codes('```\n\n```')[0].text, '');
  const block = codes('```\n\tx  \n\n\n```')[0];
  assert.equal(block.text, '\tx  \n\n');
  assert.equal(userCodeDisplayText(block.text), '\tx  \n');
  assert.equal(userCodeDisplayText('a\r\nb\r\n'), 'a\r\nb');
  assert.equal(userCodeDisplayText('a\rb\r'), 'a␍b␍');
});

test("closed prior blocks remain eligible when later text contains an open fence", () => {
  const text = '```js\nconst first = 1;\n```\n\n```py\nprint(';
  const result = visible(text);
  assert.equal(result.length, 2);
  assert.equal(result[0].kind, 'code');
  assert.equal(result[1].text, '```py\nprint(');
});

test("multiline anchors keep their exact CR/Unicode behavior without normalizing stored text", () => {
  for (const breakBefore of ['\r', '\u2028', '\u2029']) {
    const input = `before${breakBefore}\`\`\`js\nx\n\`\`\`${breakBefore}after`;
    assert.equal(codes(input)[0].text, 'x');
    assert.equal(parse(input).segments.map(s => s.raw).join(''), input);
  }
  assert.equal(codes('```js\nx\r```').length, 0);
  assert.equal(codes('```js\nx\r\n```')[0].text, 'x\r');
  assert.equal(userCodeDisplayText(codes('```js\nx\r\n```')[0].text), 'x␍');
});

test("UTF-16 offsets include emoji/Unicode and preserve HTML-looking payload as data", () => {
  const input = '😀 中文\n```html\n<script>alert(1)</script>\n<img onerror=x>\n```\n끝';
  const result = parse(input), code = result.segments.find(s => s.kind === 'code');
  assert.equal(code.start, input.indexOf('```'));
  assert.equal(input.slice(code.bodyStart,code.bodyEnd), code.text);
  assert.equal(code.text, '<script>alert(1)</script>\n<img onerror=x>');
  let position = 0;
  for (const segment of result.segments) {
    assert.equal(segment.start, position);
    assert.equal(segment.raw, input.slice(segment.start,segment.end));
    position = segment.end;
  }
  assert.equal(position, input.length);
});

test("unsupported serialized context is not stripped or promoted into invented attachment UI", () => {
  for (const input of ['<!-- attach: x -->\n> secret\n```js\nx\n```',
    'In `a.js` at line 3:\n```js\nx\n```', '<!-- reply -->\n> quoted']) {
    const result = parse(input);
    assert.equal(result.fallback, 'context-metadata');
    assert.equal(result.segments[0].text, input);
  }
});

test("resource bounds fall back to the complete original message rather than a partial parse", () => {
  const oversized = 'x'.repeat(USER_SEGMENT_LIMITS.maxCodeUnits + 1);
  assert.equal(parse(oversized).fallback, 'input-limit');
  assert.equal(parse(oversized).segments[0].text, oversized);
  const many = Array.from({length:USER_SEGMENT_LIMITS.maxFences+1},(_,i)=>`\`\`\`js\n${i}\n\`\`\``).join('\n');
  assert.equal(parse(many).fallback, 'fence-limit');
  assert.equal(parse(many).segments[0].raw, many);
  const adversarial = '`'.repeat(100_000) + '\nno closing fence';
  assert.equal(codes(adversarial).length, 0);
  assert.equal(parse(adversarial).segments[0].raw, adversarial);
});
