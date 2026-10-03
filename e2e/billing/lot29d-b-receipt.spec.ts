/**
 * LOT29D-B — Canonical receipt after billing payment.
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
	const nom = `QA29DB-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e5)}`;
	const response = await request.post(`${api}/api/patients`, {
		headers: bearer(token),
		data: {
			nom,
			prenoms: 'Receipt',
			sexe: 'M',
			dateNaissance: '1990-01-15',
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
	unitPrice = 18_000
) {
	const patient = await createPatient(request, token, 'INV');
	const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
	const catalog = await request.post(`${api}/api/act-catalog`, {
		headers: bearer(token),
		data: {
			code: `QA29DB-${stamp}`.slice(0, 20),
			label: `Acte reçu ${stamp}`,
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
			code: `T29DB-${stamp}`.slice(0, 20),
			label: `Tarif 29DB ${stamp}`,
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

test.describe('LOT29D-B billing receipt convergence', () => {
	test('QA-29D-B-001 @critical billing payment exposes canonical receipt', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(180_000);
		const admin = await loginApi(request, adminEmail);
		const { invoice } = await seedCollectibleInvoice(request, admin, 18_000);

		await login(adminEmail, password);
		await page.goto(`/billing/${invoice.id}`);
		await expect(page.getByTestId('invoice-collection')).toBeVisible({ timeout: 20_000 });
		await page.getByTestId('invoice-pay-amount').fill('18000');
		await page.getByTestId('invoice-pay-method').selectOption('CARD');
		await page.getByTestId('invoice-pay').click();
		await expect(page.getByTestId('invoice-pay-success')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('invoice-pay-receipt-link')).toBeVisible();

		const verify = await request.get(`${api}/api/billing/invoices/${invoice.id}`, {
			headers: bearer(admin)
		});
		expect(verify.ok()).toBeTruthy();
		const body = JSON.parse(await verify.text()) as {
			payments?: Array<{
				id: number;
				amount: number;
				paymentMethod: string;
				receiptId?: number;
				receiptNumber?: string;
			}>;
		};
		expect(body.payments?.length).toBe(1);
		const pay = body.payments![0];
		expect(pay.amount).toBe(18_000);
		expect(pay.paymentMethod).toBe('CARD');
		expect(pay.receiptId).toBeTruthy();
		expect(pay.receiptNumber).toMatch(/^REC-\d{6}$/);

		await page.getByTestId(`invoice-payment-receipt-${pay.id}`).click();
		await expect(page.getByText(pay.receiptNumber!)).toBeVisible({ timeout: 20_000 });
		await expect(page.getByText('CARD')).toBeVisible();
		await expect(page.getByText('Encaissement facturation')).toBeVisible();
	});

	test('QA-29D-B-002 @critical payment replay keeps same receipt identity', async ({ request }) => {
		test.setTimeout(120_000);
		const admin = await loginApi(request, adminEmail);
		const { invoice } = await seedCollectibleInvoice(request, admin, 9_000);
		const key = `qa29db-replay-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
		const payload = {
			amount: 9_000,
			paymentMethod: 'CASH',
			idempotencyKey: key
		};
		const first = await request.post(`${api}/api/billing/invoices/${invoice.id}/payments`, {
			headers: { ...bearer(admin), 'Idempotency-Key': key },
			data: payload
		});
		expect(first.ok(), await first.text()).toBeTruthy();
		const a = (JSON.parse(await first.text()).data ?? JSON.parse(await first.text())) as {
			payments?: Array<{ id: number; receiptId?: number; receiptNumber?: string }>;
		};
		const second = await request.post(`${api}/api/billing/invoices/${invoice.id}/payments`, {
			headers: { ...bearer(admin), 'Idempotency-Key': key },
			data: payload
		});
		expect(second.ok(), await second.text()).toBeTruthy();
		const b = (JSON.parse(await second.text()).data ?? JSON.parse(await second.text())) as {
			payments?: Array<{ id: number; receiptId?: number; receiptNumber?: string }>;
		};
		expect(a.payments?.length).toBe(1);
		expect(b.payments?.length).toBe(1);
		expect(a.payments![0].id).toBe(b.payments![0].id);
		expect(a.payments![0].receiptId).toBe(b.payments![0].receiptId);
		expect(a.payments![0].receiptNumber).toBe(b.payments![0].receiptNumber);
	});
});
