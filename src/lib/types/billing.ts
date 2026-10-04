export type ActType =
	'CONSULTATION' | 'LABORATORY' | 'IMAGING' | 'HOSPITALIZATION' | 'MEDICATION' | 'PERFORMED_ACT';
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
	cashSessionId?: number | null;
	/** LOT29F-D: OPEN/CLOSED when payment is session-linked (backend decoration). */
	cashSessionStatus?: 'OPEN' | 'CLOSED' | string | null;
	/** Canonical cash_receipts id when issued (LOT29D-B). */
	receiptId?: number | null;
	receiptNumber?: string | null;
	/** LOT29D-C full reversal decoration. */
	reversed?: boolean;
	reversalId?: number | null;
	reversedAt?: string | null;
	reversalReason?: string | null;
	reversedBy?: number | null;
	/** LOT29F-E′: derived when reversal occurred after CashSession.ClosedAt. */
	postCloseCorrection?: boolean;
	/** LOT29F-F: physical correction execution on a later OPEN host session. */
	cashCorrectionExecuted?: boolean;
	cashCorrectionExecutionId?: number | null;
	cashCorrectionExecutedAt?: string | null;
	cashCorrectionHostSessionId?: number | null;
}
/** LOT29F-B immutable credit note projection on invoice / document. */
export interface CreditNote {
	id: number;
	number: string;
	invoiceId: number;
	amount: number;
	reason: string;
	issuedBy: number;
	issuedAt: string;
	createdAt: string;
	invoiceNumber?: string;
	invoiceGrossAmount?: number;
	patientAmount?: number;
	patientId?: number;
	patientName?: string;
	patientCode?: string;
	issuerName?: string;
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
	/** LOT29F-B decorations */
	creditedAmount?: number;
	effectivePatientAmount?: number;
	effectiveBalanceAmount?: number;
	creditNote?: CreditNote | null;
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
