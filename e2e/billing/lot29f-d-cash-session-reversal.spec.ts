/**
 * LOT29F-D — OPEN CASH-session PaymentReversal + system CashMovement OUT.
 * Not a refund. Sessionless reversal unchanged.
 * LOT29F-E′: CLOSED CASH accounting reversal is covered by QA-29F-EPRIME-001;
 * QA-29F-D-002 now asserts CLOSED non-CASH remains blocked.
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
	const code = `E29FD-${Date.now().toString(36)}`.slice(0, 20);
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
		const key = `qa29fd-preclose-${Date.now()}`;
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
			code: `E29FD-${stamp}`.slice(0, 20),
			label: `Acte reverse ${stamp}`,
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
			code: `T29FD-${stamp}`.slice(0, 20),
			label: `Tarif 29FD ${stamp}`,
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
			nom: `QA29FD-${tag}-${stamp}`,
			prenoms: 'Rev',
			sexe: 'M',
			dateNaissance: '1993-05-05',
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

test.describe('LOT29F-D open cash session reversal', () => {
	test('QA-29F-D-001 @critical open cash reverse adjusts expected once', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(240_000);
		const admin = await loginApi(request, adminEmail);
		const reg = await ensureRegister(request, admin);
		await precloseCurrent(request, admin);

		const openKey = `qa29fd-open-${Date.now()}`;
		const opened = await request.post(`${api}/api/cash/sessions/open`, {
			headers: { ...bearer(admin), 'Idempotency-Key': openKey },
			data: { cashRegisterId: reg.id, openingFloat: 10000, idempotencyKey: openKey }
		});
		expect(opened.ok(), await opened.text()).toBeTruthy();
		const session = await opened.json();
		const sessionId = session.session.id as number;

		const invId = await issueInvoice(request, admin, 'cash', 20000);
		const payKey = `qa29fd-pay-${Date.now()}`;
		const paid = await request.post(`${api}/api/cash/sessions/${sessionId}/payments`, {
			headers: { ...bearer(admin), 'Idempotency-Key': payKey },
			data: {
				invoiceId: invId,
				amount: 20000,
				paymentMethod: 'CASH',
				idempotencyKey: payKey,
				payer: { mode: 'PATIENT' }
			}
		});
		expect(paid.ok(), await paid.text()).toBeTruthy();
		const receipt = await paid.json();
		expect(receipt.paymentId).toBeTruthy();

		const liveBefore = await (
			await request.get(`${api}/api/cash/sessions/${sessionId}`, { headers: bearer(admin) })
		).json();
		expect(liveBefore.cashCollected).toBe(20_000);
		expect(liveBefore.expectedCash).toBe(30_000);

		await login(adminEmail);
		await page.goto(`/billing/${invId}`);
		await expect(page.getByTestId(`invoice-reverse-${receipt.paymentId}`)).toBeVisible({
			timeout: 30_000
		});
		await page.getByTestId(`invoice-reverse-${receipt.paymentId}`).click();
		await expect(page.getByTestId('invoice-reverse-modal')).toBeVisible();
		await expect(page.getByTestId('invoice-reverse-cash-session-warn')).toBeVisible();
		await expect(page.getByTestId('invoice-reverse-cash-session-warn')).not.toContainText(
			/Rembours/i
		);
		await page.getByTestId('invoice-reverse-reason').fill('Erreur de saisie session ouverte');
		await page.getByTestId('invoice-reverse-confirm').check();
		await page.getByTestId('invoice-reverse-submit').click();
		await expect(page.getByTestId(`invoice-reversed-${receipt.paymentId}`)).toBeVisible({
			timeout: 20_000
		});
		await expect(page.getByTestId(`invoice-receipt-${receipt.paymentId}`)).toBeVisible();

		const invAfter = await (
			await request.get(`${api}/api/billing/invoices/${invId}`, { headers: bearer(admin) })
		).json();
		const invBody = invAfter.data ?? invAfter;
		expect(invBody.paidAmount).toBe(0);
		expect(invBody.balanceAmount).toBe(20_000);
		const payRow = (
			invBody.payments as Array<{ id: number; reversed?: boolean; amount: number }>
		).find((p) => p.id === receipt.paymentId);
		expect(payRow?.reversed).toBeTruthy();
		expect(payRow?.amount).toBe(20_000);

		const liveAfter = await (
			await request.get(`${api}/api/cash/sessions/${sessionId}`, { headers: bearer(admin) })
		).json();
		expect(liveAfter.cashCollected).toBe(20_000);
		expect(liveAfter.cashMovementReversalOut).toBe(20_000);
		expect(liveAfter.expectedCash).toBe(10_000);

		await page.goto('/cash');
		await expect(page.getByTestId('cash-kpi-expected')).toContainText('10', { timeout: 20_000 });
		await page.getByTestId('cash-close-counted').fill('10000');
		await page.getByTestId('cash-close-submit').click();
		await expect(page.getByTestId('cash-close-result')).toBeVisible({ timeout: 30_000 });
		await expect(page.getByTestId('cash-close-expected')).toContainText('10');
		await page.getByTestId('cash-close-recon-link').click();
		await expect(page.getByTestId('cash-closing-report')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('cash-recon-expected')).toContainText('10');
		await expect(page.getByTestId('cash-recon-reversal-out')).toContainText('20');
		await expect(page.getByTestId('cash-recon-cash')).toContainText('20');
	});

	test('QA-29F-D-002 @critical closed non-CASH session reversal rejected', async ({ request }) => {
		test.setTimeout(180_000);
		const admin = await loginApi(request, adminEmail);
		const reg = await ensureRegister(request, admin);
		await precloseCurrent(request, admin);
		const openKey = `qa29fd2-open-${Date.now()}`;
		const opened = await request.post(`${api}/api/cash/sessions/open`, {
			headers: { ...bearer(admin), 'Idempotency-Key': openKey },
			data: { cashRegisterId: reg.id, openingFloat: 5000, idempotencyKey: openKey }
		});
		expect(opened.ok()).toBeTruthy();
		const sessionId = (await opened.json()).session.id as number;
		const invId = await issueInvoice(request, admin, 'closed', 3000);
		const payKey = `qa29fd2-pay-${Date.now()}`;
		const paid = await request.post(`${api}/api/cash/sessions/${sessionId}/payments`, {
			headers: { ...bearer(admin), 'Idempotency-Key': payKey },
			data: {
				invoiceId: invId,
				amount: 3000,
				paymentMethod: 'CARD',
				idempotencyKey: payKey,
				payer: { mode: 'PATIENT' }
			}
		});
		expect(paid.ok()).toBeTruthy();
		const paymentId = (await paid.json()).paymentId as number;
		const closeKey = `qa29fd2-close-${Date.now()}`;
		expect(
			(
				await request.post(`${api}/api/cash/sessions/${sessionId}/close`, {
					headers: { ...bearer(admin), 'Idempotency-Key': closeKey },
					data: { countedCashAmount: 5000, idempotencyKey: closeKey }
				})
			).ok()
		).toBeTruthy();
		const revKey = `qa29fd2-rev-${Date.now()}`;
		const rev = await request.post(`${api}/api/billing/payments/${paymentId}/reverse`, {
			headers: { ...bearer(admin), 'Idempotency-Key': revKey },
			data: { reason: 'Apres cloture carte', idempotencyKey: revKey }
		});
		expect(rev.status()).toBe(409);
		const body = await rev.text();
		expect(body).toMatch(/PAYMENT_REVERSAL_SESSION_METHOD_UNSUPPORTED|espèces|especes/i);
	});
});
