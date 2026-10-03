import axios from 'axios';
import type { Invoice, InvoiceStatus, Payment } from '$lib/types/billing';
import { can, paymentAllowed } from './state.ts';
import type { PaymentCommandState } from './payment-command.ts';
import { isPaymentSubmitDisabled } from './payment-command.ts';

/** Canonical payment methods — mirrors backend `paymentMethods` map. */
export const BILLING_PAYMENT_METHODS = [
	{ value: 'CASH', label: 'Espèces' },
	{ value: 'CARD', label: 'Carte bancaire' },
	{ value: 'MOBILE_MONEY', label: 'Mobile Money' },
	{ value: 'BANK_TRANSFER', label: 'Virement' },
	{ value: 'CHECK', label: 'Chèque' },
	{ value: 'OTHER', label: 'Autre' }
] as const;

export type BillingPaymentMethod = (typeof BILLING_PAYMENT_METHODS)[number]['value'];

export const COLLECTION_PERMISSION = 'billing.payment.create';
/** Canonical receipt read — same permission as /cash/receipts/:id (LOT29D-B). */
export const RECEIPT_READ_PERMISSION = 'cash.receipt.read';
/** LOT29D-C: separate from collection — Contrepasser / Annuler l'encaissement. */
export const REVERSAL_PERMISSION = 'billing.payment.reverse';
export const REVERSAL_ACTION_LABEL = "Annuler l'encaissement";
export const MIN_REVERSAL_REASON_LEN = 3;
export const MAX_REVERSAL_REASON_LEN = 500;

export type CollectibleKind =
	'payable' | 'partially_paid' | 'settled' | 'cancelled' | 'draft' | 'non_collectible';

export function invoiceCollectibleKind(
	invoice: Pick<Invoice, 'status' | 'balanceAmount'>
): CollectibleKind {
	const status = invoice.status as InvoiceStatus;
	if (status === 'CANCELLED') return 'cancelled';
	if (status === 'DRAFT') return 'draft';
	if (
		status === 'PAID' ||
		(['ISSUED', 'PARTIALLY_PAID'].includes(status) && invoice.balanceAmount <= 0)
	) {
		return 'settled';
	}
	if (status === 'PARTIALLY_PAID' && invoice.balanceAmount > 0) return 'partially_paid';
	if (status === 'ISSUED' && invoice.balanceAmount > 0) return 'payable';
	return 'non_collectible';
}

export function isInvoiceCollectible(invoice: Pick<Invoice, 'status' | 'balanceAmount'>): boolean {
	return paymentAllowed(invoice as Invoice);
}

export function canShowEncaisser(
	invoice: Pick<Invoice, 'status' | 'balanceAmount'>,
	permissions: string[]
): boolean {
	return isInvoiceCollectible(invoice) && can(permissions, COLLECTION_PERMISSION);
}

export function collectibleStatusLabel(kind: CollectibleKind): string {
	switch (kind) {
		case 'payable':
			return 'À encaisser';
		case 'partially_paid':
			return 'Partiellement payée';
		case 'settled':
			return 'Soldée';
		case 'cancelled':
			return 'Annulée';
		case 'draft':
			return 'Brouillon';
		default:
			return 'Non encaissable';
	}
}

/** UX prevalidation only — backend remains authoritative. */
export function validatePaymentAmount(
	amount: number,
	remainingBalance: number
): { ok: true } | { ok: false; reason: 'empty' | 'zero' | 'negative' | 'over_balance' } {
	if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
		return { ok: false, reason: 'empty' };
	}
	const n = Number(amount);
	if (n === 0) return { ok: false, reason: 'zero' };
	if (n < 0) return { ok: false, reason: 'negative' };
	if (n > remainingBalance) return { ok: false, reason: 'over_balance' };
	return { ok: true };
}

export function paymentAmountErrorMessage(
	reason: 'empty' | 'zero' | 'negative' | 'over_balance'
): string {
	switch (reason) {
		case 'empty':
			return 'Montant obligatoire';
		case 'zero':
			return 'Le montant doit être supérieur à zéro';
		case 'negative':
			return 'Le montant ne peut pas être négatif';
		case 'over_balance':
			return 'Le montant dépasse le reste patient affiché';
	}
}

