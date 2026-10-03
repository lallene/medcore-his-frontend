import assert from 'node:assert/strict';
import test from 'node:test';
import {
	beginPaymentCommand,
	completePaymentCommandError,
	completePaymentCommandSuccess,
	createPaymentCommandState,
	isPaymentSubmitDisabled,
	simulatePaymentSubmitKeys
} from './payment-command.ts';

test('F01 Encaisser disabled while request pending', () => {
	const idle = createPaymentCommandState('k1');
	assert.equal(isPaymentSubmitDisabled(idle), false);
	const pending = beginPaymentCommand(idle);
	assert.equal(pending.phase, 'pending');
	assert.equal(isPaymentSubmitDisabled(pending), true);
});

test('F02 duplicate click while pending does not mint a second logical key', () => {
	const keys = simulatePaymentSubmitKeys({
		initialKey: 'logical-1',
		clicksWhilePending: 3,
		retryAfterError: false,
		thenNewPaymentAfterSuccess: false
	});
	assert.deepEqual(keys, ['logical-1']);
});

test('F03 retry same logical payment reuses idempotency key', () => {
	let state = createPaymentCommandState('retry-key');
	state = beginPaymentCommand(state);
	state = completePaymentCommandError(state);
	assert.equal(state.idempotencyKey, 'retry-key');
	state = beginPaymentCommand(state);
	assert.equal(state.idempotencyKey, 'retry-key');
	assert.equal(state.phase, 'pending');
});

test('F04 successful new payment receives a new key', () => {
	const pending = beginPaymentCommand(createPaymentCommandState('first-key'));
	assert.equal(pending.idempotencyKey, 'first-key');
	const state = completePaymentCommandSuccess();
	assert.equal(state.phase, 'idle');
	assert.notEqual(state.idempotencyKey, 'first-key');
	assert.ok(state.idempotencyKey.length > 0);
});

test('F05 payment error restores actionable UI and keeps key', () => {
	let state = createPaymentCommandState('err-key');
	state = beginPaymentCommand(state);
	assert.equal(isPaymentSubmitDisabled(state), true);
	state = completePaymentCommandError(state);
	assert.equal(state.phase, 'error');
	assert.equal(isPaymentSubmitDisabled(state), false);
	assert.equal(state.idempotencyKey, 'err-key');
});
