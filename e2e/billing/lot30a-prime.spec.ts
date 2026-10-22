/**
 * LOT30-A′ — pre-insurance financial foundation boundaries (API + UI).
 * QA-30APRIME-001 CASH requires an OPEN cash session and hits the drawer exactly once.
 * QA-30APRIME-002 an arbitrary tariffId cannot alter the invoice gross.
 * QA-30APRIME-003 insurance member details are redacted for non-insurance roles.
 */
import { expect, type APIRequestContext } from '@playwright/test';
import { test } from '../fixtures/medcore';

const api = process.env.QA_API_URL ?? 'http://127.0.0.1:18082';
const password = process.env.QA_ADMIN_PASSWORD ?? 'admin123';
const adminEmail = process.env.QA_ADMIN_EMAIL ?? 'admin@medcore.local';
const accueilEmail = 'demo.accueil@medcore.local';

async function loginApi(request: APIRequestContext, email: string) {
	const response = await request.post(`${api}/api/auth/login`, { data: { email, password } });
	expect(response.ok(), await response.text()).toBeTruthy();
	const body = await response.json();
	return (body.data?.token ?? body.token) as string;
}

function bearer(token: string) {
	return { Authorization: `Bearer ${token}` };
}

function unwrap<T>(text: string): T {
	const parsed = JSON.parse(text);
	return (parsed.data ?? parsed) as T;
}

