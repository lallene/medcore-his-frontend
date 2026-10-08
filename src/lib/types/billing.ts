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
	/** LOT29F-H-B immutable payer snapshot. */
	payerPartyId?: number | null;
	payerKind?: string | null;
	payerDisplayName?: string | null;
	payerPhone?: string | null;
	payerRelationship?: string | null;
	payerIsPatient?: boolean;
	payerProvenance?: string | null;
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
	customerCredit?: number;
	holderPartyId?: number | null;
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
	/** LOT29F-B/H-C decorations */
	creditedAmount?: number;
	effectivePatientAmount?: number;
	effectiveBalanceAmount?: number;
	customerCreditAmount?: number;
	creditHolderPartyId?: number | null;
	creditNote?: CreditNote | null;
	/** LOT29F-H-D: credit applications settle receivable without increasing paidAmount/CashCollected. */
	creditAppliedAmount?: number;
	moneyPaidAmount?: number;
	totalSettledAmount?: number;
}

export interface CreditSummary {
	holderPartyId: number;
	patientId: number;
	totalCredited: number;
	totalApplied: number;
	totalRefunded: number;
	availableCredit: number;
}

export interface CreditApplicationResult {
	application: {
		id: number;
		holderPartyId: number;
		patientId: number;
		invoiceId: number;
		amount: number;
		idempotencyKey: string;
		createdAt: string;
	};
	amountApplied: number;
	remainingAvailableCredit: number;
	remainingReceivable: number;
	invoiceStatus: string;
	invoiceId: number;
	holderPartyId: number;
	patientId: number;
	creditAppliedOnInvoice: number;
	moneyPaidOnInvoice: number;
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

/** LOT29F-H-E read-only patient financial statement (backend-authoritative). */
export type FinancialHistoryEventType =
	| 'INVOICE_ISSUED'
	| 'PAYMENT_RECEIVED'
	| 'PAYMENT_REVERSED'
	| 'CREDIT_NOTE_ISSUED'
	| 'CREDIT_EARNED'
	| 'CREDIT_APPLIED'
	| 'CREDIT_APPLICATION_REVERSED';

export interface FinancialStatementSummary {
	grossPatientObligation: number;
	creditNoteReduction: number;
	correctedPatientObligation: number;
	effectiveMoneyPaid: number;
	creditApplied: number;
	totalSettled: number;
	receivableOutstanding: number;
	creditEarned: number;
	creditRestored: number;
	creditUsed: number;
	creditAvailable: number;
}

export interface FinancialStatementInvoiceLine {
	invoiceId: number;
	number: string;
	status: string;
	issuedAt?: string | null;
	createdAt: string;
	grossPatientObligation: number;
	creditNoteReduction: number;
	correctedObligation: number;
	effectiveMoneyPaid: number;
	creditApplied: number;
	totalSettled: number;
	remainingReceivable: number;
	creditNoteId?: number;
	creditNoteNumber?: string;
}

export interface FinancialStatementHolder {
	holderPartyId: number;
	kind: string;
	displayName: string;
	phone?: string;
	creditEarned: number;
	creditRestored: number;
	creditUsed: number;
	creditRefunded: number;
	availableCredit: number;
}

export interface FinancialStatement {
	patientId: number;
	patientCode: string;
	patientName: string;
	asOf: string;
	summary: FinancialStatementSummary;
	invoices: FinancialStatementInvoiceLine[];
	holders: FinancialStatementHolder[];
	patientCreditTotalAvailable: number;
}

export interface FinancialHistoryEvent {
	eventType: FinancialHistoryEventType | string;
	occurredAt: string;
	amount: number;
	sourceType: string;
	sourceId: number;
	invoiceId?: number;
	invoiceNumber?: string;
	holderPartyId?: number;
	paymentId?: number;
	creditNoteId?: number;
	creditApplicationId?: number;
	payerDisplay?: string;
	payerProvenance?: string;
	payerUnknown?: boolean;
	label: string;
	sortKey: string;
}

export interface FinancialHistoryPage {
	data: FinancialHistoryEvent[];
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export type FinancialHistoryQuery = {
	page?: number;
	limit?: number;
	dateFrom?: string;
	dateTo?: string;
	eventType?: string;
	invoiceId?: number;
	holderPartyId?: number;
};
