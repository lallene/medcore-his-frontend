import { api } from '$lib/api/client';
import type { ConsultationSOAP, UpsertConsultationSOAPPayload } from '$lib/types/soap';

export async function getConsultationSOAP(
	consultationId: number
): Promise<ConsultationSOAP | null> {
	try {
		const response = await api.get<ConsultationSOAP>(`/api/consultations/${consultationId}/soap`);

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

export async function saveConsultationSOAP(
	consultationId: number,
	payload: UpsertConsultationSOAPPayload
): Promise<ConsultationSOAP> {
	const response = await api.put<ConsultationSOAP>(
		`/api/consultations/${consultationId}/soap`,
		payload
	);

	return response.data;
}
