/**
 * LOT29F-H-E — Patient financial statement (read-only projection).
 */
import { expect, type APIRequestContext } from '@playwright/test';
import { test } from '../fixtures/medcore';

const api = process.env.QA_API_URL ?? 'http://127.0.0.1:18082';
const password = process.env.QA_ADMIN_PASSWORD ?? 'admin123';
const adminEmail = process.env.QA_ADMIN_EMAIL ?? 'admin@medcore.local';
const facturationEmail = 'demo.facturation@medcore.local';
const cashierEmail = 'demo.caissiere@medcore.local';

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
	const nom = `QA29FHE-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e5)}`;
	const response = await request.post(`${api}/api/patients`, {
		headers: bearer(token),
		data: {
			nom,
			prenoms: 'Statement',
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

async function seedIssuedInvoice(
	request: APIRequestContext,
	token: string,
	patientId: number,
	unitPrice: number,
	tag: string
) {
	const stamp = `${tag}${Date.now().toString(36)}`.slice(0, 16);
	const catalog = await request.post(`${api}/api/act-catalog`, {
		headers: bearer(token),
		data: {
			code: `QA29HE-${stamp}`.slice(0, 20),
			label: `Acte HE ${stamp}`,
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
			code: `T29HE-${stamp}`.slice(0, 20),
			label: `Tarif HE ${stamp}`,
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
		data: { patientId, actCatalogEntryId: catalogBody.id, quantity: 1 }
	});
	expect([200, 201].includes(act.status()), await act.text()).toBeTruthy();
	const actBody = (JSON.parse(await act.text()).data ?? JSON.parse(await act.text())) as {
		id: number;
	};
	const invoice = await request.post(`${api}/api/billing/invoices`, {
		headers: bearer(token),
		data: {
			patientId,
			lines: [{ actType: 'PERFORMED_ACT', referenceId: actBody.id, tariffId: tariffBody.id }]
		}
	});
	expect([200, 201].includes(invoice.status()), await invoice.text()).toBeTruthy();
	const draft = (JSON.parse(await invoice.text()).data ?? JSON.parse(await invoice.text())) as {
		id: number;
	};
	const issued = await request.post(`${api}/api/billing/invoices/${draft.id}/issue`, {
		headers: bearer(token)
	});
	expect(issued.ok(), await issued.text()).toBeTruthy();
	return (JSON.parse(await issued.text()).data ?? JSON.parse(await issued.text())) as {
		id: number;
		patientId: number;
		patientAmount: number;
	};
}

function formatFcfa(amount: number): string {
	return `${new Intl.NumberFormat('fr-FR').format(amount)} FCFA`;
}

test.describe('LOT29F-H-E financial statement', () => {
	test('QA-29F-HE-001 @critical statement summary matches backend after pay + partial CN credit', async ({
		request,
		login,
		page
	}) => {
		test.setTimeout(120_000);
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, '001');
		const invoice = await seedIssuedInvoice(request, admin, patient.id, 50_000, '001');
		const payKey = `qa-he001-pay-${Date.now()}`;
		const paid = await request.post(`${api}/api/billing/invoices/${invoice.id}/payments`, {
			headers: { ...bearer(admin), 'Idempotency-Key': payKey },
			data: {
				amount: 50_000,
				paymentMethod: 'CASH',
				idempotencyKey: payKey,
				payer: { mode: 'PATIENT' }
			}
		});
		expect(paid.ok(), await paid.text()).toBeTruthy();
		const cnKey = `qa-he001-cn-${Date.now()}`;
		const cn = await request.post(`${api}/api/billing/invoices/${invoice.id}/credit-notes`, {
			headers: { ...bearer(admin), 'Idempotency-Key': cnKey },
			data: { amount: 10_000, reason: 'QA-29F-HE-001', idempotencyKey: cnKey }
		});
		expect(cn.ok(), await cn.text()).toBeTruthy();

		const stmtRes = await request.get(
			`${api}/api/billing/patients/${patient.id}/financial-statement`,
			{ headers: bearer(admin) }
		);
		expect(stmtRes.ok(), await stmtRes.text()).toBeTruthy();
		const stmt = (JSON.parse(await stmtRes.text()).data ?? JSON.parse(await stmtRes.text())) as {
			summary: {
				grossPatientObligation: number;
				creditAvailable: number;
				receivableOutstanding: number;
				effectiveMoneyPaid: number;
			};
		};

		await login(facturationEmail);
		await page.goto(`/billing/patients/${patient.id}/statement`);
		await expect(page.getByTestId('financial-statement-page')).toBeVisible({ timeout: 20_000 });
		await expect(
			page.getByTestId('financial-statement-summary-grossPatientObligation')
		).toContainText(formatFcfa(stmt.summary.grossPatientObligation));
		await expect(page.getByTestId('financial-statement-summary-creditAvailable')).toContainText(
			formatFcfa(stmt.summary.creditAvailable)
		);
		await expect(
			page.getByTestId('financial-statement-summary-receivableOutstanding')
		).toContainText(formatFcfa(stmt.summary.receivableOutstanding));
		await expect(page.getByTestId('financial-statement-summary-effectiveMoneyPaid')).toContainText(
			formatFcfa(stmt.summary.effectiveMoneyPaid)
		);
		await expect(page.getByTestId('financial-statement-holders')).toBeVisible();
		await expect(page.getByTestId('financial-statement-print')).toBeVisible();
	});

	test('QA-29F-HE-002 @critical credit apply reflected; holders/history avoid refund wording', async ({
		request,
		login,
		page
	}) => {
		test.setTimeout(120_000);
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, '002');
		const earnInv = await seedIssuedInvoice(request, admin, patient.id, 50_000, '002e');
		const payKey = `qa-he002-pay-${Date.now()}`;
		expect(
			(
				await request.post(`${api}/api/billing/invoices/${earnInv.id}/payments`, {
					headers: { ...bearer(admin), 'Idempotency-Key': payKey },
					data: {
						amount: 50_000,
						paymentMethod: 'CASH',
						idempotencyKey: payKey,
						payer: { mode: 'PATIENT' }
					}
				})
			).ok()
		).toBeTruthy();
		const cnKey = `qa-he002-cn-${Date.now()}`;
		const cnBody = JSON.parse(
			await (
				await request.post(`${api}/api/billing/invoices/${earnInv.id}/credit-notes`, {
					headers: { ...bearer(admin), 'Idempotency-Key': cnKey },
					data: { amount: 20_000, reason: 'Crédit source HE002', idempotencyKey: cnKey }
				})
			).text()
		);
		const cnParsed = (cnBody.data ?? cnBody) as { creditHolderPartyId?: number };
		expect(cnParsed.creditHolderPartyId).toBeTruthy();
		const holder = cnParsed.creditHolderPartyId as number;
		const target = await seedIssuedInvoice(request, admin, patient.id, 50_000, '002t');
		const appKey = `qa-he002-app-${Date.now()}`;
		expect(
			(
				await request.post(`${api}/api/billing/invoices/${target.id}/credit-applications`, {
					headers: { ...bearer(admin), 'Idempotency-Key': appKey },
					data: { holderPartyId: holder, amount: 20_000, idempotencyKey: appKey }
				})
			).ok()
		).toBeTruthy();

		const stmtRes = await request.get(
			`${api}/api/billing/patients/${patient.id}/financial-statement`,
			{ headers: bearer(admin) }
		);
		const stmt = (JSON.parse(await stmtRes.text()).data ?? JSON.parse(await stmtRes.text())) as {
			summary: { creditApplied: number; receivableOutstanding: number };
		};

		await login(facturationEmail);
		await page.goto(`/billing/patients/${patient.id}/statement`);
		await expect(page.getByTestId('financial-statement-page')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('financial-statement-summary-creditApplied')).toContainText(
			formatFcfa(stmt.summary.creditApplied)
		);
		await expect(page.getByTestId(`financial-statement-inv-receivable-${target.id}`)).toContainText(
			formatFcfa(30_000)
		);
		await expect(page.getByTestId(`financial-statement-holder-${holder}`)).toBeVisible();
		await expect(page.getByTestId('financial-statement-holders')).not.toContainText(
			/rembours|refund/i
		);

		await page.getByTestId('financial-statement-filter-event-type').selectOption('CREDIT_APPLIED');
		await page.getByTestId('financial-statement-filter-submit').click();
		await expect(page.getByTestId('financial-statement-history-row-0')).toBeVisible({
			timeout: 15_000
		});
		const label = await page.getByTestId('financial-statement-history-label-0').innerText();
		expect(label).toMatch(/crédit utilisé/i);
		expect(label).not.toMatch(/rembours|refund/i);
	});

	test('QA-29F-HE-003 @critical caissier denied; facturation can open statement', async ({
		request,
		login,
		page
	}) => {
		test.setTimeout(120_000);
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, '003');
		await seedIssuedInvoice(request, admin, patient.id, 25_000, '003');

		const cashierStmt = await request.get(
			`${api}/api/billing/patients/${patient.id}/financial-statement`,
			{ headers: bearer(await loginApi(request, cashierEmail)) }
		);
		expect(cashierStmt.status()).toBe(403);

		await login(cashierEmail);
		await page.goto(`/billing/patients/${patient.id}/statement`);
		await expect(page.getByTestId('access-denied')).toBeVisible({ timeout: 20_000 });

		await login(facturationEmail);
		await page.goto(`/billing/patients/${patient.id}/statement`);
		await expect(page.getByTestId('financial-statement-page')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('financial-statement-summary')).toBeVisible();
	});

	test('QA-29F-HE-004 @critical history pagination stable and invoice filter works', async ({
		request,
		login,
		page
	}) => {
		test.setTimeout(120_000);
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, '004');
		const inv = await seedIssuedInvoice(request, admin, patient.id, 30_000, '004');
		for (let i = 0; i < 12; i++) {
			const key = `qa-he004-pay-${i}-${Date.now()}`;
			expect(
				(
					await request.post(`${api}/api/billing/invoices/${inv.id}/payments`, {
						headers: { ...bearer(admin), 'Idempotency-Key': key },
						data: {
							amount: 1_000,
							paymentMethod: 'CASH',
							idempotencyKey: key,
							payer: { mode: 'PATIENT' }
						}
					})
				).ok()
			).toBeTruthy();
		}
		const invDetail = await request.get(`${api}/api/billing/invoices/${inv.id}`, {
			headers: bearer(admin)
		});
		const invBody = (JSON.parse(await invDetail.text()).data ??
			JSON.parse(await invDetail.text())) as {
			number: string;
		};

		const p1 = await request.get(
			`${api}/api/billing/patients/${patient.id}/financial-history?page=1&limit=2`,
			{ headers: bearer(admin) }
		);
		const p2 = await request.get(
			`${api}/api/billing/patients/${patient.id}/financial-history?page=2&limit=2`,
			{ headers: bearer(admin) }
		);
		const body1 = (JSON.parse(await p1.text()).data ?? JSON.parse(await p1.text())) as {
			data: { sortKey: string }[];
			totalPages: number;
		};
		const body2 = (JSON.parse(await p2.text()).data ?? JSON.parse(await p2.text())) as {
			data: { sortKey: string }[];
		};
		const keys = new Set<string>();
		for (const ev of [...body1.data, ...body2.data]) {
			expect(keys.has(ev.sortKey)).toBe(false);
			keys.add(ev.sortKey);
		}

		await login(facturationEmail);
		await page.goto(`/billing/patients/${patient.id}/statement`);
		await expect(page.getByTestId('financial-statement-history')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('financial-statement-history-meta')).toContainText(
			`/ ${body1.totalPages}`
		);
		await page.getByTestId('financial-statement-history-next').click();
		await expect(page.getByTestId('financial-statement-history-meta')).toContainText('Page 2');

		await page.getByTestId('financial-statement-filter-invoice-id').fill(String(inv.id));
		await page.getByTestId('financial-statement-filter-submit').click();
		await expect(page.getByTestId('financial-statement-history-row-0')).toBeVisible({
			timeout: 15_000
		});
		await expect(page.getByTestId('financial-statement-history-row-0')).toContainText(
			invBody.number
		);
	});
});
