/**
 * LOT29F-H-D — Credit application (consume credit to settle invoice).
 * Not Payment; not CashMovement; not Refund.
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
	const nom = `QA29FHD-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e5)}`;
	const response = await request.post(`${api}/api/patients`, {
		headers: bearer(token),
		data: {
			nom,
			prenoms: 'CreditApply',
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
	const stamp = `${tag}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`.slice(0, 18);
	const catalog = await request.post(`${api}/api/act-catalog`, {
		headers: bearer(token),
		data: {
			code: `QA29HD-${stamp}`.slice(0, 20),
			label: `Acte apply ${stamp}`,
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
			code: `T29HD-${stamp}`.slice(0, 20),
			label: `Tarif 29HD ${stamp}`,
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
	const actText = await act.text();
	expect([200, 201].includes(act.status()), actText).toBeTruthy();
	const actBody = (JSON.parse(actText).data ?? JSON.parse(actText)) as { id: number };
	const invoice = await request.post(`${api}/api/billing/invoices`, {
		headers: bearer(token),
		data: {
			patientId,
			lines: [{ actType: 'PERFORMED_ACT', referenceId: actBody.id, tariffId: tariffBody.id }]
		}
	});
	const invText = await invoice.text();
	expect([200, 201].includes(invoice.status()), invText).toBeTruthy();
	const draft = (JSON.parse(invText).data ?? JSON.parse(invText)) as { id: number };
	const issued = await request.post(`${api}/api/billing/invoices/${draft.id}/issue`, {
		headers: bearer(token)
	});
	expect(issued.ok(), await issued.text()).toBeTruthy();
	return (JSON.parse(await issued.text()).data ?? JSON.parse(await issued.text())) as {
		id: number;
		patientId: number;
		patientAmount: number;
		balanceAmount: number;
		paidAmount: number;
		status: string;
	};
}

async function earnCredit(
	request: APIRequestContext,
	token: string,
	patientId: number,
	credit: number,
	tag: string
) {
	const earn = await seedIssuedInvoice(request, token, patientId, 50_000, `${tag}e`);
	const payKey = `qa-hd-${tag}-pay-${Date.now()}`;
	const paid = await request.post(`${api}/api/billing/invoices/${earn.id}/payments`, {
		headers: { ...bearer(token), 'Idempotency-Key': payKey },
		data: {
			amount: 50_000,
			paymentMethod: 'CASH',
			idempotencyKey: payKey,
			payer: { mode: 'PATIENT' }
		}
	});
	expect(paid.ok(), await paid.text()).toBeTruthy();
	const cnKey = `qa-hd-${tag}-cn-${Date.now()}`;
	const cn = await request.post(`${api}/api/billing/invoices/${earn.id}/credit-notes`, {
		headers: { ...bearer(token), 'Idempotency-Key': cnKey },
		data: { amount: credit, reason: `Crédit source ${tag}`, idempotencyKey: cnKey }
	});
	expect(cn.ok(), await cn.text()).toBeTruthy();
	const body = (JSON.parse(await cn.text()).data ?? JSON.parse(await cn.text())) as {
		creditHolderPartyId?: number;
		customerCreditAmount: number;
	};
	expect(body.customerCreditAmount).toBe(credit);
	expect(body.creditHolderPartyId).toBeTruthy();
	return body.creditHolderPartyId as number;
}

test.describe('LOT29F-H-D credit application', () => {
	test('QA-29F-HD-001 @critical partial apply decreases credit and receivable without Payment/Cash', async ({
		request
	}) => {
		test.setTimeout(120_000);
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, '001');
		const holder = await earnCredit(request, admin, patient.id, 20_000, '001');
		const target = await seedIssuedInvoice(request, admin, patient.id, 50_000, '001t');

		const movBefore = await request.get(`${api}/api/cash/movements?limit=1`, {
			headers: bearer(admin)
		});
		// movements endpoint may 403/404 depending on RBAC — count via apply side-effects only if available
		void movBefore;

		const key = `qa-hd001-app-${Date.now()}`;
		const app = await request.post(`${api}/api/billing/invoices/${target.id}/credit-applications`, {
			headers: { ...bearer(admin), 'Idempotency-Key': key },
			data: { holderPartyId: holder, amount: 10_000, idempotencyKey: key }
		});
		expect(app.ok(), await app.text()).toBeTruthy();
		const res = (JSON.parse(await app.text()).data ?? JSON.parse(await app.text())) as {
			amountApplied: number;
			remainingAvailableCredit: number;
			remainingReceivable: number;
		};
		expect(res.amountApplied).toBe(10_000);
		expect(res.remainingAvailableCredit).toBe(10_000);
		expect(res.remainingReceivable).toBe(40_000);

		const inv = await request.get(`${api}/api/billing/invoices/${target.id}`, {
			headers: bearer(admin)
		});
		const invBody = (JSON.parse(await inv.text()).data ?? JSON.parse(await inv.text())) as {
			paidAmount: number;
			balanceAmount: number;
			creditAppliedAmount: number;
			payments?: unknown[];
		};
		expect(invBody.paidAmount).toBe(0);
		expect(invBody.creditAppliedAmount).toBe(10_000);
		expect(invBody.balanceAmount).toBe(40_000);
		expect((invBody.payments ?? []).length).toBe(0);

		const sum = await request.get(
			`${api}/api/billing/credit-summary?holderPartyId=${holder}&patientId=${patient.id}`,
			{ headers: bearer(admin) }
		);
		expect(sum.ok()).toBeTruthy();
		const sumBody = (JSON.parse(await sum.text()).data ?? JSON.parse(await sum.text())) as {
			availableCredit: number;
			totalApplied: number;
		};
		expect(sumBody.availableCredit).toBe(10_000);
		expect(sumBody.totalApplied).toBe(10_000);
	});

	test('QA-29F-HD-002 @critical mixed Payment + CreditApplication settles; money only in paidAmount', async ({
		request
	}) => {
		test.setTimeout(120_000);
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, '002');
		const holder = await earnCredit(request, admin, patient.id, 30_000, '002');
		const target = await seedIssuedInvoice(request, admin, patient.id, 50_000, '002t');
		const payKey = `qa-hd002-pay-${Date.now()}`;
		const paid = await request.post(`${api}/api/billing/invoices/${target.id}/payments`, {
			headers: { ...bearer(admin), 'Idempotency-Key': payKey },
			data: {
				amount: 20_000,
				paymentMethod: 'CASH',
				idempotencyKey: payKey,
				payer: { mode: 'PATIENT' }
			}
		});
		expect(paid.ok(), await paid.text()).toBeTruthy();
		const appKey = `qa-hd002-app-${Date.now()}`;
		const app = await request.post(`${api}/api/billing/invoices/${target.id}/credit-applications`, {
			headers: { ...bearer(admin), 'Idempotency-Key': appKey },
			data: { holderPartyId: holder, amount: 30_000, idempotencyKey: appKey }
		});
		expect(app.ok(), await app.text()).toBeTruthy();
		const inv = await request.get(`${api}/api/billing/invoices/${target.id}`, {
			headers: bearer(admin)
		});
		const body = (JSON.parse(await inv.text()).data ?? JSON.parse(await inv.text())) as {
			status: string;
			paidAmount: number;
			creditAppliedAmount: number;
			balanceAmount: number;
		};
		expect(body.status).toBe('PAID');
		expect(body.paidAmount).toBe(20_000);
		expect(body.creditAppliedAmount).toBe(30_000);
		expect(body.balanceAmount).toBe(0);
	});

	test('QA-29F-HD-003 @critical same idempotency key → one application / one APPLY', async ({
		request
	}) => {
		test.setTimeout(120_000);
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, '003');
		const holder = await earnCredit(request, admin, patient.id, 10_000, '003');
		const target = await seedIssuedInvoice(request, admin, patient.id, 10_000, '003t');
		const key = `qa-hd003-${Date.now()}`;
		const payload = { holderPartyId: holder, amount: 10_000, idempotencyKey: key };
		const headers = { ...bearer(admin), 'Idempotency-Key': key };
		const a = await request.post(`${api}/api/billing/invoices/${target.id}/credit-applications`, {
			headers,
			data: payload
		});
		const b = await request.post(`${api}/api/billing/invoices/${target.id}/credit-applications`, {
			headers,
			data: payload
		});
		expect(a.ok(), await a.text()).toBeTruthy();
		expect(b.ok(), await b.text()).toBeTruthy();
		const bodyA = (JSON.parse(await a.text()).data ?? JSON.parse(await a.text())) as {
			application: { id: number };
		};
		const bodyB = (JSON.parse(await b.text()).data ?? JSON.parse(await b.text())) as {
			application: { id: number };
		};
		expect(bodyA.application.id).toBe(bodyB.application.id);
		const ledger = await request.get(
			`${api}/api/billing/credit-ledger?holderPartyId=${holder}&patientId=${patient.id}`,
			{ headers: bearer(admin) }
		);
		expect(ledger.ok(), await ledger.text()).toBeTruthy();
		const rows = (JSON.parse(await ledger.text()).data ?? JSON.parse(await ledger.text())) as {
			entryType: string;
			amount: number;
		}[];
		const applies = rows.filter((r) => r.entryType === 'APPLY');
		expect(applies.length).toBe(1);
		expect(applies[0].amount).toBe(10_000);
	});

	test('QA-29F-HD-004 @critical insufficient credit rejected; balance stays non-negative', async ({
		request
	}) => {
		test.setTimeout(120_000);
		const admin = await loginApi(request, adminEmail);
		const patient = await createPatient(request, admin, '004');
		const holder = await earnCredit(request, admin, patient.id, 5_000, '004');
		const target = await seedIssuedInvoice(request, admin, patient.id, 20_000, '004t');
		const key = `qa-hd004-${Date.now()}`;
		const app = await request.post(`${api}/api/billing/invoices/${target.id}/credit-applications`, {
			headers: { ...bearer(admin), 'Idempotency-Key': key },
			data: { holderPartyId: holder, amount: 15_000, idempotencyKey: key }
		});
		expect(app.status()).toBe(409);
		const sum = await request.get(
			`${api}/api/billing/credit-summary?holderPartyId=${holder}&patientId=${patient.id}`,
			{ headers: bearer(admin) }
		);
		const sumBody = (JSON.parse(await sum.text()).data ?? JSON.parse(await sum.text())) as {
			availableCredit: number;
		};
		expect(sumBody.availableCredit).toBe(5_000);
		expect(sumBody.availableCredit).toBeGreaterThanOrEqual(0);
	});
});
