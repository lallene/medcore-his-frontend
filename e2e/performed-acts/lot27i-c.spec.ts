/**
 * LOT27I-C — PerformedAct → billing / tariff / invoice frontend.
 * Seeded via API. No fake invoice-success intercepts.
 */
import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { test } from '../fixtures/medcore';

const api = process.env.QA_API_URL ?? 'http://127.0.0.1:18082';
const password = process.env.QA_ADMIN_PASSWORD ?? 'admin123';
const adminEmail = process.env.QA_ADMIN_EMAIL ?? 'admin@medcore.local';
const doctorEmail = 'demo.generaliste@medcore.local';
const nurseEmail = 'demo.infirmier@medcore.local';

async function loginApi(request: APIRequestContext, email: string) {
	const response = await request.post(`${api}/api/auth/login`, {
		data: { email, password }
	});
	expect(response.ok(), await response.text()).toBeTruthy();
	const body = await response.json();
	return (body.data?.token ?? body.token) as string;
}

async function canLogin(request: APIRequestContext, email: string): Promise<boolean> {
	const response = await request.post(`${api}/api/auth/login`, {
		data: { email, password }
	});
	return response.ok();
}

function bearer(token: string) {
	return { Authorization: `Bearer ${token}` };
}

async function createPatient(request: APIRequestContext, token: string, tag: string) {
	const nom = `QA27IC-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e5)}`;
	const response = await request.post(`${api}/api/patients`, {
		headers: bearer(token),
		data: {
			nom,
			prenoms: 'Fixture',
			sexe: 'M',
			dateNaissance: '1990-01-15',
			telephone: `+22507${String(Date.now()).slice(-8)}`,
			isAssure: true
		}
	});
	const text = await response.text();
	expect([200, 201].includes(response.status()), text).toBeTruthy();
	const data = JSON.parse(text).data ?? JSON.parse(text);
	const patient = data as { id: number; codePatient: string };
	await ensureMedicalRecord(request, token, patient.id);
	return patient;
}

async function ensureMedicalRecord(request: APIRequestContext, token: string, patientId: number) {
	const response = await request.get(`${api}/api/patients/${patientId}/medical-record`, {
		headers: bearer(token)
	});
	expect(response.ok(), await response.text()).toBeTruthy();
}

async function ensureCatalogEntry(
	request: APIRequestContext,
	token: string,
	opts: { billable?: boolean; insuranceEligible?: boolean; basePrice?: number } = {}
) {
	const code = `QA27IC-${Date.now().toString(36).toUpperCase()}`;
	const basePrice = opts.basePrice ?? 999999;
	const create = await request.post(`${api}/api/act-catalog`, {
		headers: bearer(token),
		data: {
			code,
			label: `Acte QA ${code}`,
			category: 'PROCEDURE',
			basePrice,
			currency: 'XOF',
			billable: opts.billable ?? true,
			insuranceEligible: opts.insuranceEligible ?? true,
			isActive: true
		}
	});
	const text = await create.text();
	expect([200, 201].includes(create.status()), text).toBeTruthy();
	const created = JSON.parse(text) as {
		id: number;
		code: string;
		label: string;
		basePrice: number;
		billable: boolean;
		insuranceEligible: boolean;
	};
	const wantBillable = opts.billable ?? true;
	if (created.billable === wantBillable) return created;
	const update = await request.put(`${api}/api/act-catalog/${created.id}`, {
		headers: bearer(token),
		data: {
			code: created.code,
			label: created.label,
			category: 'PROCEDURE',
			basePrice: created.basePrice,
			currency: 'XOF',
			billable: wantBillable,
			insuranceEligible: opts.insuranceEligible ?? true,
			isActive: true
		}
	});
	const updateText = await update.text();
	expect(update.ok(), updateText).toBeTruthy();
	return JSON.parse(updateText) as typeof created;
}

async function createPerformedAct(
	request: APIRequestContext,
	token: string,
	patientId: number,
	catalogId: number,
	quantity = 1
) {
	const create = await request.post(`${api}/api/performed-acts`, {
		headers: bearer(token),
		data: { patientId, actCatalogEntryId: catalogId, quantity }
	});
	const text = await create.text();
	expect([200, 201].includes(create.status()), text).toBeTruthy();
	const body = JSON.parse(text);
	return (body.data ?? body) as {
		id: number;
		status: string;
		billable: boolean;
		basePrice: number;
		quantity: number;
		actLabel: string;
		actCode: string;
	};
}

