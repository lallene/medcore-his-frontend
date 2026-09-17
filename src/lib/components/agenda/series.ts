import axios from 'axios';
import type {
	Appointment,
	AppointmentSeries,
	CreateAppointmentSeriesRequest,
	SeriesOccurrenceKind
} from '../../types/scheduling.ts';
import { canCancelAppointment, canRescheduleAppointment, AGENDA_TIMEZONE } from './state.ts';

/** Go time.Weekday labels (0=Sunday … 6=Saturday) — same as backend / StaffWorkingSchedule. */
export const SERIES_WEEKDAY_OPTIONS: Array<{ value: number; label: string; short: string }> = [
	{ value: 1, label: 'Lundi', short: 'Lun' },
	{ value: 2, label: 'Mardi', short: 'Mar' },
	{ value: 3, label: 'Mercredi', short: 'Mer' },
	{ value: 4, label: 'Jeudi', short: 'Jeu' },
	{ value: 5, label: 'Vendredi', short: 'Ven' },
	{ value: 6, label: 'Samedi', short: 'Sam' },
	{ value: 0, label: 'Dimanche', short: 'Dim' }
];

export const seriesOccurrenceKindLabels: Record<SeriesOccurrenceKind, string> = {
	RULE: 'Occurrence normale',
	EXCEPTION_RESCHEDULED: 'Exception (reportée)',
	EXCEPTION_CANCELLED: 'Annulée',
	OPERATIONAL: 'Opérationnelle / historique'
};

export const SERIES_OCC_CONFLICT_FALLBACK =
	'Conflit de version — série actualisée. Veuillez réessayer.';

export function isSeriesAppointment(
	appt: Pick<Appointment, 'seriesId'> | null | undefined
): boolean {
	return typeof appt?.seriesId === 'number' && appt.seriesId > 0;
}

export function goWeekdayFromIso(iso: string, timeZone = AGENDA_TIMEZONE): number {
	const d = new Date(iso);
	const wd = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(d);
	const map: Record<string, number> = {
		Sun: 0,
		Mon: 1,
		Tue: 2,
		Wed: 3,
		Thu: 4,
		Fri: 5,
		Sat: 6
	};
	return map[wd] ?? d.getUTCDay();
}

export function formatSeriesWeekdays(byWeekdays: number[]): string {
	const labels = SERIES_WEEKDAY_OPTIONS.filter((o) => byWeekdays.includes(o.value)).map(
		(o) => o.short
	);
	return labels.length ? labels.join(', ') : '—';
}

export function formatSeriesRecurrenceSummary(
	input: Pick<
		AppointmentSeries,
		'freq' | 'intervalWeeks' | 'byWeekdays' | 'count' | 'until' | 'timezone' | 'anchorStartAt'
	>
): string {
	const interval =
		input.intervalWeeks <= 1 ? 'chaque semaine' : `toutes les ${input.intervalWeeks} semaines`;
	const days = formatSeriesWeekdays(input.byWeekdays);
	const end = input.count
		? `${input.count} occurrence${input.count > 1 ? 's' : ''}`
		: input.until
			? `jusqu’au ${new Intl.DateTimeFormat('fr-FR', {
					timeZone: input.timezone || AGENDA_TIMEZONE,
					day: 'numeric',
					month: 'short',
					year: 'numeric'
				}).format(new Date(input.until))}`
			: 'fin non définie';
	return `Hebdomadaire · ${interval} · ${days} · ${end} (${input.timezone})`;
}

export function validateRecurringCreateInput(input: {
	byWeekdays: number[];
	intervalWeeks: number;
	endMode: 'count' | 'until';
	count: number;
	untilLocal: string;
	anchorStartAt: string;
	practitionerId: number | null | undefined;
}): string | null {
	if (!input.practitionerId || input.practitionerId <= 0) {
		return 'Un praticien précis est requis pour une série récurrente.';
	}
	if (!input.byWeekdays.length) {
		return 'Sélectionnez au moins un jour de la semaine.';
	}
	if (input.intervalWeeks < 1) {
		return 'L’intervalle doit être ≥ 1 semaine.';
	}
	const anchorWd = goWeekdayFromIso(input.anchorStartAt);
	if (!input.byWeekdays.includes(anchorWd)) {
		return 'Le jour de la première occurrence doit figurer dans les jours choisis.';
	}
	if (input.endMode === 'count') {
		if (!Number.isInteger(input.count) || input.count < 1 || input.count > 52) {
			return 'Le nombre d’occurrences doit être entre 1 et 52.';
		}
	} else if (!input.untilLocal) {
		return 'Indiquez une date de fin (until).';
	}
	return null;
}

export function buildCreateSeriesPayload(input: {
	patientId: number;
	serviceId: number;
	practitionerId: number;
	appointmentTypeId?: number;
	intervalWeeks: number;
	byWeekdays: number[];
	endMode: 'count' | 'until';
	count: number;
	untilIso?: string;
	timezone: string;
	anchorStartAt: string;
	idempotencyKey: string;
}): CreateAppointmentSeriesRequest {
	const body: CreateAppointmentSeriesRequest = {
		patientId: input.patientId,
		serviceId: input.serviceId,
		practitionerId: input.practitionerId,
		appointmentTypeId: input.appointmentTypeId,
		freq: 'WEEKLY',
		intervalWeeks: input.intervalWeeks,
		byWeekdays: [...input.byWeekdays].sort((a, b) => a - b),
		timezone: input.timezone,
		anchorStartAt: input.anchorStartAt,
		idempotencyKey: input.idempotencyKey
	};
	if (input.endMode === 'count') body.count = input.count;
	else if (input.untilIso) body.until = input.untilIso;
	return body;
}

export function seriesActionVisibility(
	appt: Pick<Appointment, 'status' | 'queueTicketId' | 'hasActiveTicket' | 'seriesId'>,
	permissions: string[],
	seriesStatus?: AppointmentSeries['status'] | null
) {
	const inSeries = isSeriesAppointment(appt);
	const scheduled = appt.status === 'SCHEDULED';
	const linked = Boolean(appt.queueTicketId ?? appt.hasActiveTicket);
	const seriesActive = seriesStatus !== 'CANCELLED';
	const canReschedule = canRescheduleAppointment(permissions);
	const canCancel = canCancelAppointment(permissions);
	return {
		editThis: scheduled && !linked && canReschedule,
		editThisAndFuture: inSeries && scheduled && !linked && canReschedule && seriesActive,
		cancelThis: scheduled && !linked && canCancel,
		cancelThisAndFuture: inSeries && scheduled && !linked && canCancel && seriesActive,
		cancelEntireSeries: inSeries && canCancel && seriesActive,
		viewSeries: inSeries
	};
}

export function httpStatusOf(error: unknown): number | undefined {
	return axios.isAxiosError(error) ? error.response?.status : undefined;
}

export function isSeriesOccConflictStatus(status: number | undefined): boolean {
	return status === 409;
}

export function isSeriesOccConflict(error: unknown): boolean {
	return isSeriesOccConflictStatus(httpStatusOf(error));
}
