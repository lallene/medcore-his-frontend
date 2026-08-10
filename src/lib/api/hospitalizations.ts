import { api } from '$lib/api/client';
import type { ApiResponse } from '$lib/types/api';
import type {
	CreateHospitalizationPayload,
	Hospitalization,
	HospitalizationFilters,
	HospitalizationListMeta,
	HospitalizationListResult
} from '$lib/types/hospitalization';

export async function listHospitalizations(
	filters: HospitalizationFilters = {}
): Promise<HospitalizationListResult> {
	const response = await api.get<ApiResponse<Hospitalization[], HospitalizationListMeta>>(
		'/api/hospitalizations',
		{ params: filters }
	);
	if (!response.data.meta) throw new Error('Pagination hospitalisations absente de la réponse.');
	return { data: response.data.data, meta: response.data.meta };
}
export async function listPatientHospitalizations(patientId: number): Promise<Hospitalization[]> {
	const response = await api.get<ApiResponse<Hospitalization[]>>(
		`/api/patients/${patientId}/hospitalizations`
	);
	return response.data.data;
}
export async function getHospitalization(id: number): Promise<Hospitalization> {
	const response = await api.get<ApiResponse<Hospitalization>>(`/api/hospitalizations/${id}`);
	return response.data.data;
}
export async function getHospitalizationByConsultation(
	consultationId: number
): Promise<Hospitalization | null> {
	try {
		const response = await api.get<ApiResponse<Hospitalization>>(
			`/api/hospitalizations/consultation/${consultationId}`
		);
		return response.data.data;
	} catch (error: unknown) {
		if (
			typeof error === 'object' &&
			error !== null &&
			'response' in error &&
			(error as { response?: { status?: number } }).response?.status === 404
		)
			return null;
		throw error;
	}
}
export async function createHospitalization(
	payload: CreateHospitalizationPayload
): Promise<Hospitalization> {
	const response = await api.post<ApiResponse<Hospitalization>>('/api/hospitalizations', payload);
	return response.data.data;
}
export async function admitHospitalization(
	id: number,
	payload: { admittedAt?: string; admissionDiagnosis?: string }
): Promise<Hospitalization> {
	const response = await api.post<ApiResponse<Hospitalization>>(
		`/api/hospitalizations/${id}/admit`,
		payload
	);
	return response.data.data;
}
export async function dischargeHospitalization(
	id: number,
	payload: { dischargedAt?: string; dischargeDiagnosis: string; dischargeSummary: string }
): Promise<Hospitalization> {
	const response = await api.post<ApiResponse<Hospitalization>>(
		`/api/hospitalizations/${id}/discharge`,
		payload
	);
	return response.data.data;
}
export async function cancelHospitalization(id: number): Promise<Hospitalization> {
	const response = await api.post<ApiResponse<Hospitalization>>(
		`/api/hospitalizations/${id}/cancel`,
		{}
	);
	return response.data.data;
}
