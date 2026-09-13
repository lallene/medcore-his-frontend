/** LOT 23N-C2 — appointment notification admin DTOs (match backend 23N-C1 JSON tags). */

export type NotificationKind = 'BOOKED' | 'RESCHEDULED' | 'CANCELLED' | 'REMINDER_T24H';

export type NotificationChannel = 'LOG' | 'EMAIL' | 'SMS';

export type NotificationIntentStatus =
	'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'SKIPPED' | 'CANCELLED';

/** PHI-safe payload allow-list only — never invent extra keys. */
export interface NotificationPayloadAdmin {
	appointmentId: number;
	scheduledAt?: string;
	appointmentTypeName?: string;
	serviceName?: string;
	clinicLabel?: string;
}

export interface NotificationIntentAdmin {
	id: number;
	appointmentId: number;
	patientId: number;
	kind: NotificationKind | string;
	channel: NotificationChannel | string;
	status: NotificationIntentStatus | string;
	occurrenceKey: string;
	sendAfter: string;
	processingStartedAt?: string | null;
	sentAt?: string | null;
	cancelledAt?: string | null;
	createdAt: string;
	updatedAt: string;
	attemptCount: number;
	payload: NotificationPayloadAdmin;
}

export interface NotificationIntentAdminListResponse {
	items: NotificationIntentAdmin[];
	total: number;
	page: number;
	limit: number;
}

export interface NotificationAttemptAdmin {
	id: number;
	intentId: number;
	attemptNo: number;
	provider: string;
	providerMessageId?: string | null;
	error?: string | null;
	createdAt: string;
}

export interface NotificationAttemptAdminListResponse {
	items: NotificationAttemptAdmin[];
}

export interface NotificationIntentListFilters {
	page?: number;
	limit?: number;
	status?: string;
	kind?: string;
	channel?: string;
	appointmentId?: number;
	sendAfterFrom?: string;
	sendAfterTo?: string;
	createdAtFrom?: string;
	createdAtTo?: string;
}
