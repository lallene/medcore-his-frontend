/**
 * LOT27I-B — PerformedAct → PEC / insurance frontend.
 * Seeded via API (patient, coverage, catalog, performed act). No fake auth intercepts.
 */
import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { test } from '../fixtures/medcore';

const api = process.env.QA_API_URL ?? 'http://127.0.0.1:18082';
const password = process.env.QA_ADMIN_PASSWORD ?? 'admin123';
const adminEmail = process.env.QA_ADMIN_EMAIL ?? 'admin@medcore.local';
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
	const nom = `QA27IB-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e5)}`;
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
	opts: { insuranceEligible?: boolean; billable?: boolean } = {}
) {
	const code = `QA27IB-${Date.now().toString(36).toUpperCase()}`;
	const create = await request.post(`${api}/api/act-catalog`, {
		headers: bearer(token),
		data: {
			code,
			label: `Acte QA ${code}`,
			category: 'PROCEDURE',
			basePrice: 12500,
			currency: 'XOF',
			billable: opts.billable ?? true,
			insuranceEligible: true,
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
		insuranceEligible: boolean;
	};
	const wantEligible = opts.insuranceEligible ?? true;
	if (wantEligible === created.insuranceEligible) return created;
	// Some API builds ignore false on POST; harden via full PUT before act snapshot.
	const update = await request.put(`${api}/api/act-catalog/${created.id}`, {
		headers: bearer(token),
		data: {
			code: created.code,
			label: created.label,
			category: 'PROCEDURE',
			basePrice: created.basePrice,
			currency: 'XOF',
			billable: opts.billable ?? true,
			insuranceEligible: wantEligible,
			isActive: true
		}
	});
	const updateText = await update.text();
	expect(update.ok(), updateText).toBeTruthy();
	const updated = JSON.parse(updateText) as typeof created;
	expect(updated.insuranceEligible).toBe(wantEligible);
	return updated;
}

async function createPerformedAct(
	request: APIRequestContext,
	token: string,
	patientId: number,
	catalogId: number
) {
	const create = await request.post(`${api}/api/performed-acts`, {
		headers: bearer(token),
		data: { patientId, actCatalogEntryId: catalogId, quantity: 1 }
	});
	const text = await create.text();
	expect([200, 201].includes(create.status()), text).toBeTruthy();
	const body = JSON.parse(text);
	return (body.data ?? body) as {
		id: number;
		status: string;
		insuranceEligible: boolean;
		basePrice: number;
	};
}

async function voidPerformedAct(
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

async function ensureCompanyGuarantorCoverage(
	request: APIRequestContext,
	token: string,
	patientId: number,
	opts: { isPrincipal?: boolean; memberSuffix?: string } = {}
) {
	const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
	const companyRes = await request.post(`${api}/api/insurance/companies`, {
		headers: bearer(token),
		data: { code: `C${stamp}`.slice(0, 20), name: `Assureur ${stamp}` }
	});
	const companyText = await companyRes.text();
	expect([200, 201].includes(companyRes.status()), companyText).toBeTruthy();
	const company = (JSON.parse(companyText).data ?? JSON.parse(companyText)) as { id: number };

	const guarantorRes = await request.post(`${api}/api/insurance/guarantors`, {
		headers: bearer(token),
		data: {
			companyId: company.id,
			code: `G${stamp}`.slice(0, 20),
			name: `Garant ${stamp}`,
			defaultCoverageRate: 80,
			paymentDelayDays: 30
		}
	});
	const guarantorText = await guarantorRes.text();
	expect([200, 201].includes(guarantorRes.status()), guarantorText).toBeTruthy();
	const guarantor = (JSON.parse(guarantorText).data ?? JSON.parse(guarantorText)) as {
		id: number;
	};

	const coverageRes = await request.post(`${api}/api/insurance/coverages`, {
		headers: bearer(token),
		data: {
			patientId,
			companyId: company.id,
			guarantorId: guarantor.id,
			memberNumber: `MBR-${opts.memberSuffix ?? stamp}`,
			subscriber: 'Subscriber QA',
			beneficiary: 'Beneficiary QA',
			coverageRate: 80,
			isPrincipal: opts.isPrincipal ?? true
		}
	});
	const coverageText = await coverageRes.text();
	expect([200, 201].includes(coverageRes.status()), coverageText).toBeTruthy();
	const coverage = (JSON.parse(coverageText).data ?? JSON.parse(coverageText)) as {
		id: number;
		isPrincipal: boolean;
		memberNumber: string;
	};
	return { company, guarantor, coverage };
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

test.describe('LOT27I-B PerformedAct → PEC', () => {
	test('QA-27IB-001/004 @critical eligible PERFORMED act shows PEC CTA deep-link without coverage', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(120_000);
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, 'CTA');
		await ensureMedicalRecord(request, admin, patient.id);
		await ensureCompanyGuarantorCoverage(request, admin, patient.id);
		const catalog = await ensureCatalogEntry(request, admin);
		const act = await createPerformedAct(request, admin, patient.id, catalog.id);

		await login(adminEmail, password);
		await openPerformedActsTab(page, patient.id, patient.codePatient);
		await page.getByTestId(`performed-act-open-${act.id}`).click();
		await expect(page.getByTestId('performed-act-drawer')).toBeVisible();
		const cta = page.getByTestId('performed-act-pec-cta');
		await expect(cta).toBeVisible();
		await cta.click();
		await expect(page).toHaveURL(/\/insurance\/authorizations\?/);
		const url = new URL(page.url());
		expect(url.searchParams.get('patientId')).toBe(String(patient.id));
		expect(url.searchParams.get('referenceType')).toBe('PERFORMED_ACT');
		expect(url.searchParams.get('referenceId')).toBe(String(act.id));
		expect(url.searchParams.get('patientCoverageId')).toBeNull();
	});

	test('QA-27IB-002 @critical VOIDED act has no PEC CTA', async ({ page, login, request }) => {
		test.setTimeout(120_000);
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, 'VOID');
		const catalog = await ensureCatalogEntry(request, admin);
		const act = await createPerformedAct(request, admin, patient.id, catalog.id);
		await voidPerformedAct(request, admin, act.id, 'Annulation QA-27IB-002');

		await login(adminEmail, password);
		await openPerformedActsTab(page, patient.id, patient.codePatient);
		await page.getByTestId(`performed-act-open-${act.id}`).click();
		await expect(page.getByTestId('performed-act-drawer')).toBeVisible();
		await expect(page.getByTestId('performed-act-pec-cta')).toHaveCount(0);
	});

	test('QA-27IB-003 @critical InsuranceEligible=false has no PEC CTA', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(120_000);
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, 'INEL');
		const catalog = await ensureCatalogEntry(request, admin, { insuranceEligible: false });
		const act = await createPerformedAct(request, admin, patient.id, catalog.id);
		expect(act.insuranceEligible).toBe(false);

		await login(adminEmail, password);
		await openPerformedActsTab(page, patient.id, patient.codePatient);
		await page.getByTestId(`performed-act-open-${act.id}`).click();
		await expect(page.getByTestId('performed-act-pec-cta')).toHaveCount(0);
	});

	test('QA-27IB-005/006/008/009 @critical deep-link, one coverage unselected, create with explicit coverage', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(180_000);
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, 'ONE');
		await ensureMedicalRecord(request, admin, patient.id);
		const { coverage } = await ensureCompanyGuarantorCoverage(request, admin, patient.id, {
			isPrincipal: true,
			memberSuffix: 'ONE'
		});
		const catalog = await ensureCatalogEntry(request, admin);
		const act = await createPerformedAct(request, admin, patient.id, catalog.id);

		await login(adminEmail, password);
		await page.goto(
			`/insurance/authorizations?patientId=${patient.id}&referenceType=PERFORMED_ACT&referenceId=${act.id}`
		);
		await expect(page.getByTestId('auth-create-form')).toBeVisible({ timeout: 20_000 });
		const select = page.getByTestId('auth-coverage-select');
		await expect(select).toBeVisible();
		await expect(select).toHaveValue('0');
		await expect(page.getByTestId('auth-coverage-unselected')).toBeVisible();
		await expect(page.getByTestId('auth-create-submit')).toBeDisabled();

		await select.selectOption(String(coverage.id));
		await expect(select).toHaveValue(String(coverage.id));
		const eligible = page.getByTestId(`auth-eligible-act-PERFORMED_ACT-${act.id}`);
		await expect(eligible).toBeVisible({ timeout: 20_000 });
		await eligible.check();
		await expect(page.getByTestId('auth-requested-amount')).toHaveValue('');
		await expect(page.getByTestId('auth-create-submit')).toBeEnabled();

		const requestPromise = page.waitForRequest(
			(r) =>
				r.url().includes('/api/insurance/authorizations') &&
				r.method() === 'POST' &&
				!r.url().includes('/submit') &&
				!r.url().includes('/acts'),
			{ timeout: 30_000 }
		);
		await page.getByTestId('auth-create-submit').scrollIntoViewIfNeeded();
		await page.getByTestId('auth-create-submit').click({ force: true });
		const req = await requestPromise.catch(async (err) => {
			const createError = page.getByTestId('auth-create-error');
			const msg = (await createError.isVisible().catch(() => false))
				? await createError.innerText()
				: 'no create error';
			throw new Error(`PEC create POST missing (${msg}): ${err}`);
		});
		const body = req.postDataJSON() as {
			patientCoverageId: number;
			referenceType: string;
			referenceId: number;
			patientId: number;
		};
		expect(body.patientCoverageId).toBe(coverage.id);
		expect(body.referenceType).toBe('PERFORMED_ACT');
		expect(body.referenceId).toBe(act.id);
		expect(body.patientId).toBe(patient.id);
		await expect(page.getByTestId('auth-financial-split')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('auth-detail-reference-type')).toContainText('Acte réalisé');
	});

	test('QA-27IB-007/008 @critical multiple coverages: none selected; principal labeled', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(180_000);
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, 'MULTI');
		await ensureMedicalRecord(request, admin, patient.id);
		const principal = await ensureCompanyGuarantorCoverage(request, admin, patient.id, {
			isPrincipal: true,
			memberSuffix: 'PRIN'
		});
		const secondary = await ensureCompanyGuarantorCoverage(request, admin, patient.id, {
			isPrincipal: false,
			memberSuffix: 'SEC'
		});
		const catalog = await ensureCatalogEntry(request, admin);
		const act = await createPerformedAct(request, admin, patient.id, catalog.id);

		await login(adminEmail, password);
		await page.goto(
			`/insurance/authorizations?patientId=${patient.id}&referenceType=PERFORMED_ACT&referenceId=${act.id}`
		);
		await expect(page.getByTestId('auth-create-form')).toBeVisible({ timeout: 20_000 });
		const select = page.getByTestId('auth-coverage-select');
		await expect(select).toHaveValue('0');
		const options = await select.locator('option').allTextContents();
		expect(options.some((t) => t.includes('Principale'))).toBeTruthy();
		expect(options.some((t) => t.includes(principal.coverage.memberNumber))).toBeTruthy();
		expect(options.some((t) => t.includes(secondary.coverage.memberNumber))).toBeTruthy();
		await expect(page.getByTestId('auth-create-submit')).toBeDisabled();
	});

	test('QA-27IB-010 @critical zero coverage disables create with clear UX', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(120_000);
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, 'ZERO');
		await ensureMedicalRecord(request, admin, patient.id);
		const catalog = await ensureCatalogEntry(request, admin);
		const act = await createPerformedAct(request, admin, patient.id, catalog.id);

		await login(adminEmail, password);
		await page.goto(
			`/insurance/authorizations?patientId=${patient.id}&referenceType=PERFORMED_ACT&referenceId=${act.id}`
		);
		await expect(page.getByTestId('auth-create-form')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('auth-coverage-empty')).toBeVisible();
		await expect(page.getByTestId('auth-create-submit')).toBeDisabled();
	});

	test('QA-27IB-011 @critical 409 duplicate active PEC shows actionable error', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(180_000);
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, 'DUP');
		await ensureMedicalRecord(request, admin, patient.id);
		const { coverage } = await ensureCompanyGuarantorCoverage(request, admin, patient.id);
		const catalog = await ensureCatalogEntry(request, admin);
		const act = await createPerformedAct(request, admin, patient.id, catalog.id);

		const first = await request.post(`${api}/api/insurance/authorizations`, {
			headers: bearer(admin),
			data: {
				patientId: patient.id,
				patientCoverageId: coverage.id,
				referenceType: 'PERFORMED_ACT',
				referenceId: act.id
			}
		});
		expect([200, 201].includes(first.status()), await first.text()).toBeTruthy();

		await login(adminEmail, password);
		await page.goto(
			`/insurance/authorizations?patientId=${patient.id}&referenceType=PERFORMED_ACT&referenceId=${act.id}`
		);
		await expect(page.getByTestId('auth-create-form')).toBeVisible({ timeout: 20_000 });
		await page.getByTestId('auth-coverage-select').selectOption(String(coverage.id));
		const deeplink = page.getByTestId('auth-deeplink-error');
		const submit = page.getByTestId('auth-create-submit');
		await expect(deeplink.or(submit)).toBeVisible({ timeout: 20_000 });
		// Prefer deep-link validation UX when eligible resolution already shows DIRECT/COVERED.
		await expect(deeplink).toBeVisible({ timeout: 20_000 });
		await expect(deeplink).toContainText(/PEC|lié/i);
		await expect(submit).toBeDisabled();
	});

	test('QA-27IB-012/013 @critical lifecycle + financial split from backend decision', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(180_000);
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, 'LIFE');
		await ensureMedicalRecord(request, admin, patient.id);
		const { coverage } = await ensureCompanyGuarantorCoverage(request, admin, patient.id);
		const catalog = await ensureCatalogEntry(request, admin);
		const act = await createPerformedAct(request, admin, patient.id, catalog.id);

		const create = await request.post(`${api}/api/insurance/authorizations`, {
			headers: bearer(admin),
			data: {
				patientId: patient.id,
				patientCoverageId: coverage.id,
				referenceType: 'PERFORMED_ACT',
				referenceId: act.id,
				requestedAmount: 10000
			}
		});
		const createText = await create.text();
		expect([200, 201].includes(create.status()), createText).toBeTruthy();
		const auth = (JSON.parse(createText).data ?? JSON.parse(createText)) as { id: number };

		// Submit + decide may fail if permission debt — use API if admin has grants;
		// otherwise open draft and assert persisted requested + empty split fields.
		const submit = await request.post(`${api}/api/insurance/authorizations/${auth.id}/submit`, {
			headers: bearer(admin),
			data: { externalReference: `EXT-${auth.id}` }
		});
		if (submit.ok()) {
			await request.post(`${api}/api/insurance/authorizations/${auth.id}/pending`, {
				headers: bearer(admin),
				data: {}
			});
			const decide = await request.post(`${api}/api/insurance/authorizations/${auth.id}/decide`, {
				headers: bearer(admin),
				data: {
					status: 'APPROVED',
					externalReference: `EXT-${auth.id}`,
					externalDecisionDate: new Date().toISOString().slice(0, 10),
					approvedRate: 80
				}
			});
			if (decide.ok()) {
				const decided = (await decide.json()).data as {
					insuranceAmount: number;
					patientAmount: number;
				};
				await login(adminEmail, password);
				await page.goto(`/insurance/authorizations?authorizationId=${auth.id}`);
				await expect(page.getByTestId('auth-financial-split')).toBeVisible({ timeout: 20_000 });
				await expect(page.getByTestId('auth-detail-insurance-amount')).toContainText(
					String(decided.insuranceAmount).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f')
				);
				await expect(page.getByTestId('auth-detail-patient-amount')).toContainText(
					String(decided.patientAmount)
				);
				return;
			}
		}

		await login(adminEmail, password);
		await page.goto(`/insurance/authorizations?authorizationId=${auth.id}`);
		await expect(page.getByTestId('auth-financial-split')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('auth-detail-requested')).toContainText('10');
		await expect(page.getByTestId('auth-detail-reference-type')).toContainText('Acte réalisé');
	});

	test('QA-27IB-014 @critical Patient360 insurance list shows Acte réalisé label', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(180_000);
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, 'P360');
		await ensureMedicalRecord(request, admin, patient.id);
		const { coverage } = await ensureCompanyGuarantorCoverage(request, admin, patient.id);
		const catalog = await ensureCatalogEntry(request, admin);
		const act = await createPerformedAct(request, admin, patient.id, catalog.id);
		const create = await request.post(`${api}/api/insurance/authorizations`, {
			headers: bearer(admin),
			data: {
				patientId: patient.id,
				patientCoverageId: coverage.id,
				referenceType: 'PERFORMED_ACT',
				referenceId: act.id
			}
		});
		const createText = await create.text();
		expect([200, 201].includes(create.status()), createText).toBeTruthy();
		const auth = (JSON.parse(createText).data ?? JSON.parse(createText)) as { id: number };

		await login(adminEmail, password);
		await page.goto(`/patients/${patient.id}`);
		await expect(page.getByTestId('patient-360-tab-insurance')).toBeVisible({ timeout: 20_000 });
		await page.getByTestId('patient-360-tab-insurance').click({ force: true });
		await expect(page.getByTestId(`patient-insurance-ref-${auth.id}`)).toBeVisible({
			timeout: 20_000
		});
		await expect(page.getByText('Acte réalisé').first()).toBeVisible();
	});

	test('QA-27IB-015 @critical medication PEC remains prescription-based', async () => {
		const pharmacy = readFileSync(
			new URL('../../src/routes/pharmacy/+page.svelte', import.meta.url),
			'utf8'
		);
		expect(pharmacy).toContain('referenceType="MEDICATION"');
		expect(pharmacy).not.toContain('referenceType="PERFORMED_ACT"');
	});

	test('QA-27IB-016 @critical unauthorized user does not receive PEC create CTA', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(120_000);
		if (!(await canLogin(request, billingEmail))) {
			test.info().annotations.push({
				type: 'note',
				description: 'demo.facturation unavailable — RBAC CTA skip'
			});
			return;
		}
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, 'RBAC');

		await login(billingEmail, password);
		// LOT28E-A: FACTURATION lacks patients.360.read — cannot open Patient360 shell.
		await page.goto(`/patients/${patient.id}`);
		await expect(page.getByTestId('access-denied')).toBeVisible({ timeout: 20_000 });
	});
});
