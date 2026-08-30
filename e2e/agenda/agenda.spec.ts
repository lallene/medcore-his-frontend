/**
 * LOT 23G / 23G.2 — Agenda & scheduling E2E (deterministic fixtures).
 */
import { expect } from '@playwright/test';
import { test } from '../fixtures/medcore';
import {
	activeType,
	adminEmail,
	api,
	assertFinance,
	bearer,
	bookOnFreeSlot,
	bookPastAppointment,
	cashierEmail,
	clearPatientSchedule,
	clickFooter,
	createQaPatient,
	doctorEmail,
	firstSlot,
	listSlots,
	loginApi,
	openAppointmentOnAgenda,
	parisDate,
	password,
	patientByCode,
	pickPatient,
	provePatientClean,
	receptionEmail,
	serviceId
} from './fixtures';

test.describe.configure({ mode: 'serial' });

test('QA-AGENDA-001 @critical agenda day/week navigation filters and detail', async ({
	page,
	login
}) => {
	test.setTimeout(90_000);
	await login(adminEmail, password);
	await page.goto('/agenda');
	await expect(page.getByTestId('agenda-page')).toBeVisible();
	await expect(page.getByTestId('agenda-day-view')).toBeVisible();
	await page.getByRole('tab', { name: 'Semaine' }).click();
	await expect(page.getByTestId('agenda-week-view')).toBeAttached({ timeout: 15_000 });
	await page.getByRole('tab', { name: 'Jour' }).click();
	await expect(page.getByTestId('agenda-day-view')).toBeVisible();
	await page.getByTestId('agenda-next').click();
	await page.getByTestId('agenda-prev').click();
	await page.getByTestId('agenda-today').click();
	await expect(page.getByTestId('agenda-filter-status')).toBeVisible();

	const card = page.getByTestId('agenda-appointment-card').first();
	if (await card.count()) {
		await card.click();
		await expect(page.getByTestId('agenda-appointment-details')).toBeVisible();
	}
});

test('QA-AGENDA-BOOK-001 @critical book specific and any practitioner from UI', async ({
	page,
	login,
	request
}) => {
	test.setTimeout(180_000);
	const admin = await loginApi(request, adminEmail);
	const patient = await createQaPatient(request, admin, 'BOOK');
	const sid = await serviceId(request, admin);
	const type = await activeType(request, admin, sid);
	await provePatientClean(request, admin, patient.id);
	await assertFinance(request, await loginApi(request, receptionEmail), patient.id, 'CLEAR');

	const slotAny = await firstSlot(request, admin, {
		serviceId: sid,
		appointmentTypeId: type.id
	});

	await login(adminEmail, password);
	await page.goto('/agenda');
	await expect(page.getByTestId('agenda-page')).toBeVisible();
	await page.getByTestId('agenda-new-appointment').click();
	await expect(page.getByTestId('agenda-booking-modal')).toBeVisible();

	await pickPatient(page, patient);
	await page.getByTestId('agenda-book-service').selectOption(String(sid));
	await page.waitForTimeout(500);
	await page.getByTestId('agenda-book-type').selectOption(String(type.id));
	await page.getByTestId('agenda-book-date').fill(parisDate(slotAny.startAt));
	await page.getByTestId('agenda-prac-any').check();
	await page.getByTestId('agenda-book-reason').fill(`QA-AGENDA-ANY-${Date.now()}`);
	await clickFooter(page, 'agenda-book-next');
	await expect(page.getByTestId('agenda-availability-picker')).toBeVisible({ timeout: 30_000 });
	await page.getByTestId('agenda-slot').first().click();
	const bookResp = page.waitForResponse(
		(r) => r.url().includes('/api/appointments') && r.request().method() === 'POST',
		{ timeout: 30_000 }
	);
	await clickFooter(page, 'agenda-book-submit');
	expect([200, 201].includes((await bookResp).status())).toBeTruthy();
	await expect(
		page.getByTestId('agenda-appointment-details').or(page.getByText(/Rendez-vous créé|Succès/i))
	).toBeVisible({ timeout: 30_000 });
	// Ensure no overlay blocks the next booking CTA (details / booking modal).
	for (let i = 0; i < 3; i++) {
		await page.keyboard.press('Escape').catch(() => undefined);
		await page.waitForTimeout(150);
	}
	if (await page.getByTestId('agenda-appointment-details').count()) {
		await page
			.getByLabel('Fermer')
			.click({ force: true })
			.catch(() => undefined);
	}
	await expect(page.getByTestId('agenda-booking-modal')).toHaveCount(0, { timeout: 10_000 });
	await expect(page.getByTestId('agenda-appointment-details')).toHaveCount(0, { timeout: 10_000 });

	await clearPatientSchedule(request, admin, patient.id);
	await provePatientClean(request, admin, patient.id);

	const specSlot = await firstSlot(request, admin, {
		serviceId: sid,
		appointmentTypeId: type.id,
		practitionerId: slotAny.practitionerId
	});

	await page.getByTestId('agenda-new-appointment').click({ force: true });
	await expect(page.getByTestId('agenda-booking-modal')).toBeVisible();
	await pickPatient(page, patient);
	await page.getByTestId('agenda-book-service').selectOption(String(sid));
	await page.waitForTimeout(500);
	await page.getByTestId('agenda-book-type').selectOption(String(type.id));
	await page.getByTestId('agenda-book-date').fill(parisDate(specSlot.startAt));
	await page.getByTestId('agenda-prac-specific').check();
	await expect(page.getByTestId('agenda-book-practitioner')).toBeVisible();
	await page
		.getByTestId('agenda-book-practitioner')
		.selectOption(String(slotAny.practitionerId))
		.catch(async () => {
			await page.getByTestId('agenda-book-practitioner').fill(String(slotAny.practitionerId));
		});
	await page.getByTestId('agenda-book-reason').fill(`QA-AGENDA-SPEC-${Date.now()}`);
	await clickFooter(page, 'agenda-book-next');
	await expect(page.getByTestId('agenda-availability-picker')).toBeVisible({ timeout: 30_000 });
	await page.getByTestId('agenda-slot').first().click();
	await clickFooter(page, 'agenda-book-submit');
	await expect(page.getByTestId('agenda-appointment-details')).toBeVisible({ timeout: 30_000 });

	await clearPatientSchedule(request, admin, patient.id);
});

