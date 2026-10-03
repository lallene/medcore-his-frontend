/**
 * LOT29C — Cashier collection workflow on billing workspace.
 * Deterministic API fixtures; no cash-session dependency.
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
	const nom = `QA29C-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e5)}`;
	const response = await request.post(`${api}/api/patients`, {
		headers: bearer(token),
		data: {
			nom,
			prenoms: 'Cashier',
			sexe: 'F',
			dateNaissance: '1992-03-10',
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
	unitPrice = 20_000
) {
	const patient = await createPatient(request, token, 'INV');
	const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
	const catalog = await request.post(`${api}/api/act-catalog`, {
		headers: bearer(token),
		data: {
			code: `QA29C-${stamp}`.slice(0, 20),
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
		headers: bearer(token),
		data: {
			actType: 'PERFORMED_ACT',
			referenceId: catalogBody.id,
			code: `T29C-${stamp}`.slice(0, 20),
			label: `Tarif 29C ${stamp}`,
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

test.describe('LOT29C cashier collection', () => {
	test('QA-29C-001 @critical partial then full payment via billing Encaisser', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(180_000);
		const admin = await loginApi(request, adminEmail);
		const { invoice } = await seedCollectibleInvoice(request, admin, 20_000);
		expect(invoice.balanceAmount).toBe(20_000);

		await login(adminEmail, password);
		await page.goto('/billing');
		await expect(page.getByTestId('billing-page')).toBeVisible({ timeout: 20_000 });
		await page.getByTestId('billing-invoice-status-filter').selectOption('collectible');
		await page.getByTestId('billing-invoice-search').fill(invoice.number);
		await page.getByTestId('billing-invoice-filter-apply').click();
		await expect(page.getByTestId(`billing-invoice-link-${invoice.id}`)).toBeVisible({
			timeout: 20_000
		});
		await page.getByTestId(`billing-invoice-encaisser-${invoice.id}`).click();
		await expect(page.getByTestId('invoice-detail')).toBeVisible();
		await expect(page.getByTestId('invoice-balance')).toContainText('20');
		await expect(page.getByTestId('invoice-collection')).toBeVisible();

		await page.getByTestId('invoice-pay-amount').fill('5000');
		await page.getByTestId('invoice-pay').click();
		await expect(page.getByTestId('invoice-pay-success')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('invoice-balance')).toContainText('15');
		await expect(page.getByTestId('invoice-collection')).toBeVisible();
		await expect(page.getByTestId('invoice-payments')).toBeVisible();

		await page.getByTestId('invoice-pay-amount').fill('15000');
		await page.getByTestId('invoice-pay').click();
		await expect(page.getByTestId('invoice-pay-success')).toContainText(/soldée|0/i, {
			timeout: 20_000
		});
		await expect(page.getByTestId('invoice-collection')).toHaveCount(0);
		await expect(page.getByTestId('invoice-status')).toContainText('PAID');
	});

	test('QA-29C-002 @critical double-click Encaisser does not create two payments', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(180_000);
		const admin = await loginApi(request, adminEmail);
		const { invoice } = await seedCollectibleInvoice(request, admin, 12_000);

		await login(adminEmail, password);
		await page.goto(`/billing/${invoice.id}`);
		await expect(page.getByTestId('invoice-collection')).toBeVisible({ timeout: 20_000 });
		await page.getByTestId('invoice-pay-amount').fill('12000');
		const btn = page.getByTestId('invoice-pay');
		await Promise.all([btn.click(), btn.click()]);
		await expect(page.getByTestId('invoice-pay-success')).toBeVisible({ timeout: 20_000 });
		const rows = page.locator('[data-testid^="invoice-payment-"]');
		await expect(rows).toHaveCount(1);
		const verify = await request.get(`${api}/api/billing/invoices/${invoice.id}`, {
			headers: bearer(admin)
		});
		expect(verify.ok()).toBeTruthy();
		const body = JSON.parse(await verify.text()) as {
			paidAmount: number;
			payments?: unknown[];
			status: string;
		};
		expect(body.paidAmount).toBe(12_000);
		expect(body.status).toBe('PAID');
		expect((body.payments ?? []).length).toBe(1);
	});
});
