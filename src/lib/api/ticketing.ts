import { api } from '$lib/api/client';
import type {
	CreateTicketPayload,
	TicketAgent,
	TicketCategory,
	TicketComment,
	TicketDetail,
	TicketKPIs,
	TicketNotification,
	TicketPage
} from '$lib/types/ticketing';
export const listTickets = async (params: Record<string, string | number | boolean> = {}) =>
	(await api.get<TicketPage>('/api/tickets', { params })).data;
export const getTicket = async (id: number) =>
	(await api.get<TicketDetail>(`/api/tickets/${id}`)).data;
export const createTicket = async (payload: CreateTicketPayload) =>
	(await api.post<TicketDetail>('/api/tickets', payload)).data;
export const listTicketCategories = async () =>
	(await api.get<TicketCategory[]>('/api/ticketing/categories')).data;
export const getTicketKPIs = async () => (await api.get<TicketKPIs>('/api/ticketing/kpis')).data;
export const commentTicket = async (
	id: number,
	content: string,
	visibility: 'PUBLIC' | 'INTERNAL' = 'PUBLIC'
) => (await api.post<TicketComment>(`/api/tickets/${id}/comments`, { content, visibility })).data;
export const assignTicket = async (id: number, userId: number | null, queue: string) =>
	(await api.post<TicketDetail>(`/api/tickets/${id}/assign`, { userId, queue })).data;
export const transitionTicket = async (
	id: number,
	status: string,
	resolutionSummary = '',
	resolutionCode = ''
) =>
	(
		await api.post<TicketDetail>(`/api/tickets/${id}/workflow`, {
			status,
			resolutionSummary,
			resolutionCode
		})
	).data;
export const updateTicket = async (id: number, payload: Record<string, string>) =>
	(await api.patch<TicketDetail>(`/api/tickets/${id}`, payload)).data;
export const uploadTicketAttachment = async (id: number, file: File) => {
	const body = new FormData();
	body.append('file', file);
	return (await api.post(`/api/tickets/${id}/attachments`, body)).data;
};
export const listTicketAgents = async () =>
	(await api.get<TicketAgent[]>('/api/ticketing/agents')).data;
export const listTicketNotifications = async () =>
	(await api.get<TicketNotification[]>('/api/ticketing/notifications')).data;
