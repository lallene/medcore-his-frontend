import type { QueuePriority, QueueSource, QueueStage, QueueTicketRow } from '$lib/types/queue';

export const stageLabels: Record<QueueStage, string> = {
	RECEPTION: 'Accueil',
	WAITING_TRIAGE: 'Attente triage',
	TRIAGE_IN_PROGRESS: 'Triage en cours',
	WAITING_DOCTOR: 'Attente médecin',
	DOCTOR_IN_PROGRESS: 'Consultation en cours',
	COMPLETED: 'Terminé',
	CANCELLED: 'Annulé',
	ON_HOLD: 'En pause',
	NO_SHOW: 'Absent',
	REDIRECTED: 'Redirigé'
};

export const priorityLabels: Record<QueuePriority, string> = {
	URGENT: 'Urgent',
	HIGH: 'Haute',
	NORMAL: 'Normale',
	LOW: 'Basse'
};

export const sourceLabels: Record<QueueSource, string> = {
	APPOINTMENT: 'Rendez-vous',
	WALK_IN: 'Sans rendez-vous'
};

export const financeLabels: Record<string, string> = {
	CLEAR: 'OK',
	PAYMENT_REQUIRED: 'Paiement requis',
	INSURANCE_PENDING: 'Assurance en attente',
	EXEMPT: 'Exempté',
	BLOCKED: 'Bloqué'
};

export const receptionQueueColumns = [
	'Patient',
	'Service',
	'Heure RDV',
	'Source',
	'Priorité',
	'Attente',
	'Actions'
] as const;

export const triageQueueColumns = [
	'Référence',
	'Patient',
	'Service',
	'Priorité',
	'Attente',
	'Étape',
	'Actions'
] as const;

export const doctorQueueColumns = [
	'Référence',
	'Patient',
	'Service',
	'Médecin',
	'Priorité',
	'Attente',
	'Étape',
	'Actions'
] as const;

export const dashboardQueueColumns = [
	'Référence',
	'Patient',
	'Service',
	'Priorité',
	'Étape',
	'Attente'
] as const;

export const emptyCell = '—';

export function formatWaitMinutes(minutes: number): string {
	if (minutes <= 0) return '< 1 min';
	if (minutes < 60) return `${minutes} min`;
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`;
}

export function queuePatientLabel(
	ticket: Pick<QueueTicketRow, 'patientName' | 'patientCode'>
): string {
	const name = ticket.patientName?.trim();
	const code = ticket.patientCode?.trim();
	if (name && code) return `${name} (${code})`;
	return name || code || emptyCell;
}

export function queueServiceLabel(ticket: Pick<QueueTicketRow, 'serviceName'>): string {
	return ticket.serviceName?.trim() || emptyCell;
}

export function queueDoctorLabel(ticket: Pick<QueueTicketRow, 'expectedDoctorName'>): string {
	return ticket.expectedDoctorName?.trim() || emptyCell;
}

export function formatAppointmentTime(value?: string): string {
	if (!value) return emptyCell;
	return new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short' }).format(new Date(value));
}
