import { api } from '$lib/api/client';
import type {
	LaboratoryFilters,
	LaboratoryListResponse,
	LaboratoryOrder,
	LaboratoryResultInput
} from '$lib/types/laboratory';
export async function listLaboratoryOrders(
	filters: LaboratoryFilters = {}
): Promise<LaboratoryListResponse> {
	return (await api.get<LaboratoryListResponse>('/api/laboratory/orders', { params: filters }))
		.data;
}
export async function getLaboratoryOrder(id: number): Promise<LaboratoryOrder> {
	return (await api.get<LaboratoryOrder>(`/api/laboratory/orders/${id}`)).data;
}
export async function prepareLaboratorySample(id: number): Promise<LaboratoryOrder> {
	return (await api.post<LaboratoryOrder>(`/api/laboratory/orders/${id}/sample-pending`)).data;
}
export async function collectLaboratorySample(
	id: number,
	payload: { sampleType: string; comment?: string }
): Promise<LaboratoryOrder> {
	return (await api.post<LaboratoryOrder>(`/api/laboratory/orders/${id}/collect`, payload)).data;
}
export async function startLaboratoryAnalysis(id: number): Promise<LaboratoryOrder> {
	return (await api.post<LaboratoryOrder>(`/api/laboratory/orders/${id}/start`)).data;
}
export async function enterLaboratoryResults(
	id: number,
	results: LaboratoryResultInput[]
): Promise<LaboratoryOrder> {
	return (await api.put<LaboratoryOrder>(`/api/laboratory/orders/${id}/results`, { results })).data;
}
export async function validateLaboratoryOrder(id: number): Promise<LaboratoryOrder> {
	return (await api.post<LaboratoryOrder>(`/api/laboratory/orders/${id}/validate`)).data;
}
export async function cancelLaboratoryOrder(id: number, reason: string): Promise<LaboratoryOrder> {
	return (await api.post<LaboratoryOrder>(`/api/laboratory/orders/${id}/cancel`, { reason })).data;
}
