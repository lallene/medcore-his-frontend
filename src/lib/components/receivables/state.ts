import type { ReceivableItem } from '$lib/types/receivables';
export const receivableCan = (permissions: string[], permission: string) =>
	permissions.includes('*') || permissions.includes(permission);
export const statusLabel: Record<string, string> = {
	DUE: 'À payer',
	PARTIALLY_PAID: 'Partiellement payé',
	OVERDUE: 'Échu',
	PAID: 'Payé'
};
export const totalPatientBalance = (rows: ReceivableItem[]) =>
	rows.reduce((sum, row) => sum + Math.max(row.patientDue - row.patientPaid, 0), 0);
export const cashLink = (invoiceId: number) => `/cash?invoiceId=${invoiceId}`;
