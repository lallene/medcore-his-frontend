/**
 * LOT29F-I-B — Genuine refund execution (APPROVED → EXECUTED).
 * CASH: REFUND_OUT + ledger REFUND. External: record completed off-system restitution.
 */
import { expect, type APIRequestContext } from '@playwright/test';
import { test } from '../fixtures/medcore';

const api = process.env.QA_API_URL ?? 'http://127.0.0.1:18082';
const password = process.env.QA_ADMIN_PASSWORD ?? 'admin123';
const adminEmail = process.env.QA_ADMIN_EMAIL ?? 'admin@medcore.local';
const cashierEmail = 'demo.caissiere@medcore.local';
const accountantEmail = 'demo.comptable@medcore.local';

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

function unwrap<T>(text: string): T {
	const parsed = JSON.parse(text);
	return (parsed.data ?? parsed) as T;
}

async function createPatient(request: APIRequestContext, token: string, tag: string) {
	const nom = `QA29FIB-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e5)}`;
	const response = await request.post(`${api}/api/patients`, {
		headers: bearer(token),
		data: {
			nom,
			prenoms: 'Exec',
			sexe: 'M',
			dateNaissance: '1990-01-15',
			telephone: `+22507${String(Date.now()).slice(-8)}`,
			isAssure: false
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
			code: `QA29IB-${stamp}`.slice(0, 20),
			label: `Acte IB ${stamp}`,
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
			code: `T29IB-${stamp}`.slice(0, 20),
			label: `Tarif 29IB ${stamp}`,
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
	const actBody = unwrap<{ id: number }>(actText);
	const invoice = await request.post(`${api}/api/billing/invoices`, {
		headers: bearer(token),
		data: {
			patientId,
			lines: [{ actType: 'PERFORMED_ACT', referenceId: actBody.id, tariffId: tariffBody.id }]
		}
	});
	const invText = await invoice.text();
	expect([200, 201].includes(invoice.status()), invText).toBeTruthy();
	const draft = unwrap<{ id: number }>(invText);
	const issued = await request.post(`${api}/api/billing/invoices/${draft.id}/issue`, {
		headers: bearer(token)
	});
	expect(issued.ok(), await issued.text()).toBeTruthy();
	return unwrap<{ id: number }>(await issued.text());
}

async function earnCredit(
	request: APIRequestContext,
	token: string,
	patientId: number,
	credit: number,
	tag: string
) {
	const earn = await seedIssuedInvoice(request, token, patientId, 50_000, `${tag}e`);
	const payKey = `qa-ib-${tag}-pay-${Date.now()}`;
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
	const cnKey = `qa-ib-${tag}-cn-${Date.now()}`;
	const cn = await request.post(`${api}/api/billing/invoices/${earn.id}/credit-notes`, {
		headers: { ...bearer(token), 'Idempotency-Key': cnKey },
		data: { amount: credit, reason: `Crédit IB ${tag}`, idempotencyKey: cnKey }
	});
	expect(cn.ok(), await cn.text()).toBeTruthy();
	const body = unwrap<{ creditHolderPartyId?: number; customerCreditAmount: number }>(
		await cn.text()
	);
	expect(body.customerCreditAmount).toBe(credit);
	return body.creditHolderPartyId as number;
}

async function summary(
	request: APIRequestContext,
	token: string,
	holderPartyId: number,
	patientId: number
) {
	const res = await request.get(
		`${api}/api/billing/credit-summary?holderPartyId=${holderPartyId}&patientId=${patientId}`,
		{ headers: bearer(token) }
	);
	expect(res.ok(), await res.text()).toBeTruthy();
	return unwrap<{
		ledgerAvailable: number;
		reservedForRefund: number;
		spendableCredit: number;
	}>(await res.text());
}

async function requestRefund(
	request: APIRequestContext,
	token: string,
	data: {
		patientId: number;
		holderPartyId: number;
		amount: number;
		intendedMethod: string;
		tag: string;
	}
) {
	const key = `qa-ib-req-${data.tag}-${Date.now()}-${Math.floor(Math.random() * 1e5)}`;
	return request.post(`${api}/api/billing/refunds`, {
		headers: { ...bearer(token), 'Idempotency-Key': key },
		data: {
			patientId: data.patientId,
			holderPartyId: data.holderPartyId,
			amount: data.amount,
			reasonCode: 'UNUSED_ADVANCE',
			intendedMethod: data.intendedMethod,
			idempotencyKey: key
		}
	});
}

async function ensureRegister(request: APIRequestContext, token: string) {
	const list = await request.get(`${api}/api/cash/registers`, { headers: bearer(token) });
	expect(list.ok()).toBeTruthy();
	const regs = (await list.json()) as Array<{ id: number; code: string; active: boolean }>;
	const active = regs.find((r) => r.active);
	if (active) return active;
	const code = `IB-${Date.now().toString(36)}`.slice(0, 20);
	const created = await request.post(`${api}/api/cash/registers`, {
		headers: bearer(token),
		data: { code, name: `Caisse ${code}`, location: 'QA', active: true }
	});
	expect([200, 201].includes(created.status()), await created.text()).toBeTruthy();
	return (await created.json()) as { id: number; code: string };
}

async function precloseCurrent(request: APIRequestContext, token: string) {
	const cur = await request.get(`${api}/api/cash/sessions/current`, { headers: bearer(token) });
	expect(cur.ok()).toBeTruthy();
	const curBody = await cur.json();
	if (curBody?.session?.id) {
		const key = `qa-ib-preclose-${Date.now()}`;
		await request.post(`${api}/api/cash/sessions/${curBody.session.id}/close`, {
			headers: { ...bearer(token), 'Idempotency-Key': key },
			data: {
				countedCashAmount: curBody.expectedCash ?? curBody.session.openingFloat ?? 0,
				note: 'QA IB cleanup',
				idempotencyKey: key
			}
		});
	}
}

async function openCashSession(
	request: APIRequestContext,
	token: string,
	registerId: number,
	openingFloat: number,
	tag: string
) {
	await precloseCurrent(request, token);
	const key = `qa-ib-open-${tag}-${Date.now()}`;
	const opened = await request.post(`${api}/api/cash/sessions/open`, {
		headers: { ...bearer(token), 'Idempotency-Key': key },
		data: { cashRegisterId: registerId, openingFloat, idempotencyKey: key }
	});
	expect(opened.ok(), await opened.text()).toBeTruthy();
	return await opened.json();
}

type RefundRow = {
	id: number;
	status: string;
	amount: number;
	approvedBy?: number;
	execution?: {
		id: number;
		method: string;
		cashSessionId?: number;
		cashMovementId?: number;
		externalReference?: string;
	};
};

test.describe('LOT29F-I-B refund execution', () => {
	test('QA-29F-IB-001 @critical CASH execute: ledger REFUND + REFUND_OUT + spendable invariant', async ({
		request,
		login,
		page
	}) => {
		test.setTimeout(180_000);
		const admin = await loginApi(request, adminEmail);
		const cashier = await loginApi(request, cashierEmail);
		const patient = await createPatient(request, admin, '001');
		const holder = await earnCredit(request, admin, patient.id, 50_000, '001');

		const before = await summary(request, admin, holder, patient.id);
		expect(before.ledgerAvailable).toBe(50_000);
		expect(before.spendableCredit).toBe(50_000);

		const created = await requestRefund(request, cashier, {
			patientId: patient.id,
			holderPartyId: holder,
			amount: 20_000,
			intendedMethod: 'CASH',
			tag: '001'
		});
		expect(created.ok(), await created.text()).toBeTruthy();
		const refund = unwrap<RefundRow>(await created.text());

		const reserved = await summary(request, admin, holder, patient.id);
		expect(reserved.reservedForRefund).toBe(20_000);
		expect(reserved.spendableCredit).toBe(30_000);
		expect(reserved.ledgerAvailable).toBe(50_000);

		const approved = await request.post(`${api}/api/billing/refunds/${refund.id}/approve`, {
			headers: bearer(admin),
			data: {}
		});
		expect(approved.ok(), await approved.text()).toBeTruthy();

		const reg = await ensureRegister(request, admin);
		const session = await openCashSession(request, cashier, reg.id, 50_000, '001');
		const expectedBefore = session.expectedCash as number;
		const collectedBefore = session.cashCollected as number;

		const execKey = `qa-ib-exec-001-${Date.now()}`;
		const executed = await request.post(`${api}/api/billing/refunds/${refund.id}/execute`, {
			headers: { ...bearer(cashier), 'Idempotency-Key': execKey },
			data: { idempotencyKey: execKey }
		});
		expect(executed.ok(), await executed.text()).toBeTruthy();
		const row = unwrap<RefundRow>(await executed.text());
		expect(row.status).toBe('EXECUTED');
		expect(row.execution?.method).toBe('CASH');
		expect(row.execution?.cashMovementId).toBeTruthy();
		expect(row.execution?.cashSessionId).toBe(session.session.id);

		const after = await summary(request, admin, holder, patient.id);
		expect(after.ledgerAvailable).toBe(30_000);
		expect(after.reservedForRefund).toBe(0);
		expect(after.spendableCredit).toBe(30_000);

		const sessAfter = await request.get(`${api}/api/cash/sessions/${session.session.id}`, {
			headers: bearer(cashier)
		});
		expect(sessAfter.ok(), await sessAfter.text()).toBeTruthy();
		const sumAfter = await sessAfter.json();
		expect(sumAfter.expectedCash).toBe(expectedBefore - 20_000);
		expect(sumAfter.cashCollected).toBe(collectedBefore);
		expect(sumAfter.cashMovementRefundOut).toBe(20_000);

		await login(cashierEmail);
		await page.goto(`/billing/refunds?patientId=${patient.id}`);
		await expect(page.getByTestId('refunds-page')).toBeVisible({ timeout: 20_000 });
		await page.getByTestId(`refund-open-${refund.id}`).click();
		await expect(page.getByTestId('refund-detail-status')).toHaveText('Remboursement effectué');
		await expect(page.getByTestId('refund-execution-block')).toBeVisible();
		await expect(page.getByTestId('refund-execute')).toHaveCount(0);
		await expect(page.getByTestId('refund-cancel')).toHaveCount(0);
	});

	test('QA-29F-IB-002 @critical external execute: ledger REFUND, no CashMovement', async ({
		request
	}) => {
		test.setTimeout(150_000);
		const admin = await loginApi(request, adminEmail);
		const cashier = await loginApi(request, cashierEmail);
		const patient = await createPatient(request, admin, '002');
		const holder = await earnCredit(request, admin, patient.id, 30_000, '002');

		const created = await requestRefund(request, cashier, {
			patientId: patient.id,
			holderPartyId: holder,
			amount: 10_000,
			intendedMethod: 'TRANSFER',
			tag: '002'
		});
		expect(created.ok(), await created.text()).toBeTruthy();
		const refund = unwrap<RefundRow>(await created.text());
		const approved = await request.post(`${api}/api/billing/refunds/${refund.id}/approve`, {
			headers: bearer(admin),
			data: {}
		});
		expect(approved.ok(), await approved.text()).toBeTruthy();

		const execKey = `qa-ib-exec-002-${Date.now()}`;
		const executed = await request.post(`${api}/api/billing/refunds/${refund.id}/execute`, {
			headers: { ...bearer(cashier), 'Idempotency-Key': execKey },
			data: {
				idempotencyKey: execKey,
				externalReference: `VIR-${Date.now()}`,
				beneficiaryRailRef: 'CI00-QA-IB-002'
			}
		});
		expect(executed.ok(), await executed.text()).toBeTruthy();
		const row = unwrap<RefundRow>(await executed.text());
		expect(row.status).toBe('EXECUTED');
		expect(row.execution?.method).toBe('TRANSFER');
		expect(row.execution?.externalReference).toMatch(/^VIR-/);
		expect(row.execution?.cashMovementId ?? null).toBeFalsy();
		expect(row.execution?.cashSessionId ?? null).toBeFalsy();

		const after = await summary(request, admin, holder, patient.id);
		expect(after.ledgerAvailable).toBe(20_000);
		expect(after.reservedForRefund).toBe(0);
		expect(after.spendableCredit).toBe(20_000);
	});

	test('QA-29F-IB-003 @critical approver cannot execute (SoD)', async ({ request }) => {
		test.setTimeout(150_000);
		const admin = await loginApi(request, adminEmail);
		const cashier = await loginApi(request, cashierEmail);
		const patient = await createPatient(request, admin, '003');
		const holder = await earnCredit(request, admin, patient.id, 20_000, '003');

		const created = await requestRefund(request, cashier, {
			patientId: patient.id,
			holderPartyId: holder,
			amount: 5_000,
			intendedMethod: 'TRANSFER',
			tag: '003'
		});
		expect(created.ok(), await created.text()).toBeTruthy();
		const refund = unwrap<RefundRow>(await created.text());

		const approved = await request.post(`${api}/api/billing/refunds/${refund.id}/approve`, {
			headers: bearer(admin),
			data: {}
		});
		expect(approved.ok(), await approved.text()).toBeTruthy();

		// Admin approved — admin must not execute even with execute permission.
		const execKey = `qa-ib-sod-${Date.now()}`;
		const denied = await request.post(`${api}/api/billing/refunds/${refund.id}/execute`, {
			headers: { ...bearer(admin), 'Idempotency-Key': execKey },
			data: {
				idempotencyKey: execKey,
				externalReference: 'SOD-BLOCK',
				beneficiaryRailRef: 'CI00'
			}
		});
		expect(denied.status()).toBeGreaterThanOrEqual(400);
		const still = await request.get(`${api}/api/billing/refunds/${refund.id}`, {
			headers: bearer(admin)
		});
		expect(still.ok()).toBeTruthy();
		const row = unwrap<RefundRow>(await still.text());
		expect(row.status).toBe('APPROVED');
		const sum = await summary(request, admin, holder, patient.id);
		expect(sum.reservedForRefund).toBe(5_000);
		expect(sum.ledgerAvailable).toBe(20_000);
	});

	test('QA-29F-IB-004 @critical double-click / same idempotency key → one economic effect', async ({
		request
	}) => {
		test.setTimeout(150_000);
		const admin = await loginApi(request, adminEmail);
		const cashier = await loginApi(request, cashierEmail);
		const patient = await createPatient(request, admin, '004');
		const holder = await earnCredit(request, admin, patient.id, 25_000, '004');

		const created = await requestRefund(request, cashier, {
			patientId: patient.id,
			holderPartyId: holder,
			amount: 8_000,
			intendedMethod: 'CARD',
			tag: '004'
		});
		expect(created.ok(), await created.text()).toBeTruthy();
		const refund = unwrap<RefundRow>(await created.text());
		const approved = await request.post(`${api}/api/billing/refunds/${refund.id}/approve`, {
			headers: bearer(admin),
			data: {}
		});
		expect(approved.ok(), await approved.text()).toBeTruthy();

		const execKey = `qa-ib-dup-${Date.now()}`;
		const payload = {
			idempotencyKey: execKey,
			externalReference: 'CARD-DUP-1',
			beneficiaryRailRef: '****4242'
		};
		const [a, b] = await Promise.all([
			request.post(`${api}/api/billing/refunds/${refund.id}/execute`, {
				headers: { ...bearer(cashier), 'Idempotency-Key': execKey },
				data: payload
			}),
			request.post(`${api}/api/billing/refunds/${refund.id}/execute`, {
				headers: { ...bearer(cashier), 'Idempotency-Key': execKey },
				data: payload
			})
		]);
		expect(a.ok() || b.ok()).toBeTruthy();
		const okBody = unwrap<RefundRow>(await (a.ok() ? a : b).text());
		expect(okBody.status).toBe('EXECUTED');
		expect(okBody.execution?.id).toBeTruthy();

		const after = await summary(request, admin, holder, patient.id);
		expect(after.ledgerAvailable).toBe(17_000);
		expect(after.reservedForRefund).toBe(0);
	});

	test('QA-29F-IB-005 @critical CASH execute vs session close serializes coherently', async ({
		request
	}) => {
		test.setTimeout(180_000);
		const admin = await loginApi(request, adminEmail);
		const cashier = await loginApi(request, cashierEmail);
		const patient = await createPatient(request, admin, '005');
		const holder = await earnCredit(request, admin, patient.id, 40_000, '005');

		const created = await requestRefund(request, cashier, {
			patientId: patient.id,
			holderPartyId: holder,
			amount: 12_000,
			intendedMethod: 'CASH',
			tag: '005'
		});
		expect(created.ok(), await created.text()).toBeTruthy();
		const refund = unwrap<RefundRow>(await created.text());
		const approved = await request.post(`${api}/api/billing/refunds/${refund.id}/approve`, {
			headers: bearer(admin),
			data: {}
		});
		expect(approved.ok(), await approved.text()).toBeTruthy();

		const reg = await ensureRegister(request, admin);
		const session = await openCashSession(request, cashier, reg.id, 40_000, '005');
		const sessionId = session.session.id as number;

		const execKey = `qa-ib-race-${Date.now()}`;
		const closeKey = `qa-ib-close-${Date.now()}`;
		const [execRes, closeRes] = await Promise.all([
			request.post(`${api}/api/billing/refunds/${refund.id}/execute`, {
				headers: { ...bearer(cashier), 'Idempotency-Key': execKey },
				data: { idempotencyKey: execKey }
			}),
			request.post(`${api}/api/cash/sessions/${sessionId}/close`, {
				headers: { ...bearer(cashier), 'Idempotency-Key': closeKey },
				data: {
					countedCashAmount: session.expectedCash ?? 40_000,
					note: 'QA race',
					idempotencyKey: closeKey
				}
			})
		]);

		const execOk = execRes.ok();
		const closeOk = closeRes.ok();
		// Exactly one coherent outcome: either refund included before close, or close wins.
		expect(execOk || closeOk).toBeTruthy();

		const finalRefund = unwrap<RefundRow>(
			await (
				await request.get(`${api}/api/billing/refunds/${refund.id}`, {
					headers: bearer(admin)
				})
			).text()
		);
		const finalSess = await (
			await request.get(`${api}/api/cash/sessions/${sessionId}`, {
				headers: bearer(cashier)
			})
		).json();

		if (finalRefund.status === 'EXECUTED') {
			expect(finalRefund.execution?.cashSessionId).toBe(sessionId);
			expect(finalSess.cashMovementRefundOut ?? 0).toBe(12_000);
			if (finalSess.session.status === 'CLOSED') {
				expect(finalSess.expectedCash).toBe((session.expectedCash as number) - 12_000);
			}
		} else {
			expect(finalRefund.status).toBe('APPROVED');
			expect(finalSess.session.status).toBe('CLOSED');
			expect(finalSess.cashMovementRefundOut ?? 0).toBe(0);
		}
	});

	test('comptable cannot execute (RBAC)', async ({ request }) => {
		test.setTimeout(120_000);
		const admin = await loginApi(request, adminEmail);
		const cashier = await loginApi(request, cashierEmail);
		const accountant = await loginApi(request, accountantEmail);
		const patient = await createPatient(request, admin, 'rbac');
		const holder = await earnCredit(request, admin, patient.id, 15_000, 'rbac');

		const created = await requestRefund(request, cashier, {
			patientId: patient.id,
			holderPartyId: holder,
			amount: 4_000,
			intendedMethod: 'TRANSFER',
			tag: 'rbac'
		});
		expect(created.ok(), await created.text()).toBeTruthy();
		const refund = unwrap<RefundRow>(await created.text());
		const approved = await request.post(`${api}/api/billing/refunds/${refund.id}/approve`, {
			headers: bearer(admin),
			data: {}
		});
		expect(approved.ok(), await approved.text()).toBeTruthy();

		const denied = await request.post(`${api}/api/billing/refunds/${refund.id}/execute`, {
			headers: { ...bearer(accountant), 'Idempotency-Key': `qa-ib-rbac-${Date.now()}` },
			data: {
				idempotencyKey: `qa-ib-rbac-${Date.now()}`,
				externalReference: 'NOPE',
				beneficiaryRailRef: 'CI00'
			}
		});
		expect(denied.status()).toBe(403);
	});
});
