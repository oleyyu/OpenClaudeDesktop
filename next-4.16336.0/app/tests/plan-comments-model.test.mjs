import test from 'node:test';
import assert from 'node:assert/strict';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import remarkGfm from 'remark-gfm';
import { collectPlanText, nearestOccurrence, normalizePlanText, planCommentOverlaps, planCommentsEnabled, planPopoverPlacement,
  rehypePlanComments, resolvePlanCommentSpans, PLAN_COMMENT_ID } from '../src/plan-comments-model.mjs';
import { planCommentsStore, serializePlanComments } from '../src/inline-comments.mjs';

// B22 A3 (2.31226.0 cccc2cf0a Ah/jh/Mh/kh, cd5a31703 _Te/mT/vTe/wot): plan comments as inline marks over the plan's
// flat text, plan-mode gating and the floating editor's placement.
const hast = (markdown, comments = []) => {
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype).use(rehypePlanComments(comments));
  return processor.runSync(processor.parse(markdown));
};
const marks = (tree) => {
  const found = [];
  const walk = (node) => {
    for (const child of node.children ?? []) {
      if (child.type === 'element' && child.tagName === 'mark') found.push({ id: child.properties[PLAN_COMMENT_ID], text: child.children.map((part) => part.value).join('') });
      walk(child);
    }
  };
  walk(tree);
  return found;
};

test('flat text: every text node in order, skipping <pre> and whitespace between table structure elements', () => {
  const tree = hast('# Plan\n\nStep **one** then two.\n\n```js\nconst code = 1;\n```\n\n| a | b |\n|---|---|\n| c | d |\n');
  const { flat } = collectPlanText(tree);
  assert.ok(flat.startsWith('Plan\nStep one then two.\n'), flat);
  assert.doesNotMatch(flat, /const code/, 'code blocks are not commentable text');
  assert.match(flat, /abcd/, 'cells only, no whitespace from the table structure');
});

test('Ah: a comment wraps its span in mark[data-plan-comment-id], across inline elements', () => {
  const markdown = '# Plan\n\nStep **one** then two.\n';
  const { flat } = collectPlanText(hast(markdown));
  const start = flat.indexOf('one then'), end = start + 'one then'.length;
  const tree = hast(markdown, [{ id: 'c1', quote: 'one then', startOffset: start, endOffset: end }]);
  assert.deepEqual(marks(tree), [{ id: 'c1', text: 'one' }, { id: 'c1', text: ' then' }]);
  assert.equal(collectPlanText(tree).flat, flat, 'marking keeps the flat text');
});

test('Mh: drifted offsets fall back to the nearest occurrence; vanished text is left out', () => {
  assert.equal(nearestOccurrence('a x b x c x', 'x', 7), 6);
  assert.equal(nearestOccurrence('abc', '', 0), -1);
  assert.equal(normalizePlanText('  a\n\tb  '), 'a b');
  const flat = 'Plan\nfix the parser then fix the lexer';
  assert.deepEqual(resolvePlanCommentSpans(flat, [{ id: 'a', quote: 'fix the lexer', startOffset: 2, endOffset: 15 }]), [{ id: 'a', start: 25, end: 38 }]);
  assert.deepEqual(resolvePlanCommentSpans(flat, [{ id: 'b', quote: 'the\nparser', startOffset: 9, endOffset: 19 }]), [{ id: 'b', start: 9, end: 19 }], 'whitespace-normalized match keeps offsets');
  assert.deepEqual(resolvePlanCommentSpans(flat, [{ id: 'c', quote: 'gone', startOffset: 0, endOffset: 4 }]), []);
  const tree = hast('Edit the plan.\n', [{ id: 'z', quote: 'the plan', startOffset: 40, endOffset: 48 }]);
  assert.deepEqual(marks(tree), [{ id: 'z', text: 'the plan' }]);
});

test('_Te: a selection overlapping a comment opens nothing; Xh: comments need plan mode or a pending review', () => {
  const comments = [{ id: 'a', startOffset: 10, endOffset: 20 }];
  assert.equal(planCommentOverlaps(comments, 0, 10), false);
  assert.equal(planCommentOverlaps(comments, 19, 25), true);
  assert.equal(planCommentOverlaps(comments, 20, 30), false);
  assert.equal(planCommentsEnabled({ permission: 'plan' }), true);
  assert.equal(planCommentsEnabled({ pendingReview: true, permission: 'ask' }), true);
  assert.equal(planCommentsEnabled({ permission: 'acceptEdits' }), false);
  assert.equal(planCommentsEnabled(), false);
});

test('mT/vTe: the store keeps the offsets; the feedback lists comments in plan order', () => {
  const id = planCommentsStore.add('b22', { quote: 'later', text: 'second', startOffset: 30, endOffset: 35 });
  planCommentsStore.add('b22', { quote: 'early', text: 'first', startOffset: 2, endOffset: 7 });
  planCommentsStore.add('b22', { quote: 'bad', text: 'kept without offsets', startOffset: 5, endOffset: 5 });
  const list = planCommentsStore.get('b22');
  assert.equal(list[0].id, id);
  assert.deepEqual([list[0].startOffset, list[0].endOffset], [30, 35]);
  assert.equal('startOffset' in list[2], false, 'an empty span carries no offsets');
  assert.equal(serializePlanComments(list), 'On selected text:\n> early\nfirst\n\nOn selected text:\n> later\nsecond\n\nOn selected text:\n> bad\nkept without offsets');
  planCommentsStore.clear('b22');
});

test('wot placement: below the last line, above the first when below does not fit, clamped 8px into the boundary', () => {
  const viewport = { width: 1000, height: 800 }, card = { width: 320, height: 60 }, boundary = { top: 100, left: 400, right: 1000, bottom: 700 };
  const first = { top: 200, bottom: 220, left: 500, width: 100 }, last = { top: 240, bottom: 260, left: 450, width: 40 };
  assert.deepEqual(planPopoverPlacement({ first, last, card, boundary, viewport }), { x: 568, y: 268, side: 'below' }, 'x clamped to left + 160 + 8');
  const low = { top: 660, bottom: 680, left: 700, width: 100 };
  assert.deepEqual(planPopoverPlacement({ first: { ...low, top: 640, bottom: 660 }, last: low, card, boundary, viewport }), { x: 750, y: 572, side: 'above' });
  assert.equal(planPopoverPlacement({ first, last, card, boundary, viewport, chosen: 'above' }).y, 132, 'a chosen side sticks');
  assert.deepEqual(planPopoverPlacement({ card, boundary, viewport }), { x: 700, y: 632, side: null }, 'no box: bottom centre of the boundary');
});