function stamp() {
	return `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
}

async function createPatient(request: APIRequestContext, token: string, extra: object = {}) {
	const response = await request.post(`${api}/api/patients`, {
		headers: bearer(token),
		data: {
			nom: `QA30AP-${stamp()}`,
			prenoms: 'Prime',
			sexe: 'F',
			dateNaissance: '1990-01-01',
			telephone: `+22507${String(Date.now()).slice(-8)}`,
			isAssure: false,
			...extra
		}
	});
	const text = await response.text();
	expect([200, 201].includes(response.status()), text).toBeTruthy();
	const patient = unwrap<{ id: number }>(text);
	const mr = await request.get(`${api}/api/patients/${patient.id}/medical-record`, {
		headers: bearer(token)
	});
	expect(mr.ok(), await mr.text()).toBeTruthy();
	return patient;
}

/** Performed act + dedicated tariff → issued invoice; returns ids for further assertions. */
async function seedIssuedInvoice(request: APIRequestContext, token: string, unitPrice: number) {
	const patient = await createPatient(request, token);
	const s = stamp();
	const catalog = await request.post(`${api}/api/act-catalog`, {
		headers: bearer(token),
		data: {
			code: `QA30AP-${s}`.slice(0, 20),
			label: `Acte 30A′ ${s}`,
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
			code: `T30AP-${s}`.slice(0, 20),
			label: `Tarif 30A′ ${s}`,
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
	const actBody = unwrap<{ id: number }>(actText);
	return { patient, catalogId: catalogBody.id, tariffId: tariffBody.id, actId: actBody.id };
}

async function createAndIssue(
	request: APIRequestContext,
	token: string,
	seed: { patient: { id: number }; actId: number },
	tariffId: number
) {
	const invoice = await request.post(`${api}/api/billing/invoices`, {
		headers: bearer(token),
		data: {
			patientId: seed.patient.id,
			lines: [{ actType: 'PERFORMED_ACT', referenceId: seed.actId, tariffId }]
		}
	});
	const text = await invoice.text();
	expect([200, 201].includes(invoice.status()), text).toBeTruthy();
	const draft = unwrap<{ id: number }>(text);
	const issued = await request.post(`${api}/api/billing/invoices/${draft.id}/issue`, {
		headers: bearer(token)
	});
	expect(issued.ok(), await issued.text()).toBeTruthy();
	return unwrap<{ id: number; grossAmount: number; balanceAmount: number }>(await issued.text());
}

/** Dedicated register per test: shared DEMO registers may already host another cashier's session. */
async function openSession(request: APIRequestContext, token: string, openingFloat: number) {
	const cur = await request.get(`${api}/api/cash/sessions/current`, { headers: bearer(token) });
	const curBody = cur.ok() ? await cur.json() : null;
	if (curBody?.session?.id) {
		const key = `qa30ap-preclose-${Date.now()}`;
		await request.post(`${api}/api/cash/sessions/${curBody.session.id}/close`, {
			headers: { ...bearer(token), 'Idempotency-Key': key },
			data: {
				countedCashAmount: curBody.expectedCash ?? 0,
				note: 'QA cleanup',
				idempotencyKey: key
			}
		});
	}
	const code = `E30AP-${stamp()}`.slice(0, 20);
	const created = await request.post(`${api}/api/cash/registers`, {
		headers: bearer(token),
		data: { code, name: `Caisse ${code}`, location: 'QA', active: true }
	});
	expect([200, 201].includes(created.status()), await created.text()).toBeTruthy();
	const reg = (await created.json()) as { id: number };
	const openKey = `qa30ap-open-${Date.now()}`;
	const opened = await request.post(`${api}/api/cash/sessions/open`, {
		headers: { ...bearer(token), 'Idempotency-Key': openKey },
		data: { cashRegisterId: reg.id, openingFloat, idempotencyKey: openKey }
	});
	expect(opened.ok(), await opened.text()).toBeTruthy();
	return ((await opened.json()) as { session: { id: number } }).session.id;
}

test.describe('LOT30-A′ financial foundation', () => {
	test('QA-30APRIME-001 @critical CASH requires an open session and updates cash exactly once', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(240_000);
		const admin = await loginApi(request, adminEmail);
		const seed = await seedIssuedInvoice(request, admin, 12_000);
		const invoice = await createAndIssue(request, admin, seed, seed.tariffId);

		// Sessionless CASH via the billing endpoint is rejected without any effect.
		const key = `qa30ap-sessionless-${Date.now()}`;
		const sessionless = await request.post(`${api}/api/billing/invoices/${invoice.id}/payments`, {
			headers: { ...bearer(admin), 'Idempotency-Key': key },
			data: {
				amount: 12_000,
				paymentMethod: 'CASH',
				idempotencyKey: key,
				payer: { mode: 'PATIENT' }
			}
		});
		expect(sessionless.status()).toBe(409);
		expect(await sessionless.text()).toContain('PAYMENT_CASH_SESSION_REQUIRED');
		const unchanged = await request.get(`${api}/api/billing/invoices/${invoice.id}`, {
			headers: bearer(admin)
		});
		const unchangedBody = unwrap<{ paidAmount: number; payments?: unknown[] }>(
			await unchanged.text()
		);
		expect(unchangedBody.paidAmount).toBe(0);
		expect((unchangedBody.payments ?? []).length).toBe(0);

		// Same CASH inside an OPEN session: one payment, one receipt, drawer +12k exactly once.
		const sessionId = await openSession(request, admin, 5_000);
		const payKey = `qa30ap-cash-${Date.now()}`;
		const payload = {
			invoiceId: invoice.id,
			amount: 12_000,
			paymentMethod: 'CASH',
			idempotencyKey: payKey,
			payer: { mode: 'PATIENT' }
		};
		for (let i = 0; i < 2; i++) {
			const pay = await request.post(`${api}/api/cash/sessions/${sessionId}/payments`, {
				headers: { ...bearer(admin), 'Idempotency-Key': payKey },
				data: payload
			});
			expect(pay.ok(), await pay.text()).toBeTruthy();
		}
		const summary = await request.get(`${api}/api/cash/sessions/${sessionId}`, {
			headers: bearer(admin)
		});
		const sum = (await summary.json()) as {
			cashCollected: number;
			expectedCash: number;
			operationCount: number;
		};
		expect(sum.cashCollected).toBe(12_000);
		expect(sum.expectedCash).toBe(17_000);
		expect(sum.operationCount).toBe(1);
		const after = await request.get(`${api}/api/billing/invoices/${invoice.id}`, {
			headers: bearer(admin)
		});
		const afterBody = unwrap<{ status: string; payments: Array<{ cashSessionId?: number }> }>(
			await after.text()
		);
		expect(afterBody.status).toBe('PAID');
		expect(afterBody.payments).toHaveLength(1);
		expect(afterBody.payments[0].cashSessionId).toBe(sessionId);

		// Leave no open drawer behind for later specs (dedicated register, balanced close).
		const closeKey = `qa30ap-close-${Date.now()}`;
		const closed = await request.post(`${api}/api/cash/sessions/${sessionId}/close`, {
			headers: { ...bearer(admin), 'Idempotency-Key': closeKey },
			data: { countedCashAmount: 17_000, note: 'QA 30A′ cleanup', idempotencyKey: closeKey }
		});
		expect(closed.ok(), await closed.text()).toBeTruthy();

		// The sessionless invoice collection UI never offers CASH.
		const seed2 = await seedIssuedInvoice(request, admin, 3_000);
		const inv2 = await createAndIssue(request, admin, seed2, seed2.tariffId);
		await login(adminEmail, password);
		await page.goto(`/billing/${inv2.id}`);
		await expect(page.getByTestId('invoice-collection')).toBeVisible({ timeout: 20_000 });
		await expect(
			page.getByTestId('invoice-pay-method').locator('option[value="CASH"]')
		).toHaveCount(0);
		await expect(page.getByTestId('invoice-pay-cash-hint')).toBeVisible();
	});

	test('QA-30APRIME-002 @critical arbitrary tariff cannot alter invoice gross', async ({
		request
	}) => {
		test.setTimeout(180_000);
		const admin = await loginApi(request, adminEmail);
		const seed = await seedIssuedInvoice(request, admin, 25_000);
		// Only referential-dedicated tariffs are created here: a generic tariff would become
		// eligible for every other act of the shared DEMO database and pollute other specs.
		const other = await seedIssuedInvoice(request, admin, 1_000); // tariff dedicated to another catalog entry
		const s = stamp();
		const wrongType = await request.post(`${api}/api/billing/tariffs`, {
			headers: bearer(admin),
			data: {
				actType: 'LABORATORY',
				referenceId: 99_999_998,
				code: `L30AP-${s}`.slice(0, 20),
				label: `Labo 30A′ ${s}`,
				unitPrice: 500,
				effectiveFrom: new Date().toISOString().slice(0, 10),
				effectiveTo: null,
				isActive: true
			}
		});
		expect([200, 201].includes(wrongType.status()), await wrongType.text()).toBeTruthy();
		const wrongTypeId = (JSON.parse(await wrongType.text()) as { id: number }).id;
		for (const tariffId of [other.tariffId, wrongTypeId, 99_999_999]) {
			const res = await request.post(`${api}/api/billing/invoices`, {
				headers: bearer(admin),
				data: {
					patientId: seed.patient.id,
					lines: [{ actType: 'PERFORMED_ACT', referenceId: seed.actId, tariffId }]
				}
			});
			expect(res.status(), await res.text()).toBe(409);
			expect(await res.text()).toContain('TARIFF_NOT_ELIGIBLE');
		}
		const acts = await request.get(
			`${api}/api/billing/billable-acts?patientId=${seed.patient.id}`,
			{
				headers: bearer(admin)
			}
		);
		expect(acts.ok(), await acts.text()).toBeTruthy();
		const listed = unwrap<
			Array<{ actType: string; referenceId: number; eligibleTariffs: Array<{ id: number }> }>
		>(await acts.text());
		const row = listed.find((a) => a.actType === 'PERFORMED_ACT' && a.referenceId === seed.actId);
		expect(row?.eligibleTariffs.map((t) => t.id)).toEqual([seed.tariffId]);
		const invoice = await createAndIssue(request, admin, seed, seed.tariffId);
		expect(invoice.grossAmount).toBe(25_000);
	});

	test('QA-30APRIME-003 @critical insurance membership PII permission boundary', async ({
		request
	}) => {
		test.setTimeout(120_000);
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, {
			isAssure: true,
			tauxCouverture: 80,
			matriculeAssure: `MAT-${stamp()}`
		});
		const asAdmin = unwrap<{ isAssure: boolean; matriculeAssure: string; tauxCouverture: number }>(
			await (
				await request.get(`${api}/api/patients/${patient.id}`, { headers: bearer(admin) })
			).text()
		);
		expect(asAdmin.matriculeAssure).toMatch(/^MAT-/);
		expect(asAdmin.tauxCouverture).toBe(80);

		const accueil = await loginApi(request, accueilEmail);
		const res = await request.get(`${api}/api/patients/${patient.id}`, {
			headers: bearer(accueil)
		});
		expect(res.ok(), await res.text()).toBeTruthy();
		const asAccueil = unwrap<{
			isAssure: boolean;
			matriculeAssure: string;
			tauxCouverture: number;
			insuranceDetailsVisible: boolean;
		}>(await res.text());
		expect(asAccueil.isAssure).toBe(true);
		expect(asAccueil.matriculeAssure).toBe('');
		expect(asAccueil.tauxCouverture).toBe(0);
		expect(asAccueil.insuranceDetailsVisible).toBe(false);
		const list = await request.get(`${api}/api/insurance/coverages`, { headers: bearer(accueil) });
		expect(list.status()).toBe(403);
	});
});
