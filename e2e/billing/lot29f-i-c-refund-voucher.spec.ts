/**
 * LOT29F-I-C — Refund voucher numbering + reporting.
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
	const nom = `QA29FIC-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e5)}`;
	const response = await request.post(`${api}/api/patients`, {
		headers: bearer(token),
		data: {
			nom,
			prenoms: 'Voucher',
			sexe: 'M',
			dateNaissance: '1990-01-15',
			telephone: `+22507${String(Date.now()).slice(-8)}`,
			isAssure: false
		}
	});
	expect([200, 201].includes(response.status()), await response.text()).toBeTruthy();
	const patient = unwrap<{ id: number }>(await response.text());
	await request.get(`${api}/api/patients/${patient.id}/medical-record`, { headers: bearer(token) });
	return patient;
}

async function earnCredit(
	request: APIRequestContext,
	token: string,
	patientId: number,
	credit: number,
	tag: string
) {
	const stamp = `${tag}${Date.now().toString(36)}`.slice(0, 18);
	const catalog = await request.post(`${api}/api/act-catalog`, {
		headers: bearer(token),
		data: {
			code: `QAIC-${stamp}`.slice(0, 20),
			label: `Acte IC ${stamp}`,
			category: 'PROCEDURE',
			basePrice: 1,
			currency: 'XOF',
			billable: true,
			insuranceEligible: false,
			isActive: true
		}
	});
	expect([200, 201].includes(catalog.status())).toBeTruthy();
	const catalogBody = JSON.parse(await catalog.text()) as { id: number };
	const unitPrice = Math.max(credit, 50_000);
	const tariff = await request.post(`${api}/api/billing/tariffs`, {
		headers: bearer(token),
		data: {
			actType: 'PERFORMED_ACT',
			referenceId: catalogBody.id,
			code: `TIC-${stamp}`.slice(0, 20),
			label: `Tarif IC ${stamp}`,
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
	const actBody = unwrap<{ id: number }>(await act.text());
	const invoice = await request.post(`${api}/api/billing/invoices`, {
		headers: bearer(token),
		data: {
			patientId,
			lines: [{ actType: 'PERFORMED_ACT', referenceId: actBody.id, tariffId: tariffBody.id }]
		}
	});
	const draft = unwrap<{ id: number }>(await invoice.text());
	await request.post(`${api}/api/billing/invoices/${draft.id}/issue`, { headers: bearer(token) });
	const payKey = `qa-ic-${tag}-pay-${Date.now()}`;
	expect(
		(
			await request.post(`${api}/api/billing/invoices/${draft.id}/payments`, {
				headers: { ...bearer(token), 'Idempotency-Key': payKey },
				data: {
					amount: unitPrice,
					paymentMethod: 'CASH',
					idempotencyKey: payKey,
					payer: { mode: 'PATIENT' }
				}
			})
		).ok()
	).toBeTruthy();
	const cnKey = `qa-ic-${tag}-cn-${Date.now()}`;
	const cn = await request.post(`${api}/api/billing/invoices/${draft.id}/credit-notes`, {
		headers: { ...bearer(token), 'Idempotency-Key': cnKey },
		data: { amount: credit, reason: `Crédit IC ${tag}`, idempotencyKey: cnKey }
	});
	expect(cn.ok(), await cn.text()).toBeTruthy();
	return unwrap<{ creditHolderPartyId: number }>(await cn.text()).creditHolderPartyId;
}

async function ensureRegister(request: APIRequestContext, token: string) {
	const list = await request.get(`${api}/api/cash/registers`, { headers: bearer(token) });
	const regs = (await list.json()) as Array<{ id: number; active: boolean }>;
	const active = regs.find((r) => r.active);
	if (active) return active;
	const code = `IC-${Date.now().toString(36)}`.slice(0, 20);
	const created = await request.post(`${api}/api/cash/registers`, {
		headers: bearer(token),
		data: { code, name: `Caisse ${code}`, location: 'QA', active: true }
	});
	return (await created.json()) as { id: number };
}

async function openCash(
	request: APIRequestContext,
	token: string,
	registerId: number,
	float: number
) {
	const cur = await request.get(`${api}/api/cash/sessions/current`, { headers: bearer(token) });
	const curBody = await cur.json();
	if (curBody?.session?.id) {
		const key = `qa-ic-preclose-${Date.now()}`;
		await request.post(`${api}/api/cash/sessions/${curBody.session.id}/close`, {
			headers: { ...bearer(token), 'Idempotency-Key': key },
			data: {
				countedCashAmount: curBody.expectedCash ?? float,
				note: 'cleanup',
				idempotencyKey: key
			}
		});
	}
	const openKey = `qa-ic-open-${Date.now()}`;
	const opened = await request.post(`${api}/api/cash/sessions/open`, {
		headers: { ...bearer(token), 'Idempotency-Key': openKey },
		data: { cashRegisterId: registerId, openingFloat: float, idempotencyKey: openKey }
	});
	expect(opened.ok(), await opened.text()).toBeTruthy();
	return await opened.json();
}

type RefundRow = {
	id: number;
	status: string;
	refundNumber?: string;
	amount: number;
	execution?: { method: string; cashMovementId?: number };
};

test.describe('LOT29F-I-C refund voucher & report', () => {
	test('QA-29F-IC-001 @critical CASH execute assigns RMB + voucher two copies', async ({
		request,
		login,
		page
	}) => {
		test.setTimeout(180_000);
		const admin = await loginApi(request, adminEmail);
		const cashier = await loginApi(request, cashierEmail);
		const patient = await createPatient(request, admin, '001');
		const holder = await earnCredit(request, admin, patient.id, 40000, '001');

		const reqKey = `qa-ic-001-req-${Date.now()}`;
		const created = await request.post(`${api}/api/billing/refunds`, {
			headers: { ...bearer(cashier), 'Idempotency-Key': reqKey },
			data: {
				patientId: patient.id,
				holderPartyId: holder,
				amount: 15000,
				reasonCode: 'UNUSED_ADVANCE',
				intendedMethod: 'CASH',
				idempotencyKey: reqKey
			}
		});
		expect(created.ok(), await created.text()).toBeTruthy();
		const refund = unwrap<RefundRow>(await created.text());
		expect(refund.refundNumber ?? '').toBe('');

		expect(
			(
				await request.post(`${api}/api/billing/refunds/${refund.id}/approve`, {
					headers: bearer(admin),
					data: {}
				})
			).ok()
		).toBeTruthy();

		const reg = await ensureRegister(request, admin);
		await openCash(request, cashier, reg.id, 50000);
		const execKey = `qa-ic-001-exec-${Date.now()}`;
		const executed = await request.post(`${api}/api/billing/refunds/${refund.id}/execute`, {
			headers: { ...bearer(cashier), 'Idempotency-Key': execKey },
			data: { idempotencyKey: execKey }
		});
		expect(executed.ok(), await executed.text()).toBeTruthy();
		const row = unwrap<RefundRow>(await executed.text());
		expect(row.status).toBe('EXECUTED');
		expect(row.refundNumber).toMatch(/^RMB-\d{4}-\d{6}$/);
		expect(row.execution?.cashMovementId).toBeTruthy();

		const voucher = await request.get(`${api}/api/billing/refunds/${refund.id}/voucher`, {
			headers: bearer(cashier)
		});
		expect(voucher.ok(), await voucher.text()).toBeTruthy();
		const v = unwrap<{ refundNumber: string; copyLabels: string[]; amount: number }>(
			await voucher.text()
		);
		expect(v.refundNumber).toBe(row.refundNumber);
		expect(v.copyLabels).toHaveLength(2);
		expect(v.amount).toBe(15000);

		await login(cashierEmail);
		await page.goto(`/billing/refunds/${refund.id}/voucher`);
		await expect(page.getByTestId('refund-voucher-page')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('refund-voucher-copy-0')).toBeVisible();
		await expect(page.getByTestId('refund-voucher-copy-1')).toBeVisible();
		const n0 = await page
			.getByTestId('refund-voucher-copy-0')
			.getByTestId('refund-voucher-number')
			.innerText();
		const n1 = await page
			.getByTestId('refund-voucher-copy-1')
			.getByTestId('refund-voucher-number')
			.innerText();
		expect(n0).toContain(row.refundNumber!);
		expect(n1).toContain(row.refundNumber!);
		expect(n0).toBe(n1);
	});

	test('QA-29F-IC-002 @critical APPROVED has no RMB / no voucher / excluded from report', async ({
		request
	}) => {
		test.setTimeout(150_000);
		const admin = await loginApi(request, adminEmail);
		const cashier = await loginApi(request, cashierEmail);
		const accountant = await loginApi(request, accountantEmail);
		const patient = await createPatient(request, admin, '002');
		const holder = await earnCredit(request, admin, patient.id, 20000, '002');
		const reqKey = `qa-ic-002-${Date.now()}`;
		const created = await request.post(`${api}/api/billing/refunds`, {
			headers: { ...bearer(cashier), 'Idempotency-Key': reqKey },
			data: {
				patientId: patient.id,
				holderPartyId: holder,
				amount: 5000,
				reasonCode: 'UNUSED_ADVANCE',
				intendedMethod: 'TRANSFER',
				idempotencyKey: reqKey
			}
		});
		const refund = unwrap<RefundRow>(await created.text());
		await request.post(`${api}/api/billing/refunds/${refund.id}/approve`, {
			headers: bearer(admin),
			data: {}
		});
		const detail = unwrap<RefundRow>(
			await (
				await request.get(`${api}/api/billing/refunds/${refund.id}`, { headers: bearer(admin) })
			).text()
		);
		expect(detail.status).toBe('APPROVED');
		expect(detail.refundNumber ?? '').toBe('');
		const voucher = await request.get(`${api}/api/billing/refunds/${refund.id}/voucher`, {
			headers: bearer(admin)
		});
		expect(voucher.status()).toBeGreaterThanOrEqual(400);

		const today = new Date().toISOString().slice(0, 10);
		const reportRes = await request.get(
			`${api}/api/billing/refunds/report?dateFrom=${today}&dateTo=${today}&limit=100`,
			{ headers: bearer(accountant) }
		);
		expect(reportRes.ok(), await reportRes.text()).toBeTruthy();
		const report = unwrap<{
			summary: { executedRefundCount: number };
			data: { refundId: number }[];
		}>(await reportRes.text());
		const rows = Array.isArray(report.data) ? report.data : [];
		expect(rows.some((r) => r.refundId === refund.id)).toBeFalsy();
	});

	test('QA-29F-IC-003 @critical two executions get distinct sequential numbers; reprint stable', async ({
		request
	}) => {
		test.setTimeout(180_000);
		const admin = await loginApi(request, adminEmail);
		const cashier = await loginApi(request, cashierEmail);
		const patient = await createPatient(request, admin, '003');
		const holder = await earnCredit(request, admin, patient.id, 50000, '003');
		const reg = await ensureRegister(request, admin);
		await openCash(request, cashier, reg.id, 80000);

		async function execOne(tag: string, amount: number) {
			const key = `qa-ic-003-${tag}-${Date.now()}`;
			const created = await request.post(`${api}/api/billing/refunds`, {
				headers: { ...bearer(cashier), 'Idempotency-Key': key },
				data: {
					patientId: patient.id,
					holderPartyId: holder,
					amount,
					reasonCode: 'UNUSED_ADVANCE',
					intendedMethod: 'CASH',
					idempotencyKey: key
				}
			});
			const refund = unwrap<RefundRow>(await created.text());
			await request.post(`${api}/api/billing/refunds/${refund.id}/approve`, {
				headers: bearer(admin),
				data: {}
			});
			const execKey = `qa-ic-003-ex-${tag}-${Date.now()}`;
			const executed = await request.post(`${api}/api/billing/refunds/${refund.id}/execute`, {
				headers: { ...bearer(cashier), 'Idempotency-Key': execKey },
				data: { idempotencyKey: execKey }
			});
			expect(executed.ok(), await executed.text()).toBeTruthy();
			return unwrap<RefundRow>(await executed.text());
		}

		const a = await execOne('a', 3000);
		const b = await execOne('b', 4000);
		expect(a.refundNumber).toBeTruthy();
		expect(b.refundNumber).toBeTruthy();
		expect(a.refundNumber).not.toBe(b.refundNumber);

		const v1 = unwrap<{ refundNumber: string }>(
			await (
				await request.get(`${api}/api/billing/refunds/${a.id}/voucher`, {
					headers: bearer(cashier)
				})
			).text()
		);
		const v2 = unwrap<{ refundNumber: string }>(
			await (
				await request.get(`${api}/api/billing/refunds/${a.id}/voucher`, {
					headers: bearer(cashier)
				})
			).text()
		);
		expect(v1.refundNumber).toBe(a.refundNumber);
		expect(v2.refundNumber).toBe(a.refundNumber);
	});

	test('QA-29F-IC-004 @critical financial report includes CASH+MOBILE; cash session only CASH', async ({
		request
	}) => {
		test.setTimeout(180_000);
		const admin = await loginApi(request, adminEmail);
		const cashier = await loginApi(request, cashierEmail);
		const accountant = await loginApi(request, accountantEmail);
		const patient = await createPatient(request, admin, '004');
		const holder = await earnCredit(request, admin, patient.id, 60000, '004');
		const reg = await ensureRegister(request, admin);
		const session = await openCash(request, cashier, reg.id, 100000);

		const cashKey = `qa-ic-004-cash-${Date.now()}`;
		const cashReq = unwrap<RefundRow>(
			await (
				await request.post(`${api}/api/billing/refunds`, {
					headers: { ...bearer(cashier), 'Idempotency-Key': cashKey },
					data: {
						patientId: patient.id,
						holderPartyId: holder,
						amount: 8000,
						reasonCode: 'UNUSED_ADVANCE',
						intendedMethod: 'CASH',
						idempotencyKey: cashKey
					}
				})
			).text()
		);
		await request.post(`${api}/api/billing/refunds/${cashReq.id}/approve`, {
			headers: bearer(admin),
			data: {}
		});
		const cashExecKey = `qa-ic-004-cash-ex-${Date.now()}`;
		expect(
			(
				await request.post(`${api}/api/billing/refunds/${cashReq.id}/execute`, {
					headers: { ...bearer(cashier), 'Idempotency-Key': cashExecKey },
					data: { idempotencyKey: cashExecKey }
				})
			).ok()
		).toBeTruthy();

		const mobKey = `qa-ic-004-mob-${Date.now()}`;
		const mobReq = unwrap<RefundRow>(
			await (
				await request.post(`${api}/api/billing/refunds`, {
					headers: { ...bearer(cashier), 'Idempotency-Key': mobKey },
					data: {
						patientId: patient.id,
						holderPartyId: holder,
						amount: 6000,
						reasonCode: 'UNUSED_ADVANCE',
						intendedMethod: 'MOBILE_MONEY',
						idempotencyKey: mobKey
					}
				})
			).text()
		);
		await request.post(`${api}/api/billing/refunds/${mobReq.id}/approve`, {
			headers: bearer(admin),
			data: {}
		});
		const mobExecKey = `qa-ic-004-mob-ex-${Date.now()}`;
		expect(
			(
				await request.post(`${api}/api/billing/refunds/${mobReq.id}/execute`, {
					headers: { ...bearer(cashier), 'Idempotency-Key': mobExecKey },
					data: {
						idempotencyKey: mobExecKey,
						externalReference: `MM-${Date.now()}`,
						beneficiaryRailRef: '0700998877'
					}
				})
			).ok()
		).toBeTruthy();

		const today = new Date().toISOString().slice(0, 10);
		const report = unwrap<{
			summary: {
				executedRefundAmount: number;
				cashRefundAmount: number;
				externalRefundAmount: number;
			};
		}>(
			await (
				await request.get(
					`${api}/api/billing/refunds/report?dateFrom=${today}&dateTo=${today}&limit=100`,
					{ headers: bearer(accountant) }
				)
			).text()
		);
		expect(report.summary.cashRefundAmount).toBeGreaterThanOrEqual(8000);
		expect(report.summary.externalRefundAmount).toBeGreaterThanOrEqual(6000);
		expect(report.summary.cashRefundAmount + report.summary.externalRefundAmount).toBe(
			report.summary.executedRefundAmount
		);

		const sess = await (
			await request.get(`${api}/api/cash/sessions/${session.session.id}`, {
				headers: bearer(cashier)
			})
		).json();
		expect(sess.cashMovementRefundOut).toBeGreaterThanOrEqual(8000);
		// External MOBILE must not inflate cash refund OUT beyond CASH executions on this session.
		expect(sess.cashMovementRefundOut).toBeLessThan(8000 + 6000);
	});

	test('QA-29F-IC-005 @critical statement shows Remboursé + RMB; voucher navigation', async ({
		request,
		login,
		page
	}) => {
		test.setTimeout(180_000);
		const admin = await loginApi(request, adminEmail);
		const cashier = await loginApi(request, cashierEmail);
		const patient = await createPatient(request, admin, '005');
		const holder = await earnCredit(request, admin, patient.id, 30000, '005');
		const key = `qa-ic-005-${Date.now()}`;
		const created = unwrap<RefundRow>(
			await (
				await request.post(`${api}/api/billing/refunds`, {
					headers: { ...bearer(cashier), 'Idempotency-Key': key },
					data: {
						patientId: patient.id,
						holderPartyId: holder,
						amount: 9000,
						reasonCode: 'UNUSED_ADVANCE',
						intendedMethod: 'TRANSFER',
						idempotencyKey: key
					}
				})
			).text()
		);
		await request.post(`${api}/api/billing/refunds/${created.id}/approve`, {
			headers: bearer(admin),
			data: {}
		});
		const execKey = `qa-ic-005-ex-${Date.now()}`;
		const executed = unwrap<RefundRow>(
			await (
				await request.post(`${api}/api/billing/refunds/${created.id}/execute`, {
					headers: { ...bearer(cashier), 'Idempotency-Key': execKey },
					data: {
						idempotencyKey: execKey,
						externalReference: `VIR-${Date.now()}`,
						beneficiaryRailRef: 'CI00-QA'
					}
				})
			).text()
		);
		expect(executed.refundNumber).toMatch(/^RMB-/);

		await login(accountantEmail);
		await page.goto(`/billing/patients/${patient.id}/statement`);
		await expect(page.getByTestId('financial-statement-page')).toBeVisible({ timeout: 20_000 });
		await expect(
			page.getByTestId(`financial-statement-holder-${holder}-creditRefunded`)
		).toContainText('9');
		await page.goto(`/billing/refunds?patientId=${patient.id}`);
		await page.getByTestId(`refund-open-${created.id}`).click();
		await expect(page.getByTestId('refund-detail-number')).toHaveText(executed.refundNumber!);
		await page.getByTestId('refund-voucher-link').click();
		await expect(page.getByTestId('refund-voucher-page')).toBeVisible({ timeout: 20_000 });
		await expect(
			page.getByTestId('refund-voucher-copy-0').getByTestId('refund-voucher-number')
		).toContainText(executed.refundNumber!);
		await expect(
			page.getByTestId('refund-voucher-copy-1').getByTestId('refund-voucher-number')
		).toContainText(executed.refundNumber!);
	});
});
