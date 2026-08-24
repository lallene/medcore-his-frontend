import { api } from './client';
import type {
	DepartmentPayload,
	OrganizationCatalog,
	OrganizationDepartment,
	OrganizationService,
	ServicePayload
} from '$lib/types/organization';

export const getOrganizationCatalog = async (activeOnly = true) =>
	(
		await api.get<OrganizationCatalog>('/api/organization/catalog', {
			params: { active: activeOnly ? 'active' : 'all' }
		})
	).data;
export const listOrganizationServices = async (activeOnly = true) =>
	(
		await api.get<OrganizationService[]>('/api/organization/services', {
			params: { active: activeOnly ? 'active' : 'all' }
		})
	).data;
export const saveDepartment = async (payload: DepartmentPayload, id?: number) =>
	(
		await (id
			? api.put<OrganizationDepartment>(`/api/organization/departments/${id}`, payload)
			: api.post<OrganizationDepartment>('/api/organization/departments', payload))
	).data;
export const saveOrganizationService = async (payload: ServicePayload, id?: number) =>
	(
		await (id
			? api.put<OrganizationService>(`/api/organization/services/${id}`, payload)
			: api.post<OrganizationService>('/api/organization/services', payload))
	).data;
