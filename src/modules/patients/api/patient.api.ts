import { api } from '$lib/api/client';
import type { ApiResponse } from '$lib/types/api';
import type { CreatePatientPayload, Patient } from '../types/patient';

export async function getPatients(): Promise<Patient[]> {
	const response = await api.get<ApiResponse<Patient[]>>('/api/patients');
	return response.data.data;
}

export async function createPatient(payload: CreatePatientPayload): Promise<Patient> {
	const response = await api.post<ApiResponse<Patient>>('/api/patients', payload);
	return response.data.data;
}

export async function getPatient(id: number): Promise<Patient> {
	const response = await api.get<ApiResponse<Patient>>(`/api/patients/${id}`);
	return response.data.data;
}
