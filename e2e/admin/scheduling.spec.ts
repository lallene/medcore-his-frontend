/**
 * LOT 23L — Schedule Administration E2E.
 */
import { expect, type APIRequestContext } from '@playwright/test';
import { test } from '../fixtures/medcore';
import {
	adminEmail,
	api,
	bearer,
	loginApi,
	password,
	receptionEmail,
	serviceId
} from '../agenda/fixtures';

const medicalDirectorEmail = 'demo.directeur.medical@medcore.local';
const doctorEmail = 'demo.generaliste@medcore.local';

async function generalisteUserId(request: APIRequestContext) {
	const tok = await loginApi(request, doctorEmail);
	const payload = JSON.parse(Buffer.from(tok.split('.')[1], 'base64url').toString('utf8')) as {
		userId?: number;
	};
	expect(payload.userId).toBeTruthy();
	return payload.userId as number;
}

async function createScheduleApi(
	request: APIRequestContext,
	token: string,
	body: Record<string, unknown>
) {
	return request.post(`${api}/api/schedules`, {
		headers: { ...bearer(token), 'Idempotency-Key': crypto.randomUUID() },
		data: body
	});
}

/** Avoid 409 with seeded 08–18 windows by creating early-morning unique slots. */
async function createUniqueSchedule(
	request: APIRequestContext,
	token: string,
	opts: { practitionerId: number; serviceId: number; weekday: number; hour: number }
) {
	let last = '';
	for (let i = 0; i < 40; i++) {
		const minute = (i * 3 + (Date.now() % 3)) % 55;
		const start = `${String(opts.hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
		const end = `${String(opts.hour).padStart(2, '0')}:${String(minute + 2).padStart(2, '0')}`;
		const res = await createScheduleApi(request, token, {
			practitionerId: opts.practitionerId,
			serviceId: opts.serviceId,
			weekday: opts.weekday,
			startTime: start,
			endTime: end,
			validFrom: '2026-01-01T00:00:00.000Z'
		});
		last = await res.text();
		if ([200, 201].includes(res.status())) {
			return { ...(JSON.parse(last) as { id: number }), start, end };
		}
	}
	throw new Error(`createUniqueSchedule failed: ${last}`);
}

async function fillPractitioner(page: import('@playwright/test').Page, userId: number) {
	const field = page.getByTestId('schedule-form-practitioner');
	try {
		await field.selectOption(String(userId), { timeout: 2_000 });
	} catch {
		await field.fill(String(userId));
	}
}

async function fillExceptionPractitioner(page: import('@playwright/test').Page, userId: number) {
	const field = page.getByTestId('exception-form-practitioner');
	try {
		await field.selectOption(String(userId), { timeout: 2_000 });
	} catch {
		await field.fill(String(userId));
	}
}

test('QA-SCHEDULE-ADMIN-READ-001 @critical list schedules with filters and timezone', async ({
	page,
	login
}) => {
	test.setTimeout(90_000);
	await login(adminEmail, password);
	await page.goto('/admin/scheduling');
	await expect(page.getByTestId('schedule-admin-page')).toBeVisible({ timeout: 20_000 });
	await expect(page.getByTestId('schedule-admin-timezone')).toContainText('Europe/Paris');
	await expect(page.getByTestId('schedule-admin-schedules')).toBeVisible();
	await expect(page.getByTestId('schedule-filter-service')).toBeVisible();
	await expect(page.getByTestId('schedule-filter-weekday')).toBeVisible();
	await page.getByTestId('schedule-filter-active').selectOption('true');
	await expect(
		page.getByTestId('schedule-admin-table').or(page.getByText('Aucun horaire'))
	).toBeVisible({
		timeout: 15_000
	});
});

test('QA-SCHEDULE-ADMIN-CREATE-001 @critical create recurring interval', async ({
	page,
	login,
	request
}) => {
	test.setTimeout(180_000);
	const admin = await loginApi(request, adminEmail);
	const prac = await generalisteUserId(request);
	const sid = await serviceId(request, admin);

	await login(adminEmail, password);
	await page.goto('/admin/scheduling');
	await expect(page.getByTestId('schedule-admin-create')).toBeVisible({ timeout: 20_000 });
	await page.getByTestId('schedule-admin-create').click();
	await expect(page.getByTestId('schedule-form')).toBeVisible();
	await page.getByTestId('schedule-form-practitioner');
	await fillPractitioner(page, prac);
	await page.getByTestId('schedule-form-service').selectOption(String(sid));
	await page.getByTestId('schedule-form-weekday').selectOption('0'); // Sunday explicit
	await page.getByTestId('schedule-form-valid-from').fill('2026-01-01');

	let createdStart = '';
	for (let i = 0; i < 30; i++) {
		const minute = (i * 2 + (Date.now() % 2)) % 50;
		const start = `02:${String(minute).padStart(2, '0')}`;
		const end = `02:${String(minute + 2).padStart(2, '0')}`;
		await page.getByTestId('schedule-form-start').fill(start);
		await page.getByTestId('schedule-form-end').fill(end);
		const createResp = page.waitForResponse(
			(r) => r.url().includes('/api/schedules') && r.request().method() === 'POST',
			{ timeout: 30_000 }
		);
		await page.getByTestId('schedule-form-submit').click();
		const resp = await createResp;
		if ([200, 201].includes(resp.status())) {
			createdStart = start;
			break;
		}
		await expect(page.getByTestId('schedule-form')).toBeVisible();
	}
	expect(createdStart, 'unique UI create slot').toBeTruthy();
	await expect(page.getByTestId('schedule-admin-table')).toBeVisible({ timeout: 20_000 });
	await page.getByTestId('schedule-filter-weekday').selectOption('0');
	await expect(
		page
			.locator('[data-testid="schedule-row"]')
			.filter({ hasText: `${createdStart}–` })
			.first()
	).toBeVisible({ timeout: 15_000 });
});

test('QA-SCHEDULE-ADMIN-UPDATE-001 @critical update supported fields', async ({
	page,
	login,
	request
}) => {
	test.setTimeout(120_000);
	const admin = await loginApi(request, adminEmail);
	const prac = await generalisteUserId(request);
	const sid = await serviceId(request, admin);
	const row = await createUniqueSchedule(request, admin, {
		practitionerId: prac,
		serviceId: sid,
		weekday: 0,
		hour: 4
	});
	// Shrink inside the accepted interval to avoid collisions with fixtures from prior E2E runs.
	const newEndMin = Number(row.end.slice(3, 5)) - 1;
	const newEnd = `${row.end.slice(0, 3)}${String(newEndMin).padStart(2, '0')}`;

	await login(adminEmail, password);
	await page.goto('/admin/scheduling');
	await page.getByTestId('schedule-filter-weekday').selectOption('0');
	const editBtn = page.locator(`[data-schedule-id="${row.id}"]`).getByTestId('schedule-row-edit');
	await expect(editBtn).toBeVisible({ timeout: 20_000 });
	await editBtn.click();
	await page.getByTestId('schedule-form-end').fill(newEnd);
	const patchResp = page.waitForResponse(
		(r) => r.url().includes(`/api/schedules/${row.id}`) && r.request().method() === 'PATCH',
		{ timeout: 30_000 }
	);
	await page.getByTestId('schedule-form-submit').click();
	expect((await patchResp).ok()).toBeTruthy();
	await expect(page.locator(`[data-schedule-id="${row.id}"]`)).toContainText(newEnd);
});

test('QA-SCHEDULE-ADMIN-DELETE-001 @critical confirm soft deactivate', async ({
	page,
	login,
	request
}) => {
	test.setTimeout(120_000);
	const admin = await loginApi(request, adminEmail);
	const prac = await generalisteUserId(request);
	const sid = await serviceId(request, admin);
	const row = await createUniqueSchedule(request, admin, {
		practitionerId: prac,
		serviceId: sid,
		weekday: 0,
		hour: 3
	});

	await login(adminEmail, password);
	await page.goto('/admin/scheduling');
	await page.getByTestId('schedule-filter-weekday').selectOption('0');
	await page.locator(`[data-schedule-id="${row.id}"]`).getByTestId('schedule-row-disable').click();
	await expect(page.getByRole('heading', { name: /Désactiver cet horaire/i })).toBeVisible();
	const delResp = page.waitForResponse(
		(r) => r.url().includes(`/api/schedules/${row.id}`) && r.request().method() === 'DELETE',
		{ timeout: 30_000 }
	);
	await page
		.getByLabel('Désactiver cet horaire ?')
		.getByRole('button', { name: 'Désactiver' })
		.click();
	expect((await delResp).ok()).toBeTruthy();
});

test('QA-SCHEDULE-ADMIN-RBAC-001 @critical read-only actor cannot mutate', async ({
	page,
	login
}) => {
	test.setTimeout(90_000);
	await login(receptionEmail, password);
	await page.goto('/admin/scheduling');
	await expect(page.getByTestId('schedule-admin-page')).toBeVisible({ timeout: 20_000 });
	await expect(page.getByTestId('schedule-admin-create')).toHaveCount(0);
	await expect(page.getByTestId('schedule-row-edit')).toHaveCount(0);
	await expect(page.getByTestId('schedule-row-disable')).toHaveCount(0);
	await expect(page.getByText(/Lecture seule/i)).toBeVisible();
});

test('QA-SCHEDULE-ADMIN-SCOPE-001 @critical service manager cannot mutate other service', async ({
	page,
	login,
	request
}) => {
	test.setTimeout(120_000);
	const admin = await loginApi(request, adminEmail);
	const medTok = await loginApi(request, medicalDirectorEmail);
	const medPayload = JSON.parse(
		Buffer.from(medTok.split('.')[1], 'base64url').toString('utf8')
	) as { permissions?: string[]; userId?: number };
	expect(medPayload.permissions ?? []).toContain('schedule.manage.service');
	expect(medPayload.permissions ?? []).not.toContain('schedule.manage.all');

	const services = await request.get(`${api}/api/organization/services`, {
		headers: bearer(admin)
	});
	expect(services.ok()).toBeTruthy();
	const svcBody = await services.json();
	const items = Array.isArray(svcBody) ? svcBody : (svcBody.data ?? []);
	const foreign = items.find(
		(s: { code?: string; name?: string }) =>
			s.code === 'PHARMA' ||
			s.code === 'PHARMACIE' ||
			(s.name ?? '').toLowerCase().includes('pharmac')
	);
	expect(foreign?.id, 'pharmacy out of medical-director scope').toBeTruthy();
	const prac = await generalisteUserId(request);

	await login(medicalDirectorEmail, password);
	await page.goto('/admin/scheduling');
	await expect(page.getByTestId('schedule-admin-create')).toBeVisible({ timeout: 20_000 });
	await page.getByTestId('schedule-admin-create').click();
	const pracField = page.getByTestId('schedule-form-practitioner');
	if (await pracField.evaluate((el) => el.tagName === 'SELECT')) {
		await pracField.selectOption(String(prac));
	} else {
		await pracField.fill(String(prac));
	}
	await page.getByTestId('schedule-form-service').selectOption(String(foreign.id));
	await page.getByTestId('schedule-form-weekday').selectOption('4');
	await page.getByTestId('schedule-form-start').fill('07:00');
	await page.getByTestId('schedule-form-end').fill('07:30');
	await page.getByTestId('schedule-form-valid-from').fill('2026-01-01');
	const post = page.waitForResponse(
		(r) => r.url().includes('/api/schedules') && r.request().method() === 'POST',
		{ timeout: 30_000 }
	);
	await page.getByTestId('schedule-form-submit').click();
	const resp = await post;
	// Backend may return 403/404 (manage scope) or 400 (assignment) — mutation must not succeed.
	expect([400, 403, 404].includes(resp.status()), await resp.text()).toBeTruthy();
	await expect(page.getByTestId('schedule-form')).toContainText(
		/non autoris|périmètre|Action|Forbidden|403|impossible|Planning|affecté|service/i,
		{ timeout: 10_000 }
	);
});

test('QA-SCHEDULE-EXCEPTION-CREATE-001 @critical create negative exception', async ({
	page,
	login,
	request
}) => {
	test.setTimeout(120_000);
	const admin = await loginApi(request, adminEmail);
	const prac = await generalisteUserId(request);
	const sid = await serviceId(request, admin);
	await login(adminEmail, password);
	await page.goto('/admin/scheduling');
	await page.getByRole('tab', { name: 'Exceptions' }).click();
	await expect(page.getByTestId('schedule-admin-exception-create')).toBeVisible();
	await page.getByTestId('schedule-admin-exception-create').click();
	await fillExceptionPractitioner(page, prac);
	await page.getByTestId('exception-form-service').selectOption(String(sid));
	await page.getByTestId('exception-form-type').selectOption('ABSENCE');
	const start = new Date(Date.now() + (10 + (Date.now() % 5)) * 24 * 60 * 60_000);
	start.setMinutes(0, 0, 0);
	start.setHours(9 + (Date.now() % 6), 0, 0, 0);
	const end = new Date(start.getTime() + 2 * 60 * 60_000);
	const toParisLocal = (d: Date) => {
		const parts = Object.fromEntries(
			new Intl.DateTimeFormat('en-CA', {
				timeZone: 'Europe/Paris',
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
				hourCycle: 'h23'
			})
				.formatToParts(d)
				.filter((part) => part.type !== 'literal')
				.map((part) => [part.type, part.value])
		);
		return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
	};
	await page.getByTestId('exception-form-start').fill(toParisLocal(start));
	await page.getByTestId('exception-form-end').fill(toParisLocal(end));
	await page.getByTestId('exception-form-reason').fill(`QA-EX-ABS-${Date.now()}`);
	const post = page.waitForResponse(
		(r) => r.url().includes('/api/schedule-exceptions') && r.request().method() === 'POST',
		{ timeout: 30_000 }
	);
	await page.getByTestId('exception-form-submit').click();
	expect([200, 201].includes((await post).status())).toBeTruthy();
	await expect(page.getByTestId('exception-row').first()).toBeVisible({ timeout: 15_000 });
	await expect(page.locator('[data-exception-polarity="negative"]').first()).toBeVisible();
});

test('QA-SCHEDULE-EXCEPTION-EXTRA-001 @critical create EXTRA_AVAILABILITY', async ({
	page,
	login,
	request
}) => {
	test.setTimeout(120_000);
	const admin = await loginApi(request, adminEmail);
	const prac = await generalisteUserId(request);
	const sid = await serviceId(request, admin);
	await login(adminEmail, password);
	await page.goto('/admin/scheduling');
	await page.getByRole('tab', { name: 'Exceptions' }).click();
	await page.getByTestId('schedule-admin-exception-create').click();
	await fillExceptionPractitioner(page, prac);
	await page.getByTestId('exception-form-service').selectOption(String(sid));
	await page.getByTestId('exception-form-type').selectOption('EXTRA_AVAILABILITY');
	const toLocal = (d: Date) => {
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
	};

	let created = false;
	let lastStatus = 0;

	// Prior E2E runs may leave active exceptions behind; probe future slots until one is free.
	for (let i = 0; i < 40; i++) {
		const slotStart = new Date(Date.now() + (30 + i) * 24 * 60 * 60_000);
		slotStart.setMinutes(0, 0, 0);
		slotStart.setHours(14 + (i % 4), 0, 0, 0);
		const slotEnd = new Date(slotStart.getTime() + 60 * 60_000);

		await page.getByTestId('exception-form-start').fill(toLocal(slotStart));
		await page.getByTestId('exception-form-end').fill(toLocal(slotEnd));
		await page.getByTestId('exception-form-reason').fill(`QA-EX-EXTRA-${Date.now()}-${i}`);

		const post = page.waitForResponse(
			(r) => r.url().includes('/api/schedule-exceptions') && r.request().method() === 'POST',
			{ timeout: 30_000 }
		);

		await page.getByTestId('exception-form-submit').click();
		const response = await post;
		lastStatus = response.status();

		if ([200, 201].includes(lastStatus)) {
			created = true;
			break;
		}

		await expect(page.getByTestId('exception-form')).toBeVisible();
	}

	expect(created, `unique EXTRA_AVAILABILITY slot, last status=${lastStatus}`).toBeTruthy();
	await expect(page.locator('[data-exception-polarity="positive"]').first()).toBeVisible({
		timeout: 15_000
	});
});

test('QA-SCHEDULE-EXCEPTION-RBAC-001 @critical mutation requires schedule.manage', async ({
	page,
	login
}) => {
	test.setTimeout(90_000);
	await login(receptionEmail, password);
	await page.goto('/admin/scheduling');
	await page.getByRole('tab', { name: 'Exceptions' }).click();
	await expect(page.getByTestId('schedule-admin-exceptions')).toBeVisible({ timeout: 20_000 });
	await expect(page.getByTestId('schedule-admin-exception-create')).toHaveCount(0);
	await expect(page.getByTestId('exception-row-edit')).toHaveCount(0);
	await expect(page.getByTestId('exception-row-cancel')).toHaveCount(0);
});

test('QA-SCHEDULE-EXCEPTION-CONFLICT-001 @critical backend 409 surfaced', async ({
	page,
	login,
	request
}) => {
	test.setTimeout(120_000);
	const admin = await loginApi(request, adminEmail);
	const prac = await generalisteUserId(request);
	const sid = await serviceId(request, admin);

	/**
	 * Europe/Paris wall-clock datetime-local literals only.
	 * Do not convert API UTC instants with host-local Date getters — that drifts on Ubuntu CI (UTC)
	 * vs Mac (Paris) and can make the "conflict" window miss the first exception.
	 */
	const pad = (n: number) => String(n).padStart(2, '0');
	const baseDay = 1 + (Date.now() % 20); // 1–20 of a far-future month, avoids seeded exceptions
	let overlapStart = '';
	let overlapEnd = '';

	await login(adminEmail, password);
	await page.goto('/admin/scheduling');
	await page.getByRole('tab', { name: 'Exceptions' }).click();

	// 1) Create first BLOCKED exception through the admin UI with deterministic Paris strings.
	let seeded = false;
	for (let i = 0; i < 25; i++) {
		const day = baseDay + i;
		if (day > 28) break;
		const createdStart = `2037-11-${pad(day)}T10:00`;
		const createdEnd = `2037-11-${pad(day)}T12:00`;
		// Partial overlap (same practitioner/service) — stronger than exact-duplicate semantics.
		overlapStart = `2037-11-${pad(day)}T11:00`;
		overlapEnd = `2037-11-${pad(day)}T13:00`;

		await page.getByTestId('schedule-admin-exception-create').click();
		await expect(page.getByTestId('exception-form')).toBeVisible();
		await fillExceptionPractitioner(page, prac);
		await page.getByTestId('exception-form-service').selectOption(String(sid));
		await page.getByTestId('exception-form-type').selectOption('BLOCKED');
		await page.getByTestId('exception-form-start').fill(createdStart);
		await page.getByTestId('exception-form-end').fill(createdEnd);
		await page.getByTestId('exception-form-reason').fill(`QA-CONFLICT-A-${Date.now()}-${i}`);

		const post = page.waitForResponse(
			(r) => r.url().includes('/api/schedule-exceptions') && r.request().method() === 'POST',
			{ timeout: 30_000 }
		);
		await page.getByTestId('exception-form-submit').click();
		const status = (await post).status();
		if ([200, 201].includes(status)) {
			seeded = true;
			await expect(page.getByTestId('exception-form')).toHaveCount(0);
			break;
		}
		// This slot is already occupied. Try another day so the test owns
		// the exception used as the conflict target.
		if (status === 409) {
			await page.getByTestId('exception-form').getByRole('button', { name: 'Fermer' }).click();
			await expect(page.getByTestId('exception-form')).toHaveCount(0);
			continue;
		}
		await expect(page.getByTestId('exception-form')).toBeVisible();
		await page.getByTestId('exception-form').getByRole('button', { name: 'Fermer' }).click();
		await expect(page.getByTestId('exception-form')).toHaveCount(0);
	}
	expect(seeded, 'first BLOCKED exception seeded via UI').toBeTruthy();

	// 2) Reopen create form and submit a partially overlapping BLOCKED exception (real backend 409).
	await page.getByTestId('schedule-admin-exception-create').click();
	await expect(page.getByTestId('exception-form')).toBeVisible();
	await fillExceptionPractitioner(page, prac);
	await page.getByTestId('exception-form-service').selectOption(String(sid));
	await page.getByTestId('exception-form-type').selectOption('BLOCKED');
	await page.getByTestId('exception-form-start').fill(overlapStart);
	await page.getByTestId('exception-form-end').fill(overlapEnd);
	await page.getByTestId('exception-form-reason').fill(`QA-CONFLICT-B-${Date.now()}`);

	const conflictPost = page.waitForResponse(
		(r) => r.url().includes('/api/schedule-exceptions') && r.request().method() === 'POST',
		{ timeout: 30_000 }
	);
	await page.getByTestId('exception-form-submit').click();
	expect((await conflictPost).status()).toBe(409);
	await expect(page.getByTestId('exception-form')).toBeVisible();
	await expect(page.getByTestId('exception-form')).toContainText(
		/409|conflit|chevauche|overlap|impossible|existe/i,
		{ timeout: 15_000 }
	);
});

test('QA-SCHEDULE-ADMIN-OVERNIGHT-001 @critical overnight recurring rejected in UI', async ({
	page,
	login,
	request
}) => {
	test.setTimeout(90_000);
	const admin = await loginApi(request, adminEmail);
	const prac = await generalisteUserId(request);
	const sid = await serviceId(request, admin);
	await login(adminEmail, password);
	await page.goto('/admin/scheduling');
	await page.getByTestId('schedule-admin-create').click();
	await page.getByTestId('schedule-form-practitioner');
	await fillPractitioner(page, prac);
	await page.getByTestId('schedule-form-service').selectOption(String(sid));
	await page.getByTestId('schedule-form-weekday').selectOption('5');
	await page.getByTestId('schedule-form-start').fill('22:00');
	await page.getByTestId('schedule-form-end').fill('06:00');
	await page.getByTestId('schedule-form-valid-from').fill('2026-01-01');
	await page.getByTestId('schedule-form-submit').click();
	await expect(page.getByTestId('schedule-form')).toContainText(/fin|nuit|après le début/i);
});
