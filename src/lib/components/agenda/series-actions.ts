import {
	cancelAppointmentSeries,
	cancelAppointmentSeriesFuture,
	getAppointment,
	getAppointmentSeries
} from '../../api/appointments.ts';
import type { Appointment, AppointmentSeries } from '../../types/scheduling.ts';
import { isSeriesAppointment } from './series.ts';

/** Shared Agenda / Patient 360 load: appointment + optional parent series. */
export async function loadAppointmentWithSeries(appointmentId: number): Promise<{
	appointment: Appointment;
	series: AppointmentSeries | null;
}> {
	const appointment = await getAppointment(appointmentId);
	if (!isSeriesAppointment(appointment) || !appointment.seriesId) {
		return { appointment, series: null };
	}
	try {
		const series = await getAppointmentSeries(appointment.seriesId);
		return { appointment, series };
	} catch {
		return { appointment, series: null };
	}
}

/** 23O-B cancel-future — caller must pass current expectedVersion (OCC). */
export async function cancelSeriesFromAppointmentForward(
	seriesId: number,
	expectedVersion: number,
	fromAppointmentId: number,
	opts?: { reason?: string; idempotencyKey?: string }
): Promise<AppointmentSeries> {
	return cancelAppointmentSeriesFuture(
		seriesId,
		{
			expectedVersion,
			fromAppointmentId,
			reason: opts?.reason,
			idempotencyKey: opts?.idempotencyKey
		},
		opts?.idempotencyKey ? { idempotencyKey: opts.idempotencyKey } : undefined
	);
}

/** 23O-B cancel-entire — caller must pass current expectedVersion (OCC). */
export async function cancelEntireAppointmentSeries(
	seriesId: number,
	expectedVersion: number,
	opts?: { reason?: string; idempotencyKey?: string }
): Promise<AppointmentSeries> {
	return cancelAppointmentSeries(
		seriesId,
		{
			expectedVersion,
			reason: opts?.reason,
			idempotencyKey: opts?.idempotencyKey
		},
		opts?.idempotencyKey ? { idempotencyKey: opts.idempotencyKey } : undefined
	);
}
