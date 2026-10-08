/**
 * LOT29F-I-A — Refund request workflow (reserve spendable credit → decision).
 * No money execution: UI must never claim a payout happened.
 */
import { expect, type APIRequestContext } from '@playwright/test';
import { test } from '../fixtures/medcore';

const api = process.env.QA_API_URL ?? 'http://127.0.0.1:18082';
const password = process.env.QA_ADMIN_PASSWORD ?? 'admin123';
const adminEmail = process.env.QA_ADMIN_EMAIL ?? 'admin@medcore.local';
const facturationEmail = 'demo.facturation@medcore.local';
const cashierEmail = 'demo.caissiere@medcore.local';
const accountantEmail = 'demo.comptable@medcore.local';

const FORBIDDEN_WORDING = /Remboursé|Remboursement effectué|Montant versé|Exécuter|Argent remis/i;

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

function formatFcfa(amount: number): string {
	return `${new Intl.NumberFormat('fr-FR').format(amount)} FCFA`;
}

async function createPatient(request: APIRequestContext, token: string, tag: string) {
	const nom = `QA29FIA-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e5)}`;
	const response = await request.post(`${api}/api/patients`, {
		headers: bearer(token),
		data: {
			nom,
			prenoms: 'Refund',
			sexe: 'M',
			dateNaissance: '1990-01-15',
			telephone: `+22507${String(Date.now()).slice(-8)}`,
			isAssure: false
		}
	});
	const text = await response.text();
	expect([200, 201].includes(response.status()), text).toBeTruthy();
	const patient = unwrap<{ id: number; codePatient: string }>(text);
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
			code: `QA29IA-${stamp}`.slice(0, 20),
			label: `Acte refund ${stamp}`,
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
			code: `T29IA-${stamp}`.slice(0, 20),
			label: `Tarif 29IA ${stamp}`,
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
	const issuedText = await issued.text();
	expect(issued.ok(), issuedText).toBeTruthy();
	return unwrap<{ id: number }>(issuedText);
}

/** Pay an invoice in full then issue a partial credit note → financial credit for the holder. */
async function earnCredit(
	request: APIRequestContext,
	token: string,
	patientId: number,
	credit: number,
	tag: string
) {
	const earn = await seedIssuedInvoice(request, token, patientId, 50_000, `${tag}e`);
	const payKey = `qa-ia-${tag}-pay-${Date.now()}`;
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
	const cnKey = `qa-ia-${tag}-cn-${Date.now()}`;
	const cn = await request.post(`${api}/api/billing/invoices/${earn.id}/credit-notes`, {
		headers: { ...bearer(token), 'Idempotency-Key': cnKey },
		data: { amount: credit, reason: `Crédit source ${tag}`, idempotencyKey: cnKey }
	});
	const cnText = await cn.text();
	expect(cn.ok(), cnText).toBeTruthy();
	const body = unwrap<{ creditHolderPartyId?: number; customerCreditAmount: number }>(cnText);
	expect(body.customerCreditAmount).toBe(credit);
	expect(body.creditHolderPartyId).toBeTruthy();
	return body.creditHolderPartyId as number;
}

type Refund = {
	id: number;
	status: string;
	amount: number;
	requestedBy: number;
	rejectionReason?: string;
};

type Summary = {
	ledgerAvailable: number;
	reservedForRefund: number;
	spendableCredit: number;
	availableCredit: number;
};

async function apiRequestRefund(
	request: APIRequestContext,
	token: string,
	data: {
		patientId: number;
		holderPartyId: number;
		amount: number;
		reasonCode?: string;
		tag: string;
	}
) {
	const key = `qa-ia-${data.tag}-${Date.now()}-${Math.floor(Math.random() * 1e5)}`;
	return request.post(`${api}/api/billing/refunds`, {
		headers: { ...bearer(token), 'Idempotency-Key': key },
		data: {
			patientId: data.patientId,
			holderPartyId: data.holderPartyId,
			amount: data.amount,
			reasonCode: data.reasonCode ?? 'UNUSED_ADVANCE',
			idempotencyKey: key
		}
	});
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
	return unwrap<Summary>(await res.text());
}

