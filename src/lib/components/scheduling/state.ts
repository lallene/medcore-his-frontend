import { can, canAny } from '../../rbac/permissions.ts';
import { AGENDA_TIMEZONE, zonedLocalToUtc } from '../agenda/state.ts';
import type { ScheduleExceptionType } from '../../types/scheduling.ts';

/** Read access to Schedule Administration list APIs (UX only). */
export const SCHEDULE_ADMIN_READ_PERMISSIONS = [
	'schedule.read.own',
	'schedule.read.service',
	'schedule.read.all',
	'schedule.manage.service',
	'schedule.manage.all'
] as const;

/**
 * P0 mutation authority for Schedule Administration.
 * Intentionally excludes schedule.manage.own (product decision deferred).
 * Does NOT include appointment.create.* / queue.* / schedule.read.*.
 */
export const SCHEDULE_ADMIN_MANAGE_PERMISSIONS = [
	'schedule.manage.service',
	'schedule.manage.all'
] as const;

export const SCHEDULE_ADMIN_TIMEZONE = AGENDA_TIMEZONE;

export const WEEKDAY_OPTIONS: Array<{ value: number; label: string }> = [
	{ value: 1, label: 'Lundi' },
	{ value: 2, label: 'Mardi' },
	{ value: 3, label: 'Mercredi' },
	{ value: 4, label: 'Jeudi' },
	{ value: 5, label: 'Vendredi' },
	{ value: 6, label: 'Samedi' },
	{ value: 0, label: 'Dimanche' }
];

export const EXCEPTION_TYPE_OPTIONS: Array<{
	value: ScheduleExceptionType;
	label: string;
	polarity: 'negative' | 'positive';
}> = [
	{ value: 'ABSENCE', label: 'Absence', polarity: 'negative' },
	{ value: 'LEAVE', label: 'Congé', polarity: 'negative' },
	{ value: 'MEETING', label: 'Réunion', polarity: 'negative' },
	{ value: 'BLOCKED', label: 'Bloqué', polarity: 'negative' },
	{ value: 'TRAINING', label: 'Formation', polarity: 'negative' },
	{ value: 'OTHER', label: 'Autre', polarity: 'negative' },
	{ value: 'EXTRA_AVAILABILITY', label: 'Disponibilité supplémentaire', polarity: 'positive' }
];

export function canReadScheduleAdministration(permissions: string[]): boolean {
	return can(permissions, '*') || canAny(permissions, [...SCHEDULE_ADMIN_READ_PERMISSIONS]);
}

/** Schedule Administration mutations — not booking, not queue, not read-only. */
export function canManageSchedule(permissions: string[]): boolean {
	return can(permissions, '*') || canAny(permissions, [...SCHEDULE_ADMIN_MANAGE_PERMISSIONS]);
}

export function weekdayLabel(weekday: number): string {
	return WEEKDAY_OPTIONS.find((w) => w.value === weekday)?.label ?? `Jour ${weekday}`;
}

export function isPositiveExceptionType(type: string): boolean {
	return type === 'EXTRA_AVAILABILITY';
}

export function isNegativeExceptionType(type: string): boolean {
	return type !== 'EXTRA_AVAILABILITY';
}

export function exceptionTypeLabel(type: string): string {
	return EXCEPTION_TYPE_OPTIONS.find((t) => t.value === type)?.label ?? type;
}

export function isScheduleExceptionType(type: string): type is ScheduleExceptionType {
	return EXCEPTION_TYPE_OPTIONS.some((option) => option.value === type);
}

/** Normalize time input to HH:MM for API (backend accepts HH:MM or HH:MM:SS). */
export function normalizeWallClockTime(raw: string): string | null {
	const s = raw.trim();
	const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
	if (!m) return null;
	const h = Number(m[1]);
	const min = Number(m[2]);
	const sec = m[3] !== undefined ? Number(m[3]) : 0;
	if (h > 23 || min > 59 || sec > 59) return null;
	return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/**
 * Client-side wall-clock range check (UX). Overnight is rejected here to surface
 * a clear message; backend remains authoritative.
 */
export function validateRecurringWallClockRange(startTime: string, endTime: string): string | null {
	const start = normalizeWallClockTime(startTime);
	const end = normalizeWallClockTime(endTime);
	if (!start || !end) return 'Horaires invalides (format HH:MM).';
	if (start >= end) {
		return 'L’heure de fin doit être strictement après le début (pas de créneau nuit).';
	}
	return null;
}

/** Weekday must be an explicit integer 0–6 (never omit / never rely on Sunday default). */
export function parseExplicitWeekday(raw: string | number | null | undefined): number | null {
	if (raw === null || raw === undefined || raw === '') return null;
	const n = typeof raw === 'number' ? raw : Number(raw);
	if (!Number.isInteger(n) || n < 0 || n > 6) return null;
	return n;
}

/** Date input YYYY-MM-DD → RFC3339 UTC midnight for validFrom/validUntil. */
export function dateInputToRfc3339Date(dateLocal: string): string | null {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(dateLocal)) return null;
	return `${dateLocal}T00:00:00.000Z`;
}

export function rfc3339DateToInput(iso: string | null | undefined): string {
	if (!iso) return '';
	const d = iso.slice(0, 10);
	return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : '';
}

/** datetime-local value ↔ RFC3339 for exception absolute timestamps. */
export function datetimeLocalToRfc3339(local: string): string | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
	if (!match) return null;

	const [, year, month, day, hour, minute] = match;
	const d = zonedLocalToUtc(
		Number(year),
		Number(month),
		Number(day),
		Number(hour),
		Number(minute),
		0,
		SCHEDULE_ADMIN_TIMEZONE
	);
	return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function rfc3339ToDatetimeLocal(iso: string | null | undefined): string {
	if (!iso) return '';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '';

	const parts = Object.fromEntries(
		new Intl.DateTimeFormat('en-CA', {
			timeZone: SCHEDULE_ADMIN_TIMEZONE,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23'
		})
			.formatToParts(d)
			.filter((part) => part.type !== 'literal')
			.map((part) => [part.type, part.value])
	);

	return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function formatWallClockDisplay(time: string): string {
	const n = normalizeWallClockTime(time);
	return n ?? time;
}

export function validateExceptionRange(startAt: string, endAt: string): string | null {
	const a = new Date(startAt).getTime();
	const b = new Date(endAt).getTime();
	if (Number.isNaN(a) || Number.isNaN(b)) return 'Dates/heures invalides.';
	if (b <= a) return 'La fin doit être strictement après le début.';
	return null;
}
