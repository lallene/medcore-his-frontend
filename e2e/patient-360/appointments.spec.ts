/**
 * LOT 23H — Patient 360 upcoming appointments E2E.
 */
import { expect, type APIRequestContext } from '@playwright/test';
import { test } from '../fixtures/medcore';

const api = process.env.QA_API_URL ?? 'http://127.0.0.1:18082';
const password = process.env.QA_ADMIN_PASSWORD ?? 'admin123';
const adminEmail = process.env.QA_ADMIN_EMAIL ?? 'admin@medcore.local';
const receptionEmail = 'demo.accueil@medcore.local';
const doctorEmail = 'demo.generaliste@medcore.local';
const nurseEmail = 'demo.infirmier@medcore.local';

async function loginApi(request: APIRequestContext, email: string) {
	const response = await request.post(`${api}/api/auth/login`, {
		data: { email, password }
	});
	expect(response.ok(), await response.text()).toBeTruthy();
	const body = await response.json();
	return (body.data?.token ?? body.token) as string;
}

function bearer(token: string) {
	return { Authorization: `Bearer ${token}` };
}

async function createPatient(request: APIRequestContext, token: string, tag: string) {
	const nom = `QA360-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e5)}`;
	const response = await request.post(`${api}/api/patients`, {
		headers: bearer(token),
		data: {
			nom,
			prenoms: 'Fixture',
			sexe: 'M',
			dateNaissance: '1990-01-15',
			telephone: `+22507${String(Date.now()).slice(-8)}`,
			isAssure: false
		}
	});
	const text = await response.text();
	expect([200, 201].includes(response.status()), text).toBeTruthy();
	const data = JSON.parse(text).data ?? JSON.parse(text);
	return data as { id: number; nom: string; codePatient: string; prenoms: string };
}

async function serviceAndType(request: APIRequestContext, token: string) {
	const services = await request.get(`${api}/api/organization/services`, {
		headers: bearer(token)
	});
	expect(services.ok()).toBeTruthy();
	const body = await services.json();
	const items = Array.isArray(body) ? body : (body.data ?? []);
	const sid = (items.find((s: { code?: string }) => s.code === 'URG') ?? items[0]).id as number;
	const types = await request.get(`${api}/api/appointment-types?serviceId=${sid}&active=true`, {
		headers: bearer(token)
	});
	expect(types.ok()).toBeTruthy();
	const typeId = ((await types.json()).items ?? [])[0].id as number;
	return { sid, typeId };
}

async function bookUpcoming(
	request: APIRequestContext,
	token: string,
	opts: { patientId: number; serviceId: number; typeId: number; reason: string }
) {
	const from = new Date(Date.now() + 60 * 60_000).toISOString();
	const to = new Date(Date.now() + 5 * 24 * 60 * 60_000).toISOString();
	const avail = await request.get(
		`${api}/api/availability?serviceId=${opts.serviceId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&appointmentTypeId=${opts.typeId}`,
		{ headers: bearer(token) }
	);
	expect(avail.ok(), await avail.text()).toBeTruthy();
	const slots = ((await avail.json()).slots ?? []) as Array<{
		startAt: string;
		practitionerId: number;
	}>;
	expect(slots.length, 'availability').toBeGreaterThan(0);
	let last = '';
	for (const slot of slots.slice(0, 40)) {
		const book = await request.post(`${api}/api/appointments`, {
			headers: { ...bearer(token), 'Idempotency-Key': crypto.randomUUID() },
			data: {
				patientId: opts.patientId,
				serviceId: opts.serviceId,
				practitionerId: slot.practitionerId,
				appointmentTypeId: opts.typeId,
				startAt: slot.startAt,
				reason: opts.reason,
				idempotencyKey: crypto.randomUUID()
			}
		});
		last = await book.text();
		if ([200, 201].includes(book.status())) {
			return JSON.parse(last) as { id: number; patientId: number; scheduledAt: string };
		}
	}
	throw new Error(`book failed: ${last}`);
}

