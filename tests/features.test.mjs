import test from 'node:test';
import assert from 'node:assert/strict';
import { initialBoard, openingMoves, judgeOpening } from '../chess-opening.js';
import { routeToy, mixToy, softmax } from '../paper-calculations.js';
import { notebookPage, notebookPost, visiblePosts } from '../notebook.js';

test('the opening board has 32 pieces, all 20 legal moves, and only b3 wins', () => {
  const board = initialBoard();
  assert.equal(Object.keys(board).length, 32);
  assert.equal(board.e1.piece, 'k'); assert.equal(board.d8.piece, 'q');
  const moves = Object.keys(board).flatMap(from => openingMoves(from).map(to => [from, to]));
  assert.equal(moves.length, 20);
  assert.deepEqual(moves.filter(move => judgeOpening(...move)), [['b2', 'b3']]);
  assert.equal(judgeOpening('e2', 'e4'), false);
  assert.equal(judgeOpening('b1', 'c3'), false);
  assert.equal(judgeOpening('b2', 'b5'), null);
  assert.equal(judgeOpening('b7', 'b6'), null);
});

test('routing matches the worked example and transports unscored value features', () => {
  const result = routeToy();
  assert.ok(Math.abs(result.weights[0] - .75) < 1e-6);
  result.output.forEach((x, i) => assert.ok(Math.abs(x - [3, 1, .75, .25][i]) < 1e-5));
  const changed = routeToy({ firstValue: 8 });
  assert.deepEqual(changed.weights, result.weights);
  assert.ok(Math.abs(changed.output[0] - 6) < 1e-5);
  assert.notDeepEqual(routeToy({ rank: 4, firstValue: 8 }).weights, routeToy({ rank: 4 }).weights);
  assert.deepEqual(routeToy({ strength: 0 }).weights, [.5, .5]);
  for (let rank = 1; rank <= 4; rank++) {
    const data = routeToy({ rank });
    assert.equal(data.keys[0].length, rank); assert.equal(data.output.length, 4);
    assert.ok(Math.abs(data.weights.reduce((a, b) => a + b, 0) - 1) < 1e-12);
  }
  assert.throws(() => routeToy({ rank: 5 }), RangeError);
  assert.ok(softmax([1000, 1001]).every(Number.isFinite));
});

test('anchor mixing has independent signed coefficients and optional normalization', () => {
  const result = mixToy();
  assert.ok(Math.abs(result.output[0] - .886396) < 1e-6);
  assert.ok(Math.abs(result.output[1] - .598528) < 1e-6);
  assert.deepEqual(mixToy({ anchorWeight: 0, currentWeight: 1 }).output, [1, -1]);
  assert.deepEqual(mixToy({ anchorWeight: -1, currentWeight: 2, normalize: false }).output, [-1, -6]);
});

test('notebook filters work without exposing drafts or executable supplied text', () => {
  const posts = [
    { slug: 'a', title: 'A', kind: 'idea', date: '2026-09-27', body: [] },
    { slug: 'b', title: 'B', kind: 'note', date: '2026-09-27', draft: true, body: [] },
    { slug: 'c', title: '<img src=x onerror=alert(1)>', date: '2026-09-27', body: [{ type: 'link', url: 'javascript:alert(1)', text: 'bad' }] },
  ];
  assert.equal(visiblePosts(posts).length, 2);
  assert.ok(notebookPage(posts, 'idea').includes('#blogs/a'));
  assert.ok(!notebookPage(posts, 'idea').includes('#blogs/c'));
  assert.ok(!notebookPage(posts).includes('#blogs/b'));
  assert.ok(notebookPage(posts).includes('&lt;img'));
  assert.ok(!notebookPost(posts[2]).includes('javascript:'));
  assert.ok(notebookPage([]).includes('No blogs yet.'));
});
