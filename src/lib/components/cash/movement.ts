import type { CashMovementDirection, CashMovementType, CashSession } from '$lib/types/cash';
import { cashCan, classifyCashCommandError } from './state.ts';

export const MOVEMENT_CREATE_PERMISSION = 'cash.movement.create';
export const MOVEMENT_READ_PERMISSION = 'cash.movement.read';
export const MOVEMENT_IN_LABEL = 'Entrée de caisse';
export const MOVEMENT_OUT_LABEL = 'Sortie de caisse';
export const MIN_MOVEMENT_REASON_LEN = 3;
export const MAX_MOVEMENT_REASON_LEN = 500;

export function canShowCreateMovement(
	session: CashSession | undefined | null,
	permissions: string[]
): boolean {
	if (!session || session.status !== 'OPEN') return false;
	return cashCan(permissions, MOVEMENT_CREATE_PERMISSION);
}

export function canShowMovementJournal(permissions: string[]): boolean {
	return cashCan(permissions, MOVEMENT_READ_PERMISSION);
}

export function movementTypeForDirection(direction: CashMovementDirection): CashMovementType {
	return direction === 'IN' ? 'MANUAL_IN' : 'MANUAL_OUT';
}

export function validateMovementReason(
	raw: string
): { ok: true; reason: string } | { ok: false; message: string } {
	const reason = raw.trim();
	if (!reason) return { ok: false, message: 'Motif obligatoire.' };
	if (reason.length < MIN_MOVEMENT_REASON_LEN) return { ok: false, message: 'Motif trop court.' };
	if (reason.length > MAX_MOVEMENT_REASON_LEN) return { ok: false, message: 'Motif trop long.' };
	return { ok: true, reason };
}

export function validateMovementAmount(
	amount: number
): { ok: true } | { ok: false; message: string } {
	if (!Number.isFinite(amount) || !Number.isInteger(amount)) {
		return { ok: false, message: 'Montant invalide.' };
	}
	if (amount <= 0) return { ok: false, message: 'Le montant doit être strictement positif.' };
	return { ok: true };
}

/** Soft FE warning only — backend remains expected-cash authority. */
export function warnOutExceedsExpected(
	direction: CashMovementDirection,
	amount: number,
	backendExpected: number
): string | null {
	if (direction !== 'OUT') return null;
	if (amount > backendExpected) {
		return 'Montant supérieur aux espèces théoriques affichées — le serveur décidera.';
	}
	return null;
}

export function classifyMovementError(error: unknown): {
	message: string;
	preserveKey: boolean;
} {
	const base = classifyCashCommandError(error);
	const msg = base.message;
	if (/espèces insuffisantes|insufficient|expected/i.test(msg)) {
		return {
			message: 'Sortie refusée — espèces théoriques insuffisantes.',
			preserveKey: false
		};
	}
	if (/session.*ferm|CLOSED|clôtur/i.test(msg)) {
		return { message: 'Mouvement impossible — session fermée.', preserveKey: false };
	}
	if (base.preserveKey) return base;
	if (/autorisation|permission|FORBIDDEN|403/i.test(msg)) {
		return {
			message: "Vous n'avez pas l'autorisation de créer un mouvement de caisse.",
			preserveKey: false
		};
	}
	return base;
}

export function movementCopyIsSafe(text: string): boolean {
	return !/rembours|refund|paiement|payment|avoir|crédit patient/i.test(text);
}
