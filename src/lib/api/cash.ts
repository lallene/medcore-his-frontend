import { api } from '$lib/api/client';
import type {
	CashReceipt,
	CashRegister,
	CashSession,
	SessionSummary,
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
export const listSessions = async () => (await api.get<CashSession[]>('/api/cash/sessions')).data;
export const getSession = async (id: number) =>
	(await api.get<SessionSummary>(`/api/cash/sessions/${id}`)).data;
export const openSession = async (payload: {
	cashRegisterId: number;
	openingFloat: number;
	note?: string;
}) => (await api.post<SessionSummary>('/api/cash/sessions/open', payload)).data;
export const closeSession = async (
	id: number,
	payload: { countedCashAmount: number; note?: string }
) => (await api.post<SessionSummary>(`/api/cash/sessions/${id}/close`, payload)).data;
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
) => (await api.post<CashReceipt>(`/api/cash/sessions/${id}/payments`, payload)).data;
export const getReceipt = async (id: number) =>
	(await api.get<CashReceipt>(`/api/cash/receipts/${id}`)).data;
