import type { CashMethod, CashSession, SessionSummary } from '$lib/types/cash';
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
export const cashKpis = (s: SessionSummary) => ({
	opening: s.session.openingFloat,
	cash: s.cashPayments,
	other: s.totalPayments - s.cashPayments,
	total: s.totalPayments,
	count: s.operationCount,
	expected: s.session.openingFloat + s.cashPayments
});
export const difference = (counted: number, expected: number) => counted - expected;
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
	expected: number
): boolean {
	if (recoveryNoteRequired(session, userId)) return true;
	return difference(counted, expected) !== 0;
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
