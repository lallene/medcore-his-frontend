import type {
	Appointment,
	AppointmentStatus,
	AvailabilitySlot,
	BookAppointmentRequest
} from '../../types/scheduling.ts';
import { can, canAny } from '../../rbac/permissions.ts';
import { statusTone, type StatusTone } from '../../design/status.ts';

export const SCHEDULE_READ_PERMISSIONS = [
	'schedule.read.own',
	'schedule.read.service',
	'schedule.read.all'
] as const;

export const BOOK_PERMISSIONS = [
	'appointment.create.service',
	'appointment.create.all',
	'schedule.manage.service',
	'schedule.manage.all'
] as const;

export const RESCHEDULE_PERMISSIONS = [
	'appointment.reschedule.service',
	'appointment.reschedule.all',
	'schedule.manage.service',
	'schedule.manage.all'
] as const;

export const CANCEL_PERMISSIONS = ['appointment.cancel.service', 'appointment.cancel.all'] as const;

export const NO_SHOW_PERMISSIONS = [
	'appointment.no_show.service',
	'appointment.no_show.all'
] as const;

export const CHECK_IN_PERMISSIONS = ['queue.checkin'] as const;

export const appointmentStatusLabels: Record<AppointmentStatus, string> = {
	SCHEDULED: 'Planifié',
	ARRIVED: 'Arrivé',
	CHECKED_IN: 'Enregistré',
	IN_PROGRESS: 'En consultation',
	COMPLETED: 'Terminé',
	CANCELLED: 'Annulé',
	NO_SHOW: 'Absent'
};

export function appointmentStatusTone(status: AppointmentStatus): StatusTone {
	const map: Record<AppointmentStatus, StatusTone> = {
		SCHEDULED: 'info',
		ARRIVED: 'warning',
		CHECKED_IN: 'primary',
		IN_PROGRESS: 'info',
		COMPLETED: 'success',
		CANCELLED: 'neutral',
		NO_SHOW: 'danger'
	};
	return map[status] ?? statusTone(status);
}

export function canReadAgenda(permissions: string[]): boolean {
	return canAny(permissions, [...SCHEDULE_READ_PERMISSIONS]);
}

export function canBookAppointment(permissions: string[]): boolean {
	return canAny(permissions, [...BOOK_PERMISSIONS]);
}

export function canRescheduleAppointment(permissions: string[]): boolean {
	return canAny(permissions, [...RESCHEDULE_PERMISSIONS]);
}

export function canCancelAppointment(permissions: string[]): boolean {
	return canAny(permissions, [...CANCEL_PERMISSIONS]);
}

export function canMarkNoShow(permissions: string[]): boolean {
	return canAny(permissions, [...NO_SHOW_PERMISSIONS]);
}

export function canCheckInAppointment(permissions: string[]): boolean {
	return can(permissions, 'queue.checkin');
}

export function canListStaffForAgenda(permissions: string[]): boolean {
	return can(permissions, 'staff.read') || can(permissions, '*');
}

/** Terminal / operational states where calendar mutations are hidden. */
export function isTerminalAppointment(status: AppointmentStatus): boolean {
	return status === 'COMPLETED' || status === 'CANCELLED' || status === 'NO_SHOW';
}

/** LOT 23H — statuses shown in Patient 360 "Upcoming" (excludes terminals). */
export const UPCOMING_APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
	'SCHEDULED',
	'ARRIVED',
	'CHECKED_IN',
	'IN_PROGRESS'
] as const;

export function isUpcomingAppointmentStatus(status: AppointmentStatus): boolean {
	return (UPCOMING_APPOINTMENT_STATUSES as readonly string[]).includes(status);
}

export function filterUpcomingAppointments(items: Appointment[]): Appointment[] {
	return items.filter((a) => isUpcomingAppointmentStatus(a.status));
}

export function appointmentActionVisibility(
	appt: Pick<Appointment, 'status' | 'queueTicketId' | 'hasActiveTicket'>,
	permissions: string[]
) {
	const scheduled = appt.status === 'SCHEDULED';
	const linked = Boolean(appt.queueTicketId ?? appt.hasActiveTicket);
	return {
		reschedule: scheduled && !linked && canRescheduleAppointment(permissions),
		cancel: scheduled && !linked && canCancelAppointment(permissions),
		noShow:
			(appt.status === 'SCHEDULED' || appt.status === 'ARRIVED') &&
			!linked &&
			canMarkNoShow(permissions),
		checkIn: scheduled && !linked && canCheckInAppointment(permissions),
		openPatient: true
	};
}

/** Display timezone for medical agenda (Europe/Paris clinical site). */
export const AGENDA_TIMEZONE = 'Europe/Paris';

export function parseInstant(iso: string): Date {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) throw new Error(`Horodatage invalide: ${iso}`);
	return d;
}

export function toRfc3339(d: Date): string {
	return d.toISOString();
}

/** Start of local calendar day in timezone, as UTC Date. */
export function startOfZonedDay(anchor: Date, timeZone = AGENDA_TIMEZONE): Date {
	const parts = zonedParts(anchor, timeZone);
	return zonedLocalToUtc(parts.year, parts.month, parts.day, 0, 0, 0, timeZone);
}

