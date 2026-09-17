/**
 * LOT 23O-F/G — Recurring appointment series E2E (critical journey).
 * Reuses agenda fixtures; no parallel test framework.
 */
import { expect } from '@playwright/test';
import { test } from '../fixtures/medcore';
import {
	activeType,
	adminEmail,
	api,
	bearer,
	cancelEntireSeries,
	clearPatientSchedule,
	clickFooter,
	createQaPatient,
	createSeriesOnFreeSlot,
	doctorEmail,
	firstSlot,
	getSeries,
	loginApi,
	openAppointmentOnAgenda,
	parisDate,
	password,
	pickPatient,
	provePatientClean,
	serviceId
} from './fixtures';

test.describe.configure({ mode: 'serial' });

test('QA-SERIES-001 @critical create recurring series via UI and open series detail', async ({
	page,
	login,
	request
}) => {
	test.setTimeout(180_000);
	const admin = await loginApi(request, adminEmail);
	const patient = await createQaPatient(request, admin, 'SERIES-UI');
	const sid = await serviceId(request, admin);
	const type = await activeType(request, admin, sid);
	await provePatientClean(request, admin, patient.id);

	const slot = await firstSlot(request, admin, {
		serviceId: sid,
		appointmentTypeId: type.id
	});

	await login(adminEmail, password);
	await page.goto('/agenda');
	await page.getByTestId('agenda-new-appointment').click();
	await expect(page.getByTestId('agenda-booking-modal')).toBeVisible();

	await page.getByTestId('agenda-book-mode-recurring').check();
	await pickPatient(page, patient);
	await page.getByTestId('agenda-book-service').selectOption(String(sid));
	await page.getByTestId('agenda-book-type').selectOption(String(type.id));
	await page.getByTestId('agenda-book-date').fill(parisDate(slot.startAt));
	await expect
		.poll(async () => page.getByTestId('agenda-book-practitioner').count(), { timeout: 15_000 })
		.toBeGreaterThan(0);
	const prac = page.getByTestId('agenda-book-practitioner');
	await prac.selectOption(String(slot.practitionerId)).catch(async () => {
		await prac.fill(String(slot.practitionerId));
	});
	await page.getByTestId('agenda-series-count').fill('2');
	await page.getByTestId('agenda-book-reason').fill(`QA-SERIES-UI-${Date.now()}`);

	await clickFooter(page, 'agenda-book-next');
	await expect(page.getByTestId('agenda-availability-picker')).toBeVisible({ timeout: 30_000 });
	await page.getByTestId('agenda-slot').first().click();
	await expect(page.getByTestId('agenda-series-preview')).toBeVisible({ timeout: 15_000 });

	const createWait = page.waitForResponse(
		(r) => r.url().includes('/api/appointment-series') && r.request().method() === 'POST',
		{ timeout: 60_000 }
	);
	await clickFooter(page, 'agenda-book-submit');
	const createdRes = await createWait;
	expect(createdRes.ok(), await createdRes.text()).toBeTruthy();
	const created = (await createdRes.json()) as {
		id: number;
		occurrences: Array<{ id: number; scheduledAt: string }>;
	};
	expect(created.occurrences.length).toBeGreaterThanOrEqual(2);

	await expect(page.getByTestId('agenda-series-detail')).toBeVisible({ timeout: 30_000 });
	await expect(page.getByTestId('agenda-series-status')).toContainText(/Active/i);
	await expect(page.getByTestId('agenda-series-occurrence')).toHaveCount(
		created.occurrences.length
	);
	await page.getByTestId('agenda-series-detail-close').click();
	await expect(page.getByTestId('agenda-series-detail')).toHaveCount(0);

	// Create success opens the first occurrence details — assert series actions there.
	await expect(page.getByTestId('agenda-appointment-details')).toBeVisible({ timeout: 15_000 });
	await expect(page.getByTestId('agenda-series-badge')).toBeVisible();
	await expect(page.getByTestId('agenda-action-view-series')).toBeVisible();
	await expect(page.getByTestId('agenda-action-reschedule-future')).toBeVisible();
	await expect(page.getByTestId('agenda-action-cancel-future')).toBeVisible();
	await expect(page.getByTestId('agenda-action-cancel-series')).toBeVisible();

	await page.getByTestId('agenda-action-view-series').click();
	await expect(page.getByTestId('agenda-series-detail')).toBeVisible();
	await expect(page.getByTestId('agenda-series-occurrence').first()).toBeVisible();
	await page.getByTestId('agenda-series-detail-close').click();

	const latest = await getSeries(request, admin, created.id);
	await cancelEntireSeries(request, admin, created.id, latest.version);
	await clearPatientSchedule(request, admin, patient.id);
});