export type PaymentUxErrorKind =
	| 'validation'
	| 'permission'
	| 'not_collectible'
	| 'stale_balance'
	| 'idempotency_conflict'
	| 'network_uncertain'
	| 'server';

export type PaymentUxError = {
	kind: PaymentUxErrorKind;
	message: string;
	/** Keep same idempotency key for retry of same logical command. */
	preserveKey: boolean;
	/** Refresh authoritative invoice before user retries. */
	shouldRefresh: boolean;
	/** Offer deliberate new payment intent (new key) after user acknowledges. */
	allowNewIntent: boolean;
};

export function classifyPaymentError(error: unknown): PaymentUxError {
	if (axios.isAxiosError(error)) {
		if (!error.response) {
			return {
				kind: 'network_uncertain',
				message:
					"Résultat du paiement indéterminé (réseau). Vérifiez l'état de la facture avant de réessayer — la même intention sera rejouée.",
				preserveKey: true,
				shouldRefresh: true,
				allowNewIntent: false
			};
		}
		const status = error.response.status;
		const body = error.response.data as { code?: string; message?: string } | undefined;
		const msg =
			(typeof body?.message === 'string' && body.message) ||
			(typeof error.message === 'string' ? error.message : 'Paiement impossible');
		const lower = msg.toLowerCase();

		if (status === 403 || error.message === 'ACCESS_DENIED') {
			return {
				kind: 'permission',
				message: "Vous n'avez pas l'autorisation d'encaisser.",
				preserveKey: false,
				shouldRefresh: false,
				allowNewIntent: false
			};
		}
		if (status === 400 || status === 422) {
			return {
				kind: 'validation',
				message: msg,
				preserveKey: true,
				shouldRefresh: false,
				allowNewIntent: false
			};
		}
		if (status === 409) {
			if (lower.includes("clé d'idempotence") || lower.includes('idempoten')) {
				return {
					kind: 'idempotency_conflict',
					message:
						'Conflit d’idempotence : cette clé a déjà été utilisée avec un autre paiement. Démarrez une nouvelle intention si besoin.',
					preserveKey: true,
					shouldRefresh: true,
					allowNewIntent: true
				};
			}
			if (lower.includes('dépasse') || lower.includes('reste')) {
				return {
					kind: 'stale_balance',
					message:
						'Le solde a changé (paiement concurrent ou solde actualisé). La facture va être rechargée.',
					preserveKey: false,
					shouldRefresh: true,
					allowNewIntent: true
				};
			}
			if (lower.includes("n'accepte pas") || lower.includes('accepte pas')) {
				return {
					kind: 'not_collectible',
					message: msg,
					preserveKey: false,
					shouldRefresh: true,
					allowNewIntent: false
				};
			}
			return {
				kind: 'stale_balance',
				message: msg,
				preserveKey: false,
				shouldRefresh: true,
				allowNewIntent: true
			};
		}
		return {
			kind: 'server',
			message: msg,
			preserveKey: true,
			shouldRefresh: true,
			allowNewIntent: false
		};
	}
	const msg = error instanceof Error ? error.message : 'Paiement impossible';
	if (msg === 'ACCESS_DENIED') {
		return {
			kind: 'permission',
			message: "Vous n'avez pas l'autorisation d'encaisser.",
			preserveKey: false,
			shouldRefresh: false,
			allowNewIntent: false
		};
	}
	return {
		kind: 'server',
		message: msg,
		preserveKey: true,
		shouldRefresh: true,
		allowNewIntent: false
	};
}

export function isPaymentFormSubmitDisabled(
	cmd: PaymentCommandState,
	amount: number,
	remainingBalance: number
): boolean {
	if (isPaymentSubmitDisabled(cmd)) return true;
	return !validatePaymentAmount(amount, remainingBalance).ok;
}

