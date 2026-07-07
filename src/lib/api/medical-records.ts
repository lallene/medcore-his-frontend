import { api } from '$lib/api/client';
import type { PatientMedicalSummary } from '$lib/types/medical-record';

type MaybeWrapped<T> = T | { data: T };

function unwrap<T>(payload: MaybeWrapped<T>): T {
	if (payload && typeof payload === 'object' && 'data' in payload) {
		return payload.data;
	}

	return payload as T;
}

export async function getPatientMedicalSummary(patientId: number): Promise<PatientMedicalSummary> {
	const response = await api.get<MaybeWrapped<PatientMedicalSummary>>(
		`/api/patients/${patientId}/medical-summary`
	);

	return unwrap(response.data);
}
