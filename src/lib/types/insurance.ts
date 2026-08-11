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

export type AuthorizationReferenceType =
	| 'CONSULTATION'
	| 'LABORATORY'
	| 'IMAGING'
	| 'HOSPITALIZATION'
	| 'PROCEDURE'
	| 'MEDICATION'
	| 'OTHER';
export type AuthorizationStatus =
	'DRAFT' | 'SUBMITTED' | 'PENDING' | 'APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED' | 'CANCELLED';

export interface InsuranceAuthorization {
	id: number;
	authorizationNumber: string;
	patientId: number;
	medicalRecordId: number;
	patientCoverageId: number;
	insuranceCompanyId: number;
	guarantorId: number;
	referenceType: AuthorizationReferenceType;
	referenceId: number;
	referenceLabel: string;
	service: string;
	requestedAmount: number | null;
	requestedAt: string;
	status: AuthorizationStatus;
	externalReference: string;
	externalDecisionDate: string | null;
	approvedRate: number | null;
	approvedAmount: number | null;
	insuranceAmount: number | null;
	patientAmount: number | null;
	ceilingAmount: number | null;
	rejectionReason: string;
	comment: string;
	patientName: string;
	patientCode: string;
	companyName: string;
	memberNumber: string;
	contractRate: number;
	guarantorName: string;
	createdAt: string;
}

export interface AuthorizationPage {
	items: InsuranceAuthorization[];
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
}

export interface AuthorizationFilters {
	search?: string;
	status?: string;
	referenceType?: string;
	service?: string;
	companyId?: number;
	patientId?: number;
	dateFrom?: string;
	dateTo?: string;
	page?: number;
	pageSize?: number;
}
