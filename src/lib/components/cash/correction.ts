import type { Payment } from '$lib/types/billing';
import type { CorrectionEligibility } from '$lib/types/cash';
import { cashCan } from './state.ts';
import { usesRefundWording } from '../billing/collection.ts';

export const CORRECTION_EXECUTE_PERMISSION = 'cash.correction.execute';
export const CORRECTION_READ_PERMISSION = 'cash.correction.read';
export const CORRECTION_EXECUTE_LABEL = 'Exécuter la correction de caisse';
export const CORRECTION_EXECUTED_LABEL = 'Correction de caisse exécutée';
export const CORRECTION_HOST_OUT_LABEL = 'Correction de caisse postérieure';

export const CORRECTION_EXPLAIN =
	'Le paiement est déjà contrepassé dans le HIS. Cette action enregistre la sortie réelle d’espèces sur le tiroir actuellement ouvert de la même caisse.';

export function canShowExecuteCorrection(
	payment: Payment | undefined | null,
	permissions: string[],
	eligibility: CorrectionEligibility | null | undefined
): boolean {
	if (!payment || !paymentIsPostCloseEligible(payment)) return false;
	if (!cashCan(permissions, CORRECTION_EXECUTE_PERMISSION)) return false;
	if (payment.cashCorrectionExecuted) return false;
	if (!eligibility?.eligible) return false;
	return true;
}

export function paymentIsPostCloseEligible(payment: Payment | undefined | null): boolean {
	return Boolean(payment?.reversed && payment.postCloseCorrection);
}

export function correctionExecuteUnavailableReason(
	eligibility: CorrectionEligibility | null | undefined
): string | null {
	if (!eligibility) return null;
	if (eligibility.alreadyExecuted) return 'Correction de caisse déjà exécutée.';
	if (eligibility.eligible) return null;
	return eligibility.unavailableReason || 'Exécution indisponible.';
}

export function classifyCorrectionError(error: unknown): {
	message: string;
	preserveKey: boolean;
	shouldRefresh: boolean;
} {
	const msg = error instanceof Error ? error.message : String(error ?? '');
	if (/CASH_EXECUTION_INSUFFICIENT_CASH|espèces attendues insuffisantes/i.test(msg)) {
		return {
			message: 'Espèces insuffisantes sur la session hôte — rafraîchissez le résumé.',
			preserveKey: false,
			shouldRefresh: true
		};
	}
	if (/CASH_EXECUTION_REGISTER_MISMATCH|même caisse/i.test(msg)) {
		return {
			message: 'La session hôte doit appartenir à la même caisse.',
			preserveKey: false,
			shouldRefresh: true
		};
	}
	if (/CASH_EXECUTION_OPEN_SESSION_REQUIRED|session ouverte/i.test(msg)) {
		return {
			message: 'Aucune session ouverte sur la même caisse.',
			preserveKey: false,
			shouldRefresh: true
		};
	}
	if (/déjà exécut/i.test(msg)) {
		return {
			message: 'Correction de caisse déjà exécutée.',
			preserveKey: false,
			shouldRefresh: true
		};
	}
	if (/autorisation|permission|FORBIDDEN|403/i.test(msg)) {
		return {
			message: "Vous n'avez pas l'autorisation d'exécuter cette correction de caisse.",
			preserveKey: false,
			shouldRefresh: false
		};
	}
	if (/idempoten|clé/i.test(msg)) {
		return { message: msg, preserveKey: true, shouldRefresh: false };
	}
	return { message: msg || 'Exécution impossible.', preserveKey: true, shouldRefresh: false };
}

export function correctionCopyIsClean(text: string): boolean {
	return !usesRefundWording(text) && !/Rembours/i.test(text);
}
