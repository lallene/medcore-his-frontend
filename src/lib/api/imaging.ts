import { api } from '$lib/api/client';
import type {
	ImagingFilters,
	ImagingListResponse,
	ImagingOrder,
	ImagingReportInput
} from '$lib/types/imaging';
export async function listImagingOrders(
	filters: ImagingFilters = {}
): Promise<ImagingListResponse> {
	return (await api.get<ImagingListResponse>('/api/imaging/orders', { params: filters })).data;
}
export async function getImagingOrder(id: number): Promise<ImagingOrder> {
	return (await api.get<ImagingOrder>(`/api/imaging/orders/${id}`)).data;
}
export async function scheduleImagingOrder(
	id: number,
	payload: { scheduledAt: string; comment?: string }
): Promise<ImagingOrder> {
	return (await api.post<ImagingOrder>(`/api/imaging/orders/${id}/schedule`, payload)).data;
}
export async function startImagingOrder(
	id: number,
	payload: {
		technicalNotes?: string;
		contrastUsed?: boolean;
		contrastProduct?: string;
		studyInstanceUid?: string;
		externalViewerUrl?: string;
	} = {}
): Promise<ImagingOrder> {
	return (await api.post<ImagingOrder>(`/api/imaging/orders/${id}/start`, payload)).data;
}
export async function saveImagingReport(
	id: number,
	payload: ImagingReportInput
): Promise<ImagingOrder> {
	return (await api.put<ImagingOrder>(`/api/imaging/orders/${id}/report`, payload)).data;
}
export async function validateImagingOrder(id: number): Promise<ImagingOrder> {
	return (await api.post<ImagingOrder>(`/api/imaging/orders/${id}/validate`)).data;
}
export async function cancelImagingOrder(id: number, reason: string): Promise<ImagingOrder> {
	return (await api.post<ImagingOrder>(`/api/imaging/orders/${id}/cancel`, { reason })).data;
}
