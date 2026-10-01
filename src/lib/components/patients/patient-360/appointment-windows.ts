import {
	AGENDA_TIMEZONE,
	addCalendarDays,
	startOfZonedDay,
	toRfc3339
} from '../../agenda/state.ts';

/**
 * Patient 360 appointment list horizon (calendar days, Europe/Paris).
 * Kept at 30 so absolute duration stays ≤ backend MaxQueryRangeDays (31×24h)
 * across DST transitions.
 */
export const PATIENT360_APPOINTMENT_HORIZON_DAYS = 30;

/** Backend scheduling.MaxQueryRangeDays absolute ceiling. */
export const MAX_APPOINTMENT_QUERY_RANGE_MS = 31 * 24 * 60 * 60 * 1000;

/** Half-open windows matching GET /api/appointments [from, to). */
export function patient360AppointmentWindows(
	anchor: Date,
	timeZone = AGENDA_TIMEZONE
): {
	startToday: Date;
	past: { from: string; to: string };
	forward: { from: string; to: string };
} {
	const startToday = startOfZonedDay(anchor, timeZone);
	const historyFrom = addCalendarDays(startToday, -PATIENT360_APPOINTMENT_HORIZON_DAYS, timeZone);
	const upcomingTo = addCalendarDays(startToday, PATIENT360_APPOINTMENT_HORIZON_DAYS, timeZone);
	return {
		startToday,
		past: { from: toRfc3339(historyFrom), to: toRfc3339(startToday) },
		forward: { from: toRfc3339(startToday), to: toRfc3339(upcomingTo) }
	};
}

export function appointmentWindowDurationMs(fromIso: string, toIso: string): number {
	return new Date(toIso).getTime() - new Date(fromIso).getTime();
}
