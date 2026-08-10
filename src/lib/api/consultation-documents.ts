import { api } from '$lib/api/client';

export type ConsultationDocumentType = 'prescription' | 'exam-request' | 'sick-leave';

export async function openConsultationDocument(
	consultationId: number,
	type: ConsultationDocumentType
): Promise<void> {
	const response = await api.get<Blob>(`/api/consultations/${consultationId}/${type}/pdf`, {
		responseType: 'blob'
	});

	const rawContentType = response.headers['content-type'];

	const contentType = typeof rawContentType === 'string' ? rawContentType : 'application/pdf';

	const blob = new Blob([response.data], {
		type: contentType
	});

	const url = URL.createObjectURL(blob);

	const popup = window.open(url, '_blank', 'noopener,noreferrer');

	if (!popup) {
		const link = document.createElement('a');

		link.href = url;
		link.download = `${type}-consultation-${consultationId}.pdf`;

		document.body.appendChild(link);
		link.click();
		link.remove();
	}

	window.setTimeout(() => {
		URL.revokeObjectURL(url);
	}, 60_000);
}
