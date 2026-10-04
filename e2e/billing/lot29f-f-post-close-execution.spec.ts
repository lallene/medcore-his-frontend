/**
 * LOT29F-F — POST-CLOSE physical cash correction execution (PCE1).
 * Explicit OUT on OPEN same-register host session — not a Refund.
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

async function ensureRegister(request: APIRequestContext, token: string) {
	const list = await request.get(`${api}/api/cash/registers`, { headers: bearer(token) });
	expect(list.ok()).toBeTruthy();
	const regs = (await list.json()) as Array<{ id: number; code: string; active: boolean }>;
	const active = regs.find((r) => r.active);
	if (active) return active;
	const code = `E29FF-${Date.now().toString(36)}`.slice(0, 20);
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
		const key = `qa29ff-preclose-${Date.now()}`;
		await request.post(`${api}/api/cash/sessions/${curBody.session.id}/close`, {
			headers: { ...bearer(token), 'Idempotency-Key': key },
			data: {
				countedCashAmount: curBody.expectedCash ?? curBody.session.openingFloat ?? 0,
				note: 'QA cleanup',
				idempotencyKey: key
			}
		});
	}
}

async function issueInvoice(
	request: APIRequestContext,
	token: string,
	tag: string,
	unitPrice: number
) {
	const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
	const catalog = await request.post(`${api}/api/act-catalog`, {
		headers: bearer(token),
		data: {
			code: `E29FF-${stamp}`.slice(0, 20),
			label: `Acte exec ${stamp}`,
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
			code: `T29FF-${stamp}`.slice(0, 20),
			label: `Tarif 29FF ${stamp}`,
			unitPrice,
			effectiveFrom: new Date().toISOString().slice(0, 10),
			effectiveTo: null,
			isActive: true
		}
	});
	expect([200, 201].includes(tariff.status()), await tariff.text()).toBeTruthy();
	const tariffBody = JSON.parse(await tariff.text()) as { id: number };
	const patient = await request.post(`${api}/api/patients`, {
		headers: bearer(token),
		data: {
			nom: `QA29FF-${tag}-${stamp}`,
			prenoms: 'Exec',
			sexe: 'M',
			dateNaissance: '1993-05-05',
			telephone: `+22507${String(Date.now()).slice(-8)}`,
			isAssure: false
		}
	});
	const pText = await patient.text();
	expect([200, 201].includes(patient.status()), pText).toBeTruthy();
	const patientBody = (JSON.parse(pText).data ?? JSON.parse(pText)) as { id: number };
	await request.get(`${api}/api/patients/${patientBody.id}/medical-record`, {
		headers: bearer(token)
	});
	const act = await request.post(`${api}/api/performed-acts`, {
		headers: bearer(token),
		data: { patientId: patientBody.id, actCatalogEntryId: catalogBody.id, quantity: 1 }
	});
	const actParsed = JSON.parse(await act.text());
	const actBody = (actParsed.data ?? actParsed) as { id: number };
	const invoice = await request.post(`${api}/api/billing/invoices`, {
		headers: bearer(token),
		data: {
			patientId: patientBody.id,
			lines: [{ actType: 'PERFORMED_ACT', referenceId: actBody.id, tariffId: tariffBody.id }]
		}
	});
	const invParsed = JSON.parse(await invoice.text());
	const draft = (invParsed.data ?? invParsed) as { id: number };
	const issued = await request.post(`${api}/api/billing/invoices/${draft.id}/issue`, {
		headers: bearer(token)
	});
	expect(issued.ok(), await issued.text()).toBeTruthy();
	return draft.id;
}

test.describe('LOT29F-F post-close cash correction execution', () => {
	test('QA-29F-F-001 @critical physical OUT on same-register host session', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(300_000);
		const admin = await loginApi(request, adminEmail);
		const reg = await ensureRegister(request, admin);
		await precloseCurrent(request, admin);

		const openKey = `qa29ff-open1-${Date.now()}`;
		const opened = await request.post(`${api}/api/cash/sessions/open`, {
			headers: { ...bearer(admin), 'Idempotency-Key': openKey },
			data: { cashRegisterId: reg.id, openingFloat: 10000, idempotencyKey: openKey }
		});
		expect(opened.ok(), await opened.text()).toBeTruthy();
		const s1 = (await opened.json()).session.id as number;

		const invId = await issueInvoice(request, admin, 'exec', 8000);
		const payKey = `qa29ff-pay-${Date.now()}`;
		const paid = await request.post(`${api}/api/cash/sessions/${s1}/payments`, {
			headers: { ...bearer(admin), 'Idempotency-Key': payKey },
			data: {
				invoiceId: invId,
				amount: 8000,
				paymentMethod: 'CASH',
				idempotencyKey: payKey
			}
		});
		expect(paid.ok(), await paid.text()).toBeTruthy();
		const receipt = await paid.json();
		const paymentId = receipt.paymentId as number;

		const closeKey = `qa29ff-close1-${Date.now()}`;
		const closed = await request.post(`${api}/api/cash/sessions/${s1}/close`, {
			headers: { ...bearer(admin), 'Idempotency-Key': closeKey },
			data: { countedCashAmount: 18000, note: 's1 baseline', idempotencyKey: closeKey }
		});
		expect(closed.ok(), await closed.text()).toBeTruthy();
		const baseline = await closed.json();
		expect(baseline.expectedCash).toBe(18_000);

		const revKey = `qa29ff-rev-${Date.now()}`;
		const rev = await request.post(`${api}/api/billing/payments/${paymentId}/reverse`, {
			headers: { ...bearer(admin), 'Idempotency-Key': revKey },
			data: { reason: 'Correction apres cloture', idempotencyKey: revKey }
		});
		expect(rev.ok(), await rev.text()).toBeTruthy();
		const afterRev = await (
			await request.get(`${api}/api/cash/sessions/${s1}`, { headers: bearer(admin) })
		).json();
		expect(afterRev.expectedCash).toBe(18_000);
		expect(afterRev.cashMovementReversalOut ?? 0).toBe(0);
		expect(afterRev.cashMovementPostCloseCorrectionOut ?? 0).toBe(0);

		const open2Key = `qa29ff-open2-${Date.now()}`;
		const opened2 = await request.post(`${api}/api/cash/sessions/open`, {
			headers: { ...bearer(admin), 'Idempotency-Key': open2Key },
			data: { cashRegisterId: reg.id, openingFloat: 20000, idempotencyKey: open2Key }
		});
		expect(opened2.ok(), await opened2.text()).toBeTruthy();
		const s2 = (await opened2.json()).session.id as number;

		await login(adminEmail);
		await page.goto(`/billing/${invId}`);
		await expect(page.getByTestId(`invoice-execute-correction-${paymentId}`)).toBeVisible({
			timeout: 30_000
		});
		await page.getByTestId(`invoice-execute-correction-${paymentId}`).click();
		await expect(page.getByTestId('invoice-execute-correction-modal')).toBeVisible();
		await expect(page.getByTestId('invoice-execute-correction-explain')).not.toContainText(
			/Rembours/i
		);
		await expect(page.getByTestId('invoice-execute-correction-amount')).toContainText('8');
		await expect(page.getByTestId('invoice-execute-correction-host')).toContainText(String(s2));
		await page.getByTestId('invoice-execute-correction-confirm').check();
		await page.getByTestId('invoice-execute-correction-submit').click();
		await expect(page.getByTestId(`invoice-correction-executed-${paymentId}`)).toBeVisible({
			timeout: 20_000
		});

		const host = await (
			await request.get(`${api}/api/cash/sessions/${s2}`, { headers: bearer(admin) })
		).json();
		expect(host.expectedCash).toBe(12_000);
		expect(host.cashCollected).toBe(0);
		expect(host.cashMovementPostCloseCorrectionOut).toBe(8_000);

		const s1Again = await (
			await request.get(`${api}/api/cash/sessions/${s1}`, { headers: bearer(admin) })
		).json();
		expect(s1Again.expectedCash).toBe(18_000);
		expect(s1Again.session.countedCashAmount).toBe(18_000);
		expect(s1Again.session.cashDifference).toBe(0);

		const invBody =
			(
				await (
					await request.get(`${api}/api/billing/invoices/${invId}`, { headers: bearer(admin) })
				).json()
			).data ??
			(await (
				await request.get(`${api}/api/billing/invoices/${invId}`, { headers: bearer(admin) })
			).json());
		expect(invBody.paidAmount).toBe(0);
		expect(invBody.balanceAmount).toBe(8_000);

		await page.goto('/cash');
		await expect(page.getByTestId('cash-kpi-expected')).toContainText('12', { timeout: 20_000 });
		await page.getByTestId('cash-close-counted').fill('12000');
		await page.getByTestId('cash-close-submit').click();
		await expect(page.getByTestId('cash-close-result')).toBeVisible({ timeout: 30_000 });
		await page.getByTestId('cash-close-recon-link').click();
		await expect(page.getByTestId('cash-closing-report')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('cash-recon-expected')).toContainText('12');
		await expect(page.getByTestId('cash-recon-post-close-out')).toContainText('8');
	});

	test('QA-29F-F-002 @critical different register execution rejected', async ({ request }) => {
		test.setTimeout(240_000);
		const admin = await loginApi(request, adminEmail);
		const regA = await ensureRegister(request, admin);
		await precloseCurrent(request, admin);
		const codeB = `E29FFB-${Date.now().toString(36)}`.slice(0, 20);
		const createdB = await request.post(`${api}/api/cash/registers`, {
			headers: bearer(admin),
			data: { code: codeB, name: `Caisse ${codeB}`, location: 'QA-B', active: true }
		});
		expect([200, 201].includes(createdB.status())).toBeTruthy();
		const regB = (await createdB.json()) as { id: number };

		const openKey = `qa29ff2-oa-${Date.now()}`;
		const openedA = await request.post(`${api}/api/cash/sessions/open`, {
			headers: { ...bearer(admin), 'Idempotency-Key': openKey },
			data: { cashRegisterId: regA.id, openingFloat: 0, idempotencyKey: openKey }
		});
		expect(openedA.ok(), await openedA.text()).toBeTruthy();
		const sessionA = (await openedA.json()).session.id as number;

		const invId = await issueInvoice(request, admin, 'mismatch', 4000);
		const payKey = `qa29ff2-pay-${Date.now()}`;
		const paid = await request.post(`${api}/api/cash/sessions/${sessionA}/payments`, {
			headers: { ...bearer(admin), 'Idempotency-Key': payKey },
			data: {
				invoiceId: invId,
				amount: 4000,
				paymentMethod: 'CASH',
				idempotencyKey: payKey
			}
		});
		expect(paid.ok()).toBeTruthy();
		const paymentId = (await paid.json()).paymentId as number;
		const closeKey = `qa29ff2-ca-${Date.now()}`;
		expect(
			(
				await request.post(`${api}/api/cash/sessions/${sessionA}/close`, {
					headers: { ...bearer(admin), 'Idempotency-Key': closeKey },
					data: { countedCashAmount: 4000, idempotencyKey: closeKey }
				})
			).ok()
		).toBeTruthy();
		const revKey = `qa29ff2-rev-${Date.now()}`;
		const revRes = await request.post(`${api}/api/billing/payments/${paymentId}/reverse`, {
			headers: { ...bearer(admin), 'Idempotency-Key': revKey },
			data: { reason: 'Rev for mismatch', idempotencyKey: revKey }
		});
		expect(revRes.ok()).toBeTruthy();
		const inv = await (
			await request.get(`${api}/api/billing/invoices/${invId}`, { headers: bearer(admin) })
		).json();
		const invBody = inv.data ?? inv;
		const payRow = (invBody.payments as Array<{ id: number; reversalId?: number }>).find(
			(p) => p.id === paymentId
		);
		expect(payRow?.reversalId).toBeTruthy();

		const openBKey = `qa29ff2-ob-${Date.now()}`;
		const openedB = await request.post(`${api}/api/cash/sessions/open`, {
			headers: { ...bearer(admin), 'Idempotency-Key': openBKey },
			data: { cashRegisterId: regB.id, openingFloat: 50000, idempotencyKey: openBKey }
		});
		expect(openedB.ok(), await openedB.text()).toBeTruthy();
		const sessionB = (await openedB.json()).session.id as number;

		const execKey = `qa29ff2-x-${Date.now()}`;
		const exec = await request.post(`${api}/api/cash/corrections/execute`, {
			headers: { ...bearer(admin), 'Idempotency-Key': execKey },
			data: {
				paymentReversalId: payRow!.reversalId,
				hostSessionId: sessionB,
				idempotencyKey: execKey
			}
		});
		expect(exec.status()).toBe(409);
		expect(await exec.text()).toMatch(/CASH_EXECUTION_REGISTER_MISMATCH|même caisse/i);

		const host = await (
			await request.get(`${api}/api/cash/sessions/${sessionB}`, { headers: bearer(admin) })
		).json();
		expect(host.cashMovementPostCloseCorrectionOut ?? 0).toBe(0);
		expect(host.expectedCash).toBe(50_000);
	});
});
