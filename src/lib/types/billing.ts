export type ActType = 'CONSULTATION' | 'LABORATORY' | 'IMAGING' | 'HOSPITALIZATION' | 'MEDICATION';
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
export interface Tariff {
	id: number;
	actType: ActType;
	referenceId?: number | null;
	code: string;
	label: string;
	unitPrice: number;
	currency: 'XOF';
	effectiveFrom: string;
	effectiveTo?: string | null;
	isActive: boolean;
}
export interface BillableAct {
	actType: ActType;
	referenceId: number;
	billableKey: string;
	label: string;
	date: string;
	quantity: number;
	tariff?: Tariff | null;
	coverageResolution: 'NONE' | 'DIRECT' | 'COVERED';
	authorizationNumber?: string;
	alreadyBilled: boolean;
}
export interface InvoiceLine {
	id: number;
	actType: ActType;
	referenceId: number;
	description: string;
	quantity: number;
	unitPrice: number;
	grossAmount: number;
	insuranceAmount: number;
	patientAmount: number;
	authorizationNumber?: string;
	coverageResolution: 'NONE' | 'DIRECT' | 'COVERED';
	coverageStatus?: string;
	coveragePending: boolean;
}
export interface Payment {
	id: number;
	amount: number;
	paymentMethod: string;
	reference?: string;
	paidAt: string;
	receivedBy: number;
}
export interface Invoice {
	id: number;
	number: string;
	patientId: number;
	patientName: string;
	patientCode: string;
	status: InvoiceStatus;
	grossAmount: number;
	insuranceAmount: number;
	patientAmount: number;
	paidAmount: number;
	balanceAmount: number;
	coveragePending: boolean;
	issuedAt?: string | null;
	createdAt: string;
	lines?: InvoiceLine[];
	payments?: Payment[];
}
export interface InvoicePage {
	data: Invoice[];
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}
export interface BillingKPIs {
	pendingInvoices: number;
	patientReceivable: number;
	paidInvoices: number;
	insuranceExpected: number;
}
