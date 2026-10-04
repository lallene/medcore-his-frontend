/**
 * LOT29F-E′ — POST-CLOSE CASH PaymentReversal without CashMovement (PCR1 / CSI1).
 * Accounting correction only — not a refund / physical cash return.
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
	const code = `E29FE-${Date.now().toString(36)}`.slice(0, 20);
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
		const key = `qa29fe-preclose-${Date.now()}`;
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
			code: `E29FE-${stamp}`.slice(0, 20),
			label: `Acte eprime ${stamp}`,
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
			code: `T29FE-${stamp}`.slice(0, 20),
			label: `Tarif 29FE ${stamp}`,
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
			nom: `QA29FE-${tag}-${stamp}`,
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

test.describe('LOT29F-E′ post-close cash accounting reversal', () => {
	test('QA-29F-EPRIME-001 @critical post-close CASH reverse without movement', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(240_000);
		const admin = await loginApi(request, adminEmail);
		const reg = await ensureRegister(request, admin);
		await precloseCurrent(request, admin);

		const openKey = `qa29fe-open-${Date.now()}`;
		const opened = await request.post(`${api}/api/cash/sessions/open`, {
			headers: { ...bearer(admin), 'Idempotency-Key': openKey },
			data: { cashRegisterId: reg.id, openingFloat: 10000, idempotencyKey: openKey }
		});
		expect(opened.ok(), await opened.text()).toBeTruthy();
		const sessionId = (await opened.json()).session.id as number;

		const invId = await issueInvoice(request, admin, 'pcr', 15000);
		const payKey = `qa29fe-pay-${Date.now()}`;
		const paid = await request.post(`${api}/api/cash/sessions/${sessionId}/payments`, {
			headers: { ...bearer(admin), 'Idempotency-Key': payKey },
			data: {
				invoiceId: invId,
				amount: 15000,
				paymentMethod: 'CASH',
				idempotencyKey: payKey
			}
		});
		expect(paid.ok(), await paid.text()).toBeTruthy();
		const receipt = await paid.json();
		expect(receipt.paymentId).toBeTruthy();

		const closeKey = `qa29fe-close-${Date.now()}`;
		const closed = await request.post(`${api}/api/cash/sessions/${sessionId}/close`, {
			headers: { ...bearer(admin), 'Idempotency-Key': closeKey },
			data: { countedCashAmount: 25000, note: 'baseline eprime', idempotencyKey: closeKey }
		});
		expect(closed.ok(), await closed.text()).toBeTruthy();
		const baseline = await closed.json();
		expect(baseline.expectedCash).toBe(25_000);
		expect(baseline.session.countedCashAmount).toBe(25_000);
		expect(baseline.session.cashDifference).toBe(0);
		expect(baseline.cashMovementReversalOut ?? 0).toBe(0);

		await login(adminEmail);
		await page.goto(`/billing/${invId}`);
		await expect(page.getByTestId(`invoice-reverse-${receipt.paymentId}`)).toBeVisible({
			timeout: 30_000
		});
		await page.getByTestId(`invoice-reverse-${receipt.paymentId}`).click();
		await expect(page.getByTestId('invoice-reverse-modal')).toBeVisible();
		await expect(page.getByTestId('invoice-reverse-cash-session-warn')).toBeVisible();
		await expect(page.getByTestId('invoice-reverse-cash-session-warn')).toContainText(
			/clôtur|clotur/i
		);
		await expect(page.getByTestId('invoice-reverse-cash-session-warn')).toContainText(
			/pas de retour d’espèces|sortie physique|n’enregistre pas/i
		);
		await expect(page.getByTestId('invoice-reverse-cash-session-warn')).not.toContainText(
			/Remboursé|Argent retourné/i
		);
		await page.getByTestId('invoice-reverse-reason').fill('Correction posterieure apres cloture');
		await page.getByTestId('invoice-reverse-confirm').check();
		await page.getByTestId('invoice-reverse-submit').click();
		await expect(page.getByTestId(`invoice-reversed-${receipt.paymentId}`)).toBeVisible({
			timeout: 20_000
		});
		await expect(page.getByTestId(`invoice-post-close-${receipt.paymentId}`)).toBeVisible();
		await expect(page.getByTestId(`invoice-post-close-${receipt.paymentId}`)).toContainText(
			'Correction postérieure à la clôture'
		);
		await expect(page.getByTestId(`invoice-receipt-${receipt.paymentId}`)).toBeVisible();

		const invAfter = await (
			await request.get(`${api}/api/billing/invoices/${invId}`, { headers: bearer(admin) })
		).json();
		const invBody = invAfter.data ?? invAfter;
		expect(invBody.paidAmount).toBe(0);
		expect(invBody.balanceAmount).toBe(15_000);
		const payRow = (
			invBody.payments as Array<{
				id: number;
				reversed?: boolean;
				amount: number;
				postCloseCorrection?: boolean;
			}>
		).find((p) => p.id === receipt.paymentId);
		expect(payRow?.reversed).toBeTruthy();
		expect(payRow?.amount).toBe(15_000);
		expect(payRow?.postCloseCorrection).toBeTruthy();

		const after = await (
			await request.get(`${api}/api/cash/sessions/${sessionId}`, { headers: bearer(admin) })
		).json();
		expect(after.expectedCash).toBe(25_000);
		expect(after.session.countedCashAmount).toBe(25_000);
		expect(after.session.cashDifference).toBe(0);
		expect(after.cashCollected).toBe(15_000);
		expect(after.cashMovementReversalOut ?? 0).toBe(0);

		const rcpt = await (
			await request.get(`${api}/api/cash/receipts/${receipt.id}`, { headers: bearer(admin) })
		).json();
		expect(rcpt.paymentReversed).toBeTruthy();
		expect(rcpt.postCloseCorrection).toBeTruthy();

		await page.goto(`/cash/receipts/${receipt.id}`);
		await expect(page.getByTestId('receipt-payment-reversed')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('receipt-payment-reversed')).toContainText(
			'Encaissement contrepassé'
		);
		await expect(page.getByTestId('receipt-payment-reversed')).not.toContainText(/Rembours/i);
		await expect(page.getByTestId('receipt-post-close-correction')).toContainText(
			'Correction postérieure à la clôture'
		);

		await page.goto(`/cash/sessions/${sessionId}`);
		await expect(page.getByTestId('cash-closing-report')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('cash-recon-expected')).toContainText('25');
		await expect(page.getByTestId('cash-recon-counted')).toContainText('25');
		await expect(page.getByTestId('cash-recon-difference')).toContainText('0');
		await expect(page.getByTestId('cash-recon-post-close')).toBeVisible();
		await expect(page.getByTestId('cash-recon-post-close')).toContainText(
			/Correction postérieure/i
		);
		await expect(page.getByTestId('cash-recon-reversal-out')).toContainText('0');
	});
});
