export type CashMethod = 'CASH' | 'CARD' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CHECK';
export type VarianceKind = 'BALANCED' | 'SHORTAGE' | 'SURPLUS';
export interface CashRegister {
	id: number;
	code: string;
	name: string;
	location: string;
	active: boolean;
}
export interface CashSession {
	id: number;
	cashRegisterId: number;
	openedBy: number;
	openedAt: string;
	openingFloat: number;
	openingNote: string;
	status: 'OPEN' | 'CLOSED';
	closedBy?: number;
	closedAt?: string;
	expectedCashAmount?: number | null;
	countedCashAmount?: number | null;
	cashDifference?: number | null;
	closingNote: string;
	register: CashRegister;
}
/** Backend-authoritative session financial projection (LOT29E-C / 29E-D). FE formats only. */
export interface SessionSummary {
	session: CashSession;
	cashCollected: number;
	nonCashCollected: number;
	totalCollected: number;
	cashPayments: number;
	cardPayments: number;
	mobileMoneyPayments: number;
	bankTransferPayments: number;
	checkPayments: number;
	totalPayments: number;
	operationCount: number;
	expectedCash: number;
	/** LOT29F-C — physical cash journal totals (not revenue). Backend-authoritative. */
	cashMovementIn: number;
	cashMovementOut: number;
	netCashMovement: number;
	cashMovementManualOut?: number;
	cashMovementReversalOut?: number;
	closingProofComplete: boolean;
	finalReconciliation: boolean;
	recoveryClose: boolean;
	varianceKind?: VarianceKind | '';
}
export type CashMovementDirection = 'IN' | 'OUT';
export type CashMovementType = 'MANUAL_IN' | 'MANUAL_OUT';
/** Append-only physical cash journal entry (not a Payment / Refund). */
export interface CashMovement {
	id: number;
	cashSessionId: number;
	direction: CashMovementDirection;
	type: CashMovementType;
	amount: number;
	reason: string;
	referenceType?: string;
	referenceId?: number | null;
	createdBy: number;
	occurredAt: string;
	createdAt: string;
}
export interface SessionListPage {
	items: CashSession[];
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}
export interface SessionListQuery {
	status?: 'OPEN' | 'CLOSED' | '';
	cashRegisterId?: number;
	dateFrom?: string;
	dateTo?: string;
	page?: number;
	limit?: number;
}
export interface CashReceipt {
	id: number;
	receiptNumber: string;
	paymentId: number;
	invoiceId: number;
	patientId: number;
	/** Present for cash-session collection; null/absent for sessionless billing receipts. */
	cashSessionId?: number | null;
	amount: number;
	paymentMethod: CashMethod;
	externalReference: string;
	mobileOperator: string;
	issuedBy: number;
	issuedAt: string;
	invoiceNumber: string;
	patientName: string;
	patientCode: string;
	cashierName: string;
	registerCode: string;
	registerName: string;
	invoiceGrossAmount: number;
	insuranceAmount: number;
	patientAmount: number;
	paidBefore: number;
	balanceAfter: number;
	/** LOT29D-C: underlying payment was fully reversed. */
	paymentReversed?: boolean;
	paymentReversedAt?: string | null;
}
