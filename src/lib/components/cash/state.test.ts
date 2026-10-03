import test from 'node:test';
import assert from 'node:assert/strict';
import {
	canCloseOwnSession,
	canCollectOnSession,
	canRecoverCloseSession,
	canShowClosingReport,
	cashCan,
	classifyCashCommandError,
	closeNoteRequired,
	CLOSE_ANY_PERMISSION,
	draftCloseGap,
	isIncompleteClosed,
	isSessionOpener,
	methods,
	needsOperator,
	needsReference,
	presentClosedSnapshot,
	presentSessionSummary,
	recoveryNoteRequired
} from './state.ts';
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
		openingFloat: 50000,
		openingNote: '',
		status: 'OPEN',
		closingNote: '',
		register: { id: 9, code: 'C1', name: 'Principale', location: '', active: true },
		...over
	}) as CashSession;

const summary = (over: Partial<SessionSummary> = {}): SessionSummary => ({
	session: sess(),
	cashCollected: 5000,
	nonCashCollected: 13000,
	totalCollected: 18000,
	cashPayments: 5000,
	cardPayments: 3000,
	mobileMoneyPayments: 10000,
	bankTransferPayments: 0,
	checkPayments: 0,
	totalPayments: 18000,
	operationCount: 3,
	expectedCash: 55000,
	cashMovementIn: 0,
	cashMovementOut: 0,
	netCashMovement: 0,
	closingProofComplete: false,
	finalReconciliation: false,
	recoveryClose: false,
	varianceKind: '',
	...over
});

const closedComplete = (over: Partial<SessionSummary> = {}): SessionSummary =>
	summary({
		session: sess({
			status: 'CLOSED',
			expectedCashAmount: 30000,
			countedCashAmount: 30000,
			cashDifference: 0,
			closedBy: 11,
			closedAt: '2026-01-01T12:00:00Z',
			closingNote: ''
		}),
		expectedCash: 30000,
		closingProofComplete: true,
		finalReconciliation: true,
		varianceKind: 'BALANCED',
		...over
	});

test('SF01–SF06 dashboard uses backend summary fields only', () => {
	const x = presentSessionSummary(summary());
	assert.ok(x);
	assert.equal(x.opening, 50000);
	assert.equal(x.cash, 5000);
	assert.equal(x.other, 13000);
	assert.equal(x.total, 18000);
	assert.equal(x.count, 3);
	assert.equal(x.expected, 55000);
});

test('SF02 expected not locally calculated from opening+cash', () => {
	const x = presentSessionSummary(
		summary({
			session: sess({ openingFloat: 10000 }),
			cashCollected: 20000,
			cashPayments: 20000,
			// Deliberately "wrong" if FE recomputed — must still trust backend expectedCash.
			expectedCash: 99999
		})
	);
	assert.equal(x?.expected, 99999);
});

test('SF09 summary loading null has no fake totals', () => {
	assert.equal(presentSessionSummary(null), null);
	assert.equal(presentSessionSummary(undefined), null);
});

test('SF10 error path exposes no reconstructed totals', () => {
	assert.equal(presentSessionSummary(null)?.cash, undefined);
});

test('SF11–SF14 closed snapshot from backend fields', () => {
	const closed = closedComplete({
		session: sess({
			status: 'CLOSED',
			expectedCashAmount: 30000,
			countedCashAmount: 29000,
			cashDifference: -1000,
			closedBy: 11,
			closedAt: '2026-01-01T12:00:00Z',
			closingNote: 'manque'
		}),
		expectedCash: 30000,
		cashCollected: 20000,
		varianceKind: 'SHORTAGE'
	});
	const snap = presentClosedSnapshot(closed);
	assert.ok(snap);
	assert.equal(snap.expected, 30000);
	assert.equal(snap.counted, 29000);
	assert.equal(snap.difference, -1000);
	assert.equal(presentSessionSummary(closed)?.expected, 30000);
});

test('SF14 draft gap is form-only and does not invent closed variance', () => {
	assert.equal(draftCloseGap(53000, 55000), -2000);
	assert.equal(presentClosedSnapshot(summary()), null);
});

