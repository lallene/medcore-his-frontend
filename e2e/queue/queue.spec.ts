import { expect, type APIRequestContext } from '@playwright/test';
import { test } from '../fixtures/medcore';

const api = process.env.QA_API_URL ?? 'http://127.0.0.1:8080';
const password = process.env.QA_ADMIN_PASSWORD ?? 'admin123';
const adminEmail = process.env.QA_ADMIN_EMAIL ?? 'admin@medcore.local';
const receptionEmail = 'demo.accueil@medcore.local';
const nurseEmail = 'demo.infirmier@medcore.local';
const doctorEmail = 'demo.generaliste@medcore.local';
const cashierEmail = 'demo.caissiere@medcore.local';

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

async function patientId(request: APIRequestContext, token: string, code: string) {
	const response = await request.get(`${api}/api/patients?search=${encodeURIComponent(code)}`, {
		headers: bearer(token)
	});
	expect(response.ok(), await response.text()).toBeTruthy();
	const body = await response.json();
	const items = body.data ?? body.items ?? [];
	const row = (Array.isArray(items) ? items : []).find(
		(p: { codePatient?: string; code_patient?: string }) =>
			p.codePatient === code || p.code_patient === code
	);
	expect(row?.id, `patient ${code}`).toBeTruthy();
	return row.id as number;
}

async function serviceId(request: APIRequestContext, token: string, code = 'URG') {
	const response = await request.get(`${api}/api/organization/services`, {
		headers: bearer(token)
	});
	expect(response.ok(), await response.text()).toBeTruthy();
	const body = await response.json();
	const items = body.data ?? body;
	const row = (Array.isArray(items) ? items : []).find((s: { code?: string }) => s.code === code);
	expect(row?.id, `service ${code}`).toBeTruthy();
	return row.id as number;
}

function okCreate(status: number) {
	return status === 200 || status === 201;
}

async function clearActiveTickets(request: APIRequestContext, token: string, patientCode: string) {
	const list = await request.get(
		`${api}/api/queue/tickets?search=${encodeURIComponent(patientCode)}&status=ACTIVE&limit=50`,
		{
			headers: bearer(token)
		}
	);
	if (!list.ok()) return;
	const body = await list.json();
	for (const t of body.items ?? []) {
		await request.post(`${api}/api/queue/tickets/${t.id}/cancel`, {
			headers: bearer(token),
			data: { reason: 'QA cleanup' }
		});
	}
}

