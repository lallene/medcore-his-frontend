import assert from 'node:assert/strict';
import test from 'node:test';
import { assertSafeQARun } from './policy.ts';

test('production refuses destructive suites before Playwright starts', () =>
	assert.throws(() => assertSafeQARun('production', 'full'), /interdites en production/));
test('production allows only its non destructive smoke', () =>
	assert.doesNotThrow(() => assertSafeQARun('production', 'production-smoke')));
