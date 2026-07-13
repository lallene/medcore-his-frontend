import { api } from '$lib/api/client';

import type {
	ConsultationSpecialtyResponse,
	UpsertConsultationSpecialtyPayload
} from '$lib/types/specialty';

export async function getConsultationSpecialty(
	consultationId: number
): Promise<ConsultationSpecialtyResponse | null> {
	try {
		const response = await api.get<ConsultationSpecialtyResponse>(
			`/api/consultations/${consultationId}/specialty`
		);

		return response.data;
	} catch (error: unknown) {
		if (typeof error === 'object' && error !== null && 'response' in error) {
			const response = (
				error as {
					response?: {
						status?: number;
					};
				}
			).response;

			if (response?.status === 404) {
				return null;
			}
		}

		throw error;
	}
}

export async function saveConsultationSpecialty(
	consultationId: number,
	payload: UpsertConsultationSpecialtyPayload
): Promise<ConsultationSpecialtyResponse> {
	const response = await api.put<ConsultationSpecialtyResponse>(
		`/api/consultations/${consultationId}/specialty`,
		payload
	);

	return response.data;
}
