import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	buildCreateSeriesPayload,
	formatSeriesRecurrenceSummary,
	goWeekdayFromIso,
	isSeriesAppointment,
	isSeriesOccConflictStatus,
	SERIES_OCC_CONFLICT_FALLBACK,
	seriesActionVisibility,
	validateRecurringCreateInput
} from './series.ts';

describe('series helpers LOT 23O-E', () => {
	it('detects series membership', () => {
		assert.equal(isSeriesAppointment({ seriesId: 9 }), true);
		assert.equal(isSeriesAppointment({ seriesId: null }), false);
		assert.equal(isSeriesAppointment({}), false);
	});

	it('validates recurring create input', () => {
		const anchor = '2026-12-07T09:00:00.000Z'; // Monday UTC
		assert.equal(goWeekdayFromIso(anchor, 'UTC'), 1);
		assert.equal(
			validateRecurringCreateInput({
				byWeekdays: [1],
				intervalWeeks: 1,
				endMode: 'count',
				count: 3,
				untilLocal: '',
				anchorStartAt: anchor,
				practitionerId: 10
			}),
			null
		);
		assert.match(
			validateRecurringCreateInput({
				byWeekdays: [2],
				intervalWeeks: 1,
				endMode: 'count',
				count: 3,
				untilLocal: '',
				anchorStartAt: anchor,
				practitionerId: 10
			}) ?? '',
			/jour/
		);
		assert.match(
			validateRecurringCreateInput({
				byWeekdays: [1],
				intervalWeeks: 1,
				endMode: 'count',
				count: 3,
				untilLocal: '',
				anchorStartAt: anchor,
				practitionerId: null
			}) ?? '',
			/praticien/
		);
	});

	it('builds create payload with count XOR until', () => {
		const withCount = buildCreateSeriesPayload({
			patientId: 1,
			serviceId: 10,
			practitionerId: 5,
			appointmentTypeId: 2,
			intervalWeeks: 1,
			byWeekdays: [1, 3],
			endMode: 'count',
			count: 4,
			timezone: 'Europe/Paris',
			anchorStartAt: '2026-12-07T08:00:00.000Z',
			idempotencyKey: 'k1'
		});
		assert.equal(withCount.count, 4);
		assert.equal(withCount.until, undefined);
		assert.deepEqual(withCount.byWeekdays, [1, 3]);
	});

	it('formats recurrence summary', () => {
		const s = formatSeriesRecurrenceSummary({
			freq: 'WEEKLY',
			intervalWeeks: 2,
			byWeekdays: [1, 3],
			count: 5,
			until: null,
			timezone: 'Europe/Paris',
			anchorStartAt: '2026-12-07T08:00:00.000Z'
		});
		assert.match(s, /2 semaines/);
		assert.match(s, /5 occurrence/);
	});

	it('gates series actions by permissions and status', () => {
		const appt = {
			status: 'SCHEDULED' as const,
			queueTicketId: null,
			hasActiveTicket: false,
			seriesId: 3
		};
		const full = seriesActionVisibility(
			appt,
			['appointment.reschedule.service', 'appointment.cancel.service'],
			'ACTIVE'
		);
		assert.equal(full.editThis, true);
		assert.equal(full.editThisAndFuture, true);
		assert.equal(full.cancelEntireSeries, true);

		const readOnly = seriesActionVisibility(appt, ['schedule.read.all'], 'ACTIVE');
		assert.equal(readOnly.editThisAndFuture, false);
		assert.equal(readOnly.cancelThis, false);
		assert.equal(readOnly.viewSeries, true);

		const cancelledSeries = seriesActionVisibility(
			appt,
			['appointment.cancel.service', 'appointment.reschedule.service'],
			'CANCELLED'
		);
		assert.equal(cancelledSeries.editThisAndFuture, false);
		assert.equal(cancelledSeries.cancelEntireSeries, false);
		assert.equal(cancelledSeries.editThis, true);
	});

	it('detects OCC conflict status for shared refresh path', () => {
		assert.equal(isSeriesOccConflictStatus(409), true);
		assert.equal(isSeriesOccConflictStatus(200), false);
		assert.match(SERIES_OCC_CONFLICT_FALLBACK, /actualisée/);
	});
});
