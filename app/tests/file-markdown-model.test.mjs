import test from 'node:test';
import assert from 'node:assert/strict';
import {
  frontmatterLabel, MARKDOWN_PLAIN_LIMITS, markdownBlockBoundaries, markdownChunkHeight, markdownChunks, markdownFilePlan,
  markdownFileStats, markdownTooSlow, splitFrontmatter,
} from '../src/file-markdown-model.mjs';

// Files viewer Markdown plan (2.2553.1 cd2efac6e Ti/Ci/Lr/Ar/Ur, shared-16 Bx).

// R3-files FT-18 (cov9-01): splitFrontmatter is the generated 2.42304.0 c3fde7009 ki over Li; a list value also carries
// its `items` (read by the gated document variant Ei/wi; the pane shows key and value).
test('Ur: a leading --- block becomes fields and the body; values are flattened to text', () => {
  const skill = [
    '---',
    'name: demo-skill',
    'description: "A \\"quoted\\" demo"',
    "summary: 'it''s fine'",
    'allowed-tools: [Read, Write, "Bash(git:*)"]',
    'tags:',
    '  - one',
    '  - two',
    'notes: |',
    '  line one',
    '  line two',
    'folded: >-',
    '  a',
    '  b',
    'empty: ~',
    'model: sonnet # trailing comment',
    'metadata:',
    '  owner: me',
    '  team: you',
    '---',
    '',
    '# Body',
    '',
  ].join('\n');
  const result = splitFrontmatter(skill);
  assert.equal(result.body, '# Body\n');
  assert.deepEqual(result.fields, [
    { key: 'name', value: 'demo-skill' },
    { key: 'description', value: 'A "quoted" demo' },
    { key: 'summary', value: "it's fine" },
    { key: 'allowed-tools', value: 'Read, Write, Bash(git:*)', items: ['Read', 'Write', 'Bash(git:*)'] },
    { key: 'tags', value: 'one, two', items: ['one', 'two'] },
    { key: 'notes', value: 'line one\nline two\n' },
    { key: 'folded', value: 'a b' },
    { key: 'empty', value: '' },
    { key: 'model', value: 'sonnet' },
    { key: 'metadata', value: 'owner: me\nteam: you' },
  ]);
  assert.equal(splitFrontmatter('# No frontmatter\n'), null);
  assert.equal(splitFrontmatter('---\nname: x\n'), null, 'an unclosed block is body text');
  // CRLF and an empty block.
  assert.deepEqual(splitFrontmatter('---\r\nname: x\r\n---\r\nBody'), { fields: [{ key: 'name', value: 'x' }], body: 'Body' });
  assert.deepEqual(splitFrontmatter('---\n\n---\nBody'), { fields: [], body: 'Body' });
});

test('Ur: unsupported YAML (a duplicate key, a colon in a plain value, a bad escape) keeps the split with no fields', () => {
  for (const block of ['a: 1\na: 2', 'key: a: b', 'key: "\\q"', '- item', 'key: "open']) {
    assert.deepEqual(splitFrontmatter(`---\n${block}\n---\nBody\n`), { fields: [], body: 'Body\n' }, block);
  }
});

test('Oi labels: dashes and underscores read as spaces, first letter capitalised', () => {
  assert.equal(frontmatterLabel('allowed-tools'), 'Allowed tools');
  assert.equal(frontmatterLabel('argument_hint'), 'Argument hint');
  assert.equal(frontmatterLabel('name'), 'Name');
});

test('Lr/Ci: counted characters skip definitions and data-URL images; any limit trips the plain view', () => {
  const stats = markdownFileStats('a|b\n\n[ref]: http://x\n![i](data:image/png;base64,AAAA)\nlast line');
  assert.deepEqual(stats, { chars: 4 + 1 + 10, pipes: 1, longestRun: 9 + 1, longestLine: 9 });
  assert.deepEqual(MARKDOWN_PLAIN_LIMITS, { chars: 524288, pipes: 5000, longestRun: 262144, longestLine: 32768 });
  assert.equal(markdownTooSlow('x'.repeat(32768)), false);
  assert.equal(markdownTooSlow('x'.repeat(32769)), true, 'longest line');
  assert.equal(markdownTooSlow('|'.repeat(5001)), true, 'pipes');
  assert.equal(markdownTooSlow(`${'word '.repeat(6000)}\n`.repeat(9)), true, 'a run of 270 KB without a blank line');
  assert.equal(markdownTooSlow(`${'word '.repeat(6000)}\n\n`.repeat(9)), false, 'blank lines end each run');
  assert.equal(markdownChunkHeight('a\nb'), Math.round(2 * 24 + (3 / 90) * 14));
});

test('Bx/Ar: chunks of at least the limit, cut only at block starts, never before a --- line', () => {
  const doc = '# A\n\npara one\n\n- item\n- item\n\nafter list\n\n```\ncode\n\nstill code\n```\n\n## B\n\nend\n';
  const boundaries = markdownBlockBoundaries(doc);
  assert.deepEqual(boundaries.map((at) => doc.slice(at, at + 5)), ['para ', '- ite', 'after', '```\nc', '## B\n', 'end\n']);
  assert.deepEqual(markdownChunks(doc, 10), ['# A\n\npara one\n\n', '- item\n- item\n\n', 'after list\n\n', '```\ncode\n\nstill code\n```\n\n', '## B\n\nend\n']);
  assert.equal(markdownChunks(doc, 10).join(''), doc);
  assert.deepEqual(markdownChunks('# A\n\npara\n\n---\n\nnext\n', 4), ['# A\n\n', 'para\n\n---\n\n', 'next\n'], 'no cut before ---');
  // Nr: a reference definition, footnote, open raw HTML block, open comment,
  // math block or leading --- keeps one chunk; a plain <div> line does not.
  for (const extra of ['[ref]: http://x', '[^1]: note', '<pre>', '<!-- open', '$$']) {
    assert.equal(markdownChunks(`${doc}\n${extra}\n`, 10).length, 1, extra);
  }
  assert.equal(markdownChunks(`${doc}\n<div>\n`, 10).length, 6);
  assert.equal(markdownChunks(`---\n${doc}`, 10).length, 1);
  assert.deepEqual(markdownChunks('short', 16384), ['short']);
});

test('Ti: Si gates chunking, the frontmatter is split first, and a tripped chunk shows the whole source as plain', () => {
  const entry = (index) => `## v${index}\n\n- change ${index} with enough words to fill a line of text\n\n`;
  let body = '';
  for (let index = 0; body.length < 60000; index++) body += entry(index);
  const source = `---\nname: log\n---\n${body}`;
  const plan = markdownFilePlan(source);
  assert.deepEqual(plan.frontmatter.fields, [{ key: 'name', value: 'log' }]);
  assert.equal(plan.body, body);
  assert.equal(plan.plain, false);
  assert.ok(plan.chunks.length >= 3 && plan.chunks.every((chunk) => chunk.length >= 16384 || chunk === plan.chunks.at(-1)));
  assert.equal(plan.chunks.join(''), body);
  assert.equal(markdownFilePlan(source), plan, 'one-entry cache');
  const small = markdownFilePlan(body.slice(0, 40000));
  assert.equal(small.chunks.length, 1, 'at or below Si: one chunk');
  const tooWide = markdownFilePlan(`# Wide\n\n${'x'.repeat(40000)}\n`);
  assert.deepEqual([tooWide.plain, tooWide.chunks.length], [true, 1]);
});
