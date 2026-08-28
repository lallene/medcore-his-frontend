import { expect, type APIRequestContext } from '@playwright/test';
import { test } from '../fixtures/medcore';

const api = process.env.QA_API_URL ?? 'http://127.0.0.1:8080';
const password = process.env.QA_ADMIN_PASSWORD ?? 'admin123';
const adminEmail = process.env.QA_ADMIN_EMAIL ?? 'admin@medcore.local';
const receptionEmail = 'demo.accueil@medcore.local';
const nurseEmail = 'demo.infirmier@medcore.local';
const doctorEmail = 'demo.generaliste@medcore.local';
const cashierEmail = 'demo.caissiere@medcore.local';

/** Patient DEMO avec facture entièrement payée (finance=CLEAR) — seed full_demo. */
const PATIENT_CLEAR = 'P-DEMO-010';
/** Patient isolé pour RBAC — override finance comme QA-QUEUE-SMOKE-001. */
const PATIENT_RBAC = 'P-DEMO-007';

const qaTag = process.env.QA_RUN_ID ?? `local-${Date.now()}`;

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

async function clearActiveTickets(request: APIRequestContext, token: string, patientCode: string) {
	const list = await request.get(
		`${api}/api/queue/tickets?search=${encodeURIComponent(patientCode)}&status=ACTIVE&limit=50`,
		{ headers: bearer(token) }
	);
	if (!list.ok()) return;
	const body = await list.json();
	for (const t of body.items ?? []) {
		await request.post(`${api}/api/queue/tickets/${t.id}/cancel`, {
			headers: bearer(token),
			data: { reason: `QA cleanup ${qaTag}` }
		});
	}
}

/** Vérifie finance via API queue (règle métier réelle). */
async function evaluateFinance(
	request: APIRequestContext,
	receptionToken: string,
	patientId: number
) {
	const res = await request.get(`${api}/api/queue/finance/${patientId}`, {
		headers: bearer(receptionToken)
	});
	expect(res.ok(), await res.text()).toBeTruthy();
	const body = await res.json();
	return (body.financeStatus ?? body.finance_status) as string;
}

/**
 * Prépare check-in : patient CLEAR → pas d'override ;
 * sinon utilise financeOverride (workflow accueil existant, identique QA-QUEUE-SMOKE-001).
 */
async function walkInCheckInPayload(
	request: APIRequestContext,
	receptionToken: string,
	patientId: number,
	serviceId: number,
	reason: string,
	allowOverride = false
) {
	const financeStatus = await evaluateFinance(request, receptionToken, patientId);
	const payload: Record<string, unknown> = {
		patientId,
		serviceId,
		identityConfirmed: true,
		reason: `${reason} ${qaTag}`
	};
	if (financeStatus === 'CLEAR' || financeStatus === 'EXEMPT') {
		return { payload, financeStatus };
	}
	if (!allowOverride) {
		expect(
			financeStatus,
			`Patient finance=${financeStatus} — utiliser un patient CLEAR ou activer override`
		).toBe('CLEAR');
	}
	payload.financeOverride = true;
	payload.financeOverrideNote = `QA clinical flow ${qaTag}`;
	return { payload, financeStatus };
}

async function medicalRecordId(request: APIRequestContext, token: string, patientId: number) {
	const res = await request.get(`${api}/api/patients/${patientId}/summary`, {
		headers: bearer(token)
	});
	expect(res.ok(), await res.text()).toBeTruthy();
	const body = await res.json();
	const recordId = body.medical_record?.id ?? body.medicalRecord?.id;
	expect(recordId, 'medical record id').toBeTruthy();
	return recordId as number;
}

async function recordTriageVitals(
	request: APIRequestContext,
	nurseToken: string,
	readerToken: string,
	patientId: number
) {
	const recordId = await medicalRecordId(request, readerToken, patientId);
	const temperatureC = 36.5 + (Date.now() % 15) / 10;
	const vitRes = await request.post(`${api}/api/medical-records/${recordId}/vital-signs`, {
		headers: bearer(nurseToken),
		data: {
			temperature_c: temperatureC,
			systolic_bp: 142,
			diastolic_bp: 88,
			heart_rate: 76
		}
	});
	expect(vitRes.ok(), await vitRes.text()).toBeTruthy();
	const vital = await vitRes.json();
	return { vitalId: vital.id as number, temperatureC };
}

