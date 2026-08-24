export type InsuranceReceivableStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
export interface InsuranceReceivable {
	invoiceLineId: number;
	invoiceId: number;
	patientId: number;
	insuranceCompanyId: number;
	invoiceNumber: string;
	patientName: string;
	patientCode: string;
	companyName: string;
	authorizationId?: number;
	authorizationNumber: string;
	coverageResolution: string;
	actType: string;
	description: string;
	invoiceDate: string;
	grossAmount: number;
	insuranceDue: number;
	insurancePaid: number;
	insuranceBalance: number;
	dueDate?: string | null;
	status: InsuranceReceivableStatus;
	batchNumber: string;
}
export interface InsuranceReceivableFollowUp {
	id: number;
	invoiceLineId: number;
	type: string;
	note: string;
	followedUpAt: string;
	createdBy: number;
}
export interface InsuranceReceivableDetail extends InsuranceReceivable {
	followUps: InsuranceReceivableFollowUp[];
	allocations: InsuranceSettlementAllocation[];
}
export interface InsuranceReceivablePage {
	items: InsuranceReceivable[];
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}
export interface InsuranceReceivableKPIs {
	totalReceivables: number;
	settledAmount: number;
	overdueAmount: number;
	unallocatedAmount: number;
	pendingInvoices: number;
	debtorCompanies: number;
}
export interface InsuranceCompanyDebt {
	insuranceCompanyId: number;
	companyName: string;
	billed: number;
	paid: number;
	balance: number;
	unallocated: number;
	invoices: number;
	patients: number;
}
export interface InsuranceSettlementAllocation {
	id: number;
	settlementId: number;
	invoiceId: number;
	invoiceLineId: number;
	insuranceAuthorizationId?: number;
	amount: number;
	createdBy: number;
	createdAt: string;
}
export interface InsuranceSettlement {
	id: number;
	settlementNumber: string;
	insuranceCompanyId: number;
	companyName: string;
	externalReference: string;
	receivedAt: string;
	totalAmount: number;
	paymentMethod: string;
	bankReference: string;
	comment: string;
	status: 'DRAFT' | 'POSTED' | 'CANCELLED';
	idempotencyKey: string;
	createdBy: number;
	postedBy?: number;
	postedAt?: string;
	allocatedAmount: number;
	unallocatedAmount: number;
	allocations: InsuranceSettlementAllocation[];
}
export interface InsuranceBatch {
	id: number;
	batchNumber: string;
	insuranceCompanyId: number;
	companyName: string;
	periodFrom?: string;
	periodTo?: string;
	externalReference: string;
	comment: string;
	status: 'DRAFT' | 'SUBMITTED' | 'ACKNOWLEDGED' | 'CLOSED';
	submittedBy?: number;
	submittedAt?: string;
	createdBy: number;
	invoiceCount: number;
	totalAmount: number;
	items?: { id: number; invoiceLineId: number; invoiceId: number; amount: number }[];
}
