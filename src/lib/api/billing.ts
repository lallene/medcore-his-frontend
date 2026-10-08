import { api } from '$lib/api/client';
import type {
	BillableAct,
	BillingKPIs,
	CreditApplicationResult,
	CreditNote,
	CreditSummary,
	FinancialHistoryPage,
	FinancialHistoryQuery,
	FinancialStatement,
	Invoice,
	InvoicePage,
	Refund,
	RefundDecisionPayload,
	RefundExecutePayload,
	RefundListQuery,
	RefundPage,
	RefundRequestPayload,
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
/** LOT29F-B/H-C: immutable credit note (avoir) with authoritative reduction amount — not a refund. */
export const issueCreditNote = async (
	invoiceId: number,
	payload: { amount: number; reason: string; idempotencyKey: string }
) => {
	const key = payload.idempotencyKey;
	return (
		await api.post<Invoice>(
			`/api/billing/invoices/${invoiceId}/credit-notes`,
			{ amount: payload.amount, reason: payload.reason, idempotencyKey: key },
			{ headers: key ? { 'Idempotency-Key': key } : undefined }
		)
	).data;
};
export const getCreditSummary = async (holderPartyId: number, patientId: number) =>
	(
		await api.get<CreditSummary>('/api/billing/credit-summary', {
			params: { holderPartyId, patientId }
		})
	).data;
export const listPatientCreditBalances = async (patientId: number) =>
	(await api.get<CreditSummary[]>(`/api/billing/patients/${patientId}/credit-balances`)).data;
/** LOT29F-H-D: allocate existing customer credit — not a Payment / not Cash. */
export const applyCredit = async (
	invoiceId: number,
	payload: { holderPartyId: number; amount: number; reason?: string; idempotencyKey: string }
) => {
	const key = payload.idempotencyKey;
	return (
		await api.post<CreditApplicationResult>(
			`/api/billing/invoices/${invoiceId}/credit-applications`,
			{
				holderPartyId: payload.holderPartyId,
				amount: payload.amount,
				reason: payload.reason,
				idempotencyKey: key
			},
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
/** LOT29F-H-E: read-only patient financial statement. */
export const getFinancialStatement = async (patientId: number) =>
	(await api.get<FinancialStatement>(`/api/billing/patients/${patientId}/financial-statement`))
		.data;
export const listFinancialHistory = async (patientId: number, params: FinancialHistoryQuery = {}) =>
	(
		await api.get<FinancialHistoryPage>(`/api/billing/patients/${patientId}/financial-history`, {
			params
		})
	).data;
/** LOT29F-I-A: refund request workflow (reserve spendable credit) — no money execution. */
export const requestRefund = async (payload: RefundRequestPayload) => {
	const key = payload.idempotencyKey;
	return (
		await api.post<Refund>('/api/billing/refunds', payload, {
			headers: key ? { 'Idempotency-Key': key } : undefined
		})
	).data;
};
export const listRefunds = async (params: RefundListQuery = {}) =>
	(await api.get<RefundPage>('/api/billing/refunds', { params })).data;
export const getRefund = async (id: number) =>
	(await api.get<Refund>(`/api/billing/refunds/${id}`)).data;
export const approveRefund = async (id: number, payload: RefundDecisionPayload = {}) =>
	(await api.post<Refund>(`/api/billing/refunds/${id}/approve`, payload)).data;
export const rejectRefund = async (id: number, payload: { reason: string }) =>
	(await api.post<Refund>(`/api/billing/refunds/${id}/reject`, payload)).data;
export const cancelRefund = async (id: number, payload: { reason: string }) =>
	(await api.post<Refund>(`/api/billing/refunds/${id}/cancel`, payload)).data;
/** LOT29F-I-B: execute approved refund (CASH REFUND_OUT or external recording). */
export const executeRefund = async (id: number, payload: RefundExecutePayload) => {
	const key = payload.idempotencyKey;
	return (
		await api.post<Refund>(`/api/billing/refunds/${id}/execute`, payload, {
			headers: key ? { 'Idempotency-Key': key } : undefined
		})
	).data;
};
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
