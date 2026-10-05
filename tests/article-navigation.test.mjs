import test from 'node:test';
import assert from 'node:assert/strict';
import { readingState, articleNavigation } from '../article-navigation.js';

test('reading progress clamps to the article and activates the last section at the end', () => {
  const headings = [300, 1300, 2250];
  assert.deepEqual(readingState(0, 800, 150, 2600, headings), {progress: 0, active: 0});
  assert.deepEqual(readingState(975, 800, 150, 2600, headings), {progress: .5, active: 0});
  assert.equal(readingState(1300, 800, 150, 2600, headings).active, 1);
  assert.deepEqual(readingState(1800, 800, 150, 2600, headings), {progress: 1, active: 2});
  assert.deepEqual(readingState(2000, 800, 150, 2600, headings), {progress: 1, active: 2});
  assert.deepEqual(readingState(150, 800, 150, 500, [300]), {progress: 1, active: 0});
});
test('the margin navigator keeps every heading destination and escapes author text', () => {
  const headings = ['motivation','one','two','three'].map(id => ['', id, 'A < B & C']);
  const html = articleNavigation(headings, 'sample post');
  for (const [, id] of headings) assert.ok(html.includes(`#blogs/sample%20post/${id}`));
  assert.ok(html.includes('A &lt; B &amp; C'));
  assert.ok(!html.includes('A < B & C'));
  assert.equal(articleNavigation(headings.slice(0,2), 'short'), '');
});
