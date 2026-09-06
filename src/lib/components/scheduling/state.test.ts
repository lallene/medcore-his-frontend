import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	canManageSchedule,
	canReadScheduleAdministration,
	dateInputToRfc3339Date,
	datetimeLocalToRfc3339,
	isNegativeExceptionType,
	isPositiveExceptionType,
	isScheduleExceptionType,
	normalizeWallClockTime,
	parseExplicitWeekday,
	rfc3339ToDatetimeLocal,
	validateExceptionRange,
	validateRecurringWallClockRange,
	weekdayLabel
} from './state.ts';

describe('schedule administration RBAC', () => {
	it('distinguishes read vs manage and excludes booking/queue/create', () => {
		assert.equal(canReadScheduleAdministration(['schedule.read.service']), true);
		assert.equal(canReadScheduleAdministration(['schedule.read.own']), true);
		assert.equal(canReadScheduleAdministration(['schedule.manage.service']), true);
		assert.equal(canReadScheduleAdministration(['appointment.create.service']), false);
		assert.equal(canReadScheduleAdministration(['queue.checkin']), false);

		assert.equal(canManageSchedule(['schedule.manage.service']), true);
		assert.equal(canManageSchedule(['schedule.manage.all']), true);
		assert.equal(canManageSchedule(['*']), true);
		assert.equal(canManageSchedule(['schedule.read.all']), false);
		assert.equal(canManageSchedule(['schedule.read.service']), false);
		assert.equal(canManageSchedule(['schedule.manage.own']), false);
		assert.equal(canManageSchedule(['appointment.create.all']), false);
		assert.equal(canManageSchedule(['queue.read.all']), false);
		assert.equal(canManageSchedule(['queue.checkin']), false);
	});
});

describe('schedule administration helpers', () => {
	it('requires explicit weekday 0-6', () => {
		assert.equal(parseExplicitWeekday(1), 1);
		assert.equal(parseExplicitWeekday('0'), 0);
		assert.equal(parseExplicitWeekday(''), null);
		assert.equal(parseExplicitWeekday(null), null);
		assert.equal(parseExplicitWeekday(7), null);
		assert.equal(parseExplicitWeekday(-1), null);
		assert.equal(weekdayLabel(1), 'Lundi');
	});

	it('validates wall-clock ranges and rejects overnight', () => {
		assert.equal(normalizeWallClockTime('8:00'), '08:00');
		assert.equal(normalizeWallClockTime('08:30:00'), '08:30');
		assert.equal(validateRecurringWallClockRange('08:00', '12:00'), null);
		assert.ok(validateRecurringWallClockRange('18:00', '08:00'));
		assert.ok(validateRecurringWallClockRange('10:00', '10:00'));
	});

	it('classifies exception polarity', () => {
		assert.equal(isPositiveExceptionType('EXTRA_AVAILABILITY'), true);
		assert.equal(isNegativeExceptionType('ABSENCE'), true);
		assert.equal(isNegativeExceptionType('LEAVE'), true);
		assert.equal(isPositiveExceptionType('ABSENCE'), false);
	});

	it('accepts only supported exception types for write DTOs', () => {
		assert.equal(isScheduleExceptionType('ABSENCE'), true);
		assert.equal(isScheduleExceptionType('EXTRA_AVAILABILITY'), true);
		assert.equal(isScheduleExceptionType('FUTURE_TYPE'), false);
	});

	it('converts exception datetime-local values in Europe/Paris, DST-safe', () => {
		assert.equal(datetimeLocalToRfc3339('2026-01-15T10:30'), '2026-01-15T09:30:00.000Z');
		assert.equal(datetimeLocalToRfc3339('2026-07-15T10:30'), '2026-07-15T08:30:00.000Z');
		assert.equal(rfc3339ToDatetimeLocal('2026-01-15T09:30:00.000Z'), '2026-01-15T10:30');
		assert.equal(rfc3339ToDatetimeLocal('2026-07-15T08:30:00.000Z'), '2026-07-15T10:30');
	});

	it('converts date input and validates exception range', () => {
		assert.equal(dateInputToRfc3339Date('2026-09-01'), '2026-09-01T00:00:00.000Z');
		assert.equal(dateInputToRfc3339Date('bad'), null);
		assert.equal(
			validateExceptionRange('2026-09-10T08:00:00.000Z', '2026-09-10T12:00:00.000Z'),
			null
		);
		assert.ok(validateExceptionRange('2026-09-10T12:00:00.000Z', '2026-09-10T08:00:00.000Z'));
	});
});
