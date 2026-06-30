export interface CreateVoucherPayload {
	patientId: number;
	coverageId: number;
	companyId: number;
	guarantorId: number;
	reason: string;
	amount: number;
}

export interface InsuranceVoucher {
	id: number;
	patientId: number;
	patientName?: string;
	companyId: number;
	companyName?: string;
	status: string;
	reason: string;
	estimatedAmount: number;
}