test('QA-AGENDA-BOOK-CONFLICT-001 @critical booking 409 refreshes availability', async ({
	page,
	login,
	request
}) => {
	test.setTimeout(180_000);
	const admin = await loginApi(request, adminEmail);
	const patientA = await createQaPatient(request, admin, 'BOOK-CONFLICT-A');
	const patientB = await createQaPatient(request, admin, 'BOOK-CONFLICT-B');
	const sid = await serviceId(request, admin);
	const type = await activeType(request, admin, sid);
	await provePatientClean(request, admin, patientA.id);
	await provePatientClean(request, admin, patientB.id);

	const held = await bookOnFreeSlot(request, admin, {
		patientId: patientA.id,
		serviceId: sid,
		appointmentTypeId: type.id,
		reason: `QA-AGENDA-COMPETE-${Date.now()}`
	});
	const slot = held.slot;

	await login(adminEmail, password);
	await page.goto('/agenda');
	await page.getByTestId('agenda-new-appointment').click();

	await pickPatient(page, patientB);
	await page.getByTestId('agenda-book-service').selectOption(String(sid));
	await page.waitForTimeout(400);
	await page.getByTestId('agenda-book-type').selectOption(String(type.id));
	await page.getByTestId('agenda-book-date').fill(parisDate(slot.startAt));
	await page.getByTestId('agenda-prac-specific').check();
	await page
		.getByTestId('agenda-book-practitioner')
		.selectOption(String(slot.practitionerId))
		.catch(async () => {
			await page.getByTestId('agenda-book-practitioner').fill(String(slot.practitionerId));
		});
	await clickFooter(page, 'agenda-book-next');
	await expect(page.getByTestId('agenda-availability-picker')).toBeVisible({ timeout: 30_000 });

	const stale = page.locator(
		`[data-slot-start="${slot.startAt}"][data-practitioner-id="${slot.practitionerId}"]`
	);
	if (await stale.count()) {
		await stale.click();
		const conflict = page.waitForResponse(
			(r) => r.url().includes('/api/appointments') && r.request().method() === 'POST',
			{ timeout: 20_000 }
		);
		await clickFooter(page, 'agenda-book-submit');
		const posted = await conflict;
		expect(posted.status(), 'real backend booking conflict').toBe(409);
		await expect(page.getByText(/Créneau|conflit|indisponible/i)).toBeVisible({
			timeout: 20_000
		});
		await expect(page.getByTestId('agenda-appointment-details')).toHaveCount(0);
		await expect(page.getByTestId('agenda-availability-picker')).toBeVisible();
		await expect(page.getByTestId('agenda-slot').first()).toBeVisible();
	} else {
		await expect(page.getByTestId('agenda-availability-picker')).toBeVisible();
		await expect(page.getByTestId('agenda-slot').first()).toBeVisible();
	}

	await clearPatientSchedule(request, admin, patientA.id);
	await clearPatientSchedule(request, admin, patientB.id);
});

