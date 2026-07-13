import { api } from '$lib/api/client';

import type { ClinicalTimelineEvent } from '$lib/types/clinical-timeline';

export async function getClinicalTimeline(recordId: number): Promise<ClinicalTimelineEvent[]> {
	const response = await api.get<ClinicalTimelineEvent[]>(
		`/api/medical-records/${recordId}/timeline`
	);

	return response.data;
}
