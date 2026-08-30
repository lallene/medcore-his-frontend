import { api } from '$lib/api/client';
import type {
	Appointment,
	AppointmentCheckInRequest,
	AppointmentCheckInResult,
	AppointmentListFilters,
	AppointmentListResponse,
	AppointmentTypeListResponse,
	AvailabilityQuery,
	AvailabilityResponse,
	BookAppointmentRequest,
	CancelAppointmentRequest,
	NoShowAppointmentRequest,
	RescheduleAppointmentRequest
} from '$lib/types/scheduling';

function cleanParams(params: Record<string, string | number | boolean | undefined>) {
	const out: Record<string, string | number | boolean> = {};
	for (const [k, v] of Object.entries(params)) {
		if (v === undefined || v === '') continue;
		out[k] = v;
	}
	return out;
}

export const listAppointments = async (filters: AppointmentListFilters) =>
	(
		await api.get<AppointmentListResponse>('/api/appointments', {
			params: cleanParams({
				from: filters.from,
				to: filters.to,
				serviceId: filters.serviceId,
				practitionerId: filters.practitionerId,
				status: filters.status,
				appointmentTypeId: filters.appointmentTypeId,
				page: filters.page,
				limit: filters.limit
			})
		})
	).data;

export const getAppointment = async (id: number) =>
	(await api.get<Appointment>(`/api/appointments/${id}`)).data;

export const listAppointmentTypes = async (
	params: {
		serviceId?: number;
		active?: boolean;
	} = {}
) =>
	(
		await api.get<AppointmentTypeListResponse>('/api/appointment-types', {
			params: cleanParams({
				serviceId: params.serviceId,
				active: params.active === undefined ? undefined : params.active ? 'true' : 'false'
			})
		})
	).data;

export const getAvailability = async (query: AvailabilityQuery) =>
	(
		await api.get<AvailabilityResponse>('/api/availability', {
			params: cleanParams({
				serviceId: query.serviceId,
				from: query.from,
				to: query.to,
				practitionerId: query.practitionerId,
				appointmentTypeId: query.appointmentTypeId,
				durationMinutes: query.durationMinutes,
				slotStepMinutes: query.slotStepMinutes
			})
		})
	).data;

export const getAvailabilityFirst = async (query: AvailabilityQuery) =>
	(
		await api.get<{ slot: AvailabilityResponse['slots'][0]; timezone: string }>(
			'/api/availability/first',
			{
				params: cleanParams({
					serviceId: query.serviceId,
					from: query.from,
					to: query.to,
					practitionerId: query.practitionerId,
					appointmentTypeId: query.appointmentTypeId,
					durationMinutes: query.durationMinutes,
					slotStepMinutes: query.slotStepMinutes
				})
			}
		)
	).data;

export const getMyAvailability = async (query: Omit<AvailabilityQuery, 'practitionerId'>) =>
	(
		await api.get<AvailabilityResponse>('/api/availability/mine', {
			params: cleanParams({
				serviceId: query.serviceId,
				from: query.from,
				to: query.to,
				appointmentTypeId: query.appointmentTypeId,
				durationMinutes: query.durationMinutes,
				slotStepMinutes: query.slotStepMinutes
			})
		})
	).data;

export const bookAppointment = async (
	payload: BookAppointmentRequest,
	opts?: { idempotencyKey?: string }
) => {
	const key = opts?.idempotencyKey ?? payload.idempotencyKey;
	const body = { ...payload, idempotencyKey: key };
	const headers = key ? { 'Idempotency-Key': key } : undefined;
	return (await api.post<Appointment>('/api/appointments', body, { headers })).data;
};

export const rescheduleAppointment = async (
	id: number,
	payload: RescheduleAppointmentRequest,
	opts?: { idempotencyKey?: string }
) => {
	const key = opts?.idempotencyKey ?? payload.idempotencyKey;
	const body = { ...payload, idempotencyKey: key };
	const headers = key ? { 'Idempotency-Key': key } : undefined;
	return (await api.patch<Appointment>(`/api/appointments/${id}/reschedule`, body, { headers }))
		.data;
};

export const cancelAppointment = async (
	id: number,
	payload: CancelAppointmentRequest = {},
	opts?: { idempotencyKey?: string }
) => {
	const key = opts?.idempotencyKey ?? payload.idempotencyKey;
	const body = { ...payload, idempotencyKey: key };
	const headers = key ? { 'Idempotency-Key': key } : undefined;
	return (await api.post<Appointment>(`/api/appointments/${id}/cancel`, body, { headers })).data;
};

export const markAppointmentNoShow = async (
	id: number,
	payload: NoShowAppointmentRequest = {},
	opts?: { idempotencyKey?: string }
) => {
	const key = opts?.idempotencyKey ?? payload.idempotencyKey;
	const body = { ...payload, idempotencyKey: key };
	const headers = key ? { 'Idempotency-Key': key } : undefined;
	return (await api.post<Appointment>(`/api/appointments/${id}/no-show`, body, { headers })).data;
};

/** Canonical LOT 23F check-in (finance → queue). */
export const checkInAppointment = async (id: number, payload: AppointmentCheckInRequest) =>
	(await api.post<AppointmentCheckInResult>(`/api/queue/appointments/${id}/check-in`, payload))
		.data;
