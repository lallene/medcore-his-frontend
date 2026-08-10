import { api } from '$lib/api/client';

import type { ApiResponse } from '$lib/types/api';
import type {
	CreatePatientPayload,
	Patient,
	PatientListMeta,
	PatientListResult
} from '$lib/types/patient';

export async function getPatients(page = 1, limit = 20): Promise<PatientListResult> {
	const response = await api.get<ApiResponse<Patient[], PatientListMeta>>('/api/patients', {
		params: {
			page,
			limit
		}
	});

	if (!response.data.meta) {
		throw new Error('Métadonnées de pagination absentes.');
	}

	return {
		data: response.data.data,
		meta: response.data.meta
	};
}

export async function getPatient(id: number): Promise<Patient> {
	const response = await api.get<ApiResponse<Patient>>(`/api/patients/${id}`);

	return response.data.data;
}

export async function createPatient(payload: CreatePatientPayload): Promise<Patient> {
	const response = await api.post<ApiResponse<Patient>>('/api/patients', payload);

	return response.data.data;
}
