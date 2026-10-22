/**
 * LOT AIDE — contextual help and /help centre (keyboard, touch, Escape, search, RBAC filtering).
 * QA-HELP-001 tooltip opens on keyboard focus (medical form) and closes on Escape.
 * QA-HELP-002 detailed help panel opens with Enter, focus moves in, Escape restores focus.
 * QA-HELP-003 financial form help + payment flow unchanged.
 * QA-HELP-004 /help search (accent-insensitive), module navigation, deep link.
 * QA-HELP-005 restricted entries are not served to a role without the permission.
 * QA-HELP-006 tooltip opens on tap (touch).
 */
import { requiredQaPassword } from '../fixtures/credentials';
import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { test } from '../fixtures/medcore';

const api = process.env.QA_API_URL ?? 'http://127.0.0.1:18082';
const adminEmail = process.env.QA_ADMIN_EMAIL ?? 'admin@medcore.local';
const password = requiredQaPassword();
const nurseEmail = 'demo.infirmier@medcore.local';

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

async function inProgressConsultationId(request: APIRequestContext, token: string) {
	const res = await request.get(`${api}/api/consultations?status=in_progress&limit=20`, {
		headers: bearer(token)
	});
	expect(res.ok(), await res.text()).toBeTruthy();
	const body = JSON.parse(await res.text());
	const rows = (body.data?.items ?? body.items ?? body.data ?? []) as Array<{ id: number }>;
	expect(rows.length, 'demo seed provides an in-progress consultation').toBeGreaterThan(0);
	return rows[0].id;
}

async function openClinicalForm(page: Page, request: APIRequestContext) {
	const token = await loginApi(request, adminEmail);
	const id = await inProgressConsultationId(request, token);
	await page.goto(`/consultations/${id}`);
	await expect(page.locator('#temperature')).toBeVisible({ timeout: 20_000 });
	await expect(page.getByTestId('help-hint-consultation.vitals.temperature')).toBeVisible({
		timeout: 20_000
	});
}

