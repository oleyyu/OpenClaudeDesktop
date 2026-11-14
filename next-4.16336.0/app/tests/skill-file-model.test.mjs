import test from 'node:test';
import assert from 'node:assert/strict';
import { skillFilePreview, skillSourceLines, skillFieldLabel, skillFileIsLarge } from '../src/skill-file-model.mjs';

test('large-file fallback observes UTF-8 bytes and a separate explicit row resource cap', () => {
  assert.equal(skillFileIsLarge('a'.repeat(204800)), false);
  assert.equal(skillFileIsLarge('a'.repeat(204801)), true);
  assert.equal(skillFileIsLarge('字'.repeat(68266)+'aa'), false);
  assert.equal(skillFileIsLarge('字'.repeat(68267)), true);
  assert.equal(skillFileIsLarge('\n'.repeat(9999)), false);
  assert.equal(skillFileIsLarge('\n'.repeat(10000)), true);
  const source = '---\ndescription: x\n---\n'+'a'.repeat(204801);
  assert.deepEqual(skillFilePreview(source), { structured: false, fields: [], content: source });
});

test('SKILL metadata hides existing description/name, preserves body and formats nested metadata in order', () => {
  const text = '---\nname: Example\ndescription: |\n  multi-line description\nuser-invocable: false\nargument-hint: hi\nmetadata:\n  author: Jane\n  tags: [code, review]\nallowed-tools: [Read, Edit]\n---\n\n# Body\n\n**Text**\n';
  assert.deepEqual(skillFilePreview(text), { structured: true, fields: [
    { key: 'author', value: 'Jane' }, { key: 'tags', value: 'code,review' }, { key: 'allowed-tools', value: 'Read,Edit' },
  ], content: '# Body\n\n**Text**' });
  assert.equal(skillFieldLabel('allowed-tools'), 'Allowed Tools');
});

test('description-only frontmatter is structured but name-only and invalid YAML remain normal Markdown', () => {
  assert.deepEqual(skillFilePreview('---\ndescription: Available above\n---\n# Body\n'), { structured: true, fields: [], content: '# Body' });
  for (const content of ['# Ordinary', '---\nname: example\n---\n# Body', '---\ninvalid: [\n---\n# Body', '---\n- a\n- b\n---\n# Body']) {
    assert.deepEqual(skillFilePreview(content), { structured: false, fields: [], content });
  }
});

test('null/empty metadata disappears; boolean and zero values survive, object arrays are JSON', () => {
  assert.deepEqual(skillFilePreview('---\nempty: null\nblank: " "\nzero: 0\nfalse: false\nlist: [{a: 1}]\n---\nx').fields,
    [{ key: 'zero', value: '0' }, { key: 'false', value: 'false' }, { key: 'list', value: '[{"a":1}]' }]);
});

test('aliases, recursive objects, unsafe keys and HTML are data without prototype pollution', () => {
  const parsed = skillFilePreview('---\ndescription: x\nmetadata: &self\n  again: *self\n  author: "<img onerror=x>"\n__proto__:\n  skfPolluted: yes\n---\n<script>alert(1)</script>');
  assert.equal(parsed.structured, true);
  assert.deepEqual(parsed.fields, [{ key: 'author', value: '<img onerror=x>' }, { key: 'skfPolluted', value: 'yes' }]);
  assert.equal({}.skfPolluted, undefined);
});

test('deep metadata and excessive alias expansion fall back to complete content', () => {
  const text = '---\na: &a [1, 2]\nb: [' + Array(100).fill('*a').join(',') + ']\n---\nBody';
  assert.deepEqual(skillFilePreview(text), { structured: false, fields: [], content: text });
  const deep = '---\ndescription: x\n'+Array.from({length:50},(_,i)=>'  '.repeat(i)+'level:').join('\n')+'  value\n---\nBody';
  assert.equal(skillFilePreview(deep).structured, false);
});

test('raw mode keeps CRLF, whitespace, leading blank lines and final empty line exactly', () => {
  for (const source of ['', '\n', '\r\n# Hi\r\n\r\n', '  x  \n\t\n', 'a\rb']) assert.equal(skillSourceLines(source).join('\n'), source);
  assert.deepEqual(skillSourceLines('a\n'), ['a', '']);
});
