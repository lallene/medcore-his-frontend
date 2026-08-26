import { test, expect } from '../fixtures/medcore';

test('QA-DASHBOARD-001 @critical imported campaign is consultable without execution controls', async ({
	page,
	login
}) => {
	await login();
	await page.goto('/admin/qa');
	await expect(page.getByRole('heading', { name: 'MedCore Automated QA' })).toBeVisible();
	await expect(page.getByText('local-lot16-full').first()).toBeVisible();
	await expect(page.getByRole('button', { name: /exécuter|lancer/i })).toHaveCount(0);
	await page.getByText('local-lot16-full').last().click();
	await expect(page.getByRole('heading', { name: /^QA-SMOKE-001 / })).toBeVisible();
});