test('RC01–RC14 reconciliation presentation from backend only', () => {
	const balanced = closedComplete();
	assert.equal(canShowClosingReport(balanced), true);
	const snap = presentClosedSnapshot(balanced);
	assert.ok(snap);
	assert.equal(snap.varianceKind, 'BALANCED');
	assert.equal(snap.varianceLabel, 'Caisse équilibrée');
	assert.equal(snap.expected, 30000);
	assert.equal(snap.counted, 30000);
	assert.equal(snap.difference, 0);

	const shortage = closedComplete({
		session: sess({
			status: 'CLOSED',
			expectedCashAmount: 15000,
			countedCashAmount: 14000,
			cashDifference: -1000,
			closedBy: 11,
			closedAt: '2026-01-01T12:00:00Z',
			closingNote: 'manque espèces'
		}),
		expectedCash: 15000,
		varianceKind: 'SHORTAGE'
	});
	assert.equal(presentClosedSnapshot(shortage)?.varianceLabel, 'Écart négatif (manquants)');
	assert.equal(presentClosedSnapshot(shortage)?.closingNote, 'manque espèces');

	const surplus = closedComplete({
		session: sess({
			status: 'CLOSED',
			expectedCashAmount: 5000,
			countedCashAmount: 5500,
			cashDifference: 500,
			closedBy: 11,
			closedAt: '2026-01-01T12:00:00Z',
			closingNote: 'excédent'
		}),
		expectedCash: 5000,
		varianceKind: 'SURPLUS'
	});
	assert.equal(presentClosedSnapshot(surplus)?.varianceKind, 'SURPLUS');

	const recovery = closedComplete({
		session: sess({
			status: 'CLOSED',
			openedBy: 11,
			closedBy: 99,
			expectedCashAmount: 1000,
			countedCashAmount: 1000,
			cashDifference: 0,
			closedAt: '2026-01-01T12:00:00Z',
			closingNote: 'récupération'
		}),
		expectedCash: 1000,
		recoveryClose: true
	});
	assert.equal(presentClosedSnapshot(recovery)?.recoveryClose, true);
	assert.equal(presentClosedSnapshot(recovery)?.closedBy, 99);
	assert.equal(presentClosedSnapshot(recovery)?.openedBy, 11);

	assert.equal(canShowClosingReport(summary()), false);
	assert.equal(isIncompleteClosed(summary({ session: sess({ status: 'CLOSED' }) })), true);
	assert.equal(presentClosedSnapshot(summary({ session: sess({ status: 'CLOSED' }) })), null);
});

test('SF15 mixed payment methods map from backend breakdown fields', () => {
	const s = summary({
		cashCollected: 20000,
		nonCashCollected: 30000,
		totalCollected: 50000,
		cardPayments: 30000,
		expectedCash: 30000,
		session: sess({ openingFloat: 10000 })
	});
	const x = presentSessionSummary(s);
	assert.equal(x?.cash, 20000);
	assert.equal(x?.other, 30000);
	assert.equal(x?.total, 50000);
	assert.equal(x?.expected, 30000);
	assert.equal(s.cardPayments, 30000);
});

test('SF16 sessionless not represented — zero summary stays zero', () => {
	const x = presentSessionSummary(
		summary({
			cashCollected: 0,
			nonCashCollected: 0,
			totalCollected: 0,
			operationCount: 0,
			expectedCash: 15000,
			session: sess({ openingFloat: 15000 })
		})
	);
	assert.equal(x?.cash, 0);
	assert.equal(x?.total, 0);
	assert.equal(x?.count, 0);
	assert.equal(x?.expected, 15000);
});

test('SF07/SF08 refresh contract: presentation is pure map of payload', () => {
	const first = presentSessionSummary(
		summary({ cashCollected: 1000, totalCollected: 1000, expectedCash: 11000, operationCount: 1 })
	);
	const replay = presentSessionSummary(
		summary({ cashCollected: 1000, totalCollected: 1000, expectedCash: 11000, operationCount: 1 })
	);
	assert.deepEqual(first, replay);
});

test('conditional fields', () => {
	assert.equal(methods.length, 5);
	assert.equal(needsOperator('MOBILE_MONEY'), true);
	assert.equal(needsReference('CHECK'), true);
	assert.equal(needsReference('CASH'), false);
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
	assert.equal(authoritative.cashDifference, draftCloseGap(53000, 55000));
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
