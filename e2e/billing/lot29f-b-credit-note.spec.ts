/**
 * LOT29F-B — Immutable credit note (avoir) foundation.
 * Not a refund. Not a PaymentReversal.
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
	const nom = `QA29FB-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e5)}`;
	const response = await request.post(`${api}/api/patients`, {
		headers: bearer(token),
		data: {
			nom,
			prenoms: 'Avoir',
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

async function seedEligibleInvoice(request: APIRequestContext, token: string, unitPrice = 18_000) {
	const patient = await createPatient(request, token, 'INV');
	const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
	const catalog = await request.post(`${api}/api/act-catalog`, {
		headers: bearer(token),
		data: {
			code: `QA29FB-${stamp}`.slice(0, 20),
			label: `Acte avoir ${stamp}`,
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
			code: `T29FB-${stamp}`.slice(0, 20),
			label: `Tarif 29FB ${stamp}`,
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

test.describe('LOT29F-B credit note', () => {
	test('QA-29F-B-001 @critical issue credit note and open printable avoir', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(180_000);
		const admin = await loginApi(request, adminEmail);
		const { invoice } = await seedEligibleInvoice(request, admin, 18_000);

		await login(adminEmail, password);
		await page.goto(`/billing/${invoice.id}`);
		await expect(page.getByTestId('invoice-detail')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('invoice-number')).toContainText(invoice.number);
		await expect(page.getByTestId('invoice-credit-note')).toBeVisible();
		await page.getByTestId('invoice-credit-note').click();
		await expect(page.getByTestId('invoice-credit-note-modal')).toBeVisible();
		await expect(page.getByTestId('invoice-credit-note-modal-amount')).toContainText('18');
		await page.getByTestId('invoice-credit-note-reason-input').fill('Correction QA-29F-B-001');
		await page.getByTestId('invoice-credit-note-confirm').check();
		await page.getByTestId('invoice-credit-note-submit').click();

		await expect(page.getByTestId('invoice-credit-note-modal')).toBeHidden({ timeout: 20_000 });
		await expect(page.getByTestId('invoice-credit-note-panel')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('invoice-credit-note-number')).toBeVisible();
		await expect(page.getByTestId('invoice-pay-success')).toContainText(/Avoir émis/i);
		await expect(page.getByTestId('invoice-pay-success')).not.toContainText(/rembours/i);
		await expect(page.getByTestId('invoice-number')).toContainText(invoice.number);

		await page.getByTestId('invoice-credit-note-link').click();
		await expect(page).toHaveURL(/\/billing\/credit-notes\/\d+$/);
		await expect(page.getByTestId('credit-note-document')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('credit-note-doc-type')).toHaveText('AVOIR');
		await expect(page.getByTestId('credit-note-doc-invoice')).toContainText(invoice.number);
		await expect(page.getByTestId('credit-note-document')).not.toContainText(/remboursé/i);

		await page.goto(`/billing/${invoice.id}`);
		await expect(page.getByTestId('invoice-number')).toContainText(invoice.number);
		await expect(page.getByTestId('invoice-credit-note-panel')).toBeVisible();
	});

	test('QA-29F-B-002 @critical credit note replay same key exactly once', async ({ request }) => {
		test.setTimeout(120_000);
		const admin = await loginApi(request, adminEmail);
		const { invoice } = await seedEligibleInvoice(request, admin, 14_000);
		const key = `qa29fb-cn-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
		const payload = { reason: 'Replay QA-29F-B-002', idempotencyKey: key };
		const first = await request.post(`${api}/api/billing/invoices/${invoice.id}/credit-notes`, {
			headers: { ...bearer(admin), 'Idempotency-Key': key },
			data: payload
		});
		expect(first.ok(), await first.text()).toBeTruthy();
		const a = (JSON.parse(await first.text()).data ?? JSON.parse(await first.text())) as {
			creditNote?: { id: number; number: string; amount: number };
			creditedAmount: number;
			balanceAmount: number;
		};
		const second = await request.post(`${api}/api/billing/invoices/${invoice.id}/credit-notes`, {
			headers: { ...bearer(admin), 'Idempotency-Key': key },
			data: payload
		});
		expect(second.ok(), await second.text()).toBeTruthy();
		const b = (JSON.parse(await second.text()).data ?? JSON.parse(await second.text())) as {
			creditNote?: { id: number; number: string; amount: number };
			creditedAmount: number;
			balanceAmount: number;
		};
		expect(a.creditNote?.id).toBeTruthy();
		expect(a.creditNote?.id).toBe(b.creditNote?.id);
		expect(a.creditNote?.number).toBe(b.creditNote?.number);
		expect(a.creditedAmount).toBe(14_000);
		expect(b.creditedAmount).toBe(14_000);
		expect(a.balanceAmount).toBe(0);
		expect(b.balanceAmount).toBe(0);
	});
});
