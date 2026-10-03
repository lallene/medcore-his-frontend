/**
 * LOT29E-D — Cash closing reconciliation report.
 */
import { expect, type APIRequestContext } from '@playwright/test';
import { test } from '../fixtures/medcore';

const api = process.env.QA_API_URL ?? 'http://127.0.0.1:18082';
const password = process.env.QA_ADMIN_PASSWORD ?? 'admin123';
const adminEmail = process.env.QA_ADMIN_EMAIL ?? 'admin@medcore.local';

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

async function ensureRegister(request: APIRequestContext, token: string) {
	const list = await request.get(`${api}/api/cash/registers`, { headers: bearer(token) });
	expect(list.ok()).toBeTruthy();
	const regs = (await list.json()) as Array<{ id: number; code: string; active: boolean }>;
	const active = regs.find((r) => r.active);
	if (active) return active;
	const code = `E29D-${Date.now().toString(36)}`.slice(0, 20);
	const created = await request.post(`${api}/api/cash/registers`, {
		headers: bearer(token),
		data: { code, name: `Caisse ${code}`, location: 'QA', active: true }
	});
	expect([200, 201].includes(created.status()), await created.text()).toBeTruthy();
	return (await created.json()) as { id: number; code: string };
}

async function precloseCurrent(request: APIRequestContext, token: string) {
	const cur = await request.get(`${api}/api/cash/sessions/current`, { headers: bearer(token) });
	expect(cur.ok()).toBeTruthy();
	const curBody = await cur.json();
	if (curBody?.session?.id) {
		const key = `qa29ed-preclose-${Date.now()}`;
		await request.post(`${api}/api/cash/sessions/${curBody.session.id}/close`, {
			headers: { ...bearer(token), 'Idempotency-Key': key },
			data: {
				countedCashAmount: curBody.expectedCash ?? curBody.session.openingFloat ?? 0,
				note: 'QA cleanup',
				idempotencyKey: key
			}
		});
	}
}

async function issueInvoice(
	request: APIRequestContext,
	token: string,
	stamp: string,
	unitPrice: number
) {
	const catalog = await request.post(`${api}/api/act-catalog`, {
		headers: bearer(token),
		data: {
			code: `E29D-${stamp}`.slice(0, 20),
			label: `Acte recon ${stamp}`,
			category: 'PROCEDURE',
			basePrice: 1,
			currency: 'XOF',
			billable: true,
			insuranceEligible: false,
			isActive: true
		}
	});
	expect([200, 201].includes(catalog.status()), await catalog.text()).toBeTruthy();
	const catalogBody = JSON.parse(await catalog.text()) as { id: number };
	const tariff = await request.post(`${api}/api/billing/tariffs`, {
		headers: bearer(token),
		data: {
			actType: 'PERFORMED_ACT',
			referenceId: catalogBody.id,
			code: `T29ED-${stamp}`.slice(0, 20),
			label: `Tarif 29ED ${stamp}`,
			unitPrice,
			effectiveFrom: new Date().toISOString().slice(0, 10),
			effectiveTo: null,
			isActive: true
		}
	});
	expect([200, 201].includes(tariff.status()), await tariff.text()).toBeTruthy();
	const tariffBody = JSON.parse(await tariff.text()) as { id: number };
	const patient = await request.post(`${api}/api/patients`, {
		headers: bearer(token),
		data: {
			nom: `QA29ED-${stamp}`,
			prenoms: 'Rec',
			sexe: 'M',
			dateNaissance: '1990-01-01',
			telephone: `+22507${String(Date.now()).slice(-8)}`,
			isAssure: false
		}
	});
	const pText = await patient.text();
	expect([200, 201].includes(patient.status()), pText).toBeTruthy();
	const patientBody = (JSON.parse(pText).data ?? JSON.parse(pText)) as { id: number };
	await request.get(`${api}/api/patients/${patientBody.id}/medical-record`, {
		headers: bearer(token)
	});
	const act = await request.post(`${api}/api/performed-acts`, {
		headers: bearer(token),
		data: { patientId: patientBody.id, actCatalogEntryId: catalogBody.id, quantity: 1 }
	});
	const actParsed = JSON.parse(await act.text());
	const actBody = (actParsed.data ?? actParsed) as { id: number };
	const invoice = await request.post(`${api}/api/billing/invoices`, {
		headers: bearer(token),
		data: {
			patientId: patientBody.id,
			lines: [{ actType: 'PERFORMED_ACT', referenceId: actBody.id, tariffId: tariffBody.id }]
		}
	});
	const invParsed = JSON.parse(await invoice.text());
	const draft = (invParsed.data ?? invParsed) as { id: number };
	const issued = await request.post(`${api}/api/billing/invoices/${draft.id}/issue`, {
		headers: bearer(token)
	});
	expect(issued.ok(), await issued.text()).toBeTruthy();
	return draft.id;
}

