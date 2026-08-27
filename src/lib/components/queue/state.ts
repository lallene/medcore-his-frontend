import type {
	DoctorWorklistKPIs,
	QueuePriority,
	QueueSource,
	QueueStage,
	QueueTicketRow,
	VitalSummary
} from '$lib/types/queue';

export const stageLabels: Record<QueueStage, string> = {
	RECEPTION: 'Accueil',
	WAITING_TRIAGE: 'Attente triage',
	TRIAGE_IN_PROGRESS: 'Triage en cours',
	WAITING_DOCTOR: 'À traiter',
	DOCTOR_IN_PROGRESS: 'En consultation',
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

/** LOT 20 — colonnes compactes worklist médecin (maquette). */
export const doctorWorklistColumns = [
	'Priorité',
	'Patient',
	'Âge / Sexe',
	'Arrivé',
	'Attente',
	'Constantes',
	'Motif',
	'Prise en charge',
	'Actions'
] as const;

/** @deprecated prefer doctorWorklistColumns */
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

export const emptyDoctorWorklistKPIs = (): DoctorWorklistKPIs => ({
	toTreat: 0,
	urgent: 0,
	inConsultation: 0,
	avgWaitMinutes: 0,
	completedToday: 0,
	avgConsultationMinutes: 0
});

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

export function formatClock(value?: string): string {
	if (!value) return emptyCell;
	return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(
		new Date(value)
	);
}

export function sexLabel(sex?: string): string {
	const v = sex?.trim().toUpperCase();
	if (v === 'M') return 'Homme';
	if (v === 'F') return 'Femme';
	return emptyCell;
}

export function ageSexLabel(
	ticket: Pick<QueueTicketRow, 'patientAgeYears' | 'patientSex'>
): string {
	const age =
		ticket.patientAgeYears != null && ticket.patientAgeYears >= 0
			? `${ticket.patientAgeYears} ans`
			: '';
	const sex = sexLabel(ticket.patientSex);
	if (age && sex !== emptyCell) return `${age} ${sex}`;
	return age || (sex !== emptyCell ? sex : emptyCell);
}

export function waitToneClass(minutes: number, priority: QueuePriority): string {
	if (priority === 'URGENT' || minutes >= 30) return 'font-semibold text-danger';
	if (minutes >= 20 || priority === 'HIGH') return 'font-semibold text-amber-700';
	return 'text-emerald-700';
}

export function formatVitalSummary(v?: VitalSummary | null): string {
	if (!v) return emptyCell;
	const parts: string[] = [];
	if (v.temperatureC != null) parts.push(`${v.temperatureC.toFixed(1)} °C`);
	if (v.systolicBp != null && v.diastolicBp != null) {
		parts.push(`${v.systolicBp}/${v.diastolicBp}`);
	}
	if (v.heartRate != null) parts.push(`${v.heartRate} bpm`);
	return parts.length ? parts.join(' · ') : emptyCell;
}

export function vitalsHaveAbnormal(v?: VitalSummary | null): boolean {
	if (!v) return false;
	return v.abnormalTemp || v.abnormalBp || v.abnormalHr || v.abnormalSpo2;
}

/** Server-side stages allowed on doctor worklist — never triage. */
export const doctorWorklistStages: QueueStage[] = ['WAITING_DOCTOR', 'DOCTOR_IN_PROGRESS'];

export function isDoctorWorklistTicket(ticket: Pick<QueueTicketRow, 'stage'>): boolean {
	return doctorWorklistStages.includes(ticket.stage);
}

export function filterDoctorWorklist(
	items: QueueTicketRow[],
	opts: { search?: string; priority?: string; stage?: string }
): QueueTicketRow[] {
	const q = opts.search?.trim().toLowerCase() ?? '';
	return items.filter((ticket) => {
		if (!isDoctorWorklistTicket(ticket)) return false;
		if (opts.priority && ticket.priority !== opts.priority) return false;
		if (opts.stage && ticket.stage !== opts.stage) return false;
		if (!q) return true;
		const hay =
			`${ticket.patientName} ${ticket.patientCode} ${ticket.reference} ${ticket.reason ?? ''}`.toLowerCase();
		return hay.includes(q);
	});
}

export function careStateLabel(ticket: QueueTicketRow): string {
	if (ticket.stage === 'DOCTOR_IN_PROGRESS') {
		const name = ticket.doctorTakenByName?.trim();
		return name ? `En charge — ${name}` : 'En consultation';
	}
	return 'Prêt';
}
