import test from 'node:test';
import assert from 'node:assert/strict';
import { codeCommentFinding, directivePriority, parseAssistantDirective, rewriteAssistantDirectives } from '../src/assistant-directives-model.mjs';

test('parseAssistantDirective reads quoted, single-quoted and bare values, with backslash quotes only when asked', () => {
  const comment = parseAssistantDirective('::code-comment{title="Keep \\"x}\\" literal" start=3 file=\'/a b\'} tail', { backslash: true });
  assert.equal(comment.name, 'code-comment');
  assert.deepEqual(comment.attributes, { title: 'Keep "x}" literal', start: '3', file: '/a b' });
  assert.equal(comment.raw, '::code-comment{title="Keep \\"x}\\" literal" start=3 file=\'/a b\'}');
  assert.equal(parseAssistantDirective('::git-push{cwd="/repo\\"}').attributes.cwd, '/repo\\', 'literal mode: the quote closes');
  assert.equal(parseAssistantDirective('::git-push prose'), null, '{ must follow the name');
  assert.equal(parseAssistantDirective('::::git-push{cwd=x}'), null, 'at most three colons');
  assert.equal(parseAssistantDirective('::a{x=1 x=2}'), null, 'duplicate keys');
  assert.equal(parseAssistantDirective('::a{x="open'), null);
});

test('codeCommentFinding follows the TUI: title/body/file required, priority from the title or the attribute, path relative to cwd', () => {
  const directive = parseAssistantDirective('::code-comment{title="Bug" body="b" file="/repo/src/x.js" start=12 end=4 priority=P2}', { backslash: true });
  assert.deepEqual(codeCommentFinding(directive, '/repo/'), { title: 'Bug', body: 'b', file: '/repo/src/x.js', display: 'src/x.js', start: 12, end: 12, priority: 2 });
  const titled = parseAssistantDirective('::code-comment{title="[P0] Crash" body="b" file="x.js" priority=3}', { backslash: true });
  assert.equal(codeCommentFinding(titled).priority, 0);
  assert.equal(codeCommentFinding(titled).title, 'Crash');
  assert.equal(codeCommentFinding(parseAssistantDirective('::code-comment{title="t" file="x"}')), null);
  assert.equal(codeCommentFinding(parseAssistantDirective('::code-comment{title="t" body="b" file="x" priority=7}')).priority, null);
});

test('rewriteAssistantDirectives turns findings into items, hides git receipts and leaves code alone', () => {
  const text = [
    'Findings:',
    '::code-comment{title="[P1] SQL injection" body="Input reaches \\"query\\"." file="/repo/src/db.js" start=10 end=12 confidence=0.5}',
    '```',
    '::code-comment{title="x" body="y" file="/z"}',
    '```',
    'Kept `::git-push{cwd="/r"}` inline.',
    '::git-stage{cwd="/repo"} ::git-commit{cwd="/repo"}',
    '::git-create-pr{cwd="/repo" branch="fix" url="https://github.com/o/r/pull/7"}',
  ].join('\n');
  assert.equal(rewriteAssistantDirectives(text, { cwd: '/repo' }), [
    'Findings:',
    '- [P1](#codex-priority-1) **SQL injection** — [src/db.js:10-12](<file:///repo/src/db.js#L10-L12>)',
    '  Input reaches "query".',
    '```',
    '::code-comment{title="x" body="y" file="/z"}',
    '```',
    'Kept `::git-push{cwd="/r"}` inline.',
    '',
    '<https://github.com/o/r/pull/7>',
  ].join('\n'));
  assert.equal(rewriteAssistantDirectives('plain text'), 'plain text');
  assert.equal(rewriteAssistantDirectives('Done.\n::git-push{cwd="/r" branch="b"}\n'), 'Done.', 'trailing receipts leave no blank tail');
});

test('while streaming an unfinished directive on the last line is held back', () => {
  assert.equal(rewriteAssistantDirectives('Hi\n::code-comment{title="a" bo', { streaming: true }), 'Hi');
  assert.equal(rewriteAssistantDirectives('Done ::git-push{cwd="/r', { streaming: true }), 'Done');
  assert.equal(rewriteAssistantDirectives('Done ::git-push{cwd="/r'), 'Done ::git-push{cwd="/r', 'a finished reply shows it as written');
});

test('directivePriority reads only the badge links', () => {
  assert.equal(directivePriority('#codex-priority-2'), 2);
  assert.equal(directivePriority('#codex-priority-9'), null);
  assert.equal(directivePriority('https://x'), null);
});