async function voidPerformedActApi(
	request: APIRequestContext,
	token: string,
	actId: number,
	reason: string
) {
	const response = await request.post(`${api}/api/performed-acts/${actId}/void`, {
		headers: bearer(token),
		data: { reason }
	});
	expect(response.ok(), await response.text()).toBeTruthy();
}

async function createPerformedActTariff(
	request: APIRequestContext,
	token: string,
	opts: { unitPrice: number; referenceId?: number | null; codeSuffix?: string } = {
		unitPrice: 8500
	}
) {
	const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
	const response = await request.post(`${api}/api/billing/tariffs`, {
		headers: bearer(token),
		data: {
			actType: 'PERFORMED_ACT',
			referenceId: opts.referenceId ?? null,
			code: `TPA-${opts.codeSuffix ?? stamp}`.slice(0, 20),
			label: `Tarif PA ${stamp}`,
			unitPrice: opts.unitPrice,
			effectiveFrom: new Date().toISOString().slice(0, 10),
			effectiveTo: null,
			isActive: true
		}
	});
	const text = await response.text();
	expect([200, 201].includes(response.status()), text).toBeTruthy();
	return JSON.parse(text) as { id: number; unitPrice: number; actType: string };
}

async function createInvoiceApi(
	request: APIRequestContext,
	token: string,
	patientId: number,
	actId: number,
	tariffId: number
) {
	const response = await request.post(`${api}/api/billing/invoices`, {
		headers: bearer(token),
		data: {
			patientId,
			lines: [{ actType: 'PERFORMED_ACT', referenceId: actId, tariffId }]
		}
	});
	const text = await response.text();
	expect([200, 201].includes(response.status()), text).toBeTruthy();
	return JSON.parse(text) as {
		id: number;
		number: string;
		status: string;
		grossAmount: number;
		insuranceAmount: number;
		patientAmount: number;
		lines: Array<{
			id: number;
			unitPrice: number;
			grossAmount: number;
			insuranceAmount: number;
			patientAmount: number;
			actType: string;
		}>;
	};
}

async function openPerformedActsTab(page: Page, patientId: number, codePatient: string) {
	await page.goto(`/patients/${patientId}`);
	await expect(page.getByText(codePatient).first()).toBeVisible({ timeout: 20_000 });
	await expect(page.getByTestId('patient-360-tab-performed-acts')).toBeVisible({
		timeout: 20_000
	});
	await page.getByTestId('patient-360-tab-performed-acts').click({ force: true });
	await expect(page.getByTestId('patient-performed-acts')).toBeVisible();
}

