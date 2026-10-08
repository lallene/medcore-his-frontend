/** LOT29F-H-D — apply existing customer credit to settle an invoice (not Payment / not Refund). */

import { can } from './state.ts';
import { classifyPaymentError, type PaymentUxError } from './collection.ts';
import type { Invoice } from '$lib/types/billing';

export const CREDIT_APPLY_PERMISSION = 'billing.credit.apply';
export const CREDIT_READ_PERMISSION = 'billing.credit.read';

export const CREDIT_APPLY_ACTION_LABEL = 'Utiliser le crédit';
/** Backend `availableCredit` === `spendableCredit` (ledger − reserved for refund requests). */
export const CREDIT_AVAILABLE_LABEL = 'Crédit utilisable';
export const CREDIT_RESERVED_LABEL = 'Montant réservé';
export const CREDIT_APPLIED_LABEL = 'Crédit utilisé';
export const CREDIT_SETTLEMENT_LABEL = 'Règlement par crédit';

export type CreditBalance = {
	holderPartyId: number;
	patientId: number;
	totalCredited: number;
	totalApplied: number;
	totalRefunded: number;
	ledgerAvailable?: number;
	reservedForRefund?: number;
	spendableCredit?: number;
	/** Backend-authoritative apply ceiling (= spendableCredit). */
	availableCredit: number;
};

export function canShowCreditBalances(
	invoice: Pick<
		Invoice,
		'patientId' | 'status' | 'balanceAmount' | 'insuranceAmount' | 'coveragePending'
	>,
	permissions: string[]
): boolean {
	if (!can(permissions, CREDIT_READ_PERMISSION)) return false;
	if (!invoice.patientId) return false;
	if (invoice.coveragePending) return false;
	if ((invoice.insuranceAmount ?? 0) > 0) return false;
	return ['ISSUED', 'PARTIALLY_PAID'].includes(invoice.status);
}

export function canShowApplyCredit(
	invoice: Pick<
		Invoice,
		'status' | 'balanceAmount' | 'insuranceAmount' | 'coveragePending' | 'patientId'
	>,
	permissions: string[],
	balances: CreditBalance[]
): boolean {
	if (!can(permissions, CREDIT_APPLY_PERMISSION)) return false;
	if (!canShowCreditBalances(invoice, permissions)) return false;
	if ((invoice.balanceAmount ?? 0) <= 0) return false;
	return balances.some((b) => b.availableCredit > 0);
}

export function eligibleHolders(balances: CreditBalance[]): CreditBalance[] {
	return balances.filter((b) => b.availableCredit > 0);
}

export function maxApplicableAmount(
	invoice: Pick<Invoice, 'balanceAmount'>,
	holder: Pick<CreditBalance, 'availableCredit'> | null | undefined
): number {
	const receivable = Math.max(0, invoice.balanceAmount ?? 0);
	const avail = Math.max(0, holder?.availableCredit ?? 0);
	return Math.min(receivable, avail);
}

export function validateCreditApplyAmount(
	amount: number,
	invoice: Pick<Invoice, 'balanceAmount'>,
	holder: Pick<CreditBalance, 'availableCredit'> | null | undefined
): string | null {
	if (!Number.isFinite(amount) || amount <= 0) {
		return 'Montant d’application obligatoire et strictement positif';
	}
	if (!holder) return 'Titulaire financier obligatoire';
	if (amount > holder.availableCredit) {
		return 'Crédit utilisable insuffisant';
	}
	if (amount > (invoice.balanceAmount ?? 0)) {
		return 'Montant supérieur au reste dû patient';
	}
	return null;
}

export function classifyCreditApplyError(error: unknown): PaymentUxError {
	const base = classifyPaymentError(error);
	const msg = base.message;
	if (/CREDIT_APPLICATION_INSUFFICIENT|Crédit (disponible|utilisable) insuffisant/i.test(msg)) {
		return {
			...base,
			kind: 'stale_balance',
			message: 'Crédit utilisable insuffisant — actualisez les soldes.'
		};
	}
	if (/CREDIT_APPLICATION_EXCEEDS_BALANCE|reste dû patient/i.test(msg)) {
		return {
			...base,
			kind: 'stale_balance',
			message: 'Montant supérieur au reste dû — la facture a peut‑être été réglée concurremment.'
		};
	}
	if (/CREDIT_APPLICATION_INVOICE_INELIGIBLE|n'accepte pas d'application/i.test(msg)) {
		return {
			...base,
			kind: 'stale_balance',
			message: 'Cette facture n’accepte plus d’application de crédit — actualisez.'
		};
	}
	if (/IDEMPOTENCY_CONFLICT|idempotence déjà utilisée/i.test(msg)) {
		return { ...base, kind: 'idempotency_conflict', message: "Clé d'idempotence déjà utilisée." };
	}
	if (base.kind === 'permission') {
		return { ...base, message: "Vous n'avez pas l'autorisation d'appliquer le crédit." };
	}
	return base;
}

/** Forbidden cash / refund / avoir wording for credit-application UX copy. */
export function creditApplyCopyIsSafe(text: string): boolean {
	return (
		!/encaissement esp[eè]ces/i.test(text) &&
		!/paiement esp[eè]ces/i.test(text) &&
		!/\brembours/i.test(text) &&
		!/\brefund\b/i.test(text) &&
		!/\bavoir\b/i.test(text)
	);
}
