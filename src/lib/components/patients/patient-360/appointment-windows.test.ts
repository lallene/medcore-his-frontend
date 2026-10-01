import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	MAX_APPOINTMENT_QUERY_RANGE_MS,
	PATIENT360_APPOINTMENT_HORIZON_DAYS,
	appointmentWindowDurationMs,
	patient360AppointmentWindows
} from './appointment-windows.ts';

describe('Patient 360 appointment query windows', () => {
	it('uses a 30-day horizon', () => {
		assert.equal(PATIENT360_APPOINTMENT_HORIZON_DAYS, 30);
	});

	it('keeps absolute duration ≤ 31×24h across Paris DST end (Oct 2026)', () => {
		// 2026-10-25 Europe/Paris leaves CEST → CET inside +30d from Oct 1.
		const windows = patient360AppointmentWindows(new Date('2026-10-01T12:00:00Z'));
		const pastMs = appointmentWindowDurationMs(windows.past.from, windows.past.to);
		const forwardMs = appointmentWindowDurationMs(windows.forward.from, windows.forward.to);
		assert.ok(pastMs <= MAX_APPOINTMENT_QUERY_RANGE_MS, `past ${pastMs}ms`);
		assert.ok(forwardMs <= MAX_APPOINTMENT_QUERY_RANGE_MS, `forward ${forwardMs}ms`);
		// Regression: former ±31 calendar days overflowed here (745h > 744h).
		assert.ok(forwardMs <= 30 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000);
	});

	it('keeps absolute duration ≤ 31×24h across Paris DST start (Mar 2027)', () => {
		// 2027-03-28 Europe/Paris CEST begins inside +30d from Mar 1.
		const windows = patient360AppointmentWindows(new Date('2027-03-01T12:00:00Z'));
		assert.ok(
			appointmentWindowDurationMs(windows.past.from, windows.past.to) <=
				MAX_APPOINTMENT_QUERY_RANGE_MS
		);
		assert.ok(
			appointmentWindowDurationMs(windows.forward.from, windows.forward.to) <=
				MAX_APPOINTMENT_QUERY_RANGE_MS
		);
	});

	it('keeps absolute duration ≤ 31×24h in a non-transition month', () => {
		const windows = patient360AppointmentWindows(new Date('2026-06-15T12:00:00Z'));
		assert.ok(
			appointmentWindowDurationMs(windows.past.from, windows.past.to) <=
				MAX_APPOINTMENT_QUERY_RANGE_MS
		);
		assert.ok(
			appointmentWindowDurationMs(windows.forward.from, windows.forward.to) <=
				MAX_APPOINTMENT_QUERY_RANGE_MS
		);
		assert.equal(
			appointmentWindowDurationMs(windows.forward.from, windows.forward.to),
			30 * 24 * 60 * 60 * 1000
		);
	});
});
