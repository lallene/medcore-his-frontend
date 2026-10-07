/**
 * LOT29F-H-C — Credit ledger + paid/partial CreditNote.
 * Credit can be created/read; not spent; not refunded.
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
	const nom = `QA29FHC-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e5)}`;
	const response = await request.post(`${api}/api/patients`, {
		headers: bearer(token),
		data: {
			nom,
			prenoms: 'Credit',
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

async function seedIssuedInvoice(request: APIRequestContext, token: string, unitPrice: number) {
	const patient = await createPatient(request, token, 'INV');
	const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
	const catalog = await request.post(`${api}/api/act-catalog`, {
		headers: bearer(token),
		data: {
			code: `QA29HC-${stamp}`.slice(0, 20),
			label: `Acte credit ${stamp}`,
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
			code: `T29HC-${stamp}`.slice(0, 20),
			label: `Tarif 29HC ${stamp}`,
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
	const draft = (JSON.parse(invText).data ?? JSON.parse(invText)) as { id: number };
	const issued = await request.post(`${api}/api/billing/invoices/${draft.id}/issue`, {
		headers: bearer(token)
	});
	expect(issued.ok(), await issued.text()).toBeTruthy();
	return (JSON.parse(await issued.text()).data ?? JSON.parse(await issued.text())) as {
		id: number;
		patientAmount: number;
		balanceAmount: number;
	};
}

test.describe('LOT29F-H-C credit ledger', () => {
	test('QA-29F-HC-001 @critical paid invoice partial CN creates customer credit', async ({
		request
	}) => {
		test.setTimeout(120_000);
		const admin = await loginApi(request, adminEmail);
		const invoice = await seedIssuedInvoice(request, admin, 50_000);
		const payKey = `qa-hc001-pay-${Date.now()}`;
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
		const cnKey = `qa-hc001-cn-${Date.now()}`;
		const cn = await request.post(`${api}/api/billing/invoices/${invoice.id}/credit-notes`, {
			headers: { ...bearer(admin), 'Idempotency-Key': cnKey },
			data: { amount: 10_000, reason: 'QA-29F-HC-001 reduction', idempotencyKey: cnKey }
		});
		expect(cn.ok(), await cn.text()).toBeTruthy();
		const body = (JSON.parse(await cn.text()).data ?? JSON.parse(await cn.text())) as {
			customerCreditAmount: number;
			balanceAmount: number;
			creditedAmount: number;
		};
		expect(body.customerCreditAmount).toBe(10_000);
		expect(body.balanceAmount).toBe(0);
		expect(body.creditedAmount).toBe(10_000);
	});

	test('QA-29F-HC-002 @critical partial-paid CN remaining receivable zero credit', async ({
		request
	}) => {
		test.setTimeout(120_000);
		const admin = await loginApi(request, adminEmail);
		const invoice = await seedIssuedInvoice(request, admin, 50_000);
		const payKey = `qa-hc002-pay-${Date.now()}`;
		const paid = await request.post(`${api}/api/billing/invoices/${invoice.id}/payments`, {
			headers: { ...bearer(admin), 'Idempotency-Key': payKey },
			data: {
				amount: 30_000,
				paymentMethod: 'CASH',
				idempotencyKey: payKey,
				payer: { mode: 'PATIENT' }
			}
		});
		expect(paid.ok(), await paid.text()).toBeTruthy();
		const cnKey = `qa-hc002-cn-${Date.now()}`;
		const cn = await request.post(`${api}/api/billing/invoices/${invoice.id}/credit-notes`, {
			headers: { ...bearer(admin), 'Idempotency-Key': cnKey },
			data: { amount: 10_000, reason: 'QA-29F-HC-002', idempotencyKey: cnKey }
		});
		expect(cn.ok(), await cn.text()).toBeTruthy();
		const body = (JSON.parse(await cn.text()).data ?? JSON.parse(await cn.text())) as {
			customerCreditAmount: number;
			balanceAmount: number;
			status: string;
		};
		expect(body.customerCreditAmount).toBe(0);
		expect(body.balanceAmount).toBe(10_000);
		expect(body.status).toBe('PARTIALLY_PAID');
	});

	test('QA-29F-HC-003 @critical PaymentReversal blocked after positive credit', async ({
		request
	}) => {
		test.setTimeout(120_000);
		const admin = await loginApi(request, adminEmail);
		const invoice = await seedIssuedInvoice(request, admin, 40_000);
		const payKey = `qa-hc003-pay-${Date.now()}`;
		const paid = await request.post(`${api}/api/billing/invoices/${invoice.id}/payments`, {
			headers: { ...bearer(admin), 'Idempotency-Key': payKey },
			data: {
				amount: 40_000,
				paymentMethod: 'CASH',
				idempotencyKey: payKey,
				payer: { mode: 'PATIENT' }
			}
		});
		expect(paid.ok(), await paid.text()).toBeTruthy();
		const paidBody = (JSON.parse(await paid.text()).data ?? JSON.parse(await paid.text())) as {
			payments: Array<{ id: number }>;
		};
		const paymentId = paidBody.payments[0].id;
		const cnKey = `qa-hc003-cn-${Date.now()}`;
		const cn = await request.post(`${api}/api/billing/invoices/${invoice.id}/credit-notes`, {
			headers: { ...bearer(admin), 'Idempotency-Key': cnKey },
			data: { amount: 10_000, reason: 'QA-29F-HC-003', idempotencyKey: cnKey }
		});
		expect(cn.ok(), await cn.text()).toBeTruthy();
		const revKey = `qa-hc003-rev-${Date.now()}`;
		const rev = await request.post(`${api}/api/billing/payments/${paymentId}/reverse`, {
			headers: { ...bearer(admin), 'Idempotency-Key': revKey },
			data: { reason: 'Should block after credit', idempotencyKey: revKey }
		});
		expect(rev.status()).toBe(409);
		const err = await rev.text();
		expect(/CREDIT_REVERSAL_BLOCKED|credit client|crédit client/i.test(err)).toBeTruthy();
	});
});
