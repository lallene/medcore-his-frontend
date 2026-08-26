import { test as base, expect } from '@playwright/test';
type Fixtures = {
	login: (email?: string, password?: string) => Promise<void>;
	qaDiagnostics: void;
};
export const test = base.extend<Fixtures>({
	login: async ({ page }, use) => {
		await use(
			async (
				email = process.env.QA_ADMIN_EMAIL ?? 'admin@medcore.local',
				password = process.env.QA_ADMIN_PASSWORD ?? 'admin123'
			) => {
				await page.goto('/login');
				await page.getByTestId('qa-login-email').fill(email);
				await page.getByTestId('qa-login-password').fill(password);
				await Promise.all([
					page.waitForURL(/\/dashboard/),
					page.getByTestId('qa-login-submit').click()
				]);
			}
		);
	},
	qaDiagnostics: [
		async ({ page }, use, testInfo) => {
			const events: string[] = [];
			page.on('console', (message) => {
				if (message.type() === 'error') events.push(`console: ${message.text()}`);
			});
			page.on('response', (response) => {
				if (response.status() >= 500) events.push(`http ${response.status()}: ${response.url()}`);
			});
			await use();
			if (testInfo.status !== testInfo.expectedStatus)
				await testInfo.attach('browser-network-errors', {
					body: events.join('\n') || 'No browser console error or HTTP 5xx captured.',
					contentType: 'text/plain'
				});
		},
		{ auto: true }
	]
});
test.afterEach(async ({ page }, testInfo) => {
	if (testInfo.status === testInfo.expectedStatus) return;
	const state = await page
		.evaluate(() => ({ url: location.href, title: document.title }))
		.catch(() => ({ url: 'unavailable', title: 'unavailable' }));
	await testInfo.attach('browser-state', {
		body: JSON.stringify(state, null, 2),
		contentType: 'application/json'
	});
});
export { expect };
