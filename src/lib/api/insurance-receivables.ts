import { api } from './client';
import type {
	InsuranceBatch,
	InsuranceCompanyDebt,
	InsuranceReceivable,
	InsuranceReceivableDetail,
	InsuranceReceivableFollowUp,
	InsuranceReceivableKPIs,
	InsuranceReceivablePage,
	InsuranceSettlement
} from '$lib/types/insurance-receivables';
export const listInsuranceReceivables = async (
	params: Record<string, string | number | boolean | undefined> = {}
) => (await api.get<InsuranceReceivablePage>('/api/insurance-receivables', { params })).data;
export const getInsuranceReceivable = async (id: number) =>
	(await api.get<InsuranceReceivableDetail>(`/api/insurance-receivables/${id}`)).data;
export const addInsuranceReceivableFollowUp = async (id: number, type: string, note: string) =>
	(
		await api.post<InsuranceReceivableFollowUp>(`/api/insurance-receivables/${id}/followups`, {
			type,
			note
		})
	).data;
export const getInsuranceReceivableKPIs = async () =>
	(await api.get<InsuranceReceivableKPIs>('/api/insurance-receivables/kpis')).data;
export const listInsuranceDebtorCompanies = async () =>
	(await api.get<InsuranceCompanyDebt[]>('/api/insurance-receivables/companies')).data;
export const listInsuranceSettlements = async (companyId?: number) =>
	(
		await api.get<InsuranceSettlement[]>('/api/insurance-receivables/settlements', {
			params: { companyId }
		})
	).data;
export const getInsuranceSettlement = async (id: number) =>
	(await api.get<InsuranceSettlement>(`/api/insurance-receivables/settlements/${id}`)).data;
export const createInsuranceSettlement = async (payload: Record<string, unknown>) =>
	(await api.post<InsuranceSettlement>('/api/insurance-receivables/settlements', payload)).data;
export const allocateInsuranceSettlement = async (
	id: number,
	payload: { invoiceLineId: number; amount: number }
) =>
	(
		await api.post<InsuranceSettlement>(
			`/api/insurance-receivables/settlements/${id}/allocations`,
			payload
		)
	).data;
export const postInsuranceSettlement = async (id: number) =>
	(await api.post<InsuranceSettlement>(`/api/insurance-receivables/settlements/${id}/post`)).data;
export const setInsuranceDueDate = async (id: number, dueDate: string | null, note = '') =>
	(
		await api.put<InsuranceReceivable>(`/api/insurance-receivables/${id}/due-date`, {
			dueDate,
			note
		})
	).data;
export const listInsuranceBatches = async (companyId?: number) =>
	(await api.get<InsuranceBatch[]>('/api/insurance-receivables/batches', { params: { companyId } }))
		.data;
export const createInsuranceBatch = async (payload: Record<string, unknown>) =>
	(await api.post<InsuranceBatch>('/api/insurance-receivables/batches', payload)).data;
export const submitInsuranceBatch = async (id: number) =>
	(await api.post<InsuranceBatch>(`/api/insurance-receivables/batches/${id}/submit`)).data;
export const listPatientInsuranceReceivables = async (patientId: number) =>
	(await api.get<InsuranceReceivablePage>(`/api/patients/${patientId}/insurance-receivables`)).data;
