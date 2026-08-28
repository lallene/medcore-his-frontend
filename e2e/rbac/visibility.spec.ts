import { expect, type APIRequestContext } from '@playwright/test';
import { test } from '../fixtures/medcore';

const api = process.env.QA_API_URL ?? 'http://127.0.0.1:8080';
const password = process.env.QA_ADMIN_PASSWORD ?? 'admin123';
const cashierEmail = 'demo.caissiere@medcore.local';
const doctorEmail = 'demo.generaliste@medcore.local';

async function loginApi(request: APIRequestContext, email: string) {
	const response = await request.post(`${api}/api/auth/login`, {
		data: { email, password }
	});
	expect(response.ok(), await response.text()).toBeTruthy();
	return (await response.json()).data.token as string;
}

test('QA-RBAC-VISIBILITY-001 @critical sidebar and landing respect effective permissions', async ({
	page,
	login,
	request
}) => {
	test.setTimeout(90_000);

	// Cashier: no dashboard, no laboratory, no access center
	await login(cashierEmail, password);
	await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveCount(0);
	await expect(page.getByRole('link', { name: 'Laboratoire' })).toHaveCount(0);
	await expect(page.getByRole('link', { name: "Centre d'accès" })).toHaveCount(0);
	await expect(page.getByRole('link', { name: 'Caisse' })).toBeVisible();

	const cashierToken = await loginApi(request, cashierEmail);
	const dash = await request.get(`${api}/api/dashboard`, {
		headers: { Authorization: `Bearer ${cashierToken}` }
	});
	expect(dash.status()).toBe(403);

	await page.goto('/admin/access');
	await expect(page.getByTestId('access-denied')).toBeVisible();
	await expect(page.getByText('Request failed with status code 403')).toHaveCount(0);

	await page.goto('/laboratory');
	await expect(page.getByTestId('access-denied')).toBeVisible();

	// Doctor: worklist visible, no dashboard menu, direct API still protected for ACC
	await login(doctorEmail, password);
	await expect(page.getByRole('link', { name: 'File médecin' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveCount(0);

	const docToken = await loginApi(request, doctorEmail);
	expect(
		(
			await request.get(`${api}/api/access/users`, {
				headers: { Authorization: `Bearer ${docToken}` }
			})
		).status()
	).toBe(403);
});
