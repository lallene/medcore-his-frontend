import { test, expect } from '../fixtures/medcore';
test('QA-ORG-001 @critical organization catalog and structured selectors', async ({
	page,
	login
}) => {
	await login();
	await page.goto('/admin/organization');
	await expect(page.getByRole('heading', { name: 'Départements et services' })).toBeVisible();
	await expect(page.getByText('Urgences').first()).toBeVisible();
	await expect(page.getByText('Laboratoire').first()).toBeVisible();
});
