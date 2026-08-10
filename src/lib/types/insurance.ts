export interface InsuranceCompany {
	id: number;
	code: string;
	name: string;
	description?: string;
	phone?: string;
	email?: string;
	city?: string;
	country?: string;
	isActive: boolean;
}

export interface CompanyRow extends Record<string, unknown> {
	id: number;
	code: string;
	name: string;
	city: string;
	status: string;
}

export interface PatientCoverage {
	id: number;
	patientId: number;
	patientName?: string;
	companyName?: string;
	guarantorName?: string;
	memberNumber: string;
	subscriber: string;
	beneficiary: string;
	coverageRate: number;
	validFrom?: string;
	validTo?: string;
	isPrincipal: boolean;
	isActive: boolean;
}

export interface PatientInsuranceView {
	source: 'structured' | 'legacy' | 'none';
	insured: boolean;
	status: string;
	organization: string;
	guarantor: string;
	memberNumber: string;
	subscriber: string;
	beneficiary: string;
	coverageRate: number;
	validFrom: string;
	validTo: string;
}
