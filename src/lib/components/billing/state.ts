import type { Invoice } from '$lib/types/billing';
export const formatXOF = (amount: number) =>
	`${new Intl.NumberFormat('fr-FR').format(amount)} FCFA`;
export const can = (permissions: string[], permission: string) =>
	permissions.includes('*') || permissions.includes(permission);
export const invoiceBalance = (invoice: Pick<Invoice, 'patientAmount' | 'paidAmount'>) =>
	Math.max(0, invoice.patientAmount - invoice.paidAmount);
export const paymentAllowed = (invoice: Invoice) =>
	['ISSUED', 'PARTIALLY_PAID'].includes(invoice.status) && invoice.balanceAmount > 0;
export const printableRows = (invoice: Invoice) =>
	(invoice.lines ?? []).map((line) => ({
		description: line.description,
		quantity: line.quantity,
		unitPrice: line.unitPrice,
		gross: line.grossAmount,
		insurance: line.insuranceAmount,
		patient: line.patientAmount
	}));
