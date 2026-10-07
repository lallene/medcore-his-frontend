import { expect, test, type APIRequestContext } from '@playwright/test';

const api = process.env.QA_API_URL || 'http://127.0.0.1:8080';
const adminEmail = process.env.QA_ADMIN_EMAIL || 'admin@medcore.local';
const password = process.env.QA_ADMIN_PASSWORD || 'admin123';

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

async function loginApi(request: APIRequestContext, email: string) {
	const res = await request.post(`${api}/api/auth/login`, {
		data: { email, password }
	});
	expect(res.ok(), await res.text()).toBeTruthy();
	const body = JSON.parse(await res.text()) as { token?: string; accessToken?: string };
	return body.token || body.accessToken!;
}

async function seedIssuedInvoice(request: APIRequestContext, token: string, amount: number) {
	const patients = await request.get(`${api}/api/patients?limit=5`, { headers: bearer(token) });
	expect(patients.ok()).toBeTruthy();
	const plist = JSON.parse(await patients.text()) as { data?: Array<{ id: number }> };
	const patientId = plist.data?.[0]?.id;
	expect(patientId).toBeTruthy();
	const tariffs = await request.get(`${api}/api/billing/tariffs`, { headers: bearer(token) });
	expect(tariffs.ok()).toBeTruthy();
	const tlist = JSON.parse(await tariffs.text()) as Array<{
		id: number;
		unitPrice: number;
		actType: string;
	}>;
	let tariff = tlist.find((x) => x.unitPrice === amount);
	if (!tariff) {
		const created = await request.post(`${api}/api/billing/tariffs`, {
			headers: bearer(token),
			data: {
				actType: 'CONSULTATION',
				code: `QA-HC-${Date.now()}`,
				label: 'QA H-C',
				unitPrice: amount,
				effectiveFrom: new Date().toISOString()
			}
		});
		expect(created.ok(), await created.text()).toBeTruthy();
		tariff = JSON.parse(await created.text()) as { id: number; unitPrice: number; actType: string };
	}
	const acts = await request.get(`${api}/api/billing/billable-acts?patientId=${patientId}`, {
		headers: bearer(token)
	});
	const actBody = JSON.parse(await acts.text()) as Array<{ actType: string; referenceId: number }>;
	const act = actBody.find((a) => a.actType === 'CONSULTATION') ?? actBody[0];
	expect(act).toBeTruthy();
	const inv = await request.post(`${api}/api/billing/invoices`, {
		headers: bearer(token),
		data: {
			patientId,
			lines: [{ actType: act.actType, referenceId: act.referenceId, tariffId: tariff!.id }]
		}
	});
	expect([200, 201].includes(inv.status()), await inv.text()).toBeTruthy();
	const draft = (JSON.parse(await inv.text()).data ?? JSON.parse(await inv.text())) as {
		id: number;
	};
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
			data: { amount: 10_000, reason: 'QA-29F-HC-001 réduction', idempotencyKey: cnKey }
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
			data: { reason: 'Should block', idempotencyKey: revKey }
		});
		expect(rev.status()).toBe(409);
		const err = await rev.text();
		expect(/CREDIT_REVERSAL_BLOCKED|crédit client/i.test(err)).toBeTruthy();
	});
});
