import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
	canAccessAppointmentTypeCatalog,
	canAccessScheduleAdministration,
	canManageAppointmentTypes,
	canManageSchedule,
	canReadAppointmentNotificationAdmin,
	canReadScheduleAdministration,
	dateInputToRfc3339Date,
	datetimeLocalToRfc3339,
	defaultScheduleAdminTab,
	isNegativeExceptionType,
	isPositiveExceptionType,
	isScheduleExceptionType,
	notificationChannelLabel,
	notificationKindLabel,
	notificationStatusLabel,
	normalizeWallClockTime,
	parseExplicitWeekday,
	rfc3339ToDatetimeLocal,
	scheduleAdminVisibleTabs,
	truncateOperationalError,
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

	it('notification admin tab requires schedule.manage (not schedule.read)', () => {
		assert.equal(canReadAppointmentNotificationAdmin(['schedule.manage.service']), true);
		assert.equal(canReadAppointmentNotificationAdmin(['schedule.manage.all']), true);
		assert.equal(canReadAppointmentNotificationAdmin(['*']), true);
		assert.equal(canReadAppointmentNotificationAdmin(['schedule.read.all']), false);
		assert.equal(canReadAppointmentNotificationAdmin(['schedule.read.service']), false);
		assert.equal(canReadAppointmentNotificationAdmin(['schedule.read.own']), false);
		assert.equal(canReadAppointmentNotificationAdmin(['appointment_type.manage']), false);

		assert.ok(
			scheduleAdminVisibleTabs(['schedule.manage.service']).some((t) => t.id === 'notifications')
		);
		assert.ok(
			scheduleAdminVisibleTabs(['schedule.manage.all']).some((t) => t.id === 'notifications')
		);
		assert.ok(scheduleAdminVisibleTabs(['*']).some((t) => t.id === 'notifications'));
		assert.ok(
			!scheduleAdminVisibleTabs(['schedule.read.all']).some((t) => t.id === 'notifications')
		);
		assert.ok(
			!scheduleAdminVisibleTabs(['schedule.read.service']).some((t) => t.id === 'notifications')
		);
		assert.ok(
			!scheduleAdminVisibleTabs(['schedule.read.own']).some((t) => t.id === 'notifications')
		);
	});

	it('page access and default tab stay consistent with visible tabs', () => {
		const sets: string[][] = [
			['schedule.read.own'],
			['schedule.read.service'],
			['schedule.read.all'],
			['schedule.manage.service'],
			['schedule.manage.all'],
			['*'],
			['appointment_type.manage'],
			['schedule.read.service', 'appointment_type.manage'],
			['schedule.manage.service', 'appointment_type.manage']
		];
		for (const perms of sets) {
			assert.equal(canAccessScheduleAdministration(perms), true, String(perms));
			const visible = scheduleAdminVisibleTabs(perms).map((t) => t.id);
			assert.ok(visible.length > 0, String(perms));
			const def = defaultScheduleAdminTab(perms);
			assert.ok(visible.includes(def), `${String(perms)} default=${def} visible=${visible}`);
		}

		// Notification-admin-capable sets can open the page and see Notifications.
		for (const perms of [['schedule.manage.service'], ['schedule.manage.all'], ['*']]) {
			assert.equal(canAccessScheduleAdministration(perms), true);
			assert.equal(canReadAppointmentNotificationAdmin(perms), true);
			assert.ok(scheduleAdminVisibleTabs(perms).some((t) => t.id === 'notifications'));
			assert.equal(defaultScheduleAdminTab(perms), 'schedules');
		}

		// schedule.read.* still cannot see Notifications; default remains schedules.
		for (const perms of [['schedule.read.own'], ['schedule.read.service'], ['schedule.read.all']]) {
			assert.equal(canReadAppointmentNotificationAdmin(perms), false);
			assert.ok(!scheduleAdminVisibleTabs(perms).some((t) => t.id === 'notifications'));
			assert.equal(defaultScheduleAdminTab(perms), 'schedules');
		}

		// appointment_type.manage-only unchanged.
		const onlyTypes = ['appointment_type.manage'];
		assert.equal(canAccessScheduleAdministration(onlyTypes), true);
		assert.equal(canReadAppointmentNotificationAdmin(onlyTypes), false);
		assert.deepEqual(
			scheduleAdminVisibleTabs(onlyTypes).map((t) => t.id),
			['types']
		);
		assert.equal(defaultScheduleAdminTab(onlyTypes), 'types');

		// Unauthorized sets: no page access / no visible tabs → do not invent a fake surface.
		assert.equal(canAccessScheduleAdministration(['queue.checkin']), false);
		assert.deepEqual(scheduleAdminVisibleTabs(['queue.checkin']), []);
	});
});

describe('notification admin labels', () => {
	it('maps kinds, channels, statuses and truncates operational errors', () => {
		assert.equal(notificationKindLabel('REMINDER_T24H'), 'Rappel J−1');
		assert.equal(notificationKindLabel('BOOKED'), 'Réservation');
		assert.equal(notificationChannelLabel('LOG'), 'Journal (LOG)');
		assert.equal(notificationStatusLabel('PENDING'), 'En attente');
		assert.equal(notificationStatusLabel('FAILED'), 'Échec');
		assert.equal(truncateOperationalError('short'), 'short');
		assert.equal(truncateOperationalError('x'.repeat(200)).endsWith('…'), true);
		assert.equal(truncateOperationalError('x'.repeat(200)).length, 160);
	});

	it('long operational errors are display-truncated and not re-exposed raw in the admin UI', () => {
		const raw = 'provider boom secret-token-ABCDEFG ' + 'z'.repeat(220) + ' phone=+221770000000';
		const shown = truncateOperationalError(raw);
		assert.notEqual(shown, raw);
		assert.ok(shown.length < raw.length);
		assert.equal(shown, truncateOperationalError(raw));
		assert.ok(!shown.includes('phone=+221770000000'));

		const uiSource = readFileSync(
			new URL('./AppointmentNotificationsAdmin.svelte', import.meta.url),
			'utf8'
		);
		assert.match(uiSource, /truncateOperationalError\(att\.error\)/);
		assert.doesNotMatch(uiSource, /title=\{att\.error\}/);
		assert.doesNotMatch(uiSource, /aria-label=\{att\.error\}/);
		assert.doesNotMatch(uiSource, /data-[a-zA-Z-]+=\{att\.error\}/);
		// Text node must use truncated helper only — no bare {att.error} render.
		assert.doesNotMatch(uiSource, />\s*\{att\.error\}\s*</);
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
