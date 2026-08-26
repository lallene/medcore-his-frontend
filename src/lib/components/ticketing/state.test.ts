import assert from 'node:assert/strict';
import test from 'node:test';
import { allowedNext, statusLabels } from './state.ts';
test('closed tickets cannot resume without reopen', () =>
	assert.deepEqual(allowedNext('CLOSED'), []));
test('resolved ticket supports explicit reopen', () =>
	assert.deepEqual(allowedNext('RESOLVED'), ['CLOSED', 'REOPENED']));
test('labels cover waiting states', () =>
	assert.equal(statusLabels.WAITING_USER, 'Attente utilisateur'));
