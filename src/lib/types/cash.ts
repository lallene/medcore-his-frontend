export type CashMethod = 'CASH' | 'CARD' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CHECK';
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
	expectedCashAmount?: number;
	countedCashAmount?: number;
	cashDifference?: number;
	closingNote: string;
	register: CashRegister;
}
export interface SessionSummary {
	session: CashSession;
	cashPayments: number;
	cardPayments: number;
	mobileMoneyPayments: number;
	bankTransferPayments: number;
	checkPayments: number;
	totalPayments: number;
	operationCount: number;
	expectedCash: number;
}
export interface CashReceipt {
	id: number;
	receiptNumber: string;
	paymentId: number;
	invoiceId: number;
	patientId: number;
	cashSessionId: number;
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
}
