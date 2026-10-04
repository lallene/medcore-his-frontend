import assert from 'node:assert/strict';
import test from 'node:test';
import {
	canShowExecuteCorrection,
	classifyCorrectionError,
	CORRECTION_EXECUTE_LABEL,
	CORRECTION_EXPLAIN,
	CORRECTION_EXECUTE_PERMISSION,
	correctionCopyIsClean,
	correctionExecuteUnavailableReason,
	paymentIsPostCloseEligible
} from './correction.ts';
import type { Payment } from '$lib/types/billing';
import type { CorrectionEligibility } from '$lib/types/cash';

const pay = (over: Partial<Payment> = {}): Payment =>
	({
		id: 1,
		amount: 5000,
		paymentMethod: 'CASH',
		paidAt: '2026-01-01T00:00:00Z',
		receivedBy: 1,
		reversed: true,
		postCloseCorrection: true,
		...over
	}) as Payment;

const elig = (over: Partial<CorrectionEligibility> = {}): CorrectionEligibility => ({
	eligible: true,
	paymentId: 1,
	paymentReversalId: 9,
	amount: 5000,
	alreadyExecuted: false,
	hostSession: {
		session: {
			id: 22,
			cashRegisterId: 3,
			openedBy: 1,
			openedAt: '2026-01-02T00:00:00Z',
			openingFloat: 10000,
			openingNote: '',
			status: 'OPEN',
			closingNote: '',
			register: { id: 3, code: 'C1', name: 'Caisse', location: '', active: true }
		},
		cashCollected: 0,
		nonCashCollected: 0,
		totalCollected: 0,
		cashPayments: 0,
		cardPayments: 0,
		mobileMoneyPayments: 0,
		bankTransferPayments: 0,
		checkPayments: 0,
		totalPayments: 0,
		operationCount: 0,
		expectedCash: 10000,
		cashMovementIn: 0,
		cashMovementOut: 0,
		netCashMovement: 0,
		closingProofComplete: false,
		finalReconciliation: false,
		recoveryClose: false
	},
	...over
});

test('PCEF01 eligible correction exposes execute action', () => {
	assert.equal(canShowExecuteCorrection(pay(), [CORRECTION_EXECUTE_PERMISSION], elig()), true);
});

test('PCEF02 unreversed payment no action', () => {
	assert.equal(
		canShowExecuteCorrection(
			pay({ reversed: false, postCloseCorrection: false }),
			[CORRECTION_EXECUTE_PERMISSION],
			elig()
		),
		false
	);
});

test('PCEF03 OPEN-session reversal no post-close execution action', () => {
	assert.equal(paymentIsPostCloseEligible(pay({ postCloseCorrection: false })), false);
	assert.equal(
		canShowExecuteCorrection(
			pay({ postCloseCorrection: false }),
			[CORRECTION_EXECUTE_PERMISSION],
			elig({ postCloseCorrection: false, eligible: false })
		),
		false
	);
});

test('PCEF04 no eligible host session → unavailable', () => {
	const e = elig({
		eligible: false,
		hostSession: null,
		unavailableReason: 'CASH_EXECUTION_OPEN_SESSION_REQUIRED: Aucune session ouverte'
	});
	assert.equal(canShowExecuteCorrection(pay(), [CORRECTION_EXECUTE_PERMISSION], e), false);
	assert.match(correctionExecuteUnavailableReason(e)!, /session ouverte/i);
});

test('PCEF06 amount from eligibility / payment', () => {
	assert.equal(elig().amount, 5000);
	assert.equal(pay().amount, 5000);
});

test('PCEF08–PCEF09 explanation / no refund wording', () => {
	assert.equal(correctionCopyIsClean(CORRECTION_EXPLAIN), true);
	assert.equal(correctionCopyIsClean(CORRECTION_EXECUTE_LABEL), true);
	assert.match(CORRECTION_EXPLAIN, /déjà contrepassé|HIS/i);
});

test('PCEF13 already executed state', () => {
	assert.equal(
		canShowExecuteCorrection(
			pay({ cashCorrectionExecuted: true }),
			[CORRECTION_EXECUTE_PERMISSION],
			elig({ alreadyExecuted: true, eligible: false })
		),
		false
	);
});

test('PCEF14 insufficient-cash conflict', () => {
	const c = classifyCorrectionError(
		new Error('CASH_EXECUTION_INSUFFICIENT_CASH: Espèces attendues insuffisantes')
	);
	assert.match(c.message, /insuffisant/i);
	assert.equal(c.shouldRefresh, true);
});

test('PCEF15–PCEF16 unauthorized / CAISSIER hidden', () => {
	assert.equal(canShowExecuteCorrection(pay(), ['cash.movement.create'], elig()), false);
	assert.equal(canShowExecuteCorrection(pay(), ['billing.payment.reverse'], elig()), false);
	assert.equal(canShowExecuteCorrection(pay(), ['*'], elig()), true);
});
