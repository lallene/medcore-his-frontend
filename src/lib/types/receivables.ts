export type ReceivableStatus = 'DUE' | 'PARTIALLY_PAID' | 'OVERDUE' | 'PAID';
export interface ReceivableItem {
	invoiceId: number;
	invoiceNumber: string;
	patientId: number;
	patientName: string;
	patientCode: string;
	invoiceDate: string;
	invoiceStatus: string;
	grossAmount: number;
	insuranceAmount: number;
	patientDue: number;
	patientPaid: number;
	patientBalance: number;
	dueDate?: string | null;
	status: ReceivableStatus;
	lastPaymentAt: string;
	coveragePending: boolean;
	descriptions: string;
}
export interface ReceivablePage {
	items: ReceivableItem[];
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}
export interface ReceivableKPIs {
	totalReceivables: number;
	overdueReceivables: number;
	nonOverdueReceivables: number;
	collectedAmount: number;
	debtorPatients: number;
	unpaidInvoices: number;
}
export interface ReceivableFollowUp {
	id: number;
	invoiceId: number;
	patientId: number;
	actionType: string;
	note: string;
	promisedPaymentDate?: string | null;
	promisedAmount?: number | null;
	createdBy: number;
	createdAt: string;
}
export interface ReceivablePayment {
	id: number;
	amount: number;
	paymentMethod: string;
	reference: string;
	paidAt: string;
	receiptId: number;
	receiptNumber: string;
}
export interface ReceivableDetail extends ReceivableItem {
	lines: {
		description: string;
		actType: string;
		grossAmount: number;
		insuranceAmount: number;
		patientAmount: number;
	}[];
	payments: ReceivablePayment[];
	followUps: ReceivableFollowUp[];
}