test('QA-P360-APPT-001 @critical upcoming appointments isolation and RBAC', async ({
	page,
	login,
	request
}) => {
	test.setTimeout(180_000);
	const admin = await loginApi(request, adminEmail);
	const patientA = await createPatient(request, admin, 'A');
	const patientB = await createPatient(request, admin, 'B');
	const { sid, typeId } = await serviceAndType(request, admin);
	const apptA = await bookUpcoming(request, admin, {
		patientId: patientA.id,
		serviceId: sid,
		typeId,
		reason: `QA-360-A-${Date.now()}`
	});
	const apptB = await bookUpcoming(request, admin, {
		patientId: patientB.id,
		serviceId: sid,
		typeId,
		reason: `QA-360-B-${Date.now()}`
	});

	// ACCUEIL / schedule.read.service — sees tab + own patient only
	await login(receptionEmail, password);
	await page.goto(`/patients/${patientA.id}`);
	await expect(page.getByText(patientA.codePatient).first()).toBeVisible({ timeout: 20_000 });
	await expect(page.getByTestId('patient-360-tab-appointments')).toBeVisible({ timeout: 20_000 });
	await page.getByTestId('patient-360-tab-appointments').click({ force: true });
	await expect(page.getByTestId('patient-360-appointments')).toBeVisible();
	await expect(page.locator(`[data-appointment-id="${apptA.id}"]`)).toBeVisible({
		timeout: 20_000
	});
	await expect(page.locator(`[data-appointment-id="${apptB.id}"]`)).toHaveCount(0);

	await page.locator(`[data-appointment-id="${apptA.id}"]`).click({ force: true });
	await expect(page.getByTestId('agenda-appointment-details')).toBeVisible();
	await expect(page.getByTestId('agenda-open-patient')).toHaveCount(0);

	// INFIRMIER — patients:read without schedule.read → no tab
	await login(nurseEmail, password);
	await page.goto(`/patients/${patientA.id}`);
	await expect(page.getByText(patientA.codePatient).first()).toBeVisible({
		timeout: 20_000
	});
	await expect(page.getByTestId('patient-360-tab-appointments')).toHaveCount(0);
	await expect(page.getByTestId('patient-360-appointments')).toHaveCount(0);
});

test('QA-P360-APPT-002 @critical booking from Patient 360 with locked patient', async ({
	page,
	login,
	request
}) => {
	test.setTimeout(180_000);
	const admin = await loginApi(request, adminEmail);
	const patient = await createPatient(request, admin, 'BOOK');
	const { sid, typeId } = await serviceAndType(request, admin);

	await login(adminEmail, password);
	await page.goto(`/patients/${patient.id}`);
	await page.getByTestId('patient-360-tab-appointments').click();
	await expect(page.getByTestId('patient-360-appointments')).toBeVisible();
	await page.getByTestId('patient-360-book-appointment').click();
	await expect(page.getByTestId('agenda-booking-modal')).toBeVisible();
	await expect(page.getByTestId('agenda-selected-patient')).toBeVisible();
	await expect(page.getByTestId('agenda-selected-patient')).toHaveAttribute(
		'data-patient-locked',
		'true'
	);
	await expect(page.getByTestId('agenda-patient-search')).toHaveCount(0);

	await page.getByTestId('agenda-book-service').selectOption(String(sid));
	await page.waitForTimeout(400);
	await page.getByTestId('agenda-book-type').selectOption(String(typeId));
	const from = new Date(Date.now() + 2 * 60 * 60_000).toISOString();
	const to = new Date(Date.now() + 5 * 24 * 60 * 60_000).toISOString();
	const avail = await request.get(
		`${api}/api/availability?serviceId=${sid}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&appointmentTypeId=${typeId}`,
		{ headers: bearer(admin) }
	);
	const slot = ((await avail.json()).slots ?? [])[0] as { startAt: string } | undefined;
	expect(slot?.startAt).toBeTruthy();
	const dateLocal = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Europe/Paris',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(new Date(slot!.startAt));
	await page.getByTestId('agenda-book-date').fill(dateLocal);
	await page.getByTestId('agenda-prac-any').check();
	await page.getByTestId('agenda-book-reason').fill(`QA-360-UI-BOOK-${Date.now()}`);
	const next = page.getByTestId('agenda-book-next');
	await next.scrollIntoViewIfNeeded();
	await next.click({ force: true });
	await expect(page.getByTestId('agenda-availability-picker')).toBeVisible({ timeout: 30_000 });
	await page.getByTestId('agenda-slot').first().click();
	const bookResp = page.waitForResponse(
		(r) => r.url().includes('/api/appointments') && r.request().method() === 'POST',
		{ timeout: 30_000 }
	);
	await page.getByTestId('agenda-book-submit').click({ force: true });
	expect([200, 201].includes((await bookResp).status())).toBeTruthy();
	await expect(page.getByTestId('patient-360-appointment-list')).toBeVisible({ timeout: 30_000 });
	await expect(page.getByTestId('agenda-appointment-card').first()).toBeVisible();
});

