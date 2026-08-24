import type { CashMethod, SessionSummary } from '$lib/types/cash';
export const methods: { value: CashMethod; label: string }[] = [
	{ value: 'CASH', label: 'Espèces' },
	{ value: 'CARD', label: 'Carte bancaire' },
	{ value: 'MOBILE_MONEY', label: 'Mobile Money' },
	{ value: 'BANK_TRANSFER', label: 'Virement' },
	{ value: 'CHECK', label: 'Chèque' }
];
export const needsReference = (m: CashMethod) => m === 'BANK_TRANSFER' || m === 'CHECK';
export const needsOperator = (m: CashMethod) => m === 'MOBILE_MONEY';
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
