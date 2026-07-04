import { api } from '$lib/api/client';
import type { MedicationPresentation } from '$lib/types/pharmacy';

export async function getMedicationPresentations(): Promise<MedicationPresentation[]> {
	const response = await api.get<MedicationPresentation[]>('/api/pharmacy/presentations');
	return response.data;
}