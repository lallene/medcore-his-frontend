import { api } from '$lib/api/client';
import type {
	AppointmentCheckInPayload,
	CancelTicketPayload,
	CompleteTriagePayload,
	CreateAppointmentPayload,
	DoctorWorklistPage,
	FinanceEvaluation,
	QueueAppointmentPage,
	QueueAppointmentRow,
	QueueKPIs,
	QueueTicketDetail,
	QueueTicketPage,
	QueueTicketRow,
	SetPriorityPayload,
	TakeDoctorPayload,
	WalkInCheckInPayload
} from '$lib/types/queue';

export const getQueueKPIs = async () => (await api.get<QueueKPIs>('/api/queue/kpis')).data;

export const getDoctorWorklist = async (params: Record<string, string | number> = {}) =>
	(await api.get<DoctorWorklistPage>('/api/queue/doctor/worklist', { params })).data;

export const listTodayAppointments = async (params: Record<string, string | number> = {}) =>
	(await api.get<QueueAppointmentPage>('/api/queue/appointments/today', { params })).data;

export const createAppointment = async (payload: CreateAppointmentPayload) =>
	(await api.post<QueueAppointmentRow>('/api/queue/appointments', payload)).data;

export const checkInAppointment = async (id: number, payload: AppointmentCheckInPayload) =>
	(await api.post<QueueTicketRow>(`/api/queue/appointments/${id}/check-in`, payload)).data;

export const markAppointmentNoShow = async (id: number) =>
	(await api.post<void>(`/api/queue/appointments/${id}/no-show`)).data;

export const checkInWalkIn = async (payload: WalkInCheckInPayload) =>
	(await api.post<QueueTicketRow>('/api/queue/check-in/walk-in', payload)).data;

export const listQueueTickets = async (params: Record<string, string | number> = {}) =>
	(await api.get<QueueTicketPage>('/api/queue/tickets', { params })).data;

export const getQueueTicket = async (id: number) =>
	(await api.get<QueueTicketDetail>(`/api/queue/tickets/${id}`)).data;

export const takeTriage = async (id: number) =>
	(await api.post<QueueTicketRow>(`/api/queue/tickets/${id}/triage/take`)).data;

export const completeTriage = async (id: number, payload: CompleteTriagePayload = {}) =>
	(await api.post<QueueTicketRow>(`/api/queue/tickets/${id}/triage/complete`, payload)).data;

export const takeDoctor = async (id: number, payload: TakeDoctorPayload = {}) =>
	(await api.post<QueueTicketRow>(`/api/queue/tickets/${id}/doctor/take`, payload)).data;

export interface CompleteQueuePayload {
	disposition?: string;
	dispositionNote?: string;
}

export const completeQueueTicket = async (id: number, payload: CompleteQueuePayload = {}) =>
	(await api.post<QueueTicketRow>(`/api/queue/tickets/${id}/complete`, payload)).data;

export const getQueueTicketByConsultation = async (consultationId: number) =>
	(await api.get<QueueTicketRow>(`/api/queue/tickets/by-consultation/${consultationId}`)).data;

export const getPatientActiveQueueTicket = async (patientId: number) =>
	(await api.get<QueueTicketRow>(`/api/queue/patients/${patientId}/active-ticket`)).data;

export const cancelQueueTicket = async (id: number, payload: CancelTicketPayload = {}) =>
	(await api.post<QueueTicketRow>(`/api/queue/tickets/${id}/cancel`, payload)).data;

export const setQueueTicketPriority = async (id: number, payload: SetPriorityPayload) =>
	(await api.post<QueueTicketRow>(`/api/queue/tickets/${id}/priority`, payload)).data;

export const evaluateFinance = async (patientId: number) =>
	(await api.get<FinanceEvaluation>(`/api/queue/finance/${patientId}`)).data;
