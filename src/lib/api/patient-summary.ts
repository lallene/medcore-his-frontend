import { api } from '$lib/api/client';
import type { PatientSummary } from '$lib/types/patient-summary';

export async function getPatientSummary(patientId: number): Promise<PatientSummary> {
	const response = await api.get<PatientSummary>(`/api/patients/${patientId}/summary`);

	return response.data;
}
