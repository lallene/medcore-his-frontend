import { api } from '$lib/api/client';
import type {
	NotificationAttemptAdminListResponse,
	NotificationIntentAdmin,
	NotificationIntentAdminListResponse,
	NotificationIntentListFilters
} from '$lib/types/appointment-notifications';

function cleanParams(params: Record<string, string | number | boolean | undefined>) {
	const out: Record<string, string | number | boolean> = {};
	for (const [k, v] of Object.entries(params)) {
		if (v === undefined || v === '') continue;
		out[k] = v;
	}
	return out;
}

/** LOT 23N-C2 — read-only appointment notification admin API (not ticketing). */
export const listNotificationIntents = async (filters: NotificationIntentListFilters = {}) =>
	(
		await api.get<NotificationIntentAdminListResponse>('/api/appointment-notification-intents', {
			params: cleanParams({
				page: filters.page,
				limit: filters.limit,
				status: filters.status,
				kind: filters.kind,
				channel: filters.channel,
				appointmentId: filters.appointmentId,
				sendAfterFrom: filters.sendAfterFrom,
				sendAfterTo: filters.sendAfterTo,
				createdAtFrom: filters.createdAtFrom,
				createdAtTo: filters.createdAtTo
			})
		})
	).data;

export const getNotificationIntent = async (id: number) =>
	(await api.get<NotificationIntentAdmin>(`/api/appointment-notification-intents/${id}`)).data;

export const listNotificationAttempts = async (id: number) =>
	(
		await api.get<NotificationAttemptAdminListResponse>(
			`/api/appointment-notification-intents/${id}/attempts`
		)
	).data;
