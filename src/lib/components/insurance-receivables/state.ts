export const insuranceReceivableStatusLabel: Record<string, string> = {
	UNPAID: 'Non réglé',
	PARTIALLY_PAID: 'Partiellement réglé',
	PAID: 'Réglé',
	OVERDUE: 'En retard'
};
export const insuranceReceivableCan = (permissions: string[], permission: string) =>
	permissions.includes('*') || permissions.includes(permission);
export const insurerBalance = (due: number, paid: number) => Math.max(due - paid, 0);
export const settlementUnallocated = (total: number, allocated: number) =>
	Math.max(total - allocated, 0);
