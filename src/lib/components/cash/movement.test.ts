import test from 'node:test';
import assert from 'node:assert/strict';
import {
	canShowCreateMovement,
	canShowMovementJournal,
	classifyMovementError,
	movementCopyIsSafe,
	MOVEMENT_CREATE_PERMISSION,
	MOVEMENT_IN_LABEL,
	MOVEMENT_OUT_LABEL,
	movementTypeForDirection,
	validateMovementAmount,
	validateMovementReason,
	warnOutExceedsExpected
} from './movement.ts';
import { presentSessionSummary } from './state.ts';
import {
	beginSessionCommand,
	completeSessionCommandError,
	completeSessionCommandSuccess,
	createSessionCommandState,
	isSessionSubmitDisabled
} from './session-command.ts';
import type { CashSession, SessionSummary } from '$lib/types/cash';

const sess = (over: Partial<CashSession> = {}): CashSession =>
	({
		id: 1,
		cashRegisterId: 9,
		openedBy: 11,
		openedAt: '2026-01-01T00:00:00Z',
		openingFloat: 10000,
		openingNote: '',
		status: 'OPEN',
		closingNote: '',
		register: { id: 9, code: 'C1', name: 'Principale', location: '', active: true },
		...over
	}) as CashSession;

const summary = (over: Partial<SessionSummary> = {}): SessionSummary => ({
	session: sess(),
	cashCollected: 5000,
	nonCashCollected: 0,
	totalCollected: 5000,
	cashPayments: 5000,
	cardPayments: 0,
	mobileMoneyPayments: 0,
	bankTransferPayments: 0,
	checkPayments: 0,
	totalPayments: 5000,
	operationCount: 1,
	expectedCash: 17000,
	cashMovementIn: 3000,
	cashMovementOut: 1000,
	netCashMovement: 2000,
	closingProofComplete: false,
	finalReconciliation: false,
	recoveryClose: false,
	varianceKind: '',
	...over
});

test('CMF01 create permission gate', () => {
	assert.equal(canShowCreateMovement(sess(), [MOVEMENT_CREATE_PERMISSION]), true);
	assert.equal(canShowCreateMovement(sess(), ['*']), true);
});

test('CMF02 unauthorized / closed hidden', () => {
	assert.equal(canShowCreateMovement(sess(), ['cash.movement.read']), false);
	assert.equal(
		canShowCreateMovement(sess({ status: 'CLOSED' }), [MOVEMENT_CREATE_PERMISSION]),
		false
	);
	assert.equal(canShowCreateMovement(null, [MOVEMENT_CREATE_PERMISSION]), false);
});

test('CMF03 IN form labels and type', () => {
	assert.equal(MOVEMENT_IN_LABEL, 'Entrée de caisse');
	assert.equal(movementTypeForDirection('IN'), 'MANUAL_IN');
});

test('CMF04 OUT form labels and type', () => {
	assert.equal(MOVEMENT_OUT_LABEL, 'Sortie de caisse');
	assert.equal(movementTypeForDirection('OUT'), 'MANUAL_OUT');
});

test('CMF05 reason mandatory', () => {
	assert.equal(validateMovementReason('').ok, false);
	assert.equal(validateMovementReason('  ').ok, false);
	assert.equal(validateMovementReason('ab').ok, false);
	const ok = validateMovementReason('  Apport fonds  ');
	assert.equal(ok.ok, true);
	if (ok.ok) assert.equal(ok.reason, 'Apport fonds');
});

test('CMF06 amount validation', () => {
	assert.equal(validateMovementAmount(0).ok, false);
	assert.equal(validateMovementAmount(-1).ok, false);
	assert.equal(validateMovementAmount(1.5).ok, false);
	assert.equal(validateMovementAmount(100).ok, true);
});

test('CMF07 pending disabled', () => {
	let cmd = createSessionCommandState('cash-move');
	cmd = beginSessionCommand(cmd);
	assert.equal(isSessionSubmitDisabled(cmd), true);
});

test('CMF08 uncertainty reuses key', () => {
	let cmd = createSessionCommandState('cash-move');
	cmd = beginSessionCommand(cmd);
	const key = cmd.idempotencyKey;
	cmd = completeSessionCommandError(cmd);
	assert.equal(cmd.idempotencyKey, key);
	assert.equal(cmd.phase, 'error');
});

test('CMF09 success rotates key (refresh caller)', () => {
	const cmd = createSessionCommandState('cash-move');
	const before = cmd.idempotencyKey;
	const after = completeSessionCommandSuccess('cash-move');
	assert.notEqual(after.idempotencyKey, before);
	assert.equal(after.phase, 'idle');
	assert.equal(beginSessionCommand(cmd).phase, 'pending');
});

test('CMF10 no refund wording', () => {
	assert.equal(movementCopyIsSafe(MOVEMENT_IN_LABEL), true);
	assert.equal(movementCopyIsSafe(MOVEMENT_OUT_LABEL), true);
	assert.equal(movementCopyIsSafe('Remboursement patient'), false);
	assert.equal(movementCopyIsSafe('Paiement espèces'), false);
});

test('CMF11–CMF15 summary maps movements separately; collections unchanged', () => {
	const x = presentSessionSummary(summary());
	assert.ok(x);
	assert.equal(x.cash, 5000);
	assert.equal(x.total, 5000);
	assert.equal(x.movementIn, 3000);
	assert.equal(x.movementOut, 1000);
	assert.equal(x.netMovement, 2000);
	assert.equal(x.expected, 17000);
	// Deliberately inconsistent if FE recomputed expected
	const y = presentSessionSummary(
		summary({
			cashCollected: 5000,
			cashMovementIn: 999,
			cashMovementOut: 1,
			expectedCash: 42
		})
	);
	assert.ok(y);
	assert.equal(y.expected, 42);
	assert.equal(y.cash, 5000);
	assert.equal(y.movementIn, 999);
});

test('CMF16 reconciliation fields present for read', () => {
	assert.equal(canShowMovementJournal(['cash.movement.read']), true);
	assert.equal(canShowMovementJournal([]), false);
});

test('OUT warn soft only', () => {
	assert.ok(warnOutExceedsExpected('OUT', 100, 50));
	assert.equal(warnOutExceedsExpected('IN', 100, 50), null);
	assert.equal(warnOutExceedsExpected('OUT', 50, 50), null);
});

test('classify movement closed / permission', () => {
	const closed = classifyMovementError(new Error('Session CLOSED'));
	assert.match(closed.message, /ferm/i);
	const perm = classifyMovementError(new Error('FORBIDDEN'));
	assert.match(perm.message, /autorisation/i);
});
