import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import axios from 'axios';
import {
	SERIES_OCC_CONFLICT_FALLBACK,
	isSeriesAppointment,
	isSeriesOccConflict,
	isSeriesOccConflictStatus,
	seriesActionVisibility
} from '../../agenda/series.ts';

/** Patient 360 recurring-series action surface (shared helpers with Agenda). */
describe('Patient 360 recurring series actions', () => {
	const seriesAppt = {
		status: 'SCHEDULED' as const,
		queueTicketId: null,
		hasActiveTicket: false,
		seriesId: 42
	};

	it('detects recurring membership for Patient 360 cards', () => {
		assert.equal(isSeriesAppointment(seriesAppt), true);
		assert.equal(isSeriesAppointment({ seriesId: null }), false);
		assert.equal(isSeriesAppointment({ seriesId: 0 }), false);
	});

	it('exposes view / edit-future / cancel-future / cancel-entire when permitted', () => {
		const v = seriesActionVisibility(
			seriesAppt,
			['appointment.reschedule.service', 'appointment.cancel.service'],
			'ACTIVE'
		);
		assert.equal(v.viewSeries, true);
		assert.equal(v.editThis, true);
		assert.equal(v.editThisAndFuture, true);
		assert.equal(v.cancelThis, true);
		assert.equal(v.cancelThisAndFuture, true);
		assert.equal(v.cancelEntireSeries, true);
	});

	it('gates mutations for read-only Patient 360 users', () => {
		const v = seriesActionVisibility(seriesAppt, ['schedule.read.service'], 'ACTIVE');
		assert.equal(v.viewSeries, true);
		assert.equal(v.editThisAndFuture, false);
		assert.equal(v.cancelThisAndFuture, false);
		assert.equal(v.cancelEntireSeries, false);
	});

	it('hides series-wide mutations when series is CANCELLED', () => {
		const v = seriesActionVisibility(
			seriesAppt,
			['appointment.reschedule.all', 'appointment.cancel.all'],
			'CANCELLED'
		);
		assert.equal(v.viewSeries, true);
		assert.equal(v.editThisAndFuture, false);
		assert.equal(v.cancelThisAndFuture, false);
		assert.equal(v.cancelEntireSeries, false);
		assert.equal(v.editThis, true);
	});

	it('handles OCC 409 conflict detection for refresh-before-retry', () => {
		assert.equal(isSeriesOccConflictStatus(409), true);
		assert.equal(isSeriesOccConflictStatus(403), false);
		assert.equal(isSeriesOccConflict(new Error('other')), false);
		const ax = new axios.AxiosError('conflict');
		ax.response = {
			status: 409,
			data: {},
			statusText: 'Conflict',
			headers: {},
			config: {} as never
		};
		assert.equal(isSeriesOccConflict(ax), true);
		assert.match(SERIES_OCC_CONFLICT_FALLBACK, /Conflit de version/);
	});
});
