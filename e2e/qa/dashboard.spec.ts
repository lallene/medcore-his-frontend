import { test, expect } from '../fixtures/medcore';

test('QA-DASHBOARD-001 @critical imported campaign is consultable without execution controls', async ({
	page,
	login
}) => {
	await login();

	await page.goto('/admin/qa');

	await expect(page.getByRole('heading', { name: 'MedCore Automated QA' })).toBeVisible();

	const bootstrapRun = page.getByText(/-bootstrap$/).first();
	await expect(bootstrapRun).toBeVisible();

	await expect(page.getByRole('button', { name: /exécuter|lancer/i })).toHaveCount(0);

	await bootstrapRun.click();

	await expect(page.getByText(/QA-RBAC-001/).first()).toBeVisible();
});