test('QA-AGENDA-RESCHEDULE-001 @critical reschedule keeps id and updates time', async ({
	page,
	login,
	request
}) => {
	test.setTimeout(180_000);
	const admin = await loginApi(request, adminEmail);
	const patient = await createQaPatient(request, admin, 'RESCHEDULE');
	const sid = await serviceId(request, admin);
	const type = await activeType(request, admin, sid);
	await provePatientClean(request, admin, patient.id);

	const booked = await bookOnFreeSlot(request, admin, {
		patientId: patient.id,
		serviceId: sid,
		appointmentTypeId: type.id,
		reason: `QA-AGENDA-RESCHEDULE-${Date.now()}`
	});
	const appt = booked.body;
	expect(appt.id).toBeTruthy();
	expect(appt.scheduledAt).toBeTruthy();

	await login(adminEmail, password);
	await page.goto('/agenda');
	await openAppointmentOnAgenda(page, appt.id, appt.scheduledAt);
	await page.getByTestId('agenda-action-reschedule').click();
	await expect(page.getByTestId('agenda-reschedule-modal')).toBeVisible();
	await expect(page.getByTestId('agenda-slot').first()).toBeVisible({ timeout: 30_000 });
	const rescheduleSlots = page.getByTestId('agenda-slot');
	const nSlots = await rescheduleSlots.count();
	await rescheduleSlots.nth(nSlots > 1 ? 1 : 0).click();
	const rescheduleResp = page.waitForResponse(
		(r) =>
			r.url().includes(`/api/appointments/${appt.id}/reschedule`) &&
			r.request().method() === 'PATCH',
		{ timeout: 20_000 }
	);
	await clickFooter(page, 'agenda-reschedule-submit');
	expect([200, 201].includes((await rescheduleResp).status())).toBeTruthy();
	await expect
		.poll(
			async () => {
				const r = await request.get(`${api}/api/appointments/${appt.id}`, {
					headers: bearer(admin)
				});
				const body = await r.json();
				return body.id === appt.id && body.scheduledAt !== appt.scheduledAt;
			},
			{ timeout: 20_000 }
		)
		.toBeTruthy();

	const refreshed = await request.get(`${api}/api/appointments/${appt.id}`, {
		headers: bearer(admin)
	});
	const after = await refreshed.json();
	await page.goto('/agenda');
	await openAppointmentOnAgenda(page, after.id, after.scheduledAt);

	await clearPatientSchedule(request, admin, patient.id);
});

