/** LOT29F-H-E — read-only financial statement presentation (no client-side totals). */

import { can } from './state.ts';
import type { FinancialHistoryEventType, FinancialStatementSummary } from '$lib/types/billing';

export const STATEMENT_READ_PERMISSION = 'billing.statement.read';

export const STATEMENT_PAGE_TITLE = 'Relevé financier patient';
export const STATEMENT_SUMMARY_SECTION = 'Synthèse';
export const STATEMENT_INVOICES_SECTION = 'Factures';
export const STATEMENT_CREDITS_SECTION = 'Crédits par titulaire';
export const STATEMENT_HISTORY_SECTION = 'Historique';

export function canShowFinancialStatement(permissions: string[]): boolean {
	return can(permissions, STATEMENT_READ_PERMISSION);
}

export type SummaryFieldKey = keyof FinancialStatementSummary;

/** French labels for backend summary fields — display only, never recomputed. */
export const summaryFieldLabels: Record<SummaryFieldKey, string> = {
	grossPatientObligation: 'Facturé',
	creditNoteReduction: 'Avoirs',
	correctedPatientObligation: 'Obligation corrigée',
	effectiveMoneyPaid: 'Encaissé',
	creditApplied: 'Crédit utilisé',
	totalSettled: 'Total réglé',
	receivableOutstanding: 'Reste à payer',
	creditEarned: 'Crédit acquis',
	creditRestored: 'Crédit restauré',
	creditUsed: 'Crédit consommé',
	// Backend creditAvailable = spendable (ledger − reserved).
	creditAvailable: 'Crédit utilisable',
	ledgerCreditAvailable: 'Crédit au registre',
	reservedForRefund: 'Montant réservé',
	spendableCredit: 'Crédit utilisable'
};

export const summaryFieldOrder: SummaryFieldKey[] = [
	'grossPatientObligation',
	'creditNoteReduction',
	'correctedPatientObligation',
	'effectiveMoneyPaid',
	'creditApplied',
	'totalSettled',
	'receivableOutstanding',
	'creditEarned',
	'creditRestored',
	'creditUsed',
	'ledgerCreditAvailable',
	'reservedForRefund',
	// creditAvailable === spendableCredit on the backend; one tile avoids duplicates.
	'creditAvailable'
];

export const invoiceLineFieldLabels = {
	grossPatientObligation: 'Facturé',
	creditNoteReduction: 'Avoirs',
	correctedObligation: 'Obligation corrigée',
	effectiveMoneyPaid: 'Encaissé',
	creditApplied: 'Crédit utilisé',
	totalSettled: 'Total réglé',
	remainingReceivable: 'Reste à payer'
} as const;

export const holderFieldLabels = {
	creditEarned: 'Crédit acquis',
	creditRestored: 'Crédit restauré',
	creditUsed: 'Crédit utilisé',
	creditRefunded: 'Remboursé',
	ledgerAvailable: 'Crédit au registre',
	reservedForRefund: 'Montant réservé',
	spendableCredit: 'Crédit utilisable',
	availableCredit: 'Crédit utilisable'
} as const;

export const financialEventTypeLabels: Record<FinancialHistoryEventType, string> = {
	INVOICE_ISSUED: 'Facture émise',
	PAYMENT_RECEIVED: 'Encaissement',
	PAYMENT_REVERSED: 'Paiement contrepassé',
	CREDIT_NOTE_ISSUED: 'Avoir émis',
	CREDIT_EARNED: 'Crédit acquis',
	CREDIT_APPLIED: 'Crédit utilisé',
	CREDIT_APPLICATION_REVERSED: 'Utilisation de crédit annulée',
	REFUND_REQUESTED: 'Demande de remboursement',
	REFUND_APPROVED: 'Remboursement autorisé',
	REFUND_REJECTED: 'Demande rejetée',
	REFUND_CANCELLED: 'Demande annulée',
	REFUND_EXECUTED: 'Remboursement effectué'
};

export const financialEventTypeFilterOptions: { value: string; label: string }[] = [
	{ value: '', label: 'Tous les événements' },
	...(Object.entries(financialEventTypeLabels) as [FinancialHistoryEventType, string][]).map(
		([value, label]) => ({ value, label })
	)
];

export function financialEventTypeLabel(eventType: string): string {
	return financialEventTypeLabels[eventType as FinancialHistoryEventType] ?? eventType;
}

export function holderKindLabel(kind: string): string {
	switch (kind) {
		case 'PATIENT':
			return 'Patient';
		case 'INDIVIDUAL':
			return 'Tiers payeur';
		default:
			return kind;
	}
}

export function invoiceStatusLabel(status: string): string {
	switch (status) {
		case 'ISSUED':
			return 'Émise';
		case 'PARTIALLY_PAID':
			return 'Partiellement payée';
		case 'PAID':
			return 'Payée';
		case 'CANCELLED':
			return 'Annulée';
		default:
			return status;
	}
}

/** Credit-application / credit-holder UX must not read as cash collection or refund. */
export function statementCreditCopyIsSafe(text: string): boolean {
	return (
		!/encaissement esp[eè]ces/i.test(text) &&
		!/paiement esp[eè]ces/i.test(text) &&
		!/\brembours/i.test(text) &&
		!/\brefund\b/i.test(text) &&
		!(/\bencaissement\b/i.test(text) && /cr[eé]dit/i.test(text))
	);
}

/** All static statement labels used in credit sections pass safe wording checks. */
export function creditApplyCopyIsSafe(text: string): boolean {
	return statementCreditCopyIsSafe(text);
}

export function allStatementCreditLabelsSafe(): boolean {
	const samples = [
		STATEMENT_CREDITS_SECTION,
		summaryFieldLabels.creditApplied,
		summaryFieldLabels.creditAvailable,
		summaryFieldLabels.creditEarned,
		summaryFieldLabels.ledgerCreditAvailable,
		summaryFieldLabels.reservedForRefund,
		summaryFieldLabels.spendableCredit,
		holderFieldLabels.creditUsed,
		holderFieldLabels.ledgerAvailable,
		holderFieldLabels.reservedForRefund,
		holderFieldLabels.spendableCredit,
		holderFieldLabels.availableCredit,
		financialEventTypeLabels.CREDIT_APPLIED,
		financialEventTypeLabels.CREDIT_EARNED,
		financialEventTypeLabels.CREDIT_APPLICATION_REVERSED
	];
	return samples.every((s) => statementCreditCopyIsSafe(s));
}
