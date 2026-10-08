import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
	allStatementCreditLabelsSafe,
	canShowFinancialStatement,
	creditApplyCopyIsSafe,
	financialEventTypeLabel,
	holderFieldLabels,
	STATEMENT_READ_PERMISSION,
	statementCreditCopyIsSafe,
	summaryFieldLabels,
	summaryFieldOrder
} from './financial-statement.ts';
import { refundCopyIsSafe } from './refund.ts';

describe('LOT29F-H-E financial statement FE', () => {
	test('canShowFinancialStatement requires billing.statement.read', () => {
		assert.equal(canShowFinancialStatement([STATEMENT_READ_PERMISSION]), true);
		assert.equal(canShowFinancialStatement(['billing.read']), false);
		assert.equal(canShowFinancialStatement(['billing.credit.read']), false);
		assert.equal(canShowFinancialStatement(['patients.360.read', 'billing.read']), false);
	});

	test('summary labels are French and keyed to backend fields', () => {
		assert.equal(summaryFieldLabels.grossPatientObligation, 'Facturé');
		assert.equal(summaryFieldLabels.creditNoteReduction, 'Avoirs');
		assert.equal(summaryFieldLabels.receivableOutstanding, 'Reste à payer');
		assert.equal(summaryFieldLabels.creditAvailable, 'Crédit utilisable');
	});

	test('LOT29F-I-A labels for ledger / reserved / spendable credit', () => {
		assert.equal(summaryFieldLabels.ledgerCreditAvailable, 'Crédit au registre');
		assert.equal(summaryFieldLabels.reservedForRefund, 'Montant réservé');
		assert.equal(summaryFieldLabels.spendableCredit, 'Crédit utilisable');
		assert.equal(holderFieldLabels.reservedForRefund, 'Montant réservé');
		assert.equal(holderFieldLabels.spendableCredit, 'Crédit utilisable');
		assert.equal(holderFieldLabels.availableCredit, 'Crédit utilisable');
		assert.equal(summaryFieldOrder.includes('reservedForRefund'), true);
		assert.equal(summaryFieldOrder.includes('ledgerCreditAvailable'), true);
		assert.equal(financialEventTypeLabel('REFUND_REQUESTED'), 'Demande de remboursement');
		assert.equal(financialEventTypeLabel('REFUND_APPROVED'), 'Remboursement autorisé');
		assert.equal(financialEventTypeLabel('REFUND_REJECTED'), 'Demande rejetée');
		assert.equal(financialEventTypeLabel('REFUND_CANCELLED'), 'Demande annulée');
		for (const t of [
			'REFUND_REQUESTED',
			'REFUND_APPROVED',
			'REFUND_REJECTED',
			'REFUND_CANCELLED'
		]) {
			assert.equal(refundCopyIsSafe(financialEventTypeLabel(t)), true);
		}
		assert.equal(refundCopyIsSafe(summaryFieldLabels.reservedForRefund), true);
	});

	test('event type labels match backend vocabulary', () => {
		assert.equal(financialEventTypeLabel('CREDIT_APPLIED'), 'Crédit utilisé');
		assert.equal(financialEventTypeLabel('PAYMENT_REVERSED'), 'Paiement contrepassé');
	});

	test('credit copy avoids refund / cash misuse for credit application UX', () => {
		assert.equal(creditApplyCopyIsSafe(holderFieldLabels.creditUsed), true);
		assert.equal(creditApplyCopyIsSafe(summaryFieldLabels.creditApplied), true);
		assert.equal(statementCreditCopyIsSafe('Encaissement espèces'), false);
		assert.equal(statementCreditCopyIsSafe('Remboursement client'), false);
		assert.equal(statementCreditCopyIsSafe('Refund issued'), false);
		assert.equal(allStatementCreditLabelsSafe(), true);
	});
});
