/**
 * LOT29D-C — Full payment reversal (immutable payment + linked counter-entry).
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

async function createPatient(request: APIRequestContext, token: string, tag: string) {
	const nom = `QA29DC-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e5)}`;
	const response = await request.post(`${api}/api/patients`, {
		headers: bearer(token),
		data: {
			nom,
			prenoms: 'Reversal',
			sexe: 'F',
			dateNaissance: '1992-03-20',
			telephone: `+22507${String(Date.now()).slice(-8)}`,
			isAssure: false
		}
	});
	const text = await response.text();
	expect([200, 201].includes(response.status()), text).toBeTruthy();
	const data = JSON.parse(text).data ?? JSON.parse(text);
	const patient = data as { id: number; codePatient: string };
	const mr = await request.get(`${api}/api/patients/${patient.id}/medical-record`, {
		headers: bearer(token)
	});
	expect(mr.ok(), await mr.text()).toBeTruthy();
	return patient;
}

async function seedCollectibleInvoice(
	request: APIRequestContext,
	token: string,
	unitPrice = 22_000
) {
	const patient = await createPatient(request, token, 'INV');
	const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
	const catalog = await request.post(`${api}/api/act-catalog`, {
		headers: bearer(token),
		data: {
			code: `QA29DC-${stamp}`.slice(0, 20),
			label: `Acte contrepassation ${stamp}`,
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
			code: `T29DC-${stamp}`.slice(0, 20),
			label: `Tarif 29DC ${stamp}`,
			unitPrice,
			effectiveFrom: new Date().toISOString().slice(0, 10),
			effectiveTo: null,
			isActive: true
		}
	});
	expect([200, 201].includes(tariff.status()), await tariff.text()).toBeTruthy();
	const tariffBody = JSON.parse(await tariff.text()) as { id: number };
	const act = await request.post(`${api}/api/performed-acts`, {
		headers: bearer(token),
		data: { patientId: patient.id, actCatalogEntryId: catalogBody.id, quantity: 1 }
	});
	const actText = await act.text();
	expect([200, 201].includes(act.status()), actText).toBeTruthy();
	const actParsed = JSON.parse(actText);
	const actBody = (actParsed.data ?? actParsed) as { id: number };
	const invoice = await request.post(`${api}/api/billing/invoices`, {
		headers: bearer(token),
		data: {
			patientId: patient.id,
			lines: [{ actType: 'PERFORMED_ACT', referenceId: actBody.id, tariffId: tariffBody.id }]
		}
	});
	const invText = await invoice.text();
	expect([200, 201].includes(invoice.status()), invText).toBeTruthy();
	const draft = (JSON.parse(invText).data ?? JSON.parse(invText)) as { id: number; number: string };
	const issued = await request.post(`${api}/api/billing/invoices/${draft.id}/issue`, {
		headers: bearer(token)
	});
	const issuedText = await issued.text();
	expect(issued.ok(), issuedText).toBeTruthy();
	const body = (JSON.parse(issuedText).data ?? JSON.parse(issuedText)) as {
		id: number;
		number: string;
		balanceAmount: number;
		patientAmount: number;
		status: string;
	};
	return { patient, invoice: body };
}

test.describe('LOT29D-C payment reversal', () => {
	test('QA-29D-C-001 @critical sessionless payment reverse restores balance', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(180_000);
		const admin = await loginApi(request, adminEmail);
		const { invoice } = await seedCollectibleInvoice(request, admin, 22_000);

		await login(adminEmail, password);
		await page.goto(`/billing/${invoice.id}`);
		await expect(page.getByTestId('invoice-collection')).toBeVisible({ timeout: 20_000 });
		await page.getByTestId('invoice-pay-amount').fill('22000');
		await page.getByTestId('invoice-pay-method').selectOption('CARD');
		await page.getByTestId('invoice-pay').click();
		await expect(page.getByTestId('invoice-pay-success')).toBeVisible({ timeout: 20_000 });

		const paid = await request.get(`${api}/api/billing/invoices/${invoice.id}`, {
			headers: bearer(admin)
		});
		expect(paid.ok()).toBeTruthy();
		const paidBody = JSON.parse(await paid.text()) as {
			status: string;
			balanceAmount: number;
			paidAmount: number;
			payments?: Array<{
				id: number;
				amount: number;
				receiptId?: number;
				receiptNumber?: string;
				reversed?: boolean;
			}>;
		};
		expect(paidBody.payments?.length).toBe(1);
		const payment = paidBody.payments![0];
		expect(payment.receiptId).toBeTruthy();
		expect(paidBody.balanceAmount).toBe(0);

		await expect(page.getByTestId(`invoice-payment-${payment.id}`)).toBeVisible();
		await expect(page.getByTestId(`invoice-receipt-${payment.id}`)).toBeVisible();
		await page.getByTestId(`invoice-payment-reverse-${payment.id}`).click();
		await expect(page.getByTestId('invoice-reverse-modal')).toBeVisible();
		await expect(page.getByTestId('invoice-reverse-amount')).toContainText('22');
		await page.getByTestId('invoice-reverse-reason').fill('Erreur de saisie QA-29D-C-001');
		await page.getByTestId('invoice-reverse-confirm').check();
		await page.getByTestId('invoice-reverse-submit').click();

		await expect(page.getByTestId('invoice-reverse-modal')).toBeHidden({ timeout: 20_000 });
		await expect(page.getByTestId(`invoice-payment-reversed-${payment.id}`)).toBeVisible({
			timeout: 20_000
		});
		await expect(page.getByTestId(`invoice-payment-${payment.id}`)).toBeVisible();
		await expect(page.getByTestId(`invoice-receipt-${payment.id}`)).toBeVisible();

		const after = await request.get(`${api}/api/billing/invoices/${invoice.id}`, {
			headers: bearer(admin)
		});
		expect(after.ok()).toBeTruthy();
		const afterBody = JSON.parse(await after.text()) as {
			status: string;
			balanceAmount: number;
			paidAmount: number;
			payments?: Array<{
				id: number;
				reversed?: boolean;
				receiptId?: number;
				reversalId?: number;
			}>;
		};
		expect(afterBody.paidAmount).toBe(0);
		expect(afterBody.balanceAmount).toBe(22_000);
		expect(afterBody.status).toBe('ISSUED');
		expect(afterBody.payments?.[0].id).toBe(payment.id);
		expect(afterBody.payments?.[0].reversed).toBe(true);
		expect(afterBody.payments?.[0].receiptId).toBe(payment.receiptId);

		await page.getByTestId(`invoice-receipt-${payment.id}`).click();
		await expect(page).toHaveURL(new RegExp(`/cash/receipts/${payment.receiptId}$`));
		await expect(page.getByTestId('receipt-payment-reversed')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('receipt-payment-reversed')).toContainText(
			'Encaissement contrepassé'
		);
	});

	test('QA-29D-C-002 @critical reverse replay same key exactly once', async ({ request }) => {
		test.setTimeout(120_000);
		const admin = await loginApi(request, adminEmail);
		const { invoice } = await seedCollectibleInvoice(request, admin, 11_000);
		const payKey = `qa29dc-pay-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
		const pay = await request.post(`${api}/api/billing/invoices/${invoice.id}/payments`, {
			headers: { ...bearer(admin), 'Idempotency-Key': payKey },
			data: { amount: 11_000, paymentMethod: 'CASH', idempotencyKey: payKey }
		});
		expect(pay.ok(), await pay.text()).toBeTruthy();
		const paidBody = (JSON.parse(await pay.text()).data ?? JSON.parse(await pay.text())) as {
			payments?: Array<{ id: number; amount: number }>;
			paidAmount: number;
			balanceAmount: number;
		};
		const paymentId = paidBody.payments![0].id;
		const revKey = `qa29dc-rev-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
		const payload = { reason: 'Replay QA-29D-C-002', idempotencyKey: revKey };
		const first = await request.post(`${api}/api/billing/payments/${paymentId}/reverse`, {
			headers: { ...bearer(admin), 'Idempotency-Key': revKey },
			data: payload
		});
		expect(first.ok(), await first.text()).toBeTruthy();
		const a = (JSON.parse(await first.text()).data ?? JSON.parse(await first.text())) as {
			paidAmount: number;
			balanceAmount: number;
			status: string;
			payments?: Array<{ id: number; reversed?: boolean; reversalId?: number }>;
		};
		const second = await request.post(`${api}/api/billing/payments/${paymentId}/reverse`, {
			headers: { ...bearer(admin), 'Idempotency-Key': revKey },
			data: payload
		});
		expect(second.ok(), await second.text()).toBeTruthy();
		const b = (JSON.parse(await second.text()).data ?? JSON.parse(await second.text())) as {
			paidAmount: number;
			balanceAmount: number;
			status: string;
			payments?: Array<{ id: number; reversed?: boolean; reversalId?: number }>;
		};
		expect(a.paidAmount).toBe(0);
		expect(b.paidAmount).toBe(0);
		expect(a.balanceAmount).toBe(11_000);
		expect(b.balanceAmount).toBe(11_000);
		expect(a.payments?.[0].reversalId).toBeTruthy();
		expect(a.payments?.[0].reversalId).toBe(b.payments?.[0].reversalId);
		expect(a.payments?.[0].reversed).toBe(true);
		expect(b.payments?.[0].reversed).toBe(true);
	});
});
