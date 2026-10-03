/**
 * LOT29E-C — Authoritative cash session summary (dashboard + close snapshot).
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
	const code = `E29C-${Date.now().toString(36)}`.slice(0, 20);
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
		const key = `qa29ec-preclose-${Date.now()}`;
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

test.describe('LOT29E-C cash session summary', () => {
	test('QA-29E-C-001 @critical open cash+card summary close snapshot', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(240_000);
		const admin = await loginApi(request, adminEmail);
		const reg = await ensureRegister(request, admin);
		await precloseCurrent(request, admin);

		const openKey = `qa29ec-open-${Date.now()}`;
		const opened = await request.post(`${api}/api/cash/sessions/open`, {
			headers: { ...bearer(admin), 'Idempotency-Key': openKey },
			data: { cashRegisterId: reg.id, openingFloat: 10000, idempotencyKey: openKey }
		});
		expect(opened.ok(), await opened.text()).toBeTruthy();
		const session = await opened.json();
		const sessionId = session.session.id as number;

		const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
		const catalog = await request.post(`${api}/api/act-catalog`, {
			headers: bearer(admin),
			data: {
				code: `E29C-${stamp}`.slice(0, 20),
				label: `Acte résumé ${stamp}`,
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
			headers: bearer(admin),
			data: {
				actType: 'PERFORMED_ACT',
				referenceId: catalogBody.id,
				code: `T29EC-${stamp}`.slice(0, 20),
				label: `Tarif 29EC ${stamp}`,
				unitPrice: 50000,
				effectiveFrom: new Date().toISOString().slice(0, 10),
				effectiveTo: null,
				isActive: true
			}
		});
		expect([200, 201].includes(tariff.status()), await tariff.text()).toBeTruthy();
		const tariffBody = JSON.parse(await tariff.text()) as { id: number };
		const patient = await request.post(`${api}/api/patients`, {
			headers: bearer(admin),
			data: {
				nom: `QA29EC-${stamp}`,
				prenoms: 'Sum',
				sexe: 'M',
				dateNaissance: '1992-03-03',
				telephone: `+22507${String(Date.now()).slice(-8)}`,
				isAssure: false
			}
		});
		const pText = await patient.text();
		expect([200, 201].includes(patient.status()), pText).toBeTruthy();
		const patientBody = (JSON.parse(pText).data ?? JSON.parse(pText)) as { id: number };
		await request.get(`${api}/api/patients/${patientBody.id}/medical-record`, {
			headers: bearer(admin)
		});

		async function issueInvoice() {
			const act = await request.post(`${api}/api/performed-acts`, {
				headers: bearer(admin),
				data: { patientId: patientBody.id, actCatalogEntryId: catalogBody.id, quantity: 1 }
			});
			const actParsed = JSON.parse(await act.text());
			const actBody = (actParsed.data ?? actParsed) as { id: number };
			const invoice = await request.post(`${api}/api/billing/invoices`, {
				headers: bearer(admin),
				data: {
					patientId: patientBody.id,
					lines: [{ actType: 'PERFORMED_ACT', referenceId: actBody.id, tariffId: tariffBody.id }]
				}
			});
			const invParsed = JSON.parse(await invoice.text());
			const draft = (invParsed.data ?? invParsed) as { id: number };
			const issued = await request.post(`${api}/api/billing/invoices/${draft.id}/issue`, {
				headers: bearer(admin)
			});
			expect(issued.ok(), await issued.text()).toBeTruthy();
			return draft.id;
		}

		const invCash = await issueInvoice();
		const invCard = await issueInvoice();
		const payCashKey = `qa29ec-cash-${Date.now()}`;
		const payCash = await request.post(`${api}/api/cash/sessions/${sessionId}/payments`, {
			headers: { ...bearer(admin), 'Idempotency-Key': payCashKey },
			data: {
				invoiceId: invCash,
				amount: 20000,
				paymentMethod: 'CASH',
				idempotencyKey: payCashKey
			}
		});
		expect(payCash.ok(), await payCash.text()).toBeTruthy();
		const payCardKey = `qa29ec-card-${Date.now()}`;
		const payCard = await request.post(`${api}/api/cash/sessions/${sessionId}/payments`, {
			headers: { ...bearer(admin), 'Idempotency-Key': payCardKey },
			data: {
				invoiceId: invCard,
				amount: 30000,
				paymentMethod: 'CARD',
				idempotencyKey: payCardKey
			}
		});
		expect(payCard.ok(), await payCard.text()).toBeTruthy();

		const pre = await request.get(`${api}/api/cash/sessions/${sessionId}`, {
			headers: bearer(admin)
		});
		expect(pre.ok()).toBeTruthy();
		const preBody = await pre.json();
		expect(preBody.cashCollected).toBe(20_000);
		expect(preBody.nonCashCollected).toBe(30_000);
		expect(preBody.totalCollected).toBe(50_000);
		expect(preBody.expectedCash).toBe(30_000);
		expect(preBody.operationCount).toBe(2);

		await login(adminEmail, password);
		await page.goto('/cash');
		await expect(page.getByTestId('cash-summary')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('cash-kpi-opening')).toContainText('10');
		await expect(page.getByTestId('cash-kpi-cash')).toContainText('20');
		await expect(page.getByTestId('cash-kpi-other')).toContainText('30');
		await expect(page.getByTestId('cash-kpi-total')).toContainText('50');
		await expect(page.getByTestId('cash-kpi-count')).toHaveText(/^2$/);
		await expect(page.getByTestId('cash-kpi-expected')).toContainText('30');

		await page.getByTestId('cash-close-counted').fill('30000');
		await page.getByTestId('cash-close-submit').click();
		await expect(page.getByTestId('cash-close-result')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('cash-close-expected')).toContainText('30');
		await expect(page.getByTestId('cash-close-difference')).toContainText('0');

		const closed = await request.get(`${api}/api/cash/sessions/${sessionId}`, {
			headers: bearer(admin)
		});
		const closedBody = await closed.json();
		expect(closedBody.session.status).toBe('CLOSED');
		expect(closedBody.session.expectedCashAmount).toBe(30_000);
		expect(closedBody.expectedCash).toBe(30_000);
		expect(closedBody.session.countedCashAmount).toBe(30_000);
		expect(closedBody.session.cashDifference).toBe(0);
		expect(closedBody.cashCollected).toBe(20_000);
		expect(closedBody.nonCashCollected).toBe(30_000);
	});
});
