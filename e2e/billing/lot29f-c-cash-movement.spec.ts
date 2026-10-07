/**
 * LOT29F-C — Append-only cash movement foundation.
 * Movement is not payment / refund / credit-note.
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
	const code = `E29FC-${Date.now().toString(36)}`.slice(0, 20);
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
		const key = `qa29fc-preclose-${Date.now()}`;
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
	tag: string,
	unitPrice: number
) {
	const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
	const catalog = await request.post(`${api}/api/act-catalog`, {
		headers: bearer(token),
		data: {
			code: `E29FC-${stamp}`.slice(0, 20),
			label: `Acte mouvement ${stamp}`,
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
			code: `T29FC-${stamp}`.slice(0, 20),
			label: `Tarif 29FC ${stamp}`,
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
			nom: `QA29FC-${tag}-${stamp}`,
			prenoms: 'Move',
			sexe: 'M',
			dateNaissance: '1991-04-04',
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

test.describe('LOT29F-C cash movement foundation', () => {
	test('QA-29F-C-001 @critical movement totals and close snapshot', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(240_000);
		const admin = await loginApi(request, adminEmail);
		const reg = await ensureRegister(request, admin);
		await precloseCurrent(request, admin);

		const openKey = `qa29fc-open-${Date.now()}`;
		const opened = await request.post(`${api}/api/cash/sessions/open`, {
			headers: { ...bearer(admin), 'Idempotency-Key': openKey },
			data: { cashRegisterId: reg.id, openingFloat: 10000, idempotencyKey: openKey }
		});
		expect(opened.ok(), await opened.text()).toBeTruthy();
		const session = await opened.json();
		const sessionId = session.session.id as number;

		const invCash = await issueInvoice(request, admin, 'cash', 20000);
		const payKey = `qa29fc-pay-${Date.now()}`;
		expect(
			(
				await request.post(`${api}/api/cash/sessions/${sessionId}/payments`, {
					headers: { ...bearer(admin), 'Idempotency-Key': payKey },
					data: {
						invoiceId: invCash,
						amount: 20000,
						paymentMethod: 'CASH',
						idempotencyKey: payKey,
						payer: { mode: 'PATIENT' }
					}
				})
			).ok()
		).toBeTruthy();

		await login(adminEmail);
		await page.goto('/cash');
		await expect(page.getByTestId('cash-summary')).toBeVisible({ timeout: 30_000 });
		await expect(page.getByTestId('cash-kpi-cash')).toContainText('20');
		await expect(page.getByTestId('cash-kpi-expected')).toContainText('30');

		await expect(page.getByTestId('cash-movement-panel')).toBeVisible();
		await expect(page.getByTestId('cash-movement-submit')).toContainText('Entrée de caisse');
		await expect(page.getByTestId('cash-movement-panel')).not.toContainText(/Rembours/i);

		await page.getByTestId('cash-movement-direction').selectOption('IN');
		await page.getByTestId('cash-movement-amount').fill('5000');
		await page.getByTestId('cash-movement-reason').fill('Apport fonds QA');
		await page.getByTestId('cash-movement-confirm').locator('input').check();
		await page.getByTestId('cash-movement-submit').click();

		await expect(page.getByTestId('cash-kpi-movement-in')).toContainText('5', { timeout: 20_000 });
		await expect(page.getByTestId('cash-kpi-cash')).toContainText('20');
		await expect(page.getByTestId('cash-kpi-total')).toContainText('20');
		await expect(page.getByTestId('cash-kpi-expected')).toContainText('35');

		await page.getByTestId('cash-movement-direction').selectOption('OUT');
		await page.getByTestId('cash-movement-amount').fill('2000');
		await page.getByTestId('cash-movement-reason').fill('Retrait fonds QA');
		await page.getByTestId('cash-movement-confirm').locator('input').check();
		await page.getByTestId('cash-movement-submit').click();

		await expect(page.getByTestId('cash-kpi-movement-out')).toContainText('2', { timeout: 20_000 });
		await expect(page.getByTestId('cash-kpi-expected')).toContainText('33');
		await expect(page.getByTestId('cash-kpi-cash')).toContainText('20');

		const live = await request.get(`${api}/api/cash/sessions/${sessionId}`, {
			headers: bearer(admin)
		});
		const liveBody = await live.json();
		expect(liveBody.cashCollected).toBe(20_000);
		expect(liveBody.totalCollected).toBe(20_000);
		expect(liveBody.cashMovementIn).toBe(5_000);
		expect(liveBody.cashMovementOut).toBe(2_000);
		expect(liveBody.expectedCash).toBe(33_000);

		await page.getByTestId('cash-close-counted').fill('33000');
		await page.getByTestId('cash-close-submit').click();
		await expect(page.getByTestId('cash-close-result')).toBeVisible({ timeout: 30_000 });
		await expect(page.getByTestId('cash-close-expected')).toContainText('33');

		await page.getByTestId('cash-close-recon-link').click();
		await expect(page.getByTestId('cash-closing-report')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('cash-recon-cash')).toContainText('20');
		await expect(page.getByTestId('cash-recon-movement-in')).toContainText('5');
		await expect(page.getByTestId('cash-recon-movement-out')).toContainText('2');
		await expect(page.getByTestId('cash-recon-expected')).toContainText('33');
		await expect(page.getByTestId('cash-recon-total')).toContainText('20');
	});
});