test.describe('LOT27I-C PerformedAct → billing', () => {
	test('QA-27IC-001 @critical eligible billable PERFORMED act shows billing CTA', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(120_000);
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, 'CTA');
		await ensureMedicalRecord(request, admin, patient.id);
		const catalog = await ensureCatalogEntry(request, admin, { billable: true });
		await createPerformedActTariff(request, admin, {
			unitPrice: 8500,
			referenceId: catalog.id
		});
		const act = await createPerformedAct(request, admin, patient.id, catalog.id);

		const actor = adminEmail;
		await login(actor, password);
		await openPerformedActsTab(page, patient.id, patient.codePatient);
		await page.getByTestId(`performed-act-open-${act.id}`).click();
		await expect(page.getByTestId('performed-act-billing-cta')).toBeVisible();
	});

	test('QA-27IC-002 @critical VOIDED act has no billing CTA', async ({ page, login, request }) => {
		test.setTimeout(120_000);
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, 'VOID');
		await ensureMedicalRecord(request, admin, patient.id);
		const catalog = await ensureCatalogEntry(request, admin);
		await createPerformedActTariff(request, admin, { unitPrice: 7000, referenceId: catalog.id });
		const act = await createPerformedAct(request, admin, patient.id, catalog.id);
		await voidPerformedActApi(request, admin, act.id, 'Annulation QA-27IC-002');

		await login(adminEmail, password);
		await openPerformedActsTab(page, patient.id, patient.codePatient);
		await page.getByTestId(`performed-act-open-${act.id}`).click();
		await expect(page.getByTestId('performed-act-billing-cta')).toHaveCount(0);
	});

	test('QA-27IC-003 @critical billable=false act has no billing CTA', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(120_000);
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, 'NBILL');
		await ensureMedicalRecord(request, admin, patient.id);
		const catalog = await ensureCatalogEntry(request, admin, { billable: false });
		const act = await createPerformedAct(request, admin, patient.id, catalog.id);
		expect(act.billable).toBe(false);

		await login(adminEmail, password);
		await openPerformedActsTab(page, patient.id, patient.codePatient);
		await page.getByTestId(`performed-act-open-${act.id}`).click();
		await expect(page.getByTestId('performed-act-billing-cta')).toHaveCount(0);
	});

	test('QA-27IC-004 @critical unauthorized user has no billing CTA', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(120_000);
		// Prefer a billing-less clinical demo user. When demos are unavailable in this
		// environment, exercise the same FE gate via a limited permission actor if any
		// known seeded user can authenticate; otherwise annotate (mirrors QA-27IB-016).
		const candidates = [nurseEmail, doctorEmail, 'doc-rbac@test.local'];
		let actor: string | null = null;
		for (const email of candidates) {
			if (await canLogin(request, email)) {
				actor = email;
				break;
			}
		}
		if (!actor) {
			test.info().annotations.push({
				type: 'note',
				description:
					'No clinical/demo actor without billing.create available — CTA RBAC covered by unit tests (canCreatePerformedActBilling)'
			});
			return;
		}
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, 'UNAUTH');
		await ensureMedicalRecord(request, admin, patient.id);
		const catalog = await ensureCatalogEntry(request, admin);
		await createPerformedActTariff(request, admin, { unitPrice: 6000, referenceId: catalog.id });
		const act = await createPerformedAct(request, admin, patient.id, catalog.id);

		await login(actor, password);
		await openPerformedActsTab(page, patient.id, patient.codePatient);
		await page.getByTestId(`performed-act-open-${act.id}`).click();
		await expect(page.getByTestId('performed-act-billing-cta')).toHaveCount(0);
	});

	test('QA-27IC-005 @critical billing navigation carries correct patient context', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(120_000);
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, 'DEEP');
		await ensureMedicalRecord(request, admin, patient.id);
		const catalog = await ensureCatalogEntry(request, admin);
		await createPerformedActTariff(request, admin, { unitPrice: 8500, referenceId: catalog.id });
		const act = await createPerformedAct(request, admin, patient.id, catalog.id);

		await login(adminEmail, password);
		await openPerformedActsTab(page, patient.id, patient.codePatient);
		await page.getByTestId(`performed-act-open-${act.id}`).click();
		await page.getByTestId('performed-act-billing-cta').click();
		await expect(page).toHaveURL(
			new RegExp(`/billing\\?patientId=${patient.id}.*actType=PERFORMED_ACT.*referenceId=${act.id}`)
		);
		await expect(page.getByTestId('billing-create')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('billing-patient-select')).toHaveValue(String(patient.id));
	});

	test('QA-27IC-006 @critical PERFORMED_ACT appears in BillableActs with friendly label', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(120_000);
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, 'LABEL');
		await ensureMedicalRecord(request, admin, patient.id);
		const catalog = await ensureCatalogEntry(request, admin);
		await createPerformedActTariff(request, admin, { unitPrice: 8500, referenceId: catalog.id });
		const act = await createPerformedAct(request, admin, patient.id, catalog.id);

		await login(adminEmail, password);
		await page.goto(`/billing?patientId=${patient.id}&actType=PERFORMED_ACT&referenceId=${act.id}`);
		await expect(page.getByTestId('billing-create')).toBeVisible({ timeout: 20_000 });
		const row = page.getByTestId(`billing-act-PERFORMED_ACT:${act.id}`);
		await expect(row).toBeVisible();
		await expect(row).toContainText('Acte réalisé');
		await expect(row).not.toContainText('999');
	});

	test('QA-27IC-007 @critical missing tariff blocks invoice; BasePrice is not fallback', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(120_000);
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, 'NOTAR');
		await ensureMedicalRecord(request, admin, patient.id);
		// Unique catalog without any PERFORMED_ACT tariff (generic or specific).
		const catalog = await ensureCatalogEntry(request, admin, { basePrice: 777777 });
		const act = await createPerformedAct(request, admin, patient.id, catalog.id);
		expect(act.basePrice).toBe(777777);

		await login(adminEmail, password);
		await page.goto(`/billing?patientId=${patient.id}`);
		await expect(page.getByTestId('billing-create')).toBeVisible({ timeout: 20_000 });
		const row = page.getByTestId(`billing-act-PERFORMED_ACT:${act.id}`);
		await expect(row).toBeVisible();
		await expect(page.getByTestId('billing-missing-tariff')).toBeVisible();
		await expect(row).toContainText('Tarif manquant');
		await expect(page.getByTestId(`billing-act-check-PERFORMED_ACT:${act.id}`)).toBeDisabled();
		await expect(page.getByTestId('billing-create-draft')).toBeDisabled();
		await expect(row).not.toContainText('777 777');
		await expect(row).not.toContainText('777777');
	});

	test('QA-27IC-008/009 @critical configured tariff enables draft using Tariff.UnitPrice', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(180_000);
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, 'DRAFT');
		await ensureMedicalRecord(request, admin, patient.id);
		const catalog = await ensureCatalogEntry(request, admin, { basePrice: 999999 });
		const tariff = await createPerformedActTariff(request, admin, {
			unitPrice: 8500,
			referenceId: catalog.id
		});
		const act = await createPerformedAct(request, admin, patient.id, catalog.id, 2);

		await login(adminEmail, password);
		await page.goto(`/billing?patientId=${patient.id}&actType=PERFORMED_ACT&referenceId=${act.id}`);
		await expect(page.getByTestId('billing-create')).toBeVisible({ timeout: 20_000 });
		const row = page.getByTestId(`billing-act-PERFORMED_ACT:${act.id}`);
		await expect(row).toContainText('8 500');
		await expect(row).not.toContainText('999 999');
		await expect(page.getByTestId(`billing-act-check-PERFORMED_ACT:${act.id}`)).toBeChecked();
		await page.getByTestId('billing-create-draft').click();
		await expect(page.getByTestId('invoice-detail')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('invoice-status')).toContainText('DRAFT');
		const line = page.locator('[data-testid^="invoice-line-unit-"]').first();
		await expect(line).toContainText('8 500');
		const gross = page.locator('[data-testid^="invoice-line-gross-"]').first();
		await expect(gross).toContainText('17 000');
		void tariff;
	});

	test('QA-27IC-010/011 @critical allocation display + issue flow', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(180_000);
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, 'ISSUE');
		await ensureMedicalRecord(request, admin, patient.id);
		const catalog = await ensureCatalogEntry(request, admin);
		const tariff = await createPerformedActTariff(request, admin, {
			unitPrice: 10000,
			referenceId: catalog.id
		});
		const act = await createPerformedAct(request, admin, patient.id, catalog.id);
		const invoice = await createInvoiceApi(request, admin, patient.id, act.id, tariff.id);
		expect(invoice.grossAmount).toBe(10000);
		expect(invoice.patientAmount + invoice.insuranceAmount).toBe(invoice.grossAmount);

		await login(adminEmail, password);
		await page.goto(`/billing/${invoice.id}`);
		await expect(page.getByTestId('invoice-detail')).toBeVisible({ timeout: 20_000 });
		await expect(page.locator('[data-testid^="invoice-line-insurance-"]').first()).toBeVisible();
		await expect(page.locator('[data-testid^="invoice-line-patient-"]').first()).toBeVisible();
		await page.getByTestId('invoice-issue').click();
		await expect(page.getByTestId('invoice-status')).toContainText('ISSUED', { timeout: 20_000 });
	});

	test('QA-27IC-012/013 @critical active invoice blocks Void; does not auto-cancel', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(180_000);
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, 'VBLK');
		await ensureMedicalRecord(request, admin, patient.id);
		const catalog = await ensureCatalogEntry(request, admin);
		const tariff = await createPerformedActTariff(request, admin, {
			unitPrice: 9000,
			referenceId: catalog.id
		});
		const act = await createPerformedAct(request, admin, patient.id, catalog.id);
		const invoice = await createInvoiceApi(request, admin, patient.id, act.id, tariff.id);

		await login(adminEmail, password);
		await openPerformedActsTab(page, patient.id, patient.codePatient);
		await page.getByTestId(`performed-act-open-${act.id}`).click();
		await page.getByTestId('performed-act-void').click();
		await page.getByTestId('performed-act-void-reason').fill('Tentative void avec facture');
		await page.getByTestId('performed-act-void-confirm').click();
		await expect(page.getByTestId('performed-act-void-error')).toContainText('facturation active', {
			timeout: 20_000
		});
		await expect(page.getByTestId('performed-act-void-billing-hint')).toBeVisible();
		await expect(page.getByTestId('performed-act-void-billing-link')).toBeVisible();

		const still = await request.get(`${api}/api/billing/invoices/${invoice.id}`, {
			headers: bearer(admin)
		});
		const stillBody = JSON.parse(await still.text());
		expect(stillBody.status).toBe('DRAFT');
		expect(stillBody.status).not.toBe('CANCELLED');
	});

	test('QA-27IC-014 @critical after explicit invoice cancel, Void retry succeeds', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(180_000);
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, 'VOK');
		await ensureMedicalRecord(request, admin, patient.id);
		const catalog = await ensureCatalogEntry(request, admin);
		const tariff = await createPerformedActTariff(request, admin, {
			unitPrice: 7500,
			referenceId: catalog.id
		});
		const act = await createPerformedAct(request, admin, patient.id, catalog.id);
		const invoice = await createInvoiceApi(request, admin, patient.id, act.id, tariff.id);

		const cancel = await request.post(`${api}/api/billing/invoices/${invoice.id}/cancel`, {
			headers: bearer(admin),
			data: { reason: 'Annulation explicite QA-27IC-014' }
		});
		expect(cancel.ok(), await cancel.text()).toBeTruthy();

		await login(adminEmail, password);
		await openPerformedActsTab(page, patient.id, patient.codePatient);
		await page.getByTestId(`performed-act-open-${act.id}`).click();
		await page.getByTestId('performed-act-void').click();
		await page.getByTestId('performed-act-void-reason').fill('Void après annulation facture');
		await page.getByTestId('performed-act-void-confirm').click();
		await expect(page.getByTestId('performed-act-void-meta')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('performed-act-void')).toHaveCount(0);
	});

	test('QA-27IC-015 @critical paid invoice blocks Void; no fake refund/cancel', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(180_000);
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, 'PAID');
		await ensureMedicalRecord(request, admin, patient.id);
		const catalog = await ensureCatalogEntry(request, admin);
		const tariff = await createPerformedActTariff(request, admin, {
			unitPrice: 5000,
			referenceId: catalog.id
		});
		const act = await createPerformedAct(request, admin, patient.id, catalog.id);
		const invoice = await createInvoiceApi(request, admin, patient.id, act.id, tariff.id);
		const issued = await request.post(`${api}/api/billing/invoices/${invoice.id}/issue`, {
			headers: bearer(admin)
		});
		expect(issued.ok(), await issued.text()).toBeTruthy();
		const issuedBody = JSON.parse(await issued.text()) as {
			id: number;
			balanceAmount: number;
			patientAmount: number;
		};
		const pay = await request.post(`${api}/api/billing/invoices/${invoice.id}/payments`, {
			headers: bearer(admin),
			data: {
				amount: issuedBody.balanceAmount || issuedBody.patientAmount || 5000,
				paymentMethod: 'CASH',
				idempotencyKey: `qa27ic-paid-${invoice.id}-${Date.now()}`
			}
		});
		expect(pay.ok(), await pay.text()).toBeTruthy();

		await login(adminEmail, password);
		await openPerformedActsTab(page, patient.id, patient.codePatient);
		await page.getByTestId(`performed-act-open-${act.id}`).click();
		await page.getByTestId('performed-act-void').click();
		await page.getByTestId('performed-act-void-reason').fill('Void sur facture payée');
		await page.getByTestId('performed-act-void-confirm').click();
		await expect(page.getByTestId('performed-act-void-error')).toBeVisible({ timeout: 20_000 });
		const err = await page.getByTestId('performed-act-void-error').innerText();
		expect(/encaiss|avoir|remboursement|facturation active/i.test(err)).toBeTruthy();
		await expect(page.getByTestId('performed-act-void-billing-hint')).toContainText(
			/avoir|remboursement|encaiss/i
		);
		await expect(page.getByRole('button', { name: /rembourser|avoir/i })).toHaveCount(0);
	});

	test('QA-27IC-016 @critical Patient360 billing renders PERFORMED_ACT invoice', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(180_000);
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, 'P360');
		await ensureMedicalRecord(request, admin, patient.id);
		const catalog = await ensureCatalogEntry(request, admin);
		const tariff = await createPerformedActTariff(request, admin, {
			unitPrice: 6500,
			referenceId: catalog.id
		});
		const act = await createPerformedAct(request, admin, patient.id, catalog.id);
		const invoice = await createInvoiceApi(request, admin, patient.id, act.id, tariff.id);

		await login(adminEmail, password);
		await page.goto(`/patients/${patient.id}`);
		await expect(page.getByText(patient.codePatient).first()).toBeVisible({ timeout: 20_000 });
		await page.getByTestId('patient-360-tab-billing').click({ force: true });
		await expect(page.getByText(invoice.number)).toBeVisible({ timeout: 20_000 });
	});

	test('QA-27IC-017 @critical LOT27I-B PEC regression — coverage stays unselected', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(180_000);
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, 'PEC');
		await ensureMedicalRecord(request, admin, patient.id);
		const catalog = await ensureCatalogEntry(request, admin, { insuranceEligible: true });
		const act = await createPerformedAct(request, admin, patient.id, catalog.id);

		const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
		const companyRes = await request.post(`${api}/api/insurance/companies`, {
			headers: bearer(admin),
			data: { code: `C${stamp}`.slice(0, 20), name: `Assureur ${stamp}` }
		});
		expect([200, 201].includes(companyRes.status()), await companyRes.text()).toBeTruthy();
		const company = (JSON.parse(await companyRes.text()).data ??
			JSON.parse(await companyRes.text())) as { id: number };
		const guarantorRes = await request.post(`${api}/api/insurance/guarantors`, {
			headers: bearer(admin),
			data: {
				companyId: company.id,
				code: `G${stamp}`.slice(0, 20),
				name: `Garant ${stamp}`,
				defaultCoverageRate: 80,
				paymentDelayDays: 30
			}
		});
		expect([200, 201].includes(guarantorRes.status()), await guarantorRes.text()).toBeTruthy();
		const guarantor = (JSON.parse(await guarantorRes.text()).data ??
			JSON.parse(await guarantorRes.text())) as { id: number };
		const coverageRes = await request.post(`${api}/api/insurance/coverages`, {
			headers: bearer(admin),
			data: {
				patientId: patient.id,
				companyId: company.id,
				guarantorId: guarantor.id,
				memberNumber: `MBR-${stamp}`,
				subscriber: 'Sub',
				beneficiary: 'Ben',
				coverageRate: 80,
				isPrincipal: true
			}
		});
		expect([200, 201].includes(coverageRes.status()), await coverageRes.text()).toBeTruthy();

		await login(adminEmail, password);
		await openPerformedActsTab(page, patient.id, patient.codePatient);
		await page.getByTestId(`performed-act-open-${act.id}`).click();
		await expect(page.getByTestId('performed-act-pec-cta')).toBeVisible();
		await page.getByTestId('performed-act-pec-cta').click();
		await expect(page).toHaveURL(/referenceType=PERFORMED_ACT/);
		await expect(page).not.toHaveURL(/patientCoverageId=/);
		await expect(page.getByTestId('auth-create-form')).toBeVisible({ timeout: 20_000 });
		const coverageSelect = page.getByTestId('auth-coverage-select');
		await expect(coverageSelect).toBeVisible({ timeout: 20_000 });
		await expect(coverageSelect).toHaveValue('0');
		await expect(page.getByTestId('auth-coverage-unselected')).toBeVisible();
	});

	test('QA-27IC-018 @critical legacy billing types remain available in tariff UI', async ({
		page,
		login
	}) => {
		await login(adminEmail, password);
		await page.goto('/billing');
		await expect(page.getByTestId('billing-page')).toBeVisible({ timeout: 20_000 });
		await page.getByTestId('billing-tariffs-tab').click();
		await expect(page.getByTestId('billing-tariff-act-type')).toBeVisible();
		const options = page.getByTestId('billing-tariff-act-type').locator('option');
		await expect(options).toContainText(['Consultation', 'Laboratoire', 'Acte réalisé']);
	});

	test('QA-27IC-019 @critical medication billing type remains distinct from PERFORMED_ACT', async ({
		page,
		login
	}) => {
		await login(adminEmail, password);
		await page.goto('/billing');
		await expect(page.getByTestId('billing-page')).toBeVisible({ timeout: 20_000 });
		await page.getByTestId('billing-tariffs-tab').click();
		const select = page.getByTestId('billing-tariff-act-type');
		await expect(select).toBeVisible();
		await expect(select.locator('option')).toContainText(['Médicament', 'Acte réalisé']);
		const values = await select
			.locator('option')
			.evaluateAll((opts) => opts.map((o) => (o as HTMLOptionElement).value));
		expect(values).toContain('MEDICATION');
		expect(values).toContain('PERFORMED_ACT');
		expect(values.indexOf('MEDICATION')).not.toBe(values.indexOf('PERFORMED_ACT'));
	});
});
