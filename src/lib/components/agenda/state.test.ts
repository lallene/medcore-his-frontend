import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	AGENDA_TIMEZONE,
	appointmentActionVisibility,
	appointmentStatusLabels,
	buildBookPayload,
	buildReschedulePayload,
	canBookAppointment,
	canCheckInAppointment,
	canReadAgenda,
	dayRange,
	fetchAllAppointmentPages,
	formatAgendaTime,
	groupSlotsByPeriod,
	isTerminalAppointment,
	isUpcomingAppointmentStatus,
	filterUpcomingAppointments,
	navigateAnchor,
	newIdempotencyKey,
	slotKey,
	toRfc3339,
	weekRange,
	zonedLocalToUtc
} from './state.ts';
import type { Appointment, AvailabilitySlot } from '../../types/scheduling.ts';

describe('agenda status mapping', () => {
	it('maps French labels for all statuses', () => {
		assert.equal(appointmentStatusLabels.SCHEDULED, 'Planifié');
		assert.equal(appointmentStatusLabels.CHECKED_IN, 'Enregistré');
		assert.equal(appointmentStatusLabels.NO_SHOW, 'Absent');
	});

	it('marks terminal states', () => {
		assert.equal(isTerminalAppointment('CANCELLED'), true);
		assert.equal(isTerminalAppointment('SCHEDULED'), false);
	});
});

describe('agenda RBAC helpers', () => {
	it('requires schedule.read.* for agenda', () => {
		assert.equal(canReadAgenda(['queue.checkin']), false);
		assert.equal(canReadAgenda(['consultations.read']), false);
		assert.equal(canReadAgenda(['schedule.read.own']), true);
		assert.equal(canReadAgenda(['schedule.read.service']), true);
		assert.equal(canReadAgenda(['*']), true);
	});

	it('book vs check-in permissions are distinct', () => {
		assert.equal(canBookAppointment(['queue.checkin']), true);
		assert.equal(canCheckInAppointment(['queue.checkin']), true);
		assert.equal(canBookAppointment(['appointment.cancel.service']), false);
		assert.equal(canCheckInAppointment(['schedule.manage.all']), false);
	});

	it('action visibility respects status and permissions', () => {
		const scheduled = {
			status: 'SCHEDULED' as const,
			queueTicketId: null,
			hasActiveTicket: false
		};
		const perms = [
			'appointment.reschedule.service',
			'appointment.cancel.service',
			'appointment.no_show.service',
			'queue.checkin'
		];
		const v = appointmentActionVisibility(scheduled, perms);
		assert.equal(v.reschedule, true);
		assert.equal(v.cancel, true);
		assert.equal(v.noShow, true);
		assert.equal(v.checkIn, true);

		const linked = appointmentActionVisibility(
			{ status: 'SCHEDULED', queueTicketId: 9, hasActiveTicket: true },
			perms
		);
		assert.equal(linked.reschedule, false);
		assert.equal(linked.checkIn, false);

		const cancelOnly = appointmentActionVisibility(scheduled, ['appointment.cancel.service']);
		assert.equal(cancelOnly.cancel, true);
		assert.equal(cancelOnly.reschedule, false);
		assert.equal(cancelOnly.noShow, false);
		assert.equal(cancelOnly.checkIn, false);
	});
});

describe('agenda date ranges', () => {
	it('builds half-open day range in Europe/Paris', () => {
		const anchor = zonedLocalToUtc(2026, 3, 15, 10, 0, 0, AGENDA_TIMEZONE);
		const { from, to } = dayRange(anchor, AGENDA_TIMEZONE);
		assert.equal(toRfc3339(from), '2026-03-14T23:00:00.000Z'); // CET UTC+1 winter→spring
		assert.equal(to.getTime() - from.getTime(), 24 * 60 * 60 * 1000);
	});

	it('builds Monday–Sunday week range', () => {
		// Wednesday 2026-03-18 Paris
		const anchor = zonedLocalToUtc(2026, 3, 18, 9, 0, 0, AGENDA_TIMEZONE);
		const { from, to } = weekRange(anchor, AGENDA_TIMEZONE);
		assert.equal(formatAgendaTime(toRfc3339(from), AGENDA_TIMEZONE), '00:00');
		const mondayKey = new Intl.DateTimeFormat('en-CA', {
			timeZone: AGENDA_TIMEZONE,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		}).format(from);
		assert.equal(mondayKey, '2026-03-16');
		assert.equal((to.getTime() - from.getTime()) / 86_400_000, 7);
	});

	it('navigates day and week', () => {
		const day = zonedLocalToUtc(2026, 6, 10, 8, 0, 0, AGENDA_TIMEZONE);
		const next = navigateAnchor('day', day, 1, AGENDA_TIMEZONE);
		const prev = navigateAnchor('day', day, -1, AGENDA_TIMEZONE);
		assert.ok(next.getTime() > day.getTime());
		assert.ok(prev.getTime() < day.getTime());
		const weekNext = navigateAnchor('week', day, 1, AGENDA_TIMEZONE);
		assert.equal((weekNext.getTime() - day.getTime()) / 86_400_000 >= 6, true);
	});

	it('formats DST-sensitive Paris time without naive string slicing', () => {
		// 2026-03-29 01:30 UTC = 03:30 CEST after spring forward
		const iso = '2026-03-29T01:30:00.000Z';
		assert.equal(formatAgendaTime(iso, AGENDA_TIMEZONE), '03:30');
	});
});