test('QA-SERIES-002 @critical edit this+future and OCC 409 conflict feedback', async ({
	page,
	login,
	request
}) => {
	test.setTimeout(240_000);
	const admin = await loginApi(request, adminEmail);
	const patient = await createQaPatient(request, admin, 'SERIES-EDIT');
	const sid = await serviceId(request, admin);
	const type = await activeType(request, admin, sid);
	await provePatientClean(request, admin, patient.id);

	const series = await createSeriesOnFreeSlot(request, admin, {
		patientId: patient.id,
		serviceId: sid,
		appointmentTypeId: type.id,
		count: 2,
		reasonTag: 'edit-occ'
	});
	const first = series.occurrences[0];

	// Stale expectedVersion must never overwrite.
	const stale = await request.patch(`${api}/api/appointment-series/${series.id}`, {
		headers: bearer(admin),
		data: {
			expectedVersion: series.version + 1,
			fromAppointmentId: first.id,
			reason: 'stale-occ'
		}
	});
	expect(stale.status()).toBe(409);
	expect((await getSeries(request, admin, series.id)).version).toBe(series.version);

	await login(adminEmail, password);
	await page.goto('/agenda');
	await openAppointmentOnAgenda(page, first.id, first.scheduledAt);
	await page.getByTestId('agenda-action-reschedule-future').click();
	await expect(page.getByTestId('agenda-series-edit-future')).toBeVisible({ timeout: 20_000 });
	await expect(page.getByTestId('agenda-slot').first()).toBeVisible({ timeout: 30_000 });

	// Concurrent cancel → UI submit surfaces OCC conflict (no silent overwrite).
	const concurrent = await cancelEntireSeries(request, admin, series.id, series.version);
	expect(concurrent.status).toBe(200);

	await page.getByTestId('agenda-slot').first().click();
	const conflictWait = page.waitForResponse(
		(r) =>
			r.url().includes(`/api/appointment-series/${series.id}`) &&
			r.request().method() === 'PATCH',
		{ timeout: 60_000 }
	);
	await clickFooter(page, 'agenda-series-edit-submit');
	expect((await conflictWait).status()).toBe(409);
	await expect(page.getByTestId('agenda-series-edit-conflict')).toBeVisible({ timeout: 10_000 });

	await clearPatientSchedule(request, admin, patient.id);
});

test('QA-SERIES-003 @critical cancel entire series from Agenda', async ({ page, login, request }) => {
	test.setTimeout(180_000);
	const admin = await loginApi(request, adminEmail);
	const patient = await createQaPatient(request, admin, 'SERIES-CANCEL');
	const sid = await serviceId(request, admin);
	const type = await activeType(request, admin, sid);
	await provePatientClean(request, admin, patient.id);

	const series = await createSeriesOnFreeSlot(request, admin, {
		patientId: patient.id,
		serviceId: sid,
		appointmentTypeId: type.id,
		count: 2,
		reasonTag: 'cancel-entire'
	});
	const first = series.occurrences[0];

	await login(adminEmail, password);
	await page.goto('/agenda');
	await openAppointmentOnAgenda(page, first.id, first.scheduledAt);
	await page.getByTestId('agenda-action-cancel-series').click();
	await page.getByRole('button', { name: 'Annuler la série' }).click();

	await expect
		.poll(async () => (await getSeries(request, admin, series.id)).status, { timeout: 30_000 })
		.toBe('CANCELLED');

	const cancelled = await getSeries(request, admin, series.id);
	expect(cancelled.version).toBeGreaterThan(series.version);
	for (const occ of cancelled.occurrences) {
		expect(occ.status).toBe('CANCELLED');
	}

	const revive = await request.patch(`${api}/api/appointment-series/${series.id}`, {
		headers: bearer(admin),
		data: {
			expectedVersion: cancelled.version,
			fromAppointmentId: first.id,
			reason: 'reactivate-attempt'
		}
	});
	expect(revive.status()).toBe(409);

	await clearPatientSchedule(request, admin, patient.id);
});

