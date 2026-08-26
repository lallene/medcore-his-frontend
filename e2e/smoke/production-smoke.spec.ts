import { test, expect } from '@playwright/test';
test('QA-PROD-SMOKE-001 @production-safe frontend and health are reachable without mutation', async ({
	page,
	request
}) => {
	await page.goto('/login');
	await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();
	const api = process.env.QA_API_URL;
	if (!api) throw new Error('QA_API_URL obligatoire');
	expect((await request.get(`${api}/health`)).ok()).toBeTruthy();
});
