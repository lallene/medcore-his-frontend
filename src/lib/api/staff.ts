import { api } from './client';
import type {
	StaffAuditEvent,
	StaffCatalog,
	StaffPage,
	StaffPayload,
	StaffProfile,
	StaffUserOption
} from '$lib/types/staff';
export const listStaff = async (params: Record<string, string | number | undefined> = {}) =>
	(await api.get<StaffPage>('/api/staff', { params })).data;
export const getStaffCatalog = async () => (await api.get<StaffCatalog>('/api/staff/catalog')).data;
export const listStaffUsers = async () =>
	(await api.get<StaffUserOption[]>('/api/staff/users')).data;
export const createStaff = async (payload: StaffPayload) =>
	(await api.post<StaffProfile>('/api/staff', payload)).data;
export const updateStaff = async (id: number, payload: StaffPayload) =>
	(await api.put<StaffProfile>(`/api/staff/${id}`, payload)).data;
export const getStaffAudit = async (id: number) =>
	(await api.get<StaffAuditEvent[]>(`/api/staff/${id}/audit`)).data;
