export interface CreateVoucherPayload {
	patientId: number;
	coverageId: number;
	companyId: number;
	guarantorId: number;

	reason?: string;

	/**
	 * Ancien champ (compatibilité)
	 */
	amount?: number;

	/**
	 * Nouveau modèle MedCore
	 */
	grossAmount: number;

	consultationId?: number;
	issueDate?: string;
	notes?: string;
}

export interface InsuranceVoucher {
	id: number;
	voucherNumber: string;

	patientId: number;
	patientName?: string;

	companyId: number;
	companyName?: string;

	status: string;
	reason?: string;

	grossAmount: number;
	coveredAmount: number;
	patientAmount: number;
	amount?: number;
}
