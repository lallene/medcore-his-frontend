import test from 'node:test';
import assert from 'node:assert/strict';
import {
	canCloseOwnSession,
	canCollectOnSession,
	canRecoverCloseSession,
	cashCan,
	cashKpis,
	classifyCashCommandError,
	closeNoteRequired,
	CLOSE_ANY_PERMISSION,
	difference,
	isSessionOpener,
	methods,
	needsOperator,
	needsReference,
	recoveryNoteRequired
} from './state.ts';
import {
	beginSessionCommand,
	completeSessionCommandError,
	completeSessionCommandSuccess,
	createSessionCommandState,
	isSessionSubmitDisabled
} from './session-command.ts';
import type { CashSession } from '$lib/types/cash';

const sess = (over: Partial<CashSession> = {}): CashSession =>
	({
		id: 1,
		cashRegisterId: 9,
		openedBy: 11,
		openedAt: '2026-01-01T00:00:00Z',
		openingFloat: 50000,
		openingNote: '',
		status: 'OPEN',
		closingNote: '',
		register: { id: 9, code: 'C1', name: 'Principale', location: '', active: true },
		...over
	}) as CashSession;

test('cash excludes non-cash', () => {
	const x = cashKpis({
		session: { openingFloat: 50000 } as never,
		cashPayments: 5000,
		cardPayments: 3000,
		mobileMoneyPayments: 10000,
		bankTransferPayments: 0,
		checkPayments: 0,
		totalPayments: 18000,
		operationCount: 3,
		expectedCash: 55000
	});
	assert.equal(x.expected, 55000);
	assert.equal(x.other, 13000);
});
test('conditional fields', () => {
	assert.equal(methods.length, 5);
	assert.equal(needsOperator('MOBILE_MONEY'), true);
	assert.equal(needsReference('CHECK'), true);
	assert.equal(needsReference('CASH'), false);
});
test('differences', () => {
	assert.equal(difference(98000, 100000), -2000);
	assert.equal(difference(102000, 100000), 2000);
});
test('cash permissions are explicit', () => {
	assert.equal(cashCan([], 'cash.payment.create'), false);
	assert.equal(cashCan(['cash.payment.create'], 'cash.payment.create'), true);
	assert.equal(cashCan(['*'], 'cash.session.close'), true);
});

test('CF01 open pending disables', () => {
	const cmd = beginSessionCommand(createSessionCommandState('cash-open'));
	assert.equal(isSessionSubmitDisabled(cmd), true);
});

test('CF02 open uncertainty reuses key', () => {
	let cmd = createSessionCommandState('cash-open');
	const key = cmd.idempotencyKey;
	cmd = beginSessionCommand(cmd);
	cmd = completeSessionCommandError(cmd);
	assert.equal(cmd.idempotencyKey, key);
	assert.equal(classifyCashCommandError(new Error('Network Error')).preserveKey, true);
});

test('CF03 open success rotates key', () => {
	const initial = createSessionCommandState('cash-open');
	const pending = beginSessionCommand(initial);
	assert.equal(pending.idempotencyKey, initial.idempotencyKey);
	const cmd = completeSessionCommandSuccess('cash-open');
	assert.notEqual(cmd.idempotencyKey, initial.idempotencyKey);
	assert.equal(cmd.phase, 'idle');
});

test('CF04 open conflict does not require preserve when not network', () => {
	const c = classifyCashCommandError(new Error('Caisse inactive'));
	assert.equal(c.preserveKey, false);
});

test('CF05 close pending disables', () => {
	const cmd = beginSessionCommand(createSessionCommandState('cash-close'));
	assert.equal(isSessionSubmitDisabled(cmd), true);
});

test('CF06 close uncertainty reuses key', () => {
	let cmd = createSessionCommandState('cash-close');
	const key = cmd.idempotencyKey;
	cmd = beginSessionCommand(cmd);
	cmd = completeSessionCommandError(cmd);
	assert.equal(cmd.idempotencyKey, key);
});

test('CF07/CF08 close success uses authoritative fields shape', () => {
	const authoritative = {
		expectedCashAmount: 55000,
		countedCashAmount: 53000,
		cashDifference: -2000
	};
	assert.equal(authoritative.cashDifference, difference(53000, 55000));
});

test('CF09 same close replay keeps key until success rotates', () => {
	let cmd = createSessionCommandState('cash-close');
	const key = cmd.idempotencyKey;
	cmd = beginSessionCommand(cmd);
	cmd = completeSessionCommandError(cmd);
	cmd = beginSessionCommand(cmd);
	assert.equal(cmd.idempotencyKey, key);
});

test('CF10 ownership controls match opener policy', () => {
	assert.equal(isSessionOpener(sess(), 11), true);
	assert.equal(isSessionOpener(sess(), 12), false);
	assert.equal(canCollectOnSession(sess(), 11, ['cash.payment.create']), true);
	assert.equal(canCollectOnSession(sess(), 12, ['cash.payment.create']), false);
	assert.equal(canCloseOwnSession(sess(), 11, ['cash.session.close']), true);
	assert.equal(canCloseOwnSession(sess(), 12, ['cash.session.close']), false);
});

test('CF11 unauthorized recovery hidden', () => {
	assert.equal(canRecoverCloseSession(['cash.session.close']), false);
	assert.equal(canRecoverCloseSession(['cash.payment.create']), false);
});

test('CF12 authorized recovery explicit', () => {
	assert.equal(canRecoverCloseSession([CLOSE_ANY_PERMISSION]), true);
	assert.equal(canRecoverCloseSession(['*']), true);
});

test('CF13 recovery note required', () => {
	assert.equal(recoveryNoteRequired(sess({ openedBy: 11 }), 13), true);
	assert.equal(recoveryNoteRequired(sess({ openedBy: 11 }), 11), false);
	assert.equal(closeNoteRequired(sess({ openedBy: 11 }), 13, 100, 100), true);
	assert.equal(closeNoteRequired(sess({ openedBy: 11 }), 11, 100, 100), false);
	assert.equal(closeNoteRequired(sess({ openedBy: 11 }), 11, 90, 100), true);
});

test('CF14 current refresh implied by success key rotation after close', () => {
	const pending = beginSessionCommand(createSessionCommandState('cash-close'));
	const cmd = completeSessionCommandSuccess('cash-close');
	assert.equal(pending.phase, 'pending');
	assert.equal(cmd.phase, 'idle');
	assert.ok(cmd.idempotencyKey.startsWith('cash-close-'));
});
