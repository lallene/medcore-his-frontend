import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	canAccessAppointmentTypeCatalog,
	canAccessScheduleAdministration,
	canManageAppointmentTypes,
	canManageSchedule,
	canReadScheduleAdministration,
	dateInputToRfc3339Date,
	datetimeLocalToRfc3339,
	defaultScheduleAdminTab,
	isNegativeExceptionType,
	isPositiveExceptionType,
	isScheduleExceptionType,
	normalizeWallClockTime,
	parseExplicitWeekday,
	rfc3339ToDatetimeLocal,
	scheduleAdminVisibleTabs,
	validateAppointmentTypeDuration,
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

	it('canManageAppointmentTypes is dedicated (not schedule/book/org)', () => {
		assert.equal(canManageAppointmentTypes(['appointment_type.manage']), true);
		assert.equal(canManageAppointmentTypes(['*']), true);
		assert.equal(canManageAppointmentTypes(['schedule.manage.all']), false);
		assert.equal(canManageAppointmentTypes(['schedule.manage.service']), false);
		assert.equal(canManageAppointmentTypes(['appointment.create.all']), false);
		assert.equal(canManageAppointmentTypes(['appointment.create.service']), false);
		assert.equal(canManageAppointmentTypes(['organization.manage']), false);
		assert.equal(canManageAppointmentTypes(['schedule.read.all']), false);
		assert.equal(canManageAppointmentTypes(['schedule.read.service']), false);
		assert.equal(canManageAppointmentTypes(['schedule.read.own']), false);
	});

	it('types-only manage can access page and Types tab without schedule tabs', () => {
		const only = ['appointment_type.manage'];
		assert.equal(canAccessScheduleAdministration(only), true);
		assert.equal(canReadScheduleAdministration(only), false);
		assert.equal(canAccessAppointmentTypeCatalog(only), true);
		assert.equal(defaultScheduleAdminTab(only), 'types');
		assert.deepEqual(
			scheduleAdminVisibleTabs(only).map((t) => t.id),
			['types']
		);
	});

	it('schedule readers keep schedules/exceptions/types tabs', () => {
		const read = ['schedule.read.service'];
		assert.equal(defaultScheduleAdminTab(read), 'schedules');
		assert.deepEqual(
			scheduleAdminVisibleTabs(read).map((t) => t.id),
			['schedules', 'exceptions', 'types']
		);
		assert.equal(canAccessAppointmentTypeCatalog(read), true);
		assert.equal(canManageAppointmentTypes(read), false);
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

	it('validates appointment type duration bounds', () => {
		assert.equal(validateAppointmentTypeDuration(30), null);
		assert.equal(validateAppointmentTypeDuration(5), null);
		assert.equal(validateAppointmentTypeDuration(480), null);
		assert.ok(validateAppointmentTypeDuration(4));
		assert.ok(validateAppointmentTypeDuration(481));
		assert.ok(validateAppointmentTypeDuration(30.5));
	});
});