test('QA-QUEUE-SMOKE-001 @smoke appointment check-in to doctor queue', async ({
	page,
	login,
	request
}) => {
	test.setTimeout(90_000);
	// Bootstrap technique uniquement : libérer un patient déterministe
	const admin = await loginApi(request, adminEmail);
	await clearActiveTickets(request, admin, 'P-DEMO-007');

	const reception = await loginApi(request, receptionEmail);
	const nurse = await loginApi(request, nurseEmail);
	const doctor = await loginApi(request, doctorEmail);

	const pid = await patientId(request, reception, 'P-DEMO-007');
	const sid = await serviceId(request, reception);
	const scheduledAt = new Date(Date.now() + 5 * 60_000).toISOString();

	// ACCUEIL — RDV + check-in + ticket
	const apptRes = await request.post(`${api}/api/queue/appointments`, {
		headers: bearer(reception),
		data: { patientId: pid, serviceId: sid, scheduledAt, reason: `QA-SMOKE-${Date.now()}` }
	});
	expect(okCreate(apptRes.status()), await apptRes.text()).toBeTruthy();
	const appt = await apptRes.json();

	const checkIn = await request.post(`${api}/api/queue/appointments/${appt.id}/check-in`, {
		headers: bearer(reception),
		data: { identityConfirmed: true, financeOverride: true, financeOverrideNote: 'QA smoke' }
	});
	expect(okCreate(checkIn.status()), await checkIn.text()).toBeTruthy();
	const ticket = await checkIn.json();
	expect(ticket.reference).toMatch(/^Q-\d{4}-\d{6}$/);
	expect(ticket.stage).toBe('WAITING_TRIAGE');

	await login(receptionEmail, password);
	await page.goto('/queue/reception');
	await expect(page.getByTestId('queue-reception')).toBeVisible();

	// INFIRMIER — triage
	const takeTriage = await request.post(`${api}/api/queue/tickets/${ticket.id}/triage/take`, {
		headers: bearer(nurse)
	});
	expect(takeTriage.status(), await takeTriage.text()).toBe(200);
	expect((await takeTriage.json()).stage).toBe('TRIAGE_IN_PROGRESS');

	const completeTriage = await request.post(
		`${api}/api/queue/tickets/${ticket.id}/triage/complete`,
		{ headers: bearer(nurse), data: {} }
	);
	expect(completeTriage.status(), await completeTriage.text()).toBe(200);
	expect((await completeTriage.json()).stage).toBe('WAITING_DOCTOR');

	await login(nurseEmail, password);
	await page.goto('/queue/triage');
	await expect(page.getByTestId('queue-triage')).toBeVisible();

	// MÉDECIN — file + prise en charge
	await login(doctorEmail, password);
	await page.goto('/queue/doctor');
	await expect(page.getByTestId('queue-doctor')).toBeVisible();
	await expect(page.getByText(ticket.reference)).toBeVisible();

	const takeDoc = await request.post(`${api}/api/queue/tickets/${ticket.id}/doctor/take`, {
		headers: bearer(doctor),
		data: { createConsultation: true }
	});
	expect(takeDoc.status(), await takeDoc.text()).toBe(200);
	const inProgress = await takeDoc.json();
	expect(inProgress.stage).toBe('DOCTOR_IN_PROGRESS');
	expect(inProgress.consultationId).toBeTruthy();

	await page.goto(`/queue/${ticket.id}`);
	await expect(page.getByTestId('queue-detail')).toBeVisible();
	await expect(page.getByText(ticket.reference)).toBeVisible();
});

test('QA-QUEUE-RBAC-001 @critical reception nurse doctor scopes', async ({ request }) => {
	expect((await request.get(`${api}/api/queue/tickets`)).status()).toBe(401);

	const reception = await loginApi(request, receptionEmail);
	const nurse = await loginApi(request, nurseEmail);
	const doctor = await loginApi(request, doctorEmail);
	const cashier = await loginApi(request, cashierEmail);

	expect(
		(
			await request.get(`${api}/api/queue/appointments/today`, { headers: bearer(reception) })
		).status()
	).toBe(200);
	expect(
		(
			await request.get(`${api}/api/queue/tickets?stage=WAITING_TRIAGE`, { headers: bearer(nurse) })
		).status()
	).toBe(200);
	expect(
		(
			await request.get(`${api}/api/queue/tickets?stage=WAITING_DOCTOR`, {
				headers: bearer(doctor)
			})
		).status()
	).toBe(200);

	expect((await request.get(`${api}/api/queue/kpis`, { headers: bearer(cashier) })).status()).toBe(
		403
	);
	expect(
		(
			await request.post(`${api}/api/queue/check-in/walk-in`, {
				headers: bearer(cashier),
				data: { patientId: 1, serviceId: 1, identityConfirmed: true }
			})
		).status()
	).toBe(403);
	expect(
		(
			await request.post(`${api}/api/queue/tickets/1/triage/take`, {
				headers: bearer(reception)
			})
		).status()
	).toBe(403);
	expect(
		(
			await request.post(`${api}/api/queue/tickets/1/doctor/take`, {
				headers: bearer(nurse),
				data: {}
			})
		).status()
	).toBe(403);
});

