import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
	CREDIT_APPLY_ACTION_LABEL,
	CREDIT_APPLY_PERMISSION,
	CREDIT_AVAILABLE_LABEL,
	CREDIT_RESERVED_LABEL,
	CREDIT_READ_PERMISSION,
	CREDIT_SETTLEMENT_LABEL,
	canShowApplyCredit,
	canShowCreditBalances,
	classifyCreditApplyError,
	creditApplyCopyIsSafe,
	eligibleHolders,
	maxApplicableAmount,
	validateCreditApplyAmount,
	type CreditBalance
} from './credit-application.ts';
import type { Invoice } from '$lib/types/billing';

function inv(over: Partial<Invoice> = {}): Invoice {
	return {
		id: 1,
		number: 'INV-1',
		patientId: 9,
		patientName: 'Test',
		patientCode: 'P1',
		status: 'ISSUED',
		grossAmount: 20000,
		insuranceAmount: 0,
		patientAmount: 20000,
		paidAmount: 0,
		balanceAmount: 20000,
		coveragePending: false,
		createdAt: '2026-01-01',
		...over
	};
}

function bal(over: Partial<CreditBalance> = {}): CreditBalance {
	return {
		holderPartyId: 3,
		patientId: 9,
		totalCredited: 10000,
		totalApplied: 0,
		totalRefunded: 0,
		availableCredit: 10000,
		...over
	};
}

describe('LOT29F-H-D credit application FE', () => {
	test('shows balances with credit.read on eligible invoice', () => {
		assert.equal(canShowCreditBalances(inv(), [CREDIT_READ_PERMISSION]), true);
		assert.equal(
			canShowCreditBalances(inv({ status: 'PAID', balanceAmount: 0 }), [CREDIT_READ_PERMISSION]),
			false
		);
		assert.equal(
			canShowCreditBalances(inv({ insuranceAmount: 1000 }), [CREDIT_READ_PERMISSION]),
			false
		);
		assert.equal(canShowCreditBalances(inv(), ['billing.read']), false);
	});

	test('apply requires credit.apply + available holder credit', () => {
		assert.equal(
			canShowApplyCredit(inv(), [CREDIT_APPLY_PERMISSION, CREDIT_READ_PERMISSION], [bal()]),
			true
		);
		assert.equal(canShowApplyCredit(inv(), [CREDIT_READ_PERMISSION], [bal()]), false);
		assert.equal(
			canShowApplyCredit(
				inv(),
				[CREDIT_APPLY_PERMISSION, CREDIT_READ_PERMISSION],
				[bal({ availableCredit: 0 })]
			),
			false
		);
		assert.equal(
			canShowApplyCredit(inv(), ['billing.payment.create', CREDIT_READ_PERMISSION], [bal()]),
			false
		);
	});

	test('clinical-only denied', () => {
		assert.equal(canShowApplyCredit(inv(), ['patients.360.read', 'billing.read'], [bal()]), false);
	});

	test('maxApplicableAmount is min(receivable, available)', () => {
		assert.equal(
			maxApplicableAmount(inv({ balanceAmount: 5000 }), bal({ availableCredit: 10000 })),
			5000
		);
		assert.equal(
			maxApplicableAmount(inv({ balanceAmount: 20000 }), bal({ availableCredit: 7000 })),
			7000
		);
	});

	test('validateCreditApplyAmount', () => {
		assert.equal(
			validateCreditApplyAmount(0, inv(), bal()),
			'Montant d’application obligatoire et strictement positif'
		);
		assert.equal(
			validateCreditApplyAmount(15000, inv({ balanceAmount: 20000 }), bal()),
			'Crédit utilisable insuffisant'
		);
		assert.equal(
			validateCreditApplyAmount(
				15000,
				inv({ balanceAmount: 8000 }),
				bal({ availableCredit: 20000 })
			),
			'Montant supérieur au reste dû patient'
		);
		assert.equal(validateCreditApplyAmount(5000, inv(), bal()), null);
	});

	test('eligibleHolders filters zero', () => {
		assert.equal(eligibleHolders([bal(), bal({ holderPartyId: 4, availableCredit: 0 })]).length, 1);
	});

	test('classify insufficient / settled race as refresh', () => {
		const a = classifyCreditApplyError(new Error('CREDIT_APPLICATION_INSUFFICIENT'));
		assert.equal(a.kind, 'stale_balance');
		assert.equal(a.shouldRefresh, true);
		const b = classifyCreditApplyError(
			new Error('CREDIT_APPLICATION_EXCEEDS_BALANCE reste dû patient')
		);
		assert.equal(b.kind, 'stale_balance');
	});

	test('uses backend spendable credit (availableCredit) — reserved credit is not applicable', () => {
		const reserved = bal({
			ledgerAvailable: 10000,
			reservedForRefund: 10000,
			spendableCredit: 0,
			availableCredit: 0
		});
		assert.equal(
			canShowApplyCredit(inv(), [CREDIT_APPLY_PERMISSION, CREDIT_READ_PERMISSION], [reserved]),
			false
		);
		assert.equal(eligibleHolders([reserved]).length, 0);
		assert.equal(validateCreditApplyAmount(1000, inv(), reserved), 'Crédit utilisable insuffisant');
		assert.equal(CREDIT_AVAILABLE_LABEL, 'Crédit utilisable');
		assert.equal(CREDIT_RESERVED_LABEL, 'Montant réservé');
	});

	test('copy is not cash / refund / avoir', () => {
		assert.equal(creditApplyCopyIsSafe(CREDIT_APPLY_ACTION_LABEL), true);
		assert.equal(creditApplyCopyIsSafe(CREDIT_AVAILABLE_LABEL), true);
		assert.equal(creditApplyCopyIsSafe(CREDIT_SETTLEMENT_LABEL), true);
		assert.equal(creditApplyCopyIsSafe('Encaissement espèces'), false);
		assert.equal(creditApplyCopyIsSafe('Remboursement'), false);
		assert.equal(creditApplyCopyIsSafe('Avoir émis'), false);
	});
});