test('QA-CLINICAL-FLOW-001 @smoke @critical full doctor clinical path', async ({
	page,
	login,
	request
}) => {
	test.setTimeout(120_000);
	const admin = await loginApi(request, adminEmail);
	await clearActiveTickets(request, admin, PATIENT_CLEAR);
	const pid = await patientId(request, admin, PATIENT_CLEAR);
	const svc = await serviceId(request, admin);
	const reception = await loginApi(request, receptionEmail);
	const nurse = await loginApi(request, nurseEmail);
	const doctor = await loginApi(request, doctorEmail);

	const { payload, financeStatus } = await walkInCheckInPayload(
		request,
		reception,
		pid,
		svc,
		'QA-CLINICAL-FLOW-001',
		false
	);
	expect(financeStatus).toBe('CLEAR');

	const walkIn = await request.post(`${api}/api/queue/check-in/walk-in`, {
		headers: bearer(reception),
		data: payload
	});
	const walkInText = await walkIn.text();
	expect(walkIn.ok(), `walk-in failed: ${walkIn.status()} ${walkInText}`).toBeTruthy();
	const ticket = JSON.parse(walkInText) as { id: number; reference: string };

	const vitals = await recordTriageVitals(request, nurse, admin, pid);

	await request.post(`${api}/api/queue/tickets/${ticket.id}/triage/take`, {
		headers: bearer(nurse)
	});
	const triageDone = await request.post(`${api}/api/queue/tickets/${ticket.id}/triage/complete`, {
		headers: bearer(nurse),
		data: { vitalSignsId: vitals.vitalId }
	});
	expect(triageDone.ok(), await triageDone.text()).toBeTruthy();

	const preDoctor = await request.get(`${api}/api/queue/tickets/${ticket.id}`, {
		headers: bearer(doctor)
	});
	const preBody = await preDoctor.json();
	const preTicket = preBody.ticket ?? preBody;
	expect(preTicket.stage).toBe('WAITING_DOCTOR');
	expect(preTicket.vitalSigns?.temperatureC ?? preTicket.vitalSigns?.temperature_c).toBeCloseTo(
		vitals.temperatureC,
		1
	);

	await login(doctorEmail, password);
	await page.goto('/queue/doctor');
	await expect(page.getByTestId('queue-doctor')).toBeVisible();
	await page.getByTestId('queue-doctor-row').filter({ hasText: ticket.reference }).click();
	await page.getByTestId('queue-doctor-take').click();

	await expect(page).toHaveURL(new RegExp(`/consultations/\\d+`));
	await expect(page.getByTestId('consultation-complete-care')).toBeVisible();
	const contextBar = page.getByTestId('clinical-flow-context-bar');
	if (await contextBar.count()) {
		await expect(contextBar).toBeVisible();
	}

	const consultMatch = page.url().match(/consultations\/(\d+)/);
	expect(consultMatch?.[1]).toBeTruthy();
	const consultationId = Number(consultMatch![1]);

	const consultGet = await request.get(`${api}/api/consultations/${consultationId}`, {
		headers: bearer(doctor)
	});
	expect(consultGet.ok()).toBeTruthy();
	const consultBody = await consultGet.json();
	expect(consultBody.status).toMatch(/^(in_progress|draft)$/);
	if (consultBody.queueTicketId != null) {
		expect(consultBody.queueTicketId).toBe(ticket.id);
	} else {
		const linkCheck = await request.get(`${api}/api/queue/tickets/${ticket.id}`, {
			headers: bearer(doctor)
		});
		expect(linkCheck.ok()).toBeTruthy();
		const linkBody = await linkCheck.json();
		const linked = linkBody.ticket ?? linkBody;
		expect(linked.consultationId).toBe(consultationId);
	}

	const afterTake = await request.get(`${api}/api/queue/tickets/${ticket.id}`, {
		headers: bearer(doctor)
	});
	const afterTakeBody = await afterTake.json();
	const afterTicket = afterTakeBody.ticket ?? afterTakeBody;
	expect(afterTicket.vitalSigns?.temperatureC ?? afterTicket.vitalSigns?.temperature_c).toBeCloseTo(
		vitals.temperatureC,
		1
	);

	await page.getByTestId('consultation-complete-disposition').selectOption('DISCHARGED');
	await page.getByTestId('consultation-complete-care').click();

	await expect
		.poll(async () => {
			const res = await request.get(`${api}/api/queue/tickets/${ticket.id}`, {
				headers: bearer(doctor)
			});
			const body = await res.json();
			return (body.ticket ?? body).stage;
		})
		.toBe('COMPLETED');

	const ticketGet = await request.get(`${api}/api/queue/tickets/${ticket.id}`, {
		headers: bearer(doctor)
	});
	const ticketBody = await ticketGet.json();
	expect(ticketBody.ticket?.stage ?? ticketBody.stage).toBe('COMPLETED');

	const consultAfter = await request.get(`${api}/api/consultations/${consultationId}`, {
		headers: bearer(doctor)
	});
	const consultAfterStatus = (await consultAfter.json()).status as string;
	if (consultBody.queueTicketId != null) {
		expect(consultAfterStatus).toBe('completed');
	}

	await page.goto('/queue/doctor');
	await expect(page.getByText(ticket.reference)).not.toBeVisible();
});