test.describe('LOT29E-D cash reconciliation', () => {
	test('QA-29E-D-001 @critical open collect close reconcile print', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(240_000);
		const admin = await loginApi(request, adminEmail);
		const reg = await ensureRegister(request, admin);
		await precloseCurrent(request, admin);

		const openKey = `qa29ed-open-${Date.now()}`;
		const opened = await request.post(`${api}/api/cash/sessions/open`, {
			headers: { ...bearer(admin), 'Idempotency-Key': openKey },
			data: {
				cashRegisterId: reg.id,
				openingFloat: 10000,
				note: 'fond QA',
				idempotencyKey: openKey
			}
		});
		expect(opened.ok(), await opened.text()).toBeTruthy();
		const session = await opened.json();
		const sessionId = session.session.id as number;

		const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
		const invCash = await issueInvoice(request, admin, `${stamp}c`, 50000);
		const invCard = await issueInvoice(request, admin, `${stamp}k`, 50000);
		const payCashKey = `qa29ed-cash-${Date.now()}`;
		expect(
			(
				await request.post(`${api}/api/cash/sessions/${sessionId}/payments`, {
					headers: { ...bearer(admin), 'Idempotency-Key': payCashKey },
					data: {
						invoiceId: invCash,
						amount: 20000,
						paymentMethod: 'CASH',
						idempotencyKey: payCashKey
					}
				})
			).ok()
		).toBeTruthy();
		const payCardKey = `qa29ed-card-${Date.now()}`;
		expect(
			(
				await request.post(`${api}/api/cash/sessions/${sessionId}/payments`, {
					headers: { ...bearer(admin), 'Idempotency-Key': payCardKey },
					data: {
						invoiceId: invCard,
						amount: 30000,
						paymentMethod: 'CARD',
						idempotencyKey: payCardKey
					}
				})
			).ok()
		).toBeTruthy();

		const live = await request.get(`${api}/api/cash/sessions/${sessionId}`, {
			headers: bearer(admin)
		});
		const liveBody = await live.json();
		expect(liveBody.cashCollected).toBe(20_000);
		expect(liveBody.nonCashCollected).toBe(30_000);
		expect(liveBody.totalCollected).toBe(50_000);
		expect(liveBody.expectedCash).toBe(30_000);
		expect(liveBody.finalReconciliation).toBeFalsy();

		const closeKey = `qa29ed-close-${Date.now()}`;
		const closed = await request.post(`${api}/api/cash/sessions/${sessionId}/close`, {
			headers: { ...bearer(admin), 'Idempotency-Key': closeKey },
			data: { countedCashAmount: 30000, idempotencyKey: closeKey }
		});
		expect(closed.ok(), await closed.text()).toBeTruthy();
		const closedBody = await closed.json();
		expect(closedBody.finalReconciliation).toBeTruthy();
		expect(closedBody.varianceKind).toBe('BALANCED');

		await login(adminEmail, password);
		await page.goto(`/cash/sessions/${sessionId}`);
		await expect(page.getByTestId('cash-closing-report')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('cash-recon-opening-float')).toContainText('10');
		await expect(page.getByTestId('cash-recon-cash')).toContainText('20');
		await expect(page.getByTestId('cash-recon-noncash')).toContainText('30');
		await expect(page.getByTestId('cash-recon-total')).toContainText('50');
		await expect(page.getByTestId('cash-recon-expected')).toContainText('30');
		await expect(page.getByTestId('cash-recon-counted')).toContainText('30');
		await expect(page.getByTestId('cash-recon-difference')).toContainText('0');
		await expect(page.getByTestId('cash-recon-variance-label')).toContainText('équilibrée');
		await expect(page.getByTestId('cash-recon-opened-by')).toBeVisible();
		await expect(page.getByTestId('cash-recon-closed-by')).toBeVisible();
		await expect(page.getByTestId('cash-recon-print')).toBeVisible();

		await page.goto('/cash/sessions');
		await expect(page.getByTestId('cash-history')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId(`cash-history-row-${sessionId}`)).toBeVisible();
	});

	test('QA-29E-D-002 @critical shortage close shows variance and reason', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(240_000);
		const admin = await loginApi(request, adminEmail);
		const reg = await ensureRegister(request, admin);
		await precloseCurrent(request, admin);

		const openKey = `qa29ed2-open-${Date.now()}`;
		const opened = await request.post(`${api}/api/cash/sessions/open`, {
			headers: { ...bearer(admin), 'Idempotency-Key': openKey },
			data: { cashRegisterId: reg.id, openingFloat: 5000, idempotencyKey: openKey }
		});
		expect(opened.ok(), await opened.text()).toBeTruthy();
		const sessionId = (await opened.json()).session.id as number;
		const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
		const inv = await issueInvoice(request, admin, stamp, 20000);
		const payKey = `qa29ed2-pay-${Date.now()}`;
		expect(
			(
				await request.post(`${api}/api/cash/sessions/${sessionId}/payments`, {
					headers: { ...bearer(admin), 'Idempotency-Key': payKey },
					data: {
						invoiceId: inv,
						amount: 10000,
						paymentMethod: 'CASH',
						idempotencyKey: payKey
					}
				})
			).ok()
		).toBeTruthy();

		const closeKey = `qa29ed2-close-${Date.now()}`;
		const closed = await request.post(`${api}/api/cash/sessions/${sessionId}/close`, {
			headers: { ...bearer(admin), 'Idempotency-Key': closeKey },
			data: {
				countedCashAmount: 14000,
				note: 'Manque espèces constaté QA',
				idempotencyKey: closeKey
			}
		});
		expect(closed.ok(), await closed.text()).toBeTruthy();
		const body = await closed.json();
		expect(body.varianceKind).toBe('SHORTAGE');
		expect(body.session.cashDifference).toBe(-1000);

		await login(adminEmail, password);
		await page.goto(`/cash/sessions/${sessionId}`);
		await expect(page.getByTestId('cash-closing-report')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('cash-recon-variance-label')).toContainText('négatif');
		await expect(page.getByTestId('cash-recon-closing-note')).toContainText('Manque espèces');
		await expect(page.getByTestId('cash-recon-difference')).toContainText('1');
	});
});
