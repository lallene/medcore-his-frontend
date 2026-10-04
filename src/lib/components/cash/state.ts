import type { CashMethod, CashSession, SessionSummary, VarianceKind } from '$lib/types/cash';
export const methods: { value: CashMethod; label: string }[] = [
	{ value: 'CASH', label: 'Espèces' },
	{ value: 'CARD', label: 'Carte bancaire' },
	{ value: 'MOBILE_MONEY', label: 'Mobile Money' },
	{ value: 'BANK_TRANSFER', label: 'Virement' },
	{ value: 'CHECK', label: 'Chèque' }
];
export const needsReference = (m: CashMethod) => m === 'BANK_TRANSFER' || m === 'CHECK';
export const needsOperator = (m: CashMethod) => m === 'MOBILE_MONEY';
export const CLOSE_ANY_PERMISSION = 'cash.session.close_any';

const varianceLabels: Record<VarianceKind, string> = {
	BALANCED: 'Caisse équilibrée',
	SHORTAGE: 'Écart négatif (manquants)',
	SURPLUS: 'Écart positif (excédent)'
};

/**
 * Presentation mapping of backend SessionSummary — NOT a financial calculator.
 * expected/cash/nonCash/total/count are taken from the server projection only.
 */
export function presentSessionSummary(s: SessionSummary | null | undefined) {
	if (!s) return null;
	return {
		opening: s.session.openingFloat,
		cash: s.cashCollected,
		other: s.nonCashCollected,
		total: s.totalCollected,
		count: s.operationCount,
		expected: s.expectedCash,
		movementIn: s.cashMovementIn ?? 0,
		movementOut: s.cashMovementOut ?? 0,
		netMovement: s.netCashMovement ?? 0,
		manualOut: s.cashMovementManualOut ?? 0,
		reversalOut: s.cashMovementReversalOut ?? 0,
		card: s.cardPayments,
		mobile: s.mobileMoneyPayments,
		transfer: s.bankTransferPayments,
		check: s.checkPayments
	};
}

/**
 * Final CLOSED reconciliation proof from backend only.
 * Incomplete legacy CLOSED → null (no fake zeros).
 */
export function presentClosedSnapshot(s: SessionSummary | null | undefined) {
	if (!s || s.session.status !== 'CLOSED') return null;
	if (!s.finalReconciliation || !s.closingProofComplete) return null;
	const kind = (s.varianceKind || '') as VarianceKind | '';
	return {
		expected: s.session.expectedCashAmount ?? s.expectedCash,
		counted: s.session.countedCashAmount ?? null,
		difference: s.session.cashDifference ?? null,
		varianceKind: kind || null,
		varianceLabel: kind ? varianceLabels[kind] : null,
		closingNote: s.session.closingNote || '',
		openedBy: s.session.openedBy,
		closedBy: s.session.closedBy ?? null,
		openedAt: s.session.openedAt,
		closedAt: s.session.closedAt ?? null,
		openingNote: s.session.openingNote || '',
		recoveryClose: s.recoveryClose
	};
}

export function canShowClosingReport(s: SessionSummary | null | undefined): boolean {
	return Boolean(s?.finalReconciliation && s.closingProofComplete);
}

export function isIncompleteClosed(s: SessionSummary | null | undefined): boolean {
	return Boolean(s && s.session.status === 'CLOSED' && !s.finalReconciliation);
}

/**
 * Form-only draft gap while the cashier types counted cash.
 * Not financial authority — close result uses backend cashDifference.
 */
export function draftCloseGap(counted: number, backendExpected: number) {
	return counted - backendExpected;
}

export const cashCan = (permissions: string[], permission: string) =>
	permissions.includes('*') || permissions.includes(permission);

/** Opener-owned session: collect/normal-close only when authenticated user opened it. */
export function isSessionOpener(
	session: CashSession | undefined | null,
	userId: number | null
): boolean {
	if (!session || !userId) return false;
	return session.openedBy === userId;
}

export function canCollectOnSession(
	session: CashSession | undefined | null,
	userId: number | null,
	permissions: string[]
): boolean {
	return cashCan(permissions, 'cash.payment.create') && isSessionOpener(session, userId);
}

export function canCloseOwnSession(
	session: CashSession | undefined | null,
	userId: number | null,
	permissions: string[]
): boolean {
	return cashCan(permissions, 'cash.session.close') && isSessionOpener(session, userId);
}

export function canRecoverCloseSession(permissions: string[]): boolean {
	return cashCan(permissions, CLOSE_ANY_PERMISSION);
}

export function recoveryNoteRequired(
	session: CashSession | undefined | null,
	userId: number | null
): boolean {
	return Boolean(session && userId && session.openedBy !== userId);
}

export function closeNoteRequired(
	session: CashSession | undefined | null,
	userId: number | null,
	counted: number,
	backendExpected: number
): boolean {
	if (recoveryNoteRequired(session, userId)) return true;
	return draftCloseGap(counted, backendExpected) !== 0;
}

export function classifyCashCommandError(error: unknown): {
	message: string;
	preserveKey: boolean;
} {
	const msg = error instanceof Error ? error.message : 'Opération caisse impossible';
	const lower = msg.toLowerCase();
	if (
		lower.includes('réseau') ||
		lower.includes('network') ||
		lower.includes('timeout') ||
		lower.includes('indétermin')
	) {
		return { message: msg, preserveKey: true };
	}
	if (lower.includes("clé d'idempotence") || lower.includes('idempoten')) {
		return { message: msg, preserveKey: true };
	}
	return { message: msg, preserveKey: false };
}