export function mergePaymentHistory(
	previous: Payment[] | undefined,
	authoritative: Payment[] | undefined
): Payment[] {
	const rows = authoritative ?? [];
	const seen = new Set<number>();
	const out: Payment[] = [];
	for (const p of rows) {
		if (seen.has(p.id)) continue;
		seen.add(p.id);
		out.push(p);
	}
	void previous;
	return out;
}

export function paymentHistoryFingerprint(payments: Payment[] | undefined): string {
	return (payments ?? [])
		.map(
			(p) =>
				`${p.id}:${p.amount}:${p.paymentMethod}:${p.paidAt}:${p.receiptId ?? ''}:${p.receiptNumber ?? ''}`
		)
		.join('|');
}

export function paymentHasCanonicalReceipt(payment: Payment | undefined | null): boolean {
	return Boolean(payment?.receiptId && payment.receiptId > 0);
}

export function canShowPaymentReceipt(
	payment: Payment | undefined | null,
	permissions: string[]
): boolean {
	return paymentHasCanonicalReceipt(payment) && can(permissions, RECEIPT_READ_PERMISSION);
}

export function receiptHref(receiptId: number): string {
	return `/cash/receipts/${receiptId}`;
}

/** Latest payment that has a canonical receipt (authoritative list order). */
export function latestReceiptedPayment(payments: Payment[] | undefined): Payment | null {
	const rows = payments ?? [];
	for (let i = rows.length - 1; i >= 0; i--) {
		if (paymentHasCanonicalReceipt(rows[i])) return rows[i];
	}
	return null;
}

export function paymentIsReversed(payment: Payment | undefined | null): boolean {
	return Boolean(payment?.reversed);
}

export function canShowReversePayment(
	payment: Payment | undefined | null,
	permissions: string[]
): boolean {
	if (!payment || paymentIsReversed(payment)) return false;
	// Cash-session payments are rejected server-side; hide when session id is known.
	if (payment.cashSessionId != null && payment.cashSessionId > 0) return false;
	return can(permissions, REVERSAL_PERMISSION);
}

export function validateReversalReason(
	raw: string
): { ok: true; reason: string } | { ok: false; message: string } {
	const reason = raw.trim();
	if (!reason) return { ok: false, message: 'Motif obligatoire.' };
	if (reason.length < MIN_REVERSAL_REASON_LEN) return { ok: false, message: 'Motif trop court.' };
	if (reason.length > MAX_REVERSAL_REASON_LEN) return { ok: false, message: 'Motif trop long.' };
	return { ok: true, reason };
}

export function classifyReversalError(error: unknown): PaymentUxError {
	const base = classifyPaymentError(error);
	if (base.kind === 'permission') {
		return {
			...base,
			message: "Vous n'avez pas l'autorisation de contrepasser cet encaissement."
		};
	}
	return {
		...base,
		message: base.message
			.replace(/paiement/gi, 'contrepassation')
			.replace(/Paiement/g, 'Contrepassation')
	};
}

export function usesRefundWording(text: string): boolean {
	return /\brembours/i.test(text);
}

export function isCanonicalPaymentMethod(value: string): value is BillingPaymentMethod {
	return BILLING_PAYMENT_METHODS.some((m) => m.value === value);
}

export function listFilterForCollectible(mode: 'all' | 'collectible' | InvoiceStatus): {
	status?: string;
} {
	if (mode === 'all') return {};
	if (mode === 'collectible') return {}; // client-side filter after fetch
	return { status: mode };
}

export function filterInvoicesForCashier(
	invoices: Invoice[],
	opts: { collectibleOnly?: boolean; search?: string }
): Invoice[] {
	let rows = invoices;
	if (opts.collectibleOnly) {
		rows = rows.filter((x) => isInvoiceCollectible(x));
	}
	const q = (opts.search ?? '').trim().toLowerCase();
	if (q) {
		rows = rows.filter(
			(x) =>
				x.number.toLowerCase().includes(q) ||
				x.patientCode?.toLowerCase().includes(q) ||
				x.patientName?.toLowerCase().includes(q) ||
				String(x.patientId).includes(q)
		);
	}
	return rows;
}
