/**
 * LOT27I-A — ActCatalog admin + Patient360 performed acts (create/void/RBAC).
 * Uses demo.* users when available; otherwise falls back to admin-only coverage
 * and skips role-specific RBAC cases (Neon environments without demo seed).
 */
import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { test } from '../fixtures/medcore';

const api = process.env.QA_API_URL ?? 'http://127.0.0.1:18082';
const password = process.env.QA_ADMIN_PASSWORD ?? 'admin123';
const adminEmail = process.env.QA_ADMIN_EMAIL ?? 'admin@medcore.local';
const doctorEmail = 'demo.generaliste@medcore.local';
const nurseEmail = 'demo.infirmier@medcore.local';
const receptionEmail = 'demo.accueil@medcore.local';
const billingEmail = 'demo.facturation@medcore.local';

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
	const nom = `QA27IA-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e5)}`;
	const response = await request.post(`${api}/api/patients`, {
		headers: bearer(token),
		data: {
			nom,
			prenoms: 'Fixture',
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
	// LOT28E-B3: PA create requires MedicalRecord (fail-closed). Product GET
	// /patients/:id/medical-record already GetOrCreates — seed it for fixtures.
	const mr = await request.get(`${api}/api/patients/${patient.id}/medical-record`, {
		headers: bearer(token)
	});
	expect(mr.ok(), await mr.text()).toBeTruthy();
	return patient;
}

async function ensureCatalogEntry(request: APIRequestContext, token: string) {
	// Patient360 create-select loads act-catalog with active=true&limit=100
	// (server max), ordered by category,label,code. Accumulated E2E PROCEDURE
	// rows push late labels off page 1 → selectOption hangs until timeout.
	// Use CONSULTATION + early label so the fixture stays inside that window
	// without weakening RBAC assertions or changing product pagination.
	const code = `QA27IA-${Date.now().toString(36).toUpperCase()}`;
	const label = `000-QA ${code}`;
	const create = await request.post(`${api}/api/act-catalog`, {
		headers: bearer(token),
		data: {
			code,
			label,
			category: 'CONSULTATION',
			basePrice: 12500,
			currency: 'XOF',
			billable: true,
			insuranceEligible: true,
			isActive: true
		}
	});
	const text = await create.text();
	expect([200, 201].includes(create.status()), text).toBeTruthy();
	const catalog = JSON.parse(text) as {
		id: number;
		code: string;
		label: string;
		basePrice: number;
	};

	const list = await request.get(`${api}/api/act-catalog`, {
		headers: bearer(token),
		params: { active: 'true', limit: 100 }
	});
	const listText = await list.text();
	expect(list.ok(), listText).toBeTruthy();
	const page = JSON.parse(listText) as { data?: Array<{ id: number }> };
	const ids = (page.data ?? []).map((row) => row.id);
	expect(
		ids.includes(catalog.id),
		`QA catalog fixture id=${catalog.id} missing from create-select window (active limit=100); environment catalog pollution`
	).toBeTruthy();

	return catalog;
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

test('QA-27IA-001 @critical act catalog admin read/manage and read-only RBAC', async ({
	page,
	login,
	request
}) => {
	test.setTimeout(120_000);

	await login(adminEmail, password);
	await page.goto('/admin/act-catalog');
	await expect(page.getByTestId('act-catalog-page')).toBeVisible({ timeout: 20_000 });
	await expect(page.getByRole('heading', { name: 'Référentiel des actes' })).toBeVisible();
	await expect(page.getByTestId('act-catalog-create')).toBeVisible();

	const code = `E2E-${Date.now().toString(36).toUpperCase()}`;
	await page.getByTestId('act-catalog-create').click();
	await page.getByTestId('act-catalog-form-code').fill(code);
	await page.getByTestId('act-catalog-form-label').fill(`Libellé ${code}`);
	await page.getByTestId('act-catalog-form-category').selectOption('CONSULTATION');
	await page.getByTestId('act-catalog-form-base-price').fill('8500');
	await page.getByTestId('act-catalog-form-save').click();
	await expect(page.getByText(code).first()).toBeVisible({ timeout: 20_000 });
	await expect(page.getByTestId('act-catalog-base-price').first()).toContainText('FCFA');
	await expect(page.getByText('Prix catalogue de référence').first()).toBeVisible();

	const row = page.locator('[data-testid^="act-catalog-row-"]').filter({ hasText: code }).first();
	await row.getByRole('button', { name: 'Modifier' }).click();
	await page.getByTestId('act-catalog-form-label').fill(`Libellé ${code} maj`);
	await page.getByTestId('act-catalog-form-save').click();
	await expect(page.getByText(`Libellé ${code} maj`).first()).toBeVisible({ timeout: 20_000 });

	if (!(await canLogin(request, billingEmail))) {
		test.info().annotations.push({
			type: 'note',
			description: 'demo.facturation unavailable — read-only RBAC skipped'
		});
		return;
	}

	await login(billingEmail, password);
	await page.goto('/admin/act-catalog');
	await expect(page.getByTestId('act-catalog-page')).toBeVisible({ timeout: 20_000 });
	await expect(page.getByTestId('act-catalog-create')).toHaveCount(0);
	await expect(page.locator('[data-testid^="act-catalog-edit-"]')).toHaveCount(0);
});

test('QA-27IA-002 @critical Patient360 performed acts list/detail/create/void RBAC', async ({
	page,
	login,
	request
}) => {
	test.setTimeout(180_000);
	const admin = await loginApi(request, adminEmail);
	const patient = await createPatient(request, admin, 'PA');
	const catalog = await ensureCatalogEntry(request, admin);
	const hasDemo =
		(await canLogin(request, receptionEmail)) &&
		(await canLogin(request, nurseEmail)) &&
		(await canLogin(request, doctorEmail)) &&
		(await canLogin(request, billingEmail));

	if (hasDemo) {
		await login(receptionEmail, password);
		await page.goto(`/patients/${patient.id}`);
		await expect(page.getByTestId('access-denied')).toBeVisible({ timeout: 20_000 });

		await login(nurseEmail, password);
		await openPerformedActsTab(page, patient.id, patient.codePatient);
		await expect(page.getByTestId('performed-act-create')).toBeVisible();
		await page.getByTestId('performed-act-create').click();
		await page.getByTestId('performed-act-catalog-select').selectOption(String(catalog.id));
		await page.getByTestId('performed-act-quantity').fill('1');
		await page.getByTestId('performed-act-create-submit').click();
		await expect(page.getByTestId('performed-act-drawer')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('performed-act-base-price')).toContainText(
			'Prix catalogue de référence'
		);
		await expect(page.getByTestId('performed-act-base-price')).toContainText('FCFA');
		await expect(page.getByTestId('performed-act-void')).toHaveCount(0);

		const createdId = await page.evaluate(() => {
			const row = document.querySelector('[data-testid^="performed-act-row-"]');
			return row?.getAttribute('data-testid')?.replace('performed-act-row-', '') ?? '';
		});
		expect(createdId).toBeTruthy();

		await login(doctorEmail, password);
		await openPerformedActsTab(page, patient.id, patient.codePatient);
		await page.getByTestId(`performed-act-open-${createdId}`).click();
		await expect(page.getByTestId('performed-act-void')).toBeVisible();
		await page.getByTestId('performed-act-void').click();
		await page.getByTestId('performed-act-void-reason').fill('Erreur de saisie E2E');
		await page.getByTestId('performed-act-void-confirm').click();
		await expect(page.getByTestId('performed-act-void-meta')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('performed-act-void')).toHaveCount(0);

		// LOT28E-A: FACTURATION retains performed_acts.read but not patients.360.read → P360 denied
		await login(billingEmail, password);
		await page.goto(`/patients/${patient.id}`);
		await expect(page.getByTestId('access-denied')).toBeVisible({ timeout: 20_000 });
		return;
	}

	// Admin fallback when demo personas are absent
	await login(adminEmail, password);
	await openPerformedActsTab(page, patient.id, patient.codePatient);
	await expect(page.getByTestId('performed-act-create')).toBeVisible();
	await page.getByTestId('performed-act-create').click();
	await page.getByTestId('performed-act-catalog-select').selectOption(String(catalog.id));
	await page.getByTestId('performed-act-quantity').fill('1');
	await page.getByTestId('performed-act-create-submit').click();
	await expect(page.getByTestId('performed-act-drawer')).toBeVisible({ timeout: 20_000 });
	await expect(page.getByTestId('performed-act-base-price')).toContainText(
		'Prix catalogue de référence'
	);
	await expect(page.getByTestId('performed-act-base-price')).toContainText('FCFA');
	await expect(page.getByTestId('performed-act-void')).toBeVisible();
	await page.getByTestId('performed-act-void').click();
	await page.getByTestId('performed-act-void-reason').fill('Erreur de saisie E2E admin');
	await page.getByTestId('performed-act-void-confirm').click();
	await expect(page.getByTestId('performed-act-void-meta')).toBeVisible({ timeout: 20_000 });
	await expect(page.getByTestId('performed-act-void')).toHaveCount(0);
});

test('QA-27IA-003 @critical active-invoice void conflict UX', async ({ page, login, request }) => {
	test.setTimeout(120_000);
	const admin = await loginApi(request, adminEmail);
	const patient = await createPatient(request, admin, 'VOID');
	const catalog = await ensureCatalogEntry(request, admin);
	const create = await request.post(`${api}/api/performed-acts`, {
		headers: bearer(admin),
		data: {
			patientId: patient.id,
			actCatalogEntryId: catalog.id,
			quantity: 1
		}
	});
	const createText = await create.text();
	expect([200, 201].includes(create.status()), createText).toBeTruthy();
	const act = JSON.parse(createText) as { id: number };

	const actorEmail = (await canLogin(request, doctorEmail)) ? doctorEmail : adminEmail;
	await login(actorEmail, password);
	await page.route(`**/api/performed-acts/${act.id}/void`, async (route) => {
		await route.fulfill({
			status: 409,
			contentType: 'application/json',
			body: JSON.stringify({
				message: "Impossible d'annuler un acte encore facturé activement"
			})
		});
	});

	await openPerformedActsTab(page, patient.id, patient.codePatient);
	await page.getByTestId(`performed-act-open-${act.id}`).click();
	await page.getByTestId('performed-act-void').click();
	await page.getByTestId('performed-act-void-reason').fill('Tentative bloquée');
	await page.getByTestId('performed-act-void-confirm').click();
	await expect(page.getByTestId('performed-act-void-error')).toContainText('facturation active', {
		timeout: 15_000
	});
	await expect(page.getByTestId('performed-act-void-billing-hint')).toBeVisible();
});

test('QA-27IA-004 @critical responsive direct navigation smoke', async ({ page, login }) => {
	await login(adminEmail, password);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/admin/act-catalog');
	await expect(page.getByTestId('act-catalog-page')).toBeVisible({ timeout: 20_000 });
	await expect(page.getByRole('heading', { name: 'Référentiel des actes' })).toBeVisible();
});
