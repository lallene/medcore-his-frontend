import { api } from './client';
import type {
	AccessKPIs,
	AccessMatrix,
	AccessPermission,
	AccessSimulation,
	AccessUserDetail,
	AccessUserList,
	AccessAuditEvent
} from '$lib/types/access';

export const getAccessKPIs = async () => (await api.get<AccessKPIs>('/api/access/kpis')).data;

export const listAccessUsers = async (
	params: Record<string, string | number | boolean | undefined> = {}
) => (await api.get<AccessUserList>('/api/access/users', { params })).data;

export const getAccessUser = async (id: number) =>
	(await api.get<AccessUserDetail>(`/api/access/users/${id}`)).data;

export const setAccessUserActive = async (id: number, active: boolean, reason = '') =>
	(await api.put<AccessUserDetail>(`/api/access/users/${id}/active`, { active, reason })).data;

export const setAccessUserFunctions = async (id: number, functions: string[], reason = '') =>
	(await api.put<AccessUserDetail>(`/api/access/users/${id}/functions`, { functions, reason }))
		.data;

export const setAccessUserServices = async (
	id: number,
	primaryServiceId: number | null,
	secondaryServiceIds: number[],
	reason = ''
) =>
	(
		await api.put<AccessUserDetail>(`/api/access/users/${id}/services`, {
			primaryServiceId,
			secondaryServiceIds,
			reason
		})
	).data;

export const setAccessOverride = async (
	id: number,
	permission: string,
	effect: 'GRANT' | 'DENY',
	reason = ''
) =>
	(
		await api.post<AccessUserDetail>(`/api/access/users/${id}/overrides`, {
			permission,
			effect,
			reason
		})
	).data;

export const clearAccessOverride = async (id: number, permission: string, reason = '') =>
	(
		await api.delete<AccessUserDetail>(
			`/api/access/users/${id}/overrides/${encodeURIComponent(permission)}`,
			{ params: { reason } }
		)
	).data;

export const getAccessMatrix = async () => (await api.get<AccessMatrix>('/api/access/matrix')).data;

export const toggleAccessMatrix = async (payload: {
	functionCode: string;
	permission: string;
	effect: 'GRANT' | 'DENY' | 'CLEAR';
	reason?: string;
}) => (await api.post<AccessMatrix>('/api/access/matrix', payload)).data;

export const listAccessPermissions = async () =>
	(await api.get<AccessPermission[]>('/api/access/permissions')).data;

export const getAccessSimulation = async (id: number) =>
	(await api.get<AccessSimulation>(`/api/access/users/${id}/simulate`)).data;

export const getAccessUserAudit = async (id: number) =>
	(await api.get<AccessAuditEvent[]>(`/api/access/users/${id}/audit`)).data;
