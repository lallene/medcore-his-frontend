import { api } from '$lib/api/client';
import type {
	BillableAct,
	BillingKPIs,
	CreditNote,
	Invoice,
	InvoicePage,
	Tariff
} from '$lib/types/billing';
export const listInvoices = async (params: Record<string, string | number> = {}) =>
	(await api.get<InvoicePage>('/api/billing/invoices', { params })).data;
export const listPatientInvoices = async (patientId: number) =>
	(await listInvoices({ patientId, limit: 100 })).data;
export const getInvoice = async (id: number) =>
	(await api.get<Invoice>(`/api/billing/invoices/${id}`)).data;
export const listBillableActs = async (patientId: number) =>
	(await api.get<BillableAct[]>('/api/billing/billable-acts', { params: { patientId } })).data;
export const createInvoice = async (
	patientId: number,
	lines: { actType: string; referenceId: number; tariffId: number }[]
) => (await api.post<Invoice>('/api/billing/invoices', { patientId, lines })).data;
export const issueInvoice = async (id: number) =>
	(await api.post<Invoice>(`/api/billing/invoices/${id}/issue`)).data;
export const cancelInvoice = async (id: number, reason: string) =>
	(await api.post<Invoice>(`/api/billing/invoices/${id}/cancel`, { reason })).data;
export const payInvoice = async (
	id: number,
	payload: {
		amount: number;
		paymentMethod: string;
		reference?: string;
		idempotencyKey: string;
		payer: {
			mode: string;
			displayName?: string;
			phone?: string;
			relationship?: string;
			partyId?: number;
		};
	}
) => {
	const key = payload.idempotencyKey;
	return (
		await api.post<Invoice>(
			`/api/billing/invoices/${id}/payments`,
			{ ...payload, idempotencyKey: key },
			{ headers: key ? { 'Idempotency-Key': key } : undefined }
		)
	).data;
};
/** LOT29D-C: full payment reversal (immutable payment + linked counter-entry). */
export const reversePayment = async (
	paymentId: number,
	payload: { reason: string; idempotencyKey: string }
) => {
	const key = payload.idempotencyKey;
	return (
		await api.post<Invoice>(
			`/api/billing/payments/${paymentId}/reverse`,
			{ reason: payload.reason, idempotencyKey: key },
			{ headers: key ? { 'Idempotency-Key': key } : undefined }
		)
	).data;
};
/** LOT29F-B: immutable full-invoice credit note (avoir) — not a refund. */
export const issueCreditNote = async (
	invoiceId: number,
	payload: { reason: string; idempotencyKey: string }
) => {
	const key = payload.idempotencyKey;
	return (
		await api.post<Invoice>(
			`/api/billing/invoices/${invoiceId}/credit-notes`,
			{ reason: payload.reason, idempotencyKey: key },
			{ headers: key ? { 'Idempotency-Key': key } : undefined }
		)
	).data;
};
export const getCreditNote = async (id: number) =>
	(await api.get<CreditNote>(`/api/billing/credit-notes/${id}`)).data;
export const listTariffs = async () => (await api.get<Tariff[]>('/api/billing/tariffs')).data;
export const createTariff = async (payload: Omit<Tariff, 'id' | 'currency'>) =>
	(await api.post<Tariff>('/api/billing/tariffs', payload)).data;
export const getBillingKPIs = async () => (await api.get<BillingKPIs>('/api/billing/kpis')).data;
export const getActBillingStatus = async (
	patientId: number,
	actType: string,
	referenceId: number
) =>
	(
		await api.get<{
			billed: boolean;
			invoiceId?: number;
			invoiceNumber?: string;
			invoiceStatus?: string;
		}>('/api/billing/act-status', { params: { patientId, actType, referenceId } })
	).data;
