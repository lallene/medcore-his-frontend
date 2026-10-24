import { api } from '$lib/api/client';
import type { DashboardFilters as ActivityFilters } from '$lib/api/dashboard';
import type {
	AppointmentCheckInPayload,
	CancelTicketPayload,
	CompleteTriagePayload,
	CreateAppointmentPayload,
	DailyAppointments,
	DailyQueueFlow,
	DoctorWorklistPage,
	FinanceEvaluation,
	QueueAppointmentPage,
	QueueAppointmentRow,
	QueueKPIs,
	AppointmentStats,
	QueueTicketDetail,
	QueueTicketPage,
	QueueTicketRow,
	SetPriorityPayload,
	StaffPlannedHours,
	TakeDoctorPayload,
	WalkInCheckInPayload
} from '$lib/types/queue';

/** Sans filtre : jour courant (historique). Avec from/to : période civile [from,to). */
export const getQueueKPIs = async (filters: ActivityFilters = {}) =>
	(await api.get<QueueKPIs>('/api/queue/kpis', { params: filters })).data;

/** Rendez-vous planifiés sur la période civile [from,to), par statut. */
export const getAppointmentStats = async (filters: ActivityFilters = {}) =>
	(await api.get<AppointmentStats>('/api/queue/appointments/stats', { params: filters })).data;

/** Arrivées et sorties de la file par jour ; from et to requis. */
export const getQueueDailyFlow = async (filters: ActivityFilters) =>
	(await api.get<DailyQueueFlow[]>('/api/queue/kpis/daily', { params: filters })).data;

/** Rendez-vous par jour et par statut ; from et to requis. */
export const getAppointmentDaily = async (filters: ActivityFilters) =>
	(await api.get<DailyAppointments[]>('/api/queue/appointments/daily', { params: filters })).data;

/** Heures planifiées par membre du personnel, triées décroissantes ; from et to requis. */
export const getPlannedHoursByStaff = async (filters: ActivityFilters) =>
	(await api.get<StaffPlannedHours[]>('/api/schedules/planned-hours/by-staff', { params: filters }))
		.data;

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