test('QA-AGENDA-STALE-RESCHEDULE-001 @critical stale expected timestamps yield 409', async ({
	page,
	login,
	request
}) => {
	test.setTimeout(180_000);
	const admin = await loginApi(request, adminEmail);
	const patient = await createQaPatient(request, admin, 'STALE-RESCHEDULE');
	const sid = await serviceId(request, admin);
	const type = await activeType(request, admin, sid);
	await provePatientClean(request, admin, patient.id);

	const booked = await bookOnFreeSlot(request, admin, {
		patientId: patient.id,
		serviceId: sid,
		appointmentTypeId: type.id,
		from: new Date(Date.now() + 2 * 24 * 60 * 60_000).toISOString(),
		to: new Date(Date.now() + 6 * 24 * 60 * 60_000).toISOString(),
		reason: `QA-AGENDA-STALE-${Date.now()}`
	});
	const appt = booked.body;
	const detail = await request.get(`${api}/api/appointments/${appt.id}`, {
		headers: bearer(admin)
	});
	expect(detail.ok(), await detail.text()).toBeTruthy();
	const detailBody = await detail.json();
	const originalAt = detailBody.scheduledAt as string;
	const originalEnd = detailBody.scheduledEndAt as string;
	expect(originalAt).toBeTruthy();
	expect(originalEnd).toBeTruthy();

	await login(adminEmail, password);
	await page.goto('/agenda');
	await openAppointmentOnAgenda(page, appt.id, originalAt);
	await page.getByTestId('agenda-action-reschedule').click();
	await expect(page.getByTestId('agenda-reschedule-modal')).toBeVisible();
	await expect(page.getByTestId('agenda-slot').first()).toBeVisible({ timeout: 30_000 });

	// Authoritative backend mutation to another valid slot while UI still holds original expected*.
	const altSlots = await listSlots(request, admin, {
		serviceId: sid,
		appointmentTypeId: type.id,
		practitionerId: booked.slot.practitionerId,
		from: new Date(Date.now() + 2 * 24 * 60 * 60_000).toISOString(),
		to: new Date(Date.now() + 8 * 24 * 60 * 60_000).toISOString()
	});
	const alt = altSlots.find((s) => s.startAt !== originalAt) ?? altSlots[1] ?? altSlots[0];
	expect(alt?.startAt, 'alternate slot for stale mutate').toBeTruthy();
	const mutate = await request.patch(`${api}/api/appointments/${appt.id}/reschedule`, {
		headers: bearer(admin),
		data: {
			startAt: alt.startAt,
			practitionerId: alt.practitionerId,
			expectedScheduledAt: originalAt,
			expectedScheduledEndAt: originalEnd
		}
	});
	expect([200, 201].includes(mutate.status()), await mutate.text()).toBeTruthy();
	const mutated = await mutate.json();
	expect(mutated.scheduledAt).not.toBe(originalAt);

	const staleResp = page.waitForResponse(
		(r) =>
			r.url().includes(`/api/appointments/${appt.id}/reschedule`) &&
			r.request().method() === 'PATCH',
		{ timeout: 20_000 }
	);
	await page.getByTestId('agenda-slot').first().click();
	await clickFooter(page, 'agenda-reschedule-submit');
	expect((await staleResp).status()).toBe(409);
	await expect(
		page
			.getByText(/obsolète|Conflit|rechargement|version/i)
			.or(page.getByTestId('agenda-reschedule-modal'))
	).toBeVisible({ timeout: 15_000 });

	const afterStale = await request.get(`${api}/api/appointments/${appt.id}`, {
		headers: bearer(admin)
	});
	const afterBody = await afterStale.json();
	expect(afterBody.status).toBe('SCHEDULED');
	expect(new Date(afterBody.scheduledAt).getTime()).toBe(new Date(mutated.scheduledAt).getTime());
	expect(new Date(afterBody.scheduledAt).getTime()).not.toBe(new Date(originalAt).getTime());

	await clearPatientSchedule(request, admin, patient.id);
});

test('QA-AGENDA-CANCEL-001 @critical cancel retains row as CANCELLED', async ({
	page,
	login,
	request
}) => {
	test.setTimeout(180_000);
	const admin = await loginApi(request, adminEmail);
	const patient = await createQaPatient(request, admin, 'CANCEL');
	const sid = await serviceId(request, admin);
	const type = await activeType(request, admin, sid);
	await provePatientClean(request, admin, patient.id);

	const booked = await bookOnFreeSlot(request, admin, {
		patientId: patient.id,
		serviceId: sid,
		appointmentTypeId: type.id,
		reason: `QA-AGENDA-CANCEL-${Date.now()}`
	});
	const appt = booked.body;

	await login(adminEmail, password);
	await page.goto('/agenda');
	await openAppointmentOnAgenda(page, appt.id, appt.scheduledAt);
	await page.getByTestId('agenda-action-cancel').click();
	await page.getByRole('button', { name: 'Annuler le RDV' }).click();
	await expect
		.poll(
			async () => {
				const r = await request.get(`${api}/api/appointments/${appt.id}`, {
					headers: bearer(admin)
				});
				return (await r.json()).status;
			},
			{ timeout: 20_000 }
		)
		.toBe('CANCELLED');

	const still = await request.get(`${api}/api/appointments/${appt.id}`, {
		headers: bearer(admin)
	});
	expect(still.status()).toBe(200);
	expect((await still.json()).id).toBe(appt.id);
});