export function addCalendarDays(anchor: Date, days: number, timeZone = AGENDA_TIMEZONE): Date {
	const parts = zonedParts(anchor, timeZone);
	const noonUtc = zonedLocalToUtc(parts.year, parts.month, parts.day, 12, 0, 0, timeZone);
	noonUtc.setUTCDate(noonUtc.getUTCDate() + days);
	const shifted = zonedParts(noonUtc, timeZone);
	return zonedLocalToUtc(shifted.year, shifted.month, shifted.day, 0, 0, 0, timeZone);
}

export function dayRange(anchor: Date, timeZone = AGENDA_TIMEZONE): { from: Date; to: Date } {
	const from = startOfZonedDay(anchor, timeZone);
	const to = addCalendarDays(from, 1, timeZone);
	return { from, to };
}

/** Monday-start week containing anchor (local medical week). */
export function weekRange(anchor: Date, timeZone = AGENDA_TIMEZONE): { from: Date; to: Date } {
	const start = startOfZonedDay(anchor, timeZone);
	const parts = zonedParts(start, timeZone);
	const weekday = zonedWeekday(start, timeZone); // 1=Mon .. 7=Sun
	const monday = addCalendarDays(start, 1 - weekday, timeZone);
	const sundayExclusive = addCalendarDays(monday, 7, timeZone);
	void parts;
	return { from: monday, to: sundayExclusive };
}

export function formatAgendaDayLabel(d: Date, timeZone = AGENDA_TIMEZONE): string {
	return new Intl.DateTimeFormat('fr-FR', {
		timeZone,
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	}).format(d);
}

export function formatAgendaWeekLabel(
	from: Date,
	toExclusive: Date,
	timeZone = AGENDA_TIMEZONE
): string {
	const endInclusive = new Date(toExclusive.getTime() - 1);
	const a = new Intl.DateTimeFormat('fr-FR', {
		timeZone,
		day: 'numeric',
		month: 'short'
	}).format(from);
	const b = new Intl.DateTimeFormat('fr-FR', {
		timeZone,
		day: 'numeric',
		month: 'short',
		year: 'numeric'
	}).format(endInclusive);
	return `${a} – ${b}`;
}

export function formatAgendaTime(iso: string, timeZone = AGENDA_TIMEZONE): string {
	return new Intl.DateTimeFormat('fr-FR', {
		timeZone,
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	}).format(parseInstant(iso));
}

export function formatAgendaDateTime(iso: string, timeZone = AGENDA_TIMEZONE): string {
	return new Intl.DateTimeFormat('fr-FR', {
		timeZone,
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	}).format(parseInstant(iso));
}

export function effectiveEndIso(appt: Appointment): string {
	if (appt.scheduledEndAt) return appt.scheduledEndAt;
	const mins = appt.durationMinutes && appt.durationMinutes > 0 ? appt.durationMinutes : 30;
	return new Date(parseInstant(appt.scheduledAt).getTime() + mins * 60_000).toISOString();
}

export function appointmentDurationMinutes(appt: Appointment): number {
	if (appt.durationMinutes && appt.durationMinutes > 0) return appt.durationMinutes;
	if (appt.scheduledEndAt) {
		const ms =
			parseInstant(appt.scheduledEndAt).getTime() - parseInstant(appt.scheduledAt).getTime();
		return Math.max(1, Math.round(ms / 60_000));
	}
	return 30;
}

export type AgendaMode = 'day' | 'week' | 'mine';

export function rangeForMode(
	mode: AgendaMode,
	anchor: Date,
	timeZone = AGENDA_TIMEZONE
): { from: Date; to: Date } {
	if (mode === 'week') return weekRange(anchor, timeZone);
	return dayRange(anchor, timeZone);
}

export function navigateAnchor(
	mode: AgendaMode,
	anchor: Date,
	direction: -1 | 0 | 1,
	timeZone = AGENDA_TIMEZONE
): Date {
	if (direction === 0) return startOfZonedDay(new Date(), timeZone);
	const step = mode === 'week' ? 7 : 1;
	return addCalendarDays(startOfZonedDay(anchor, timeZone), direction * step, timeZone);
}

/** Fetch all pages for a bounded range (max 100/page). Protects against infinite loops. */
export async function fetchAllAppointmentPages<T>(
	fetchPage: (
		page: number,
		limit: number
	) => Promise<{ items: T[]; total: number; page: number; limit: number }>,
	opts?: { pageSize?: number; maxPages?: number }
): Promise<T[]> {
	const pageSize = opts?.pageSize ?? 100;
	const maxPages = opts?.maxPages ?? 50;
	const all: T[] = [];
	let page = 1;
	let total = Infinity;
	while (page <= maxPages && all.length < total) {
		const res = await fetchPage(page, pageSize);
		total = res.total;
		all.push(...res.items);
		if (res.items.length === 0 || all.length >= total || res.items.length < pageSize) break;
		page += 1;
	}
	return all;
}

