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
	/** LOT29F-I-A: backend ledger balance (credit − apply − executed refund). */
	ledgerAvailable: number;
	/** LOT29F-I-A: Σ active (en attente / autorisé) refund requests — backend authoritative. */
	reservedForRefund: number;
	/** LOT29F-I-A: ledgerAvailable − reservedForRefund (never computed client-side). */
	spendableCredit: number;
	/** Alias of spendableCredit (apply ceiling). */
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
	| 'CREDIT_APPLICATION_REVERSED'
	| 'REFUND_REQUESTED'
	| 'REFUND_APPROVED'
	| 'REFUND_REJECTED'
	| 'REFUND_CANCELLED'
	| 'REFUND_EXECUTED';

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
	/** Backend: spendable credit (ledger − reserved). */
	creditAvailable: number;
	ledgerCreditAvailable: number;
	reservedForRefund: number;
	spendableCredit: number;
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
	ledgerAvailable: number;
	reservedForRefund: number;
	spendableCredit: number;
	/** Alias of spendableCredit. */
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
	/** Official document number e.g. RMB-YYYY-XXXXXX for REFUND_EXECUTED. */
	documentNumber?: string;
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

/** LOT29F-I-A/I-B refund workflow — EXECUTED is the only money-leaving state. */
export type RefundStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXECUTED';

export type RefundReasonCode =
	| 'DUPLICATE_OR_OVERPAYMENT'
	| 'SERVICE_CANCELLED_OR_NOT_PERFORMED'
	| 'INVOICE_CORRECTION'
	| 'UNUSED_ADVANCE'
	| 'INSURANCE_COVERAGE_AFTER_PAYMENT'
	| 'TRANSFER_OR_DEATH_BEFORE_SERVICE'
	| 'OTHER';

export type RefundBeneficiaryMode = 'HOLDER' | 'ALTERNATE';

export type RefundIntendedMethod = 'UNSPECIFIED' | 'CASH' | 'CARD' | 'MOBILE_MONEY' | 'TRANSFER';

export interface Refund {
	id: number;
	patientId: number;
	holderPartyId: number;
	amount: number;
	status: RefundStatus;
	/** Official RMB-YYYY-XXXXXX — set only when EXECUTED (LOT29F-I-C). */
	refundNumber?: string;
	reasonCode: RefundReasonCode | string;
	reasonComment?: string;
	beneficiaryMode: RefundBeneficiaryMode | string;
	beneficiaryDisplayName: string;
	beneficiaryKind: string;
	beneficiaryPhone?: string;
	beneficiaryRelationship?: string;
	holderConsentRef?: string;
	intendedMethod: RefundIntendedMethod | string;
	methodOverrideReason?: string;
	clinicalAttestationRef?: string;
	requestedBy: number;
	requestedAt: string;
	approvedBy?: number | null;
	approvedAt?: string | null;
	rejectedBy?: number | null;
	rejectedAt?: string | null;
	rejectionReason?: string;
	cancelledBy?: number | null;
	cancelledAt?: string | null;
	cancellationReason?: string;
	idempotencyKey: string;
	createdAt: string;
	updatedAt: string;
	execution?: RefundExecution | null;
}

export interface RefundExecution {
	id: number;
	refundId: number;
	method: string;
	executedBy: number;
	executedAt: string;
	externalReference?: string;
	evidenceReference?: string;
	beneficiaryRailRef?: string;
	cashSessionId?: number | null;
	cashRegisterId?: number | null;
	cashMovementId?: number | null;
	beneficiaryMode: string;
	beneficiaryDisplayName: string;
	beneficiaryKind: string;
	idempotencyKey: string;
	createdAt: string;
}

export interface RefundExecutePayload {
	method?: string;
	externalReference?: string;
	evidenceReference?: string;
	beneficiaryRailRef?: string;
	hostSessionId?: number;
	idempotencyKey: string;
}

export interface RefundPage {
	data: Refund[];
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export type RefundListQuery = {
	page?: number;
	limit?: number;
	status?: string;
	patientId?: number;
	holderPartyId?: number;
	reasonCode?: string;
	dateFrom?: string;
	dateTo?: string;
	refundNumber?: string;
	method?: string;
	executedBy?: number;
};

export interface RefundVoucher {
	refundId: number;
	refundNumber: string;
	clinicHeader: string;
	status: string;
	amount: number;
	patientId: number;
	patientCode?: string;
	patientName?: string;
	holderPartyId: number;
	holderDisplay: string;
	holderKind: string;
	beneficiaryMode: string;
	beneficiaryDisplayName: string;
	beneficiaryKind: string;
	beneficiaryRelationship?: string;
	holderConsentRef?: string;
	reasonCode: string;
	reasonComment?: string;
	clinicalAttestationRef?: string;
	method: string;
	executedAt: string;
	executedBy: number;
	approvedBy: number;
	approvedAt?: string | null;
	requestedBy: number;
	requestedAt: string;
	cashSessionId?: number | null;
	cashRegisterId?: number | null;
	registerCode?: string;
	registerName?: string;
	externalReference?: string;
	evidenceReference?: string;
	beneficiaryRailRef?: string;
	copyLabels: string[];
	signatureZones: string[];
	documentaryNote: string;
}

export interface RefundReportSummary {
	executedRefundCount: number;
	executedRefundAmount: number;
	cashRefundCount: number;
	cashRefundAmount: number;
	externalRefundCount: number;
	externalRefundAmount: number;
	byMethod: { method: string; count: number; amount: number }[];
}

export interface RefundReportRow {
	refundId: number;
	refundNumber: string;
	amount: number;
	method: string;
	executedAt: string;
	executedBy: number;
	patientId: number;
	holderPartyId: number;
	beneficiaryDisplayName: string;
	cashSessionId?: number | null;
	cashRegisterId?: number | null;
	externalReference?: string;
}

export interface RefundReportPage {
	summary: RefundReportSummary;
	data: RefundReportRow[];
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export type RefundReportQuery = {
	page?: number;
	limit?: number;
	dateFrom?: string;
	dateTo?: string;
	method?: string;
	cashRegisterId?: number;
	executedBy?: number;
	patientId?: number;
	holderPartyId?: number;
};

export interface RefundRequestPayload {
	patientId: number;
	holderPartyId: number;
	amount: number;
	reasonCode: string;
	reasonComment?: string;
	beneficiaryMode?: string;
	beneficiaryDisplayName?: string;
	beneficiaryRelationship?: string;
	holderConsentRef?: string;
	intendedMethod?: string;
	methodOverrideReason?: string;
	clinicalAttestationRef?: string;
	idempotencyKey: string;
}

export interface RefundDecisionPayload {
	reason?: string;
	/** OTHER reason code requires explicit managerial approval acknowledgement. */
	managerialApproval?: boolean;
}