test('QA-AGENDA-NOSHOW-001 @critical no-show on past scheduled appointment', async ({
	request
}) => {
	test.setTimeout(120_000);
	const admin = await loginApi(request, adminEmail);
	const patient = await createQaPatient(request, admin, 'NOSHOW');
	const sid = await serviceId(request, admin);
	const type = await activeType(request, admin, sid);
	await provePatientClean(request, admin, patient.id);

	const pastAppt = await bookPastAppointment(request, admin, {
		patientId: patient.id,
		serviceId: sid,
		appointmentTypeId: type.id,
		reason: `QA-AGENDA-NOSHOW-${Date.now()}`
	});
	expect(pastAppt.id).toBeTruthy();

	const noshow = await request.post(`${api}/api/appointments/${pastAppt.id}/no-show`, {
		headers: bearer(admin),
		data: {}
	});
	expect(noshow.status(), await noshow.text()).toBe(200);
	const body = await noshow.json();
	expect(body.status).toBe('NO_SHOW');
	expect(body.queueTicketId ?? body.queue_ticket_id).toBeFalsy();

	const tickets = await request.get(`${api}/api/queue/tickets?patientId=${patient.id}&limit=20`, {
		headers: bearer(admin)
	});
	if (tickets.ok()) {
		const items = ((await tickets.json()).items ?? []) as Array<{ appointmentId?: number }>;
		expect(items.filter((t) => t.appointmentId === pastAppt.id).length).toBe(0);
	}
});

test('QA-AGENDA-CHECKIN-001 @critical check-in creates linked ticket idempotently', async ({
	request
}) => {
	test.setTimeout(180_000);
	const admin = await loginApi(request, adminEmail);
	const reception = await loginApi(request, receptionEmail);
	const patient = await createQaPatient(request, admin, 'CHECKIN');
	const sid = await serviceId(request, admin);
	const type = await activeType(request, admin, sid);
	await provePatientClean(request, admin, patient.id);
	await assertFinance(request, reception, patient.id, 'CLEAR');

	// Late arrival is allowed while SCHEDULED — past start is reliably check-in eligible
	// even when near-term availability has been consumed by earlier suite tests.
	const checkAppt = await bookPastAppointment(request, admin, {
		patientId: patient.id,
		serviceId: sid,
		appointmentTypeId: type.id,
		reason: `QA-AGENDA-CHECKIN-${Date.now()}`
	});

	const checkIn = await request.post(`${api}/api/queue/appointments/${checkAppt.id}/check-in`, {
		headers: bearer(reception),
		data: { identityConfirmed: true }
	});
	expect([200, 201].includes(checkIn.status()), await checkIn.text()).toBeTruthy();
	const checkBody = await checkIn.json();
	const ticketId = checkBody.id ?? checkBody.ticket?.id;
	expect(ticketId).toBeTruthy();

	const refreshed = await request.get(`${api}/api/appointments/${checkAppt.id}`, {
		headers: bearer(admin)
	});
	const checked = await refreshed.json();
	expect(checked.status).toBe('CHECKED_IN');
	expect(checked.queueTicketId ?? checked.queue_ticket_id).toBeTruthy();

	const again = await request.post(`${api}/api/queue/appointments/${checkAppt.id}/check-in`, {
		headers: bearer(reception),
		data: { identityConfirmed: true }
	});
	expect([200, 201].includes(again.status()), await again.text()).toBeTruthy();
	const againBody = await again.json();
	expect(againBody.id ?? againBody.ticket?.id).toBe(ticketId);

	await clearPatientSchedule(request, admin, patient.id);
});