test('QA-QUEUE-FULL-001 @full walk-in priority concurrency history', async ({
	page,
	login,
	request
}) => {
	test.setTimeout(120_000);
	const admin = await loginApi(request, adminEmail);
	const nurse = await loginApi(request, nurseEmail);
	const reception = await loginApi(request, receptionEmail);
	const doctor = await loginApi(request, doctorEmail);
	await clearActiveTickets(request, admin, 'P-DEMO-009');
	const pid = await patientId(request, reception, 'P-DEMO-009');
	const sid = await serviceId(request, reception);

	const walkIn = await request.post(`${api}/api/queue/check-in/walk-in`, {
		headers: bearer(reception),
		data: {
			patientId: pid,
			serviceId: sid,
			identityConfirmed: true,
			financeOverride: true,
			financeOverrideNote: 'QA full',
			priority: 'HIGH',
			reason: `QA-FULL-${Date.now()}`
		}
	});
	expect(okCreate(walkIn.status()), await walkIn.text()).toBeTruthy();
	const ticket = await walkIn.json();
	expect(ticket.source).toBe('WALK_IN');
	expect(ticket.priority).toBe('HIGH');

	const duplicate = await request.post(`${api}/api/queue/check-in/walk-in`, {
		headers: bearer(reception),
		data: {
			patientId: pid,
			serviceId: sid,
			identityConfirmed: true,
			financeOverride: true
		}
	});
	expect(duplicate.status()).toBe(409);

	const skip = await request.post(`${api}/api/queue/tickets/${ticket.id}/triage/complete`, {
		headers: bearer(nurse),
		data: {}
	});
	expect(skip.status()).toBe(409);

	const [a, b] = await Promise.all([
		request.post(`${api}/api/queue/tickets/${ticket.id}/triage/take`, {
			headers: bearer(nurse)
		}),
		request.post(`${api}/api/queue/tickets/${ticket.id}/triage/take`, {
			headers: bearer(admin)
		})
	]);
	const statuses = [a.status(), b.status()].sort();
	expect(statuses).toEqual([200, 409]);

	const winnerToken = a.ok() ? nurse : admin;
	const taken = a.ok() ? await a.json() : await b.json();
	expect(taken.stage).toBe('TRIAGE_IN_PROGRESS');

	const prio = await request.post(`${api}/api/queue/tickets/${ticket.id}/priority`, {
		headers: bearer(nurse),
		data: { priority: 'URGENT', reason: 'QA escalation' }
	});
	expect(prio.status(), await prio.text()).toBe(200);
	expect((await prio.json()).priority).toBe('URGENT');

	const complete = await request.post(`${api}/api/queue/tickets/${ticket.id}/triage/complete`, {
		headers: bearer(winnerToken),
		data: {}
	});
	expect(complete.status(), await complete.text()).toBe(200);

	const takeDoc = await request.post(`${api}/api/queue/tickets/${ticket.id}/doctor/take`, {
		headers: bearer(doctor),
		data: { createConsultation: true }
	});
	expect(takeDoc.status(), await takeDoc.text()).toBe(200);
	const inProgress = await takeDoc.json();
	expect(inProgress.stage).toBe('DOCTOR_IN_PROGRESS');
	expect(inProgress.consultationId).toBeTruthy();

	const detail = await request.get(`${api}/api/queue/tickets/${ticket.id}`, {
		headers: bearer(doctor)
	});
	expect(detail.ok()).toBeTruthy();
	const body = await detail.json();
	expect(body.history?.length).toBeGreaterThanOrEqual(3);
	const events = body.history.map((h: { eventType: string }) => h.eventType);
	expect(events).toEqual(expect.arrayContaining(['CHECK_IN', 'TRIAGE_TAKE', 'TRIAGE_COMPLETE']));

	await login(receptionEmail, password);
	await page.goto('/queue/reception');
	await expect(page.getByTestId('queue-reception')).toBeVisible();
	await login(nurseEmail, password);
	await page.goto('/queue/triage');
	await expect(page.getByTestId('queue-triage')).toBeVisible();
});