test('QA-SERIES-004 @critical Patient 360 recurring series cancel-future', async ({
	page,
	login,
	request
}) => {
	test.setTimeout(180_000);
	const admin = await loginApi(request, adminEmail);
	const patient = await createQaPatient(request, admin, 'SERIES-360');
	const sid = await serviceId(request, admin);
	const type = await activeType(request, admin, sid);
	await provePatientClean(request, admin, patient.id);

	const series = await createSeriesOnFreeSlot(request, admin, {
		patientId: patient.id,
		serviceId: sid,
		appointmentTypeId: type.id,
		count: 2,
		reasonTag: 'p360'
	});
	const first = series.occurrences[0];

	await login(adminEmail, password);
	await page.goto(`/patients/${patient.id}`);
	await page.getByTestId('patient-360-tab-appointments').click({ force: true });
	await expect(page.getByTestId('patient-360-appointments')).toBeVisible({ timeout: 20_000 });
	await expect(page.locator(`[data-appointment-id="${first.id}"]`)).toBeVisible({
		timeout: 30_000
	});
	await page.locator(`[data-appointment-id="${first.id}"]`).click({ force: true });
	await expect(page.getByTestId('agenda-appointment-details')).toBeVisible();
	await expect(page.getByTestId('agenda-series-badge')).toBeVisible();
	await expect(page.getByTestId('agenda-action-view-series')).toBeVisible();
	await expect(page.getByTestId('agenda-action-cancel-future')).toBeVisible();

	await page.getByTestId('agenda-action-view-series').click();
	await expect(page.getByTestId('agenda-series-detail')).toBeVisible();
	await page.getByTestId('agenda-series-detail-close').click();

	await page.getByTestId('agenda-action-cancel-future').click();
	await page.getByRole('button', { name: 'Annuler le futur' }).click();
	await expect
		.poll(
			async () => {
				const s = await getSeries(request, admin, series.id);
				return s.occurrences.filter((o) => o.status === 'SCHEDULED').length;
			},
			{ timeout: 30_000 }
		)
		.toBe(0);

	await clearPatientSchedule(request, admin, patient.id);
});

test('QA-SERIES-005 @critical RBAC hides series mutations for read-only doctor', async ({
	page,
	login,
	request
}) => {
	test.setTimeout(120_000);
	const admin = await loginApi(request, adminEmail);
	const doctorTok = await loginApi(request, doctorEmail);
	const docPayload = JSON.parse(
		Buffer.from(doctorTok.split('.')[1], 'base64url').toString('utf8')
	) as { userId?: number; permissions?: string[] };
	expect(docPayload.permissions ?? []).toContain('schedule.read.own');
	const ownId = docPayload.userId as number;

	const patient = await createQaPatient(request, admin, 'SERIES-RBAC');
	const sid = await serviceId(request, admin);
	const type = await activeType(request, admin, sid);
	await provePatientClean(request, admin, patient.id);

	const series = await createSeriesOnFreeSlot(request, admin, {
		patientId: patient.id,
		serviceId: sid,
		appointmentTypeId: type.id,
		practitionerId: ownId,
		count: 2,
		reasonTag: 'rbac'
	});
	const first = series.occurrences[0];

	await login(doctorEmail, password);
	await page.goto(`/patients/${patient.id}`);
	await page.getByTestId('patient-360-tab-appointments').click({ force: true });
	await expect(page.locator(`[data-appointment-id="${first.id}"]`)).toBeVisible({
		timeout: 30_000
	});
	await page.locator(`[data-appointment-id="${first.id}"]`).click({ force: true });
	await expect(page.getByTestId('agenda-appointment-details')).toBeVisible();
	await expect(page.getByTestId('agenda-series-badge')).toBeVisible();
	await expect(page.getByTestId('agenda-action-view-series')).toBeVisible();
	await expect(page.getByTestId('agenda-action-cancel-series')).toHaveCount(0);
	await expect(page.getByTestId('agenda-action-reschedule-future')).toHaveCount(0);

	const forbidden = await cancelEntireSeries(request, doctorTok, series.id, series.version);
	expect([403, 404].includes(forbidden.status)).toBeTruthy();

	const latest = await getSeries(request, admin, series.id);
	await cancelEntireSeries(request, admin, latest.id, latest.version);
	await clearPatientSchedule(request, admin, patient.id);
});