describe('pagination aggregation', () => {
	it('fetches until total reached and stops', async () => {
		const calls: number[] = [];
		const items = await fetchAllAppointmentPages(async (page, limit) => {
			calls.push(page);
			assert.equal(limit, 100);
			if (page === 1) {
				return {
					items: Array.from({ length: 100 }, (_, i) => ({ id: i + 1 })),
					total: 150,
					page: 1,
					limit: 100
				};
			}
			return {
				items: Array.from({ length: 50 }, (_, i) => ({ id: 100 + i + 1 })),
				total: 150,
				page: 2,
				limit: 100
			};
		});
		assert.equal(items.length, 150);
		assert.deepEqual(calls, [1, 2]);
	});

	it('guards infinite loops with maxPages', async () => {
		const items = await fetchAllAppointmentPages(
			async (page) => ({
				items: [{ id: page }],
				total: 10_000,
				page,
				limit: 1
			}),
			{ pageSize: 1, maxPages: 3 }
		);
		assert.equal(items.length, 3);
	});
});

describe('availability grouping and booking DTO', () => {
	it('groups matin / après-midi', () => {
		const slots: AvailabilitySlot[] = [
			{
				practitionerId: 1,
				serviceId: 2,
				startAt: '2026-06-10T07:00:00.000Z', // 09:00 Paris
				endAt: '2026-06-10T07:30:00.000Z',
				durationMinutes: 30
			},
			{
				practitionerId: 1,
				serviceId: 2,
				startAt: '2026-06-10T12:00:00.000Z', // 14:00 Paris
				endAt: '2026-06-10T12:30:00.000Z',
				durationMinutes: 30
			}
		];
		const g = groupSlotsByPeriod(slots, AGENDA_TIMEZONE);
		assert.equal(g.morning.length, 1);
		assert.equal(g.afternoon.length, 1);
		assert.ok(slotKey(slots[0]).includes('|'));
	});

	it('builds book payload without actor IDs', () => {
		const key = newIdempotencyKey();
		const payload = buildBookPayload({
			patientId: 10,
			serviceId: 3,
			appointmentTypeId: 7,
			startAt: '2026-06-10T08:00:00.000Z',
			idempotencyKey: key,
			reason: ' douleurs '
		});
		assert.equal(payload.patientId, 10);
		assert.equal(payload.idempotencyKey, key);
		assert.equal(payload.reason, 'douleurs');
		assert.equal('createdBy' in payload, false);
		assert.equal('actorId' in payload, false);
	});

	it('classifies upcoming vs terminal statuses for Patient 360', () => {
		assert.equal(isUpcomingAppointmentStatus('SCHEDULED'), true);
		assert.equal(isUpcomingAppointmentStatus('ARRIVED'), true);
		assert.equal(isUpcomingAppointmentStatus('CHECKED_IN'), true);
		assert.equal(isUpcomingAppointmentStatus('IN_PROGRESS'), true);
		assert.equal(isUpcomingAppointmentStatus('COMPLETED'), false);
		assert.equal(isUpcomingAppointmentStatus('CANCELLED'), false);
		assert.equal(isUpcomingAppointmentStatus('NO_SHOW'), false);
		const filtered = filterUpcomingAppointments([
			{ status: 'SCHEDULED' },
			{ status: 'CANCELLED' },
			{ status: 'CHECKED_IN' },
			{ status: 'COMPLETED' }
		] as Appointment[]);
		assert.equal(filtered.length, 2);
		assert.equal(filtered[0].status, 'SCHEDULED');
		assert.equal(filtered[1].status, 'CHECKED_IN');
	});

	it('keeps idempotency key stable across retries of same attempt', () => {
		const key = newIdempotencyKey();
		const a = buildBookPayload({
			patientId: 1,
			serviceId: 2,
			startAt: '2026-06-10T08:00:00.000Z',
			idempotencyKey: key
		});
		const b = buildBookPayload({
			patientId: 1,
			serviceId: 2,
			startAt: '2026-06-10T08:00:00.000Z',
			idempotencyKey: key
		});
		assert.equal(a.idempotencyKey, b.idempotencyKey);
	});

	it('maps reschedule expected timestamps from fresh GET', () => {
		const payload = buildReschedulePayload({
			startAt: '2026-06-11T09:00:00.000Z',
			expectedScheduledAt: '2026-06-10T08:00:00.000Z',
			expectedScheduledEndAt: '2026-06-10T08:30:00.000Z',
			idempotencyKey: 'k1'
		});
		assert.equal(payload.expectedScheduledAt, '2026-06-10T08:00:00.000Z');
		assert.equal(payload.expectedScheduledEndAt, '2026-06-10T08:30:00.000Z');
	});
});