test('QA-P360-APPT-003 @critical physician own scope on Patient 360', async ({
	page,
	login,
	request
}) => {
	test.setTimeout(120_000);
	const admin = await loginApi(request, adminEmail);
	const docTok = await loginApi(request, doctorEmail);
	const payload = JSON.parse(Buffer.from(docTok.split('.')[1], 'base64url').toString('utf8')) as {
		userId?: number;
		permissions?: string[];
	};
	expect(payload.permissions ?? []).toContain('schedule.read.own');
	const ownId = payload.userId as number;
	const patient = await createPatient(request, admin, 'OWN');
	const { sid, typeId } = await serviceAndType(request, admin);
	const from = new Date().toISOString();
	const to = new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString();
	const avail = await request.get(
		`${api}/api/availability?serviceId=${sid}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&appointmentTypeId=${typeId}&practitionerId=${ownId}`,
		{ headers: bearer(admin) }
	);
	const slots = ((await avail.json()).slots ?? []) as Array<{
		startAt: string;
		practitionerId: number;
	}>;
	expect(slots[0]?.startAt, 'own slot').toBeTruthy();
	const book = await request.post(`${api}/api/appointments`, {
		headers: { ...bearer(admin), 'Idempotency-Key': crypto.randomUUID() },
		data: {
			patientId: patient.id,
			serviceId: sid,
			practitionerId: ownId,
			appointmentTypeId: typeId,
			startAt: slots[0].startAt,
			reason: `QA-360-OWN-${Date.now()}`,
			idempotencyKey: crypto.randomUUID()
		}
	});
	expect([200, 201].includes(book.status()), await book.text()).toBeTruthy();
	const appt = await book.json();

	await login(doctorEmail, password);
	await page.goto(`/patients/${patient.id}`);
	await expect(page.getByText(patient.codePatient).first()).toBeVisible({ timeout: 20_000 });
	await page.getByTestId('patient-360-tab-appointments').click({ force: true });
	await expect(page.locator(`[data-appointment-id="${appt.id}"]`)).toBeVisible({
		timeout: 20_000
	});
});

test('QA-P360-APPT-004 @critical appointments tab usable at 375px', async ({
	page,
	login,
	request
}) => {
	test.setTimeout(90_000);
	const admin = await loginApi(request, adminEmail);
	const patient = await createPatient(request, admin, 'MOB');
	await page.setViewportSize({ width: 375, height: 812 });
	await login(adminEmail, password);
	await page.goto(`/patients/${patient.id}`);
	await expect(page.getByText(patient.codePatient).first()).toBeVisible({ timeout: 20_000 });
	const tab = page.getByTestId('patient-360-tab-appointments');
	await expect(tab).toBeAttached({ timeout: 20_000 });
	await tab.evaluate((el: HTMLElement) => el.click());
	await expect(page.getByTestId('patient-360-appointments')).toBeAttached({ timeout: 15_000 });
});
