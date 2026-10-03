/**
 * LOT29E-B — Cash session lifecycle hardening (open / current / close).
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
	const code = `E29B-${Date.now().toString(36)}`.slice(0, 20);
	const created = await request.post(`${api}/api/cash/registers`, {
		headers: bearer(token),
		data: { code, name: `Caisse ${code}`, location: 'QA', active: true }
	});
	expect([200, 201].includes(created.status()), await created.text()).toBeTruthy();
	return (await created.json()) as { id: number; code: string };
}

test.describe('LOT29E-B cash session lifecycle', () => {
	test('QA-29E-B-001 @critical open current close zero-activity', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(180_000);
		const admin = await loginApi(request, adminEmail);
		const reg = await ensureRegister(request, admin);
		// Close any leftover current session for clean open.
		const cur = await request.get(`${api}/api/cash/sessions/current`, { headers: bearer(admin) });
		expect(cur.ok()).toBeTruthy();
		const curBody = await cur.json();
		if (curBody?.session?.id) {
			const key = `qa29eb-preclose-${Date.now()}`;
			await request.post(`${api}/api/cash/sessions/${curBody.session.id}/close`, {
				headers: { ...bearer(admin), 'Idempotency-Key': key },
				data: {
					countedCashAmount: curBody.expectedCash ?? curBody.session.openingFloat ?? 0,
					note: 'QA cleanup',
					idempotencyKey: key
				}
			});
		}

		await login(adminEmail, password);
		await page.goto('/cash');
		await expect(page.getByTestId('cash-open-panel')).toBeVisible({ timeout: 20_000 });
		await page.getByTestId('cash-open-register').selectOption(String(reg.id));
		await page.getByTestId('cash-open-float').fill('15000');
		await page.getByTestId('cash-open-submit').click();
		await expect(page.getByTestId('cash-close-panel')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('cash-close-expected-preview')).toContainText('15');

		const verifyOpen = await request.get(`${api}/api/cash/sessions/current`, {
			headers: bearer(admin)
		});
		expect(verifyOpen.ok()).toBeTruthy();
		const openBody = await verifyOpen.json();
		expect(openBody.session.status).toBe('OPEN');
		expect(openBody.expectedCash).toBe(15_000);

		await page.getByTestId('cash-close-counted').fill('15000');
		await page.getByTestId('cash-close-submit').click();
		await expect(page.getByTestId('cash-close-result')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('cash-close-expected')).toContainText('15');
		await expect(page.getByTestId('cash-close-difference')).toContainText('0');

		const verifyClosed = await request.get(`${api}/api/cash/sessions/${openBody.session.id}`, {
			headers: bearer(admin)
		});
		expect(verifyClosed.ok()).toBeTruthy();
		const closed = await verifyClosed.json();
		expect(closed.session.status).toBe('CLOSED');
		expect(closed.session.expectedCashAmount).toBe(15_000);
		expect(closed.session.countedCashAmount).toBe(15_000);
		expect(closed.session.cashDifference).toBe(0);
	});

	test('QA-29E-B-002 @critical open cash payment close expected once', async ({ request }) => {
		test.setTimeout(180_000);
		const admin = await loginApi(request, adminEmail);
		const reg = await ensureRegister(request, admin);
		const cur = await request.get(`${api}/api/cash/sessions/current`, { headers: bearer(admin) });
		const curBody = await cur.json();
		if (curBody?.session?.id) {
			const key = `qa29eb-preclose2-${Date.now()}`;
			await request.post(`${api}/api/cash/sessions/${curBody.session.id}/close`, {
				headers: { ...bearer(admin), 'Idempotency-Key': key },
				data: {
					countedCashAmount: curBody.expectedCash ?? 0,
					note: 'QA cleanup',
					idempotencyKey: key
				}
			});
		}
		const openKey = `qa29eb-open-${Date.now()}`;
		const opened = await request.post(`${api}/api/cash/sessions/open`, {
			headers: { ...bearer(admin), 'Idempotency-Key': openKey },
			data: {
				cashRegisterId: reg.id,
				openingFloat: 5000,
				idempotencyKey: openKey
			}
		});
		expect(opened.ok(), await opened.text()).toBeTruthy();
		const session = await opened.json();
		const sessionId = session.session.id as number;

		const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
		const catalog = await request.post(`${api}/api/act-catalog`, {
			headers: bearer(admin),
			data: {
				code: `E29B-${stamp}`.slice(0, 20),
				label: `Acte caisse ${stamp}`,
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
				code: `T29EB-${stamp}`.slice(0, 20),
				label: `Tarif 29EB ${stamp}`,
				unitPrice: 8000,
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
				nom: `QA29EB-${stamp}`,
				prenoms: 'Cash',
				sexe: 'M',
				dateNaissance: '1991-02-02',
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

		const payKey = `qa29eb-pay-${Date.now()}`;
		const pay = await request.post(`${api}/api/cash/sessions/${sessionId}/payments`, {
			headers: { ...bearer(admin), 'Idempotency-Key': payKey },
			data: {
				invoiceId: draft.id,
				amount: 8000,
				paymentMethod: 'CASH',
				idempotencyKey: payKey
			}
		});
		expect(pay.ok(), await pay.text()).toBeTruthy();

		const closeKey = `qa29eb-close-${Date.now()}`;
		const closed = await request.post(`${api}/api/cash/sessions/${sessionId}/close`, {
			headers: { ...bearer(admin), 'Idempotency-Key': closeKey },
			data: { countedCashAmount: 13000, idempotencyKey: closeKey }
		});
		expect(closed.ok(), await closed.text()).toBeTruthy();
		const body = await closed.json();
		expect(body.session.expectedCashAmount).toBe(13_000);
		expect(body.session.cashDifference).toBe(0);
		expect(body.expectedCash).toBe(13_000);

		const replay = await request.post(`${api}/api/cash/sessions/${sessionId}/close`, {
			headers: { ...bearer(admin), 'Idempotency-Key': closeKey },
			data: { countedCashAmount: 13000, idempotencyKey: closeKey }
		});
		expect(replay.ok(), await replay.text()).toBeTruthy();
		const again = await replay.json();
		expect(again.session.id).toBe(body.session.id);
		expect(again.session.expectedCashAmount).toBe(13_000);
	});
});