test('QA-AGENDA-FINANCE-001 @critical finance gate blocks check-in', async ({
	page,
	login,
	request
}) => {
	test.setTimeout(180_000);
	const admin = await loginApi(request, adminEmail);
	const reception = await loginApi(request, receptionEmail);
	const blocked = await patientByCode(request, admin, 'P-DEMO-007');
	await assertFinance(request, reception, blocked.id, /PAYMENT_REQUIRED|BLOCKED/);
	await clearPatientSchedule(request, admin, blocked.id);

	const sid = await serviceId(request, admin);
	const type = await activeType(request, admin, sid);

	// Prefer past-eligible appointment so finance gate is exercised without racing early-window slots.
	const appt = await bookPastAppointment(request, admin, {
		patientId: blocked.id,
		serviceId: sid,
		appointmentTypeId: type.id,
		reason: `QA-AGENDA-FIN-${Date.now()}`
	});

	const blockedCheck = await request.post(`${api}/api/queue/appointments/${appt.id}/check-in`, {
		headers: bearer(reception),
		data: { identityConfirmed: true }
	});
	expect(blockedCheck.status(), await blockedCheck.text()).toBe(409);

	const still = await request.get(`${api}/api/appointments/${appt.id}`, {
		headers: bearer(admin)
	});
	const stillBody = await still.json();
	expect(stillBody.status).toBe('SCHEDULED');
	expect(stillBody.queueTicketId ?? stillBody.queue_ticket_id).toBeFalsy();

	// UI path: open details and attempt check-in — finance message must surface.
	await login(receptionEmail, password);
	await page.goto('/agenda');
	await openAppointmentOnAgenda(page, appt.id, stillBody.scheduledAt ?? appt.scheduledAt);
	await page.getByTestId('agenda-action-checkin').click();
	await expect(page.getByText(/paiement|finance|PAYMENT_REQUIRED|bloqu/i)).toBeVisible({
		timeout: 20_000
	});
	const afterUi = await request.get(`${api}/api/appointments/${appt.id}`, {
		headers: bearer(admin)
	});
	expect((await afterUi.json()).status).toBe('SCHEDULED');

	await clearPatientSchedule(request, admin, blocked.id);
});