test.describe('LOT AIDE help system', () => {
	test('QA-HELP-001 @critical tooltip opens on keyboard focus and closes on Escape', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(120_000);
		await login(adminEmail, password);
		await openClinicalForm(page, request);
		const hint = page.getByTestId('help-hint-consultation.vitals.temperature');
		const tip = page.getByTestId('help-tooltip-consultation.vitals.temperature');
		await expect(tip).toBeHidden();
		// Keyboard: the help button sits between the label and the input in tab order.
		await page.locator('#temperature').focus();
		await page.keyboard.press('Shift+Tab');
		await expect(hint).toBeFocused();
		await expect(tip).toBeVisible();
		await expect(tip).toHaveAttribute('role', 'tooltip');
		await expect(hint).toHaveAttribute('aria-describedby', (await tip.getAttribute('id')) ?? '');
		await expect(tip).toContainText('°C');
		await page.keyboard.press('Escape');
		await expect(tip).toBeHidden();
		// The field itself still works (no regression of the medical form).
		await page.locator('#temperature').fill('37.4');
		await expect(page.locator('#temperature')).toHaveValue('37.4');
	});

	test('QA-HELP-002 @critical detailed help opens with Enter and Escape restores focus', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(120_000);
		await login(adminEmail, password);
		await openClinicalForm(page, request);
		const hint = page.getByTestId('help-hint-consultation.decision.sick_leave');
		await hint.focus();
		await expect(hint).toHaveAttribute('aria-expanded', 'false');
		await page.keyboard.press('Enter');
		const panel = page.getByTestId('help-panel-consultation.decision.sick_leave');
		await expect(panel).toBeVisible();
		await expect(panel).toHaveAttribute('role', 'dialog');
		await expect(hint).toHaveAttribute('aria-expanded', 'true');
		await expect(panel).toBeFocused();
		await expect(panel).toContainText('jours');
		await page.keyboard.press('Escape');
		await expect(panel).toBeHidden();
		await expect(hint).toBeFocused();
	});

	test('QA-HELP-003 @critical financial help on the invoice page keeps the payment flow intact', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(180_000);
		const admin = await loginApi(request, adminEmail);
		const invoices = await request.get(`${api}/api/billing/invoices?status=ISSUED&limit=20`, {
			headers: bearer(admin)
		});
		expect(invoices.ok(), await invoices.text()).toBeTruthy();
		const list = unwrap<{ data?: Array<{ id: number }> } | Array<{ id: number }>>(
			await invoices.text()
		);
		const rows = (Array.isArray(list) ? list : (list.data ?? [])) as Array<{ id: number }>;
		test.skip(rows.length === 0, 'no ISSUED invoice in the demo dataset');
		await login(adminEmail, password);
		await page.goto(`/billing/${rows[0].id}`);
		await expect(page.getByTestId('invoice-collection')).toBeVisible({ timeout: 20_000 });
		const hint = page.getByTestId('help-hint-billing.payment.method');
		await expect(hint).toBeVisible({ timeout: 20_000 });
		await hint.click();
		const panel = page.getByTestId('help-panel-billing.payment.method');
		await expect(panel).toBeVisible();
		await expect(panel).toContainText('session de caisse');
		await page.getByTestId('help-panel-close-billing.payment.method').click();
		await expect(panel).toBeHidden();
		// The labelled select is still the payment method control and has no CASH option.
		const select = page.getByTestId('invoice-pay-method');
		await expect(select).toHaveAttribute('id', 'invoice-pay-method-select');
		await expect(page.getByLabel('Mode', { exact: true })).toHaveCount(1);
		await expect(select.locator('option[value="CASH"]')).toHaveCount(0);
	});

	test('QA-HELP-004 @critical /help search, module navigation and deep link', async ({
		page,
		login
	}) => {
		test.setTimeout(120_000);
		await login(adminEmail, password);
		await page.goto('/help');
		await expect(page.getByTestId('help-center')).toBeVisible({ timeout: 20_000 });
		await page.getByTestId('help-search').fill('GLYCEMIE');
		const hit = page.getByTestId('help-result-consultation.vitals.glycemia');
		await expect(hit).toBeVisible();
		await hit.click();
		await expect(page.getByTestId('help-detail')).toContainText('g/L');
		await page.getByTestId('help-search').fill('');
		await page.getByTestId('help-module-cash').click();
		await expect(page.getByTestId('help-result-cash.session.opening_float')).toBeVisible();
		await expect(page.getByTestId('help-result-consultation.vitals.glycemia')).toHaveCount(0);
		await page.goto('/help?key=billing.refund.reason');
		await expect(page.getByTestId('help-detail')).toContainText('validation managériale', {
			timeout: 20_000
		});
		// Sidebar entry is present for the authenticated user.
		await expect(page.locator('a[href$="/help"]').first()).toBeVisible();
	});

	test('QA-HELP-005 @critical restricted entries are filtered by the backend', async ({
		request
	}) => {
		const admin = await loginApi(request, adminEmail);
		const nurse = await loginApi(request, nurseEmail);
		const keys = async (token: string) => {
			const res = await request.get(`${api}/api/help/entries`, { headers: bearer(token) });
			expect(res.ok(), await res.text()).toBeTruthy();
			const body = (await res.json()) as { entries: Array<{ helpKey: string }> };
			return body.entries.map((e) => e.helpKey);
		};
		const adminKeys = await keys(admin);
		const nurseKeys = await keys(nurse);
		expect(adminKeys).toContain('billing.refund.execution_method');
		expect(nurseKeys).not.toContain('billing.refund.execution_method');
		expect(nurseKeys).not.toContain('patient.insurance.member_details');
		expect(nurseKeys).toContain('consultation.vitals.temperature');
		expect((await request.get(`${api}/api/help/entries`)).status()).toBe(401);
	});
});

test.describe('LOT AIDE touch', () => {
	test.use({ hasTouch: true });

	test('QA-HELP-006 @critical tap opens the tooltip or the detailed panel', async ({
		page,
		login,
		request
	}) => {
		test.setTimeout(120_000);
		await login(adminEmail, password);
		await openClinicalForm(page, request);
		// Tooltip-only entry: a tap pins the short help; tapping elsewhere closes it.
		await page.getByTestId('help-hint-consultation.vitals.heart_rate').tap();
		const tip = page.getByTestId('help-tooltip-consultation.vitals.heart_rate');
		await expect(tip).toBeVisible();
		await expect(tip).toContainText('bpm');
		await page.locator('#temperature').tap();
		await expect(tip).toBeHidden();
		// Entry with detailed help: a tap opens the contextual panel.
		await page.getByTestId('help-hint-consultation.vitals.spo2').tap();
		await expect(page.getByTestId('help-panel-consultation.vitals.spo2')).toBeVisible();
		await page.getByTestId('help-panel-close-consultation.vitals.spo2').tap();
		await expect(page.getByTestId('help-panel-consultation.vitals.spo2')).toBeHidden();
	});
});
