import { api } from '$lib/api/client';
import type {
	CashReceipt,
	CashRegister,
	SessionSummary,
	SessionListPage,
	SessionListQuery,
	CashMethod
} from '$lib/types/cash';
export const listRegisters = async () =>
	(await api.get<CashRegister[]>('/api/cash/registers')).data;
export const createRegister = async (payload: {
	code: string;
	name: string;
	location?: string;
	active?: boolean;
}) => (await api.post<CashRegister>('/api/cash/registers', payload)).data;
export const currentSession = async () =>
	(await api.get<SessionSummary | null>('/api/cash/sessions/current')).data;
export const listSessions = async (query: SessionListQuery = {}) => {
	const params = new URLSearchParams();
	if (query.status) params.set('status', query.status);
	if (query.cashRegisterId) params.set('cashRegisterId', String(query.cashRegisterId));
	if (query.dateFrom) params.set('dateFrom', query.dateFrom);
	if (query.dateTo) params.set('dateTo', query.dateTo);
	params.set('page', String(query.page ?? 1));
	params.set('limit', String(query.limit ?? 20));
	const qs = params.toString();
	return (await api.get<SessionListPage>(`/api/cash/sessions?${qs}`)).data;
};
export const getSession = async (id: number) =>
	(await api.get<SessionSummary>(`/api/cash/sessions/${id}`)).data;
export const openSession = async (payload: {
	cashRegisterId: number;
	openingFloat: number;
	note?: string;
	idempotencyKey: string;
}) => {
	const key = payload.idempotencyKey;
	return (
		await api.post<SessionSummary>(
			'/api/cash/sessions/open',
			{ ...payload, idempotencyKey: key },
			{ headers: key ? { 'Idempotency-Key': key } : undefined }
		)
	).data;
};
export const closeSession = async (
	id: number,
	payload: { countedCashAmount: number; note?: string; idempotencyKey: string }
) => {
	const key = payload.idempotencyKey;
	return (
		await api.post<SessionSummary>(
			`/api/cash/sessions/${id}/close`,
			{ ...payload, idempotencyKey: key },
			{ headers: key ? { 'Idempotency-Key': key } : undefined }
		)
	).data;
};
export const sessionJournal = async (id: number) =>
	(await api.get<CashReceipt[]>(`/api/cash/sessions/${id}/journal`)).data;
export const cashPayment = async (
	id: number,
	payload: {
		invoiceId: number;
		amount: number;
		paymentMethod: CashMethod;
		externalReference?: string;
		mobileOperator?: string;
		idempotencyKey: string;
	}
) => {
	const key = payload.idempotencyKey;
	return (
		await api.post<CashReceipt>(
			`/api/cash/sessions/${id}/payments`,
			{ ...payload, idempotencyKey: key },
			{ headers: key ? { 'Idempotency-Key': key } : undefined }
		)
	).data;
};
export const getReceipt = async (id: number) =>
	(await api.get<CashReceipt>(`/api/cash/receipts/${id}`)).data;