test('QA-CLINICAL-FLOW-RBAC-001 @smoke @critical clinical flow access rules', async ({
	page,
	login,
	request
}) => {
	test.setTimeout(90_000);
	const admin = await loginApi(request, adminEmail);
	await clearActiveTickets(request, admin, PATIENT_RBAC);
	const pid = await patientId(request, admin, PATIENT_RBAC);
	const svc = await serviceId(request, admin);
	const reception = await loginApi(request, receptionEmail);
	const nurse = await loginApi(request, nurseEmail);
	const doctor = await loginApi(request, doctorEmail);
	const cashier = await loginApi(request, cashierEmail);

	const { payload, financeStatus } = await walkInCheckInPayload(
		request,
		reception,
		pid,
		svc,
		'QA-CLINICAL-FLOW-RBAC-001',
		true
	);
	expect(
		financeStatus === 'PAYMENT_REQUIRED' || financeStatus === 'CLEAR' || financeStatus === 'EXEMPT'
	).toBeTruthy();
	expect(payload.financeOverride, 'override requis pour patient RBAC').toBe(true);

	const walkIn = await request.post(`${api}/api/queue/check-in/walk-in`, {
		headers: bearer(reception),
		data: payload
	});
	const walkInText = await walkIn.text();
	expect(
		walkIn.ok(),
		`walk-in failed: status=${walkIn.status()} body=${walkInText} patient=${PATIENT_RBAC} role=reception`
	).toBeTruthy();
	const ticket = JSON.parse(walkInText) as { id: number };

	const preWL = await request.get(`${api}/api/queue/doctor/worklist?limit=50`, {
		headers: bearer(doctor)
	});
	const preItems = (await preWL.json()).items ?? [];
	expect(preItems.some((t: { id: number }) => t.id === ticket.id)).toBeFalsy();

	await request.post(`${api}/api/queue/tickets/${ticket.id}/triage/take`, {
		headers: bearer(nurse)
	});
	await request.post(`${api}/api/queue/tickets/${ticket.id}/triage/complete`, {
		headers: bearer(nurse),
		data: {}
	});

	const take = await request.post(`${api}/api/queue/tickets/${ticket.id}/doctor/take`, {
		headers: bearer(doctor),
		data: { createConsultation: true }
	});
	const takeText = await take.text();
	expect(
		take.ok(),
		`doctor take failed: status=${take.status()} body=${takeText} ticketId=${ticket.id} user=${doctorEmail} service=${svc} finance=${financeStatus}`
	).toBeTruthy();
	const taken = JSON.parse(takeText);
	const consultationId = taken.consultationId as number;
	expect(consultationId).toBeTruthy();

	const cashierComplete = await request.post(`${api}/api/queue/tickets/${ticket.id}/complete`, {
		headers: bearer(cashier),
		data: { disposition: 'DISCHARGED' }
	});
	expect(cashierComplete.status()).toBe(403);

	await login(cashierEmail, password);
	await page.goto(`/consultations/${consultationId}`);
	await expect(page.getByTestId('consultation-complete-care')).not.toBeVisible();
});