export function groupSlotsByPeriod(
	slots: AvailabilitySlot[],
	timeZone = AGENDA_TIMEZONE
): { morning: AvailabilitySlot[]; afternoon: AvailabilitySlot[] } {
	const morning: AvailabilitySlot[] = [];
	const afternoon: AvailabilitySlot[] = [];
	for (const slot of slots) {
		const hour = Number(
			new Intl.DateTimeFormat('en-GB', {
				timeZone,
				hour: 'numeric',
				hour12: false
			}).format(parseInstant(slot.startAt))
		);
		if (hour < 12) morning.push(slot);
		else afternoon.push(slot);
	}
	return { morning, afternoon };
}

export function slotKey(slot: AvailabilitySlot): string {
	return `${slot.practitionerId}|${slot.startAt}|${slot.endAt}`;
}

export function newIdempotencyKey(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildBookPayload(input: {
	patientId: number;
	serviceId: number;
	appointmentTypeId?: number;
	durationMinutes?: number;
	practitionerId?: number;
	startAt: string;
	reason?: string;
	idempotencyKey: string;
}): BookAppointmentRequest {
	const payload: BookAppointmentRequest = {
		patientId: input.patientId,
		serviceId: input.serviceId,
		startAt: input.startAt,
		idempotencyKey: input.idempotencyKey
	};
	if (input.practitionerId) payload.practitionerId = input.practitionerId;
	if (input.appointmentTypeId) payload.appointmentTypeId = input.appointmentTypeId;
	if (input.durationMinutes) payload.durationMinutes = input.durationMinutes;
	if (input.reason?.trim()) payload.reason = input.reason.trim();
	return payload;
}

export function buildReschedulePayload(input: {
	startAt: string;
	expectedScheduledAt: string;
	expectedScheduledEndAt: string;
	practitionerId?: number;
	appointmentTypeId?: number;
	durationMinutes?: number;
	reason?: string;
	idempotencyKey: string;
}) {
	return {
		startAt: input.startAt,
		expectedScheduledAt: input.expectedScheduledAt,
		expectedScheduledEndAt: input.expectedScheduledEndAt,
		practitionerId: input.practitionerId,
		appointmentTypeId: input.appointmentTypeId,
		durationMinutes: input.durationMinutes,
		reason: input.reason,
		idempotencyKey: input.idempotencyKey
	};
}

export function groupAppointmentsByZonedDay(
	appointments: Appointment[],
	timeZone = AGENDA_TIMEZONE
): Map<string, Appointment[]> {
	const map = new Map<string, Appointment[]>();
	for (const appt of appointments) {
		const key = zonedDayKey(parseInstant(appt.scheduledAt), timeZone);
		const list = map.get(key) ?? [];
		list.push(appt);
		map.set(key, list);
	}
	for (const list of map.values()) {
		list.sort((a, b) => {
			const t = a.scheduledAt.localeCompare(b.scheduledAt);
			return t !== 0 ? t : a.id - b.id;
		});
	}
	return map;
}

export function weekDayKeys(from: Date, timeZone = AGENDA_TIMEZONE): string[] {
	const keys: string[] = [];
	for (let i = 0; i < 7; i++) {
		keys.push(zonedDayKey(addCalendarDays(from, i, timeZone), timeZone));
	}
	return keys;
}

export function zonedDayKey(d: Date, timeZone = AGENDA_TIMEZONE): string {
	const p = zonedParts(d, timeZone);
	return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

function zonedParts(d: Date, timeZone: string) {
	const fmt = new Intl.DateTimeFormat('en-US', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23'
	});
	const parts = Object.fromEntries(
		fmt
			.formatToParts(d)
			.filter((p) => p.type !== 'literal')
			.map((p) => [p.type, p.value])
	);
	return {
		year: Number(parts.year),
		month: Number(parts.month),
		day: Number(parts.day),
		hour: Number(parts.hour),
		minute: Number(parts.minute),
		second: Number(parts.second)
	};
}

function zonedWeekday(d: Date, timeZone: string): number {
	const wd = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(d);
	const map: Record<string, number> = {
		Mon: 1,
		Tue: 2,
		Wed: 3,
		Thu: 4,
		Fri: 5,
		Sat: 6,
		Sun: 7
	};
	return map[wd] ?? 1;
}

/** Convert a wall-clock local time in `timeZone` to a UTC Date (DST-safe). */
export function zonedLocalToUtc(
	year: number,
	month: number,
	day: number,
	hour: number,
	minute: number,
	second: number,
	timeZone: string
): Date {
	const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
	const parts = zonedParts(guess, timeZone);
	const asUtc = Date.UTC(
		parts.year,
		parts.month - 1,
		parts.day,
		parts.hour,
		parts.minute,
		parts.second
	);
	const desired = Date.UTC(year, month - 1, day, hour, minute, second);
	return new Date(guess.getTime() + (desired - asUtc));
}

export function isFinanceBlockedMessage(message: string): boolean {
	return /paiement requis|finance=PAYMENT_REQUIRED|finance=BLOCKED|finance bloqu/i.test(message);
}

export function financeHrefForPatient(patientId: number): string {
	return `/billing?patientId=${patientId}`;
}
