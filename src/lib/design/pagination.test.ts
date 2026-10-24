import assert from 'node:assert/strict';
import test from 'node:test';
import { paginationItems } from './pagination.ts';

test('short ranges list every page', () => {
	assert.deepEqual(paginationItems(1, 1), [1]);
	assert.deepEqual(paginationItems(2, 5), [1, 2, 3, 4, 5]);
	assert.deepEqual(paginationItems(4, 7), [1, 2, 3, 4, 5, 6, 7]);
});

test('long ranges keep first, last, current and neighbours', () => {
	assert.deepEqual(paginationItems(1, 60), [1, 2, 'gap', 60]);
	assert.deepEqual(paginationItems(5, 60), [1, 'gap', 4, 5, 6, 'gap', 60]);
	assert.deepEqual(paginationItems(60, 60), [1, 'gap', 59, 60]);
	assert.deepEqual(paginationItems(3, 60), [1, 2, 3, 4, 'gap', 60]);
});

test('unknown or invalid totals render no page buttons', () => {
	assert.deepEqual(paginationItems(1, 0), []);
	assert.deepEqual(paginationItems(99, 3), [1, 2, 3]);
});