test('QA-AGENDA-RBAC-001 @critical agenda visibility and action isolation', async ({
	page,
	login,
	request
}) => {
	test.setTimeout(180_000);

	await login(cashierEmail, password);
	await expect(page.getByRole('link', { name: 'Agenda' })).toHaveCount(0);
	await page.goto('/agenda');
	await expect(page.getByTestId('access-denied')).toBeVisible();

	await login(doctorEmail, password);
	await expect(page.getByRole('link', { name: 'File médecin' })).toBeVisible();
	const docToken = await loginApi(request, doctorEmail);
	const docPayload = JSON.parse(
		Buffer.from(docToken.split('.')[1], 'base64url').toString('utf8')
	) as { permissions?: string[]; userId?: number };
	expect(docPayload.permissions ?? []).toContain('schedule.read.own');
	expect(docPayload.permissions ?? []).not.toContain('schedule.read.all');
	await expect(page.getByRole('link', { name: 'Agenda' })).toBeVisible();
	await page.goto('/agenda');
	await expect(page.getByTestId('agenda-page')).toBeVisible();
	const mineTab = page.getByRole('tab', { name: 'Mon planning' });
	await mineTab.click();
	await expect(mineTab).toHaveAttribute('aria-selected', 'true');
	await expect(page.getByTestId('agenda-new-appointment')).toHaveCount(0);

	const adminTok = await loginApi(request, adminEmail);
	const sid = await serviceId(request, adminTok);
	const type = await activeType(request, adminTok, sid);
	const ownId = docPayload.userId as number;
	const ownPatient = await createQaPatient(request, adminTok, 'MYSCHEDULE-OWN');
	const otherPatient = await createQaPatient(request, adminTok, 'MYSCHEDULE-OTHER');
	await provePatientClean(request, adminTok, ownPatient.id);
	await provePatientClean(request, adminTok, otherPatient.id);

	const ownSlot = await firstSlot(request, adminTok, {
		serviceId: sid,
		appointmentTypeId: type.id,
		practitionerId: ownId,
		from: new Date(Date.now() + 30 * 60_000).toISOString(),
		to: new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString()
	});
	const anySlot = await firstSlot(request, adminTok, {
		serviceId: sid,
		appointmentTypeId: type.id,
		from: new Date(Date.now() + 30 * 60_000).toISOString(),
		to: new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString()
	});
	const otherPrac = anySlot.practitionerId === ownId ? null : anySlot.practitionerId;

	const ownBook = await request.post(`${api}/api/appointments`, {
		headers: { ...bearer(adminTok), 'Idempotency-Key': crypto.randomUUID() },
		data: {
			patientId: ownPatient.id,
			serviceId: sid,
			practitionerId: ownId,
			appointmentTypeId: type.id,
			startAt: ownSlot.startAt,
			reason: `QA-AGENDA-OWN-${Date.now()}`,
			idempotencyKey: crypto.randomUUID()
		}
	});
	expect([200, 201].includes(ownBook.status()), await ownBook.text()).toBeTruthy();
	const ownAppt = await ownBook.json();
	let otherApptId: number | null = null;
	if (otherPrac) {
		// Pick a fresh other-practitioner slot immediately before mutate (avoid stale anySlot).
		const otherSlots = await listSlots(request, adminTok, {
			serviceId: sid,
			appointmentTypeId: type.id,
			practitionerId: otherPrac,
			from: new Date(Date.now() + 30 * 60_000).toISOString(),
			to: new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString()
		});
		const otherSlot = otherSlots.find((s) => s.startAt !== ownSlot.startAt) ?? otherSlots[0];
		if (otherSlot) {
			const otherBook = await request.post(`${api}/api/appointments`, {
				headers: { ...bearer(adminTok), 'Idempotency-Key': crypto.randomUUID() },
				data: {
					patientId: otherPatient.id,
					serviceId: sid,
					practitionerId: otherPrac,
					appointmentTypeId: type.id,
					startAt: otherSlot.startAt,
					reason: `QA-AGENDA-OTHER-${Date.now()}`,
					idempotencyKey: crypto.randomUUID()
				}
			});
			if ([200, 201].includes(otherBook.status())) {
				otherApptId = (await otherBook.json()).id;
			}
		}
	}
	await page.reload();
	await page.getByRole('tab', { name: 'Mon planning' }).click();
	// Navigate to the day of own appointment if not today
	const ownDay = parisDate(ownSlot.startAt);
	const today = parisDate(new Date().toISOString());
	if (ownDay !== today) {
		const delta = Math.round(
			(Date.parse(`${ownDay}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000
		);
		for (let i = 0; i < Math.abs(delta); i++) {
			await page.getByTestId(delta > 0 ? 'agenda-next' : 'agenda-prev').click();
			await page.waitForTimeout(200);
		}
	}
	await expect(page.locator(`[data-appointment-id="${ownAppt.id}"]`).first()).toBeVisible({
		timeout: 20_000
	});
	if (otherApptId) {
		await expect(page.locator(`[data-appointment-id="${otherApptId}"]`)).toHaveCount(0);
	}

	await clearPatientSchedule(request, adminTok, ownPatient.id);
	await clearPatientSchedule(request, adminTok, otherPatient.id);

	await login(adminEmail, password);
	await page.goto('/agenda');
	await expect(page.getByTestId('agenda-page')).toBeVisible();
	await expect(page.getByTestId('agenda-new-appointment')).toBeVisible();

	const reception = await loginApi(request, receptionEmail);
	const recPayload = JSON.parse(
		Buffer.from(reception.split('.')[1], 'base64url').toString('utf8')
	) as { permissions?: string[] };
	expect(recPayload.permissions ?? []).toContain('schedule.read.service');
	expect(recPayload.permissions ?? []).toContain('appointment.create.service');
	expect(recPayload.permissions ?? []).not.toContain('schedule.read.all');
	expect(recPayload.permissions ?? []).not.toContain('appointment.create.all');
	await login(receptionEmail, password);
	await expect(page.getByRole('link', { name: 'Agenda' })).toBeVisible();
	await page.goto('/agenda');
	await expect(page.getByTestId('agenda-page')).toBeVisible();
	await expect(page.getByTestId('agenda-new-appointment')).toBeVisible();
});

test('QA-AGENDA-MOBILE-001 @critical agenda usable at 375px', async ({ page, login }) => {
	test.setTimeout(90_000);
	await page.setViewportSize({ width: 375, height: 812 });
	await login(adminEmail, password);
	await page.goto('/agenda');
	await expect(page.getByTestId('agenda-page')).toBeAttached();
	await page.getByTestId('agenda-today').scrollIntoViewIfNeeded();
	await expect(page.getByTestId('agenda-today')).toBeVisible();
	await page.getByRole('tab', { name: 'Semaine' }).click();
	await expect(page.getByTestId('agenda-week-mobile')).toBeAttached();
	await page.getByTestId('agenda-new-appointment').scrollIntoViewIfNeeded();
	await page.getByTestId('agenda-new-appointment').click();
	await expect(page.getByTestId('agenda-booking-modal')).toBeVisible();
});

test('QA-AGENDA-DASHBOARD-001 @smoke dashboard has no fake planning rows', async ({
	page,
	login
}) => {
	await login(adminEmail, password);
	await page.goto('/dashboard');
	await expect(page.getByText('Ouverture admissions')).toHaveCount(0);
	await expect(page.getByText('Consultations externes')).toHaveCount(0);
	await expect(page.getByTestId('dashboard-agenda-cta')).toBeVisible();
});
