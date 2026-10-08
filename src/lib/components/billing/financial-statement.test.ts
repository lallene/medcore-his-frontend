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
	summaryFieldLabels
} from './financial-statement.ts';

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
		assert.equal(summaryFieldLabels.creditAvailable, 'Crédit disponible');
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
