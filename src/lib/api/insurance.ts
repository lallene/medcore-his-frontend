import { api } from '$lib/api/client';
import type { ApiResponse } from '$lib/types/api';
import type {
	AuthorizationFilters,
	AuthorizationPage,
	AuthorizationStatus,
	InsuranceAuthorization,
	InsuranceCompany,
	PatientCoverage
} from '$lib/types/insurance';

export async function getInsuranceCompanies(): Promise<InsuranceCompany[]> {
	const response = await api.get<ApiResponse<InsuranceCompany[]>>('/api/insurance/companies');
	return response.data.data;
}

export async function getInsuranceAuthorizations(
	filters: AuthorizationFilters = {}
): Promise<AuthorizationPage> {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(filters))
		if (value !== undefined && value !== '') params.set(key, String(value));
	const response = await api.get<ApiResponse<AuthorizationPage>>(
		`/api/insurance/authorizations?${params}`
	);
	return response.data.data;
}

export async function getInsuranceAuthorization(id: number): Promise<InsuranceAuthorization> {
	const response = await api.get<ApiResponse<InsuranceAuthorization>>(
		`/api/insurance/authorizations/${id}`
	);
	return response.data.data;
}

export async function createInsuranceAuthorization(payload: {
	patientId: number;
	patientCoverageId: number;
	referenceType: string;
	referenceId: number;
	service?: string;
	requestedAmount?: number | null;
	comment?: string;
}): Promise<InsuranceAuthorization> {
	const response = await api.post<ApiResponse<InsuranceAuthorization>>(
		'/api/insurance/authorizations',
		payload
	);
	return response.data.data;
}

export async function submitInsuranceAuthorization(
	id: number,
	payload: { externalReference?: string; submittedAt?: string }
): Promise<InsuranceAuthorization> {
	const response = await api.post<ApiResponse<InsuranceAuthorization>>(
		`/api/insurance/authorizations/${id}/submit`,
		payload
	);
	return response.data.data;
}

export async function markInsuranceAuthorizationPending(
	id: number
): Promise<InsuranceAuthorization> {
	const response = await api.post<ApiResponse<InsuranceAuthorization>>(
		`/api/insurance/authorizations/${id}/pending`,
		{}
	);
	return response.data.data;
}

export async function decideInsuranceAuthorization(
	id: number,
	payload: {
		status: AuthorizationStatus;
		externalReference: string;
		externalDecisionDate: string;
		approvedRate?: number | null;
		approvedAmount?: number | null;
		patientAmount?: number | null;
		ceilingAmount?: number | null;
		rejectionReason?: string;
		comment?: string;
	}
): Promise<InsuranceAuthorization> {
	const response = await api.post<ApiResponse<InsuranceAuthorization>>(
		`/api/insurance/authorizations/${id}/decision`,
		payload
	);
	return response.data.data;
}

export async function cancelInsuranceAuthorization(id: number): Promise<InsuranceAuthorization> {
	const response = await api.post<ApiResponse<InsuranceAuthorization>>(
		`/api/insurance/authorizations/${id}/cancel`,
		{}
	);
	return response.data.data;
}

export async function getInsuranceCompany(id: number): Promise<InsuranceCompany> {
	const response = await api.get<ApiResponse<InsuranceCompany>>(`/api/insurance/companies/${id}`);
	return response.data.data;
}

export async function getPatientCoverages(patientId: number): Promise<PatientCoverage[]> {
	const response = await api.get<ApiResponse<PatientCoverage[]>>(
		`/api/insurance/coverages/patient/${patientId}`
	);
	return response.data.data;
}