test.describe('LOT29F-I-A refund request workflow', () => {
	test('QA-29F-IA-001 @critical request reserves spendable credit (API + UI)', async ({
		request,
		login,
		page
	}) => {
		test.setTimeout(150_000);
		const admin = await loginApi(request, adminEmail);
		const cashier = await loginApi(request, cashierEmail);
		const patient = await createPatient(request, admin, '001');
		const holder = await earnCredit(request, admin, patient.id, 20_000, '001');

		const before = await summary(request, admin, holder, patient.id);
		expect(before.ledgerAvailable).toBe(20_000);
		expect(before.reservedForRefund).toBe(0);
		expect(before.spendableCredit).toBe(20_000);

		const created = await apiRequestRefund(request, cashier, {
			patientId: patient.id,
			holderPartyId: holder,
			amount: 8_000,
			tag: '001a'
		});
		expect(created.ok(), await created.text()).toBeTruthy();
		const refund = unwrap<Refund>(await created.text());
		expect(refund.status).toBe('REQUESTED');

		const after = await summary(request, admin, holder, patient.id);
		expect(after.ledgerAvailable).toBe(20_000);
		expect(after.reservedForRefund).toBe(8_000);
		expect(after.spendableCredit).toBe(12_000);
		expect(after.availableCredit).toBe(12_000);

		// UI: balances come from the backend (no client arithmetic).
		await login(facturationEmail);
		await page.goto(`/billing/refunds?patientId=${patient.id}`);
		await expect(page.getByTestId('refunds-page')).toBeVisible({ timeout: 20_000 });
		await page.getByTestId('refund-balances-load').click();
		await expect(page.getByTestId(`refund-balance-${holder}-reserved`)).toContainText(
			formatFcfa(after.reservedForRefund)
		);
		await expect(page.getByTestId(`refund-balance-${holder}-spendable`)).toContainText(
			formatFcfa(after.spendableCredit)
		);
		await expect(page.getByTestId(`refund-balance-${holder}-ledger`)).toContainText(
			formatFcfa(after.ledgerAvailable)
		);

		// UI: request a second refund through the form.
		await page.getByTestId(`refund-balance-${holder}-pick`).click();
		await page.getByTestId('refund-amount').fill('2000');
		await page.getByTestId('refund-reason-code').selectOption('UNUSED_ADVANCE');
		await page.getByTestId('refund-submit').click();
		await expect(page.getByTestId('refund-success')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('refund-detail-status')).toHaveText('En attente de validation');

		const final = await summary(request, admin, holder, patient.id);
		expect(final.reservedForRefund).toBe(10_000);
		expect(final.spendableCredit).toBe(10_000);
		await expect(page.getByTestId(`refund-balance-${holder}-spendable`)).toContainText(
			formatFcfa(final.spendableCredit)
		);

		// Over-reservation is rejected by the backend and surfaced in the UI.
		await page.getByTestId('refund-amount').fill('999999');
		await page.getByTestId('refund-submit').click();
		await expect(page.getByTestId('refund-request-error')).toHaveAttribute(
			'data-error-kind',
			'insufficient_spendable'
		);
		const unchanged = await summary(request, admin, holder, patient.id);
		expect(unchanged.reservedForRefund).toBe(10_000);
	});

	test('QA-29F-IA-002 @critical approve requires a different user (SoD)', async ({
		request,
		login,
		page
	}) => {
		test.setTimeout(150_000);
		const admin = await loginApi(request, adminEmail);
		const accountant = await loginApi(request, accountantEmail);
		const patient = await createPatient(request, admin, '002');
		const holder = await earnCredit(request, admin, patient.id, 15_000, '002');

		const created = await apiRequestRefund(request, accountant, {
			patientId: patient.id,
			holderPartyId: holder,
			amount: 5_000,
			tag: '002'
		});
		expect(created.ok(), await created.text()).toBeTruthy();
		const refund = unwrap<Refund>(await created.text());

		// Requester cannot approve own request.
		const self = await request.post(`${api}/api/billing/refunds/${refund.id}/approve`, {
			headers: bearer(accountant),
			data: {}
		});
		expect(self.status()).toBe(409);
		expect(await self.text()).toContain('REFUND_SOD_VIOLATION');

		// A different authorised user can.
		const approved = await request.post(`${api}/api/billing/refunds/${refund.id}/approve`, {
			headers: bearer(admin),
			data: {}
		});
		expect(approved.ok(), await approved.text()).toBeTruthy();
		expect(unwrap<Refund>(await approved.text()).status).toBe('APPROVED');

		// Approval keeps the reservation; nothing is paid out in this lot.
		const sum = await summary(request, admin, holder, patient.id);
		expect(sum.reservedForRefund).toBe(5_000);
		expect(sum.spendableCredit).toBe(10_000);

		await login(adminEmail);
		await page.goto(`/billing/refunds?patientId=${patient.id}`);
		await page.getByTestId(`refund-open-${refund.id}`).click();
		await expect(page.getByTestId('refund-detail-status')).toHaveText('Remboursement autorisé');
		await expect(page.getByTestId('refund-approve')).toHaveCount(0);
		await expect(page.getByTestId('refund-detail-reserved')).toContainText(
			formatFcfa(sum.reservedForRefund)
		);
	});

	test('QA-29F-IA-003 @critical reject releases the reservation', async ({
		request,
		login,
		page
	}) => {
		test.setTimeout(150_000);
		const admin = await loginApi(request, adminEmail);
		const cashier = await loginApi(request, cashierEmail);
		const patient = await createPatient(request, admin, '003');
		const holder = await earnCredit(request, admin, patient.id, 12_000, '003');

		const first = await apiRequestRefund(request, cashier, {
			patientId: patient.id,
			holderPartyId: holder,
			amount: 6_000,
			tag: '003a'
		});
		expect(first.ok(), await first.text()).toBeTruthy();
		const apiRefund = unwrap<Refund>(await first.text());
		const held = await summary(request, admin, holder, patient.id);
		expect(held.reservedForRefund).toBe(6_000);
		expect(held.spendableCredit).toBe(6_000);

		// Reason is mandatory (API).
		const noReason = await request.post(`${api}/api/billing/refunds/${apiRefund.id}/reject`, {
			headers: bearer(admin),
			data: { reason: '' }
		});
		expect(noReason.status()).toBe(400);

		const rejected = await request.post(`${api}/api/billing/refunds/${apiRefund.id}/reject`, {
			headers: bearer(admin),
			data: { reason: 'Dossier incomplet' }
		});
		expect(rejected.ok(), await rejected.text()).toBeTruthy();
		expect(unwrap<Refund>(await rejected.text()).status).toBe('REJECTED');
		const released = await summary(request, admin, holder, patient.id);
		expect(released.reservedForRefund).toBe(0);
		expect(released.spendableCredit).toBe(12_000);

		// UI: reject a second request with a mandatory reason.
		const second = await apiRequestRefund(request, cashier, {
			patientId: patient.id,
			holderPartyId: holder,
			amount: 4_000,
			tag: '003b'
		});
		expect(second.ok(), await second.text()).toBeTruthy();
		const uiRefund = unwrap<Refund>(await second.text());

		await login(accountantEmail);
		await page.goto(`/billing/refunds?patientId=${patient.id}`);
		await page.getByTestId(`refund-open-${uiRefund.id}`).click();
		await expect(page.getByTestId('refund-detail-status')).toHaveText('En attente de validation');
		await page.getByTestId('refund-reject').click();
		await page.getByTestId('refund-decision-submit').click();
		await expect(page.getByTestId('refund-decision-error')).toHaveText('Motif obligatoire');
		await page.getByTestId('refund-decision-reason').fill('Justificatif non fourni');
		await page.getByTestId('refund-decision-submit').click();
		await expect(page.getByTestId('refund-detail-status')).toHaveText('Demande rejetée', {
			timeout: 20_000
		});
		await expect(page.getByTestId('refund-detail-rejection')).toContainText(
			'Justificatif non fourni'
		);
		const finalSum = await summary(request, admin, holder, patient.id);
		expect(finalSum.reservedForRefund).toBe(0);
		expect(finalSum.spendableCredit).toBe(12_000);
		await expect(page.getByTestId('refund-detail-spendable')).toContainText(
			formatFcfa(finalSum.spendableCredit)
		);
	});

	test('QA-29F-IA-004 @critical no payout / execution wording and no execute button', async ({
		request,
		login,
		page
	}) => {
		test.setTimeout(150_000);
		const admin = await loginApi(request, adminEmail);
		const cashier = await loginApi(request, cashierEmail);
		const patient = await createPatient(request, admin, '004');
		const holder = await earnCredit(request, admin, patient.id, 10_000, '004');

		const created = await apiRequestRefund(request, cashier, {
			patientId: patient.id,
			holderPartyId: holder,
			amount: 3_000,
			tag: '004'
		});
		expect(created.ok(), await created.text()).toBeTruthy();
		const refund = unwrap<Refund>(await created.text());
		const approved = await request.post(`${api}/api/billing/refunds/${refund.id}/approve`, {
			headers: bearer(admin),
			data: {}
		});
		expect(approved.ok(), await approved.text()).toBeTruthy();

		await login(accountantEmail);
		await page.goto(`/billing/refunds?patientId=${patient.id}`);
		await expect(page.getByTestId('refunds-page')).toBeVisible({ timeout: 20_000 });
		await page.getByTestId('refund-balances-load').click();
		await page.getByTestId(`refund-open-${refund.id}`).click();
		await expect(page.getByTestId('refund-detail-status')).toHaveText('Remboursement autorisé');
		await page.getByTestId('refund-cancel').click();

		const refundsText = await page.getByTestId('refunds-page').innerText();
		expect(refundsText).not.toMatch(FORBIDDEN_WORDING);
		await expect(page.getByRole('button', { name: /exécut|execut/i })).toHaveCount(0);
		await expect(page.getByRole('link', { name: /exécut|execut/i })).toHaveCount(0);

		await page.goto(`/billing/patients/${patient.id}/statement`);
		await expect(page.getByTestId('financial-statement-page')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('financial-statement-refund-link')).toBeVisible();
		await expect(page.getByTestId('financial-statement-summary-reservedForRefund')).toContainText(
			formatFcfa(3_000)
		);
		const statementText = await page.getByTestId('financial-statement-page').innerText();
		expect(statementText).not.toMatch(FORBIDDEN_WORDING);
		await expect(page.getByRole('button', { name: /exécut|execut/i })).toHaveCount(0);
	});

	test('QA-29F-IA-005 @critical caissier can request but cannot approve (403)', async ({
		request,
		login,
		page
	}) => {
		test.setTimeout(150_000);
		const admin = await loginApi(request, adminEmail);
		const cashier = await loginApi(request, cashierEmail);
		const patient = await createPatient(request, admin, '005');
		const holder = await earnCredit(request, admin, patient.id, 10_000, '005');

		const created = await apiRequestRefund(request, cashier, {
			patientId: patient.id,
			holderPartyId: holder,
			amount: 2_000,
			tag: '005'
		});
		expect(created.ok(), await created.text()).toBeTruthy();
		const refund = unwrap<Refund>(await created.text());
		expect(refund.status).toBe('REQUESTED');

		const denied = await request.post(`${api}/api/billing/refunds/${refund.id}/approve`, {
			headers: bearer(cashier),
			data: {}
		});
		expect(denied.status()).toBe(403);
		const deniedReject = await request.post(`${api}/api/billing/refunds/${refund.id}/reject`, {
			headers: bearer(cashier),
			data: { reason: 'Non autorisé' }
		});
		expect(deniedReject.status()).toBe(403);

		await login(cashierEmail);
		await page.goto(`/billing/refunds?patientId=${patient.id}`);
		await expect(page.getByTestId('refunds-page')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('refund-request-form')).toBeVisible();
		await page.getByTestId(`refund-open-${refund.id}`).click();
		await expect(page.getByTestId('refund-detail-status')).toHaveText('En attente de validation');
		await expect(page.getByTestId('refund-approve')).toHaveCount(0);
		await expect(page.getByTestId('refund-reject')).toHaveCount(0);
		await expect(page.getByTestId('refund-cancel')).toBeVisible();
		await expect(page.getByTestId('refund-sod-hint')).toBeVisible();

		const still = await request.get(`${api}/api/billing/refunds/${refund.id}`, {
			headers: bearer(admin)
		});
		expect(unwrap<Refund>(await still.text()).status).toBe('REQUESTED');
	});
});
