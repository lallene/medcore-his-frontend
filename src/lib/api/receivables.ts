import { api } from '$lib/api/client';
import type {
	ReceivableDetail,
	ReceivableFollowUp,
	ReceivableKPIs,
	ReceivablePage
} from '$lib/types/receivables';
export const listReceivables = async (params: Record<string, string | number> = {}) =>
	(await api.get<ReceivablePage>('/api/receivables', { params })).data;
export const getReceivableKPIs = async () =>
	(await api.get<ReceivableKPIs>('/api/receivables/kpis')).data;
export const getReceivable = async (id: number) =>
	(await api.get<ReceivableDetail>(`/api/receivables/${id}`)).data;
export const listPatientReceivables = async (patientId: number) =>
	(
		await api.get<ReceivablePage>(`/api/patients/${patientId}/receivables`, {
			params: { limit: 100 }
		})
	).data;
export const setReceivableDueDate = async (id: number, dueDate: string | null) =>
	(await api.put<ReceivableDetail>(`/api/receivables/${id}/due-date`, { dueDate })).data;
export const addReceivableFollowUp = async (
	id: number,
	payload: {
		actionType: string;
		note: string;
		promisedPaymentDate?: string | null;
		promisedAmount?: number | null;
	}
) => (await api.post<ReceivableFollowUp>(`/api/receivables/${id}/follow-ups`, payload)).data;
