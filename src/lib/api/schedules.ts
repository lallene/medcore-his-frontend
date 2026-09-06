import { api } from '$lib/api/client';
import type {
	CreateScheduleExceptionRequest,
	CreateWorkingScheduleRequest,
	ScheduleException,
	ScheduleExceptionListFilters,
	ScheduleExceptionListResponse,
	ScheduleListFilters,
	ScheduleListResponse,
	StaffWorkingSchedule,
	UpdateScheduleExceptionRequest,
	UpdateWorkingScheduleRequest
} from '$lib/types/scheduling';

function cleanParams(params: Record<string, string | number | boolean | undefined>) {
	const out: Record<string, string | number | boolean> = {};
	for (const [k, v] of Object.entries(params)) {
		if (v === undefined || v === '') continue;
		out[k] = v;
	}
	return out;
}

export const listSchedules = async (filters: ScheduleListFilters = {}) =>
	(
		await api.get<ScheduleListResponse>('/api/schedules', {
			params: cleanParams({
				practitionerId: filters.practitionerId,
				serviceId: filters.serviceId,
				weekday: filters.weekday,
				active: filters.active === undefined ? undefined : filters.active ? 'true' : 'false',
				date: filters.date,
				page: filters.page,
				limit: filters.limit
			})
		})
	).data;

export const getSchedule = async (id: number) =>
	(await api.get<StaffWorkingSchedule>(`/api/schedules/${id}`)).data;

export const createSchedule = async (body: CreateWorkingScheduleRequest) =>
	(await api.post<StaffWorkingSchedule>('/api/schedules', body)).data;

export const updateSchedule = async (id: number, body: UpdateWorkingScheduleRequest) =>
	(await api.patch<StaffWorkingSchedule>(`/api/schedules/${id}`, body)).data;

/** Soft-disable (active=false). */
export const disableSchedule = async (id: number) =>
	(await api.delete<StaffWorkingSchedule>(`/api/schedules/${id}`)).data;

export const listScheduleExceptions = async (filters: ScheduleExceptionListFilters = {}) =>
	(
		await api.get<ScheduleExceptionListResponse>('/api/schedule-exceptions', {
			params: cleanParams({
				practitionerId: filters.practitionerId,
				serviceId: filters.serviceId,
				type: filters.type,
				active: filters.active === undefined ? undefined : filters.active ? 'true' : 'false',
				from: filters.from,
				to: filters.to,
				page: filters.page,
				limit: filters.limit
			})
		})
	).data;

export const getScheduleException = async (id: number) =>
	(await api.get<ScheduleException>(`/api/schedule-exceptions/${id}`)).data;

export const createScheduleException = async (body: CreateScheduleExceptionRequest) =>
	(await api.post<ScheduleException>('/api/schedule-exceptions', body)).data;

export const updateScheduleException = async (id: number, body: UpdateScheduleExceptionRequest) =>
	(await api.patch<ScheduleException>(`/api/schedule-exceptions/${id}`, body)).data;

/** Soft-cancel (active=false + cancelledAt). */
export const cancelScheduleException = async (id: number) =>
	(await api.delete<ScheduleException>(`/api/schedule-exceptions/${id}`)).data;
