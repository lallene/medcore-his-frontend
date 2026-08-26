import assert from 'node:assert/strict';
import test from 'node:test';
import { finalizeQASummaryTests, type QASummaryAttempt } from './summary.ts';

function attempt(
	partial: Partial<QASummaryAttempt> &
		Pick<QASummaryAttempt, 'id' | 'key' | 'status' | 'retryCount'>
): QASummaryAttempt {
	return {
		suite: 'ticketing',
		title: `${partial.key} sample`,
		duration: 100,
		error: partial.status === 'FAILED' ? 'boom' : null,
		artifacts: [],
		...partial
	};
}

test('initial FAIL + retry PASS → one final PASS entry', () => {
	const tests = finalizeQASummaryTests([
		attempt({
			id: 't1',
			key: 'QA-TKT-1',
			status: 'FAILED',
			retryCount: 0,
			duration: 50,
			error: 'first'
		}),
		attempt({
			id: 't1',
			key: 'QA-TKT-1',
			status: 'PASSED',
			retryCount: 1,
			duration: 80,
			error: null,
			artifacts: [{ type: 'TRACE', name: 'trace', location: 'a.zip' }]
		})
	]);
	assert.equal(tests.length, 1);
	assert.equal(tests[0].status, 'PASSED');
	assert.equal(tests[0].retryCount, 1);
	assert.equal(tests[0].duration, 80);
	assert.equal(tests[0].error, null);
	assert.deepEqual(tests[0].artifacts, [{ type: 'TRACE', name: 'trace', location: 'a.zip' }]);
});

test('initial FAIL + retry FAIL → one final FAIL entry', () => {
	const tests = finalizeQASummaryTests([
		attempt({ id: 't1', key: 'QA-TKT-2', status: 'FAILED', retryCount: 0, error: 'first' }),
		attempt({
			id: 't1',
			key: 'QA-TKT-2',
			status: 'FAILED',
			retryCount: 1,
			error: 'second',
			duration: 120
		})
	]);
	assert.equal(tests.length, 1);
	assert.equal(tests[0].status, 'FAILED');
	assert.equal(tests[0].retryCount, 1);
	assert.equal(tests[0].error, 'second');
	assert.equal(tests[0].duration, 120);
});

test('test without retry keeps a single entry', () => {
	const tests = finalizeQASummaryTests([
		attempt({ id: 't1', key: 'QA-TKT-3', status: 'PASSED', retryCount: 0, duration: 42 })
	]);
	assert.equal(tests.length, 1);
	assert.equal(tests[0].status, 'PASSED');
	assert.equal(tests[0].retryCount, 0);
	assert.equal(tests[0].duration, 42);
});

test('distinct tests keep separate entries even with the same QA key', () => {
	const tests = finalizeQASummaryTests([
		attempt({ id: 'a', key: 'QA-DUP-1', status: 'PASSED', retryCount: 0 }),
		attempt({ id: 'b', key: 'QA-DUP-1', status: 'FAILED', retryCount: 0 })
	]);
	assert.equal(tests.length, 2);
	assert.equal(tests[0].key, 'QA-DUP-1');
	assert.equal(tests[1].key, 'QA-DUP-1');
});
