import axios from 'axios';

/** LOT28B: stale expectedVersion / lifecycle conflict from consultation APIs. */
export function isConsultationOccConflict(error: unknown): boolean {
	if (!axios.isAxiosError(error)) return false;
	return error.response?.status === 409;
}

export function consultationOccUserMessage(error: unknown, fallback: string): string {
	if (!isConsultationOccConflict(error)) {
		return error instanceof Error ? error.message : fallback;
	}
	const data = axios.isAxiosError(error) ? error.response?.data : undefined;
	if (data && typeof data === 'object') {
		const errField = (data as { error?: unknown }).error;
		if (typeof errField === 'string' && errField.trim()) return errField;
		const msg = (data as { message?: unknown }).message;
		if (typeof msg === 'string' && msg.trim()) return msg;
	}
	return 'La consultation a été modifiée entre-temps. Les données ont été actualisées.';
}
