import test from 'node:test';
import assert from 'node:assert/strict';
import { wordDiffRanges, hunkWordRanges, decorateTokens } from '../src/word-diff-model.mjs';

const changed = (text, ranges) => ranges.map(([start, end]) => text.slice(start, end));
test('word-alt highlights actual words and whitespace, not just a character prefix/suffix', () => {
  assert.deepEqual(wordDiffRanges('const count = 1;', 'const count = 2;'), { before: [[14, 15]], after: [[14, 15]] });
  assert.deepEqual(wordDiffRanges('readFile()', 'readFiles()'), { before: [[0, 8]], after: [[0, 9]] });
  assert.deepEqual(wordDiffRanges('a  b', 'a b'), { before: [[1, 3]], after: [[1, 2]] });
  assert.deepEqual(wordDiffRanges('hello world', 'hello new world'), { before: [], after: [[6, 10]] });
});
test('one-character internal neutral regions join word-alt emphasis, but final neutral text remains plain', () => {
  assert.deepEqual(wordDiffRanges('a+b+c', 'x+y+c'), { before: [[0, 3]], after: [[0, 3]] });
  assert.deepEqual(wordDiffRanges('old;', 'new;'), { before: [[0, 3]], after: [[0, 3]] });
  assert.deepEqual(wordDiffRanges('a :: b end', 'x :: y end'), { before: [[0, 1], [5, 6]], after: [[0, 1], [5, 6]] });
});
test('source length cap includes exactly 1000 UTF-16 units, and Unicode decorations do not split surrogate pairs', () => {
  assert.deepEqual(wordDiffRanges('😀 hi', '😃 hi'), { before: [[0, 2]], after: [[0, 2]] });
  const text = 'éclair 中文';
  assert.deepEqual(changed(text, wordDiffRanges(text, 'éclairs 中字').before), ['éclair', '文']);
  assert.deepEqual(wordDiffRanges('a'.repeat(1000), 'b'.repeat(1000)), { before: [[0, 1000]], after: [[0, 1000]] });
  assert.deepEqual(wordDiffRanges('a'.repeat(1001), 'b'), { before: [], after: [] });
  assert.deepEqual(wordDiffRanges('', 'x'), { before: [], after: [[0, 1]] });
  assert.deepEqual(wordDiffRanges('x', ''), { before: [[0, 1]], after: [] });
});
test('only corresponding changed rows pair; context and hunk boundaries isolate edits, notes are not code', () => {
  const rows = [
    { type: 'removed', text: 'const a = 1;' }, { type: 'note', text: '\\ No newline at end of file' },
    { type: 'added', text: 'const a = 2;' }, { type: 'added', text: 'entirely new();' },
    { type: 'context', text: 'stable();' }, { type: 'removed', text: 'gone();' },
    { type: 'separator', text: '@@ -30 +30 @@' }, { type: 'added', text: 'unrelated();' },
  ];
  assert.deepEqual(hunkWordRanges(rows), [[[10, 11]], [], [[10, 11]], [], [], [], [], []]);
});
test('syntax and word spans intersect losslessly, retaining each token theme and exact CR/HTML-looking data', () => {
  const light = { color: '#abcdef' }, dark = { color: '#123456' };
  const tokens = [{ text: 'const', light, dark }, { text: ' value\r<script>😀' }];
  const result = decorateTokens(tokens, [[3, 8]]);
  assert.deepEqual(result.map(t => [t.text, t.diff]), [['con', false], ['st', true], [' va', true], ['lue\r<script>😀', false]]);
  assert.equal(result[1].light, light); assert.equal(result[1].dark, dark);
  assert.equal(result.map(t => t.text).join(''), tokens.map(t => t.text).join(''));
});
test('deterministic mixed text corpus keeps ranges ordered, in bounds and every display character intact', () => {
  let seed = 127;
  const alphabet = ['a', 'b', ' ', '\t', '+', ';', 'é', '中', '😀', '\r'];
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
  for (let i = 0; i < 1000; i++) {
    const make = () => Array.from({ length: random() % 25 }, () => alphabet[random() % alphabet.length]).join('');
    const before = make(), after = make(), ranges = wordDiffRanges(before, after);
    for (const [side, text] of [['before', before], ['after', after]]) {
      let last = 0;
      for (const [start, end] of ranges[side]) {
        assert.ok(start >= last && end > start && end <= text.length);
        assert.ok(!(start > 0 && /[\uD800-\uDBFF]/.test(text[start - 1]) && /[\uDC00-\uDFFF]/.test(text[start])));
        assert.ok(!(end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1]) && /[\uDC00-\uDFFF]/.test(text[end])));
        last = end;
      }
      assert.equal(decorateTokens([{ text }], ranges[side]).map(t => t.text).join(''), text);
    }
  }
});
