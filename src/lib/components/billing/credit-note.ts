import type { Invoice } from '$lib/types/billing';
import { can } from './state.ts';
import { usesRefundWording } from './collection.ts';
import type { PaymentUxError } from './collection.ts';
import { classifyPaymentError } from './collection.ts';

export const CREDIT_NOTE_CREATE_PERMISSION = 'billing.credit_note.create';
export const CREDIT_NOTE_READ_PERMISSION = 'billing.credit_note.read';
export const CREDIT_NOTE_ACTION_LABEL = 'Émettre un avoir';
export const MIN_CREDIT_NOTE_REASON_LEN = 3;
export const MAX_CREDIT_NOTE_REASON_LEN = 500;

/** Backend-authoritative full-credit amount for V1 (patient amount when eligible). */
export function creditNoteAuthoritativeAmount(
	invoice: Pick<Invoice, 'patientAmount' | 'creditNote'>
): number {
	if (invoice.creditNote?.amount != null) return invoice.creditNote.amount;
	return invoice.patientAmount;
}

/**
 * UX gate only — backend remains authoritative.
 * V1: unpaid ISSUED, patient-only, no existing avoir.
 */
export function canShowIssueCreditNote(
	invoice: Pick<
		Invoice,
		| 'status'
		| 'paidAmount'
		| 'balanceAmount'
		| 'insuranceAmount'
		| 'coveragePending'
		| 'creditNote'
		| 'creditedAmount'
	>,
	permissions: string[]
): boolean {
	if (!can(permissions, CREDIT_NOTE_CREATE_PERMISSION)) return false;
	if (invoice.creditNote || (invoice.creditedAmount ?? 0) > 0) return false;
	if (invoice.coveragePending) return false;
	if (invoice.insuranceAmount > 0) return false;
	if (invoice.status !== 'ISSUED') return false;
	if (invoice.paidAmount > 0) return false;
	if (invoice.balanceAmount <= 0) return false;
	return true;
}

export function canShowCreditNoteDocument(
	invoice: Pick<Invoice, 'creditNote'>,
	permissions: string[]
): boolean {
	return !!invoice.creditNote?.id && can(permissions, CREDIT_NOTE_READ_PERMISSION);
}

export function creditNoteDocumentHref(creditNoteId: number): string {
	return `/billing/credit-notes/${creditNoteId}`;
}

export function validateCreditNoteReason(
	raw: string
): { ok: true; reason: string } | { ok: false; message: string } {
	const reason = raw.trim();
	if (!reason) return { ok: false, message: 'Motif obligatoire.' };
	if (reason.length < MIN_CREDIT_NOTE_REASON_LEN)
		return { ok: false, message: 'Motif trop court.' };
	if (reason.length > MAX_CREDIT_NOTE_REASON_LEN) return { ok: false, message: 'Motif trop long.' };
	return { ok: true, reason };
}

export function classifyCreditNoteError(error: unknown): PaymentUxError {
	const base = classifyPaymentError(error);
	const msg = base.message;
	if (/CREDIT_NOTE_ALREADY_EXISTS|avoir existe déjà/i.test(msg)) {
		return { ...base, kind: 'server', message: 'Un avoir existe déjà pour cette facture.' };
	}
	if (/CREDIT_NOTE_PAYMENT_REVERSAL_REQUIRED|Contrepassation des encaissements/i.test(msg)) {
		return {
			...base,
			kind: 'server',
			message: 'Contrepassation des encaissements requise avant avoir.'
		};
	}
	if (/CREDIT_NOTE_CASH_CORRECTION_REQUIRED|session de caisse/i.test(msg)) {
		return {
			...base,
			kind: 'server',
			message: 'Correction caisse requise — avoir impossible tant que la session bloque.'
		};
	}
	if (/CREDIT_NOTE_INSURANCE_CORRECTION_REQUIRED|part assurance|LOT30/i.test(msg)) {
		return {
			...base,
			kind: 'server',
			message: 'Correction assurance requise (hors périmètre avoir V1).'
		};
	}
	if (/CREDIT_NOTE_PATIENT_CREDIT_POLICY_REQUIRED|crédit patient/i.test(msg)) {
		return {
			...base,
			kind: 'server',
			message: 'Politique de crédit patient requise — avoir non supporté sur facture encaissée.'
		};
	}
	if (/IDEMPOTENCY_CONFLICT|idempotence déjà utilisée/i.test(msg)) {
		return {
			...base,
			kind: 'idempotency_conflict',
			message: "Clé d'idempotence déjà utilisée."
		};
	}
	if (base.kind === 'permission') {
		return {
			...base,
			message: "Vous n'avez pas l'autorisation d'émettre un avoir."
		};
	}
	return base;
}

export function creditNoteCopyIsSafe(text: string): boolean {
	return !usesRefundWording(text) && !/\brefund\b/i.test(text);
}
