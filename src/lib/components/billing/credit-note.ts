import type { Invoice } from '$lib/types/billing';
import { can } from './state.ts';
import { usesRefundWording } from './collection.ts';
import type { PaymentUxError } from './collection.ts';
import { classifyPaymentError } from './collection.ts';

export const CREDIT_NOTE_CREATE_PERMISSION = 'billing.credit_note.create';
export const CREDIT_NOTE_READ_PERMISSION = 'billing.credit_note.read';
export const CREDIT_READ_PERMISSION = 'billing.credit.read';
export const CREDIT_NOTE_ACTION_LABEL = 'Émettre un avoir';
export const MIN_CREDIT_NOTE_REASON_LEN = 3;
export const MAX_CREDIT_NOTE_REASON_LEN = 500;

/** Suggested default amount (UX only) — remaining correctable patient obligation. */
export function creditNoteDefaultAmount(
	invoice: Pick<Invoice, 'patientAmount' | 'creditedAmount' | 'creditNote'>
): number {
	if (invoice.creditNote?.amount != null) return invoice.creditNote.amount;
	const credited = invoice.creditedAmount ?? 0;
	const rem = invoice.patientAmount - credited;
	return rem > 0 ? rem : 0;
}

/** @deprecated use creditNoteDefaultAmount — kept for unpaid full-CN display. */
export function creditNoteAuthoritativeAmount(
	invoice: Pick<Invoice, 'patientAmount' | 'creditedAmount' | 'creditNote'>
): number {
	return creditNoteDefaultAmount(invoice);
}

/**
 * UX gate — backend remains authoritative.
 * H-C: unpaid ISSUED or paid/partial patient-only, no existing avoir, no insurance.
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
		| 'patientAmount'
	>,
	permissions: string[]
): boolean {
	if (!can(permissions, CREDIT_NOTE_CREATE_PERMISSION)) return false;
	if (invoice.creditNote || (invoice.creditedAmount ?? 0) > 0) return false;
	if (invoice.coveragePending) return false;
	if (invoice.insuranceAmount > 0) return false;
	if (!['ISSUED', 'PARTIALLY_PAID', 'PAID'].includes(invoice.status)) return false;
	const remaining = invoice.patientAmount - (invoice.creditedAmount ?? 0);
	if (remaining <= 0) return false;
	return true;
}

export function canShowCreditNoteDocument(
	invoice: Pick<Invoice, 'creditNote'>,
	permissions: string[]
): boolean {
	return !!invoice.creditNote?.id && can(permissions, CREDIT_NOTE_READ_PERMISSION);
}

export function canShowCustomerCredit(
	invoice: Pick<Invoice, 'customerCreditAmount'>,
	permissions: string[]
): boolean {
	return (invoice.customerCreditAmount ?? 0) > 0 && can(permissions, CREDIT_READ_PERMISSION);
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

export function validateCreditNoteAmount(
	amount: number,
	maxCorrectable: number
): { ok: true } | { ok: false; message: string } {
	if (!Number.isFinite(amount) || amount <= 0) {
		return { ok: false, message: 'Montant d’avoir obligatoire et strictement positif.' };
	}
	if (amount > maxCorrectable) {
		return { ok: false, message: 'Montant supérieur à l’obligation patient corrigible.' };
	}
	return { ok: true };
}

export function classifyCreditNoteError(error: unknown): PaymentUxError {
	const base = classifyPaymentError(error);
	const msg = base.message;
	if (/CREDIT_NOTE_ALREADY_EXISTS|avoir existe déjà/i.test(msg)) {
		return { ...base, kind: 'server', message: 'Un avoir existe déjà pour cette facture.' };
	}
	if (/CREDIT_NOTE_AMOUNT_INVALID|obligation patient corrigible/i.test(msg)) {
		return { ...base, kind: 'server', message: 'Montant d’avoir invalide.' };
	}
	if (/CREDIT_HOLDER_AMBIGUOUS|plusieurs payeurs/i.test(msg)) {
		return {
			...base,
			kind: 'server',
			message:
				'Crédit client impossible — plusieurs payeurs distincts (résolution financière requise).'
		};
	}
	if (/CREDIT_LEGACY_PAYER_UNRESOLVED|LEGACY_UNCONFIRMED|payeur historique/i.test(msg)) {
		return {
			...base,
			kind: 'server',
			message: 'Crédit client impossible — payeur historique non confirmé.'
		};
	}
	if (/CREDIT_REVERSAL_BLOCKED|crédit client a été créé/i.test(msg)) {
		return {
			...base,
			kind: 'server',
			message: 'Contrepassation impossible — un crédit client existe pour cette facture.'
		};
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
			message: 'Correction assurance requise (hors périmètre avoir).'
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
	return (
		!usesRefundWording(text) &&
		!/\brefund\b/i.test(text) &&
		!/rembours/i.test(text) &&
		!/utiliser le crédit/i.test(text)
	);
}
