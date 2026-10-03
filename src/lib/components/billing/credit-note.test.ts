import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Invoice } from '$lib/types/billing';
import {
	canShowCreditNoteDocument,
	canShowIssueCreditNote,
	classifyCreditNoteError,
	CREDIT_NOTE_ACTION_LABEL,
	CREDIT_NOTE_CREATE_PERMISSION,
	creditNoteAuthoritativeAmount,
	creditNoteCopyIsSafe,
	creditNoteDocumentHref,
	validateCreditNoteReason
} from './credit-note.ts';
import { usesRefundWording } from './collection.ts';

function inv(partial: Partial<Invoice> = {}): Invoice {
	return {
		id: 1,
		number: 'INV-000001',
		patientId: 1,
		patientName: 'Test',
		patientCode: 'P1',
		status: 'ISSUED',
		grossAmount: 20000,
		insuranceAmount: 0,
		patientAmount: 20000,
		paidAmount: 0,
		balanceAmount: 20000,
		coveragePending: false,
		createdAt: new Date().toISOString(),
		...partial
	};
}

describe('LOT29F-B credit note FE', () => {
	test('CFN01 eligible shows action', () => {
		assert.equal(canShowIssueCreditNote(inv(), [CREDIT_NOTE_CREATE_PERMISSION]), true);
	});

	test('CFN02 ineligible states', () => {
		assert.equal(
			canShowIssueCreditNote(inv({ status: 'DRAFT' }), [CREDIT_NOTE_CREATE_PERMISSION]),
			false
		);
		assert.equal(
			canShowIssueCreditNote(inv({ status: 'PAID', paidAmount: 20000, balanceAmount: 0 }), [
				CREDIT_NOTE_CREATE_PERMISSION
			]),
			false
		);
		assert.equal(
			canShowIssueCreditNote(inv({ insuranceAmount: 5000 }), [CREDIT_NOTE_CREATE_PERMISSION]),
			false
		);
		assert.equal(
			canShowIssueCreditNote(
				inv({
					creditNote: {
						id: 9,
						number: 'CN-1',
						invoiceId: 1,
						amount: 20000,
						reason: 'x',
						issuedBy: 1,
						issuedAt: '',
						createdAt: ''
					}
				}),
				[CREDIT_NOTE_CREATE_PERMISSION]
			),
			false
		);
	});

	test('CFN03 authoritative amount', () => {
		assert.equal(creditNoteAuthoritativeAmount(inv({ patientAmount: 17500 })), 17500);
	});

	test('CFN04 reason mandatory', () => {
		assert.equal(validateCreditNoteReason('').ok, false);
		assert.equal(validateCreditNoteReason('  ').ok, false);
		assert.equal(validateCreditNoteReason('ok').ok, false);
		assert.equal(validateCreditNoteReason('Motif valide').ok, true);
	});

	test('CFN09 CFN10 metadata link', () => {
		const withNote = inv({
			creditNote: {
				id: 12,
				number: 'CN-000012',
				invoiceId: 1,
				amount: 20000,
				reason: 'Correction',
				issuedBy: 3,
				issuedAt: '2026-01-01T00:00:00Z',
				createdAt: '2026-01-01T00:00:00Z'
			}
		});
		assert.equal(canShowCreditNoteDocument(withNote, ['billing.credit_note.read']), true);
		assert.equal(creditNoteDocumentHref(12), '/billing/credit-notes/12');
	});

	test('CFN11 no refund wording', () => {
		assert.equal(usesRefundWording(CREDIT_NOTE_ACTION_LABEL), false);
		assert.equal(creditNoteCopyIsSafe(CREDIT_NOTE_ACTION_LABEL), true);
		assert.equal(creditNoteCopyIsSafe('Avoir émis'), true);
		assert.equal(creditNoteCopyIsSafe('Remboursement effectué'), false);
	});

	test('CFN12 no FE amount authority for full credit', () => {
		// Modal displays patientAmount only — no setter for arbitrary amount.
		assert.equal(creditNoteAuthoritativeAmount(inv()), inv().patientAmount);
	});

	test('CFN14 unauthorized create hidden', () => {
		assert.equal(canShowIssueCreditNote(inv(), ['billing.read', 'billing.payment.create']), false);
	});

	test('CFN15 structured conflicts', () => {
		const err = classifyCreditNoteError(
			new Error('CREDIT_NOTE_PAYMENT_REVERSAL_REQUIRED Contrepassation')
		);
		assert.match(err.message, /Contrepassation/i);
		const cash = classifyCreditNoteError(
			new Error('CREDIT_NOTE_CASH_CORRECTION_REQUIRED session de caisse')
		);
		assert.match(cash.message, /caisse/i);
		const ins = classifyCreditNoteError(
			new Error('CREDIT_NOTE_INSURANCE_CORRECTION_REQUIRED LOT30')
		);
		assert.match(ins.message, /assurance/i);
	});

	test('CFN13 P360 has no credit-note create surface', () => {
		assert.equal(canShowIssueCreditNote(inv(), ['patients.360.read', 'billing.read']), false);
	});
});
