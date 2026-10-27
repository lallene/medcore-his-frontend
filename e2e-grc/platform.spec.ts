import { adminEmail, apiURL, expect, test, uiLogin } from './fixtures';

// GRC15-B08 — login, local B05 headers, B07 body limit and health on the real stack.
// Local HTTP: HSTS is only checked as present, not as a TLS proof (B05 external stays PENDING).

test.describe('login failure', () => {
	test.use({ expectedStatuses: [401] });

	test('B08-AUTH-001 wrong password is refused and stays on /login', async ({ page }) => {
		await page.goto('/login');
		await page.getByLabel('Email professionnel').fill(adminEmail);
		await page.getByLabel('Mot de passe', { exact: true }).fill('mot-de-passe-invalide-b08');
		const answer = page.waitForResponse((r) => r.url() === `${apiURL}/api/auth/login`);
		await page.getByRole('button', { name: 'Se connecter' }).click();
		expect((await answer).status()).toBe(401);
		await expect(page).toHaveURL(/\/login$/);
		await expect(page.getByText(/invalide|incorrect/i).first()).toBeVisible();
	});
});

test.describe('logout', () => {
	// The landing dashboard may still fire a request after the token is cleared:
	// that 401 is the end of the session, not an application error.
	test.use({ expectedStatuses: [401] });

	test('B08-AUTH-002 login then logout through the UI', async ({ page }) => {
		await uiLogin(page, adminEmail);
		expect(new URL(page.url()).pathname).not.toBe('/login');
		await page.getByTitle('Déconnexion').click();
		await expect(page).toHaveURL(/\/login/);
	});
});

test('B08-SEC-001 B05 headers on the frontend runtime and the API', async ({
	request,
	baseURL
}) => {
	const document = await request.get(`${baseURL}/login`);
	expect(document.status()).toBe(200);
	const web = document.headers();
	expect(web['content-security-policy']).toContain("default-src 'self'");
	expect(web['content-security-policy']).toContain(`connect-src 'self' ${apiURL}`);
	expect(web['content-security-policy']).toContain("frame-ancestors 'none'");
	expect(web['x-content-type-options']).toBe('nosniff');
	expect(web['x-frame-options']).toBe('DENY');
	expect(web['referrer-policy']).toBe('strict-origin-when-cross-origin');
	expect(web['permissions-policy']).toContain('camera=()');
	expect(web['strict-transport-security']).toBeTruthy();

	const api = (await request.get(`${apiURL}/health`)).headers();
	expect(api['content-security-policy']).toContain("default-src 'none'");
	expect(api['x-content-type-options']).toBe('nosniff');
	expect(api['x-frame-options']).toBe('DENY');
	expect(api['referrer-policy']).toBe('strict-origin-when-cross-origin');
	expect(api['permissions-policy']).toContain('camera=()');
});

test('B08-B07-001 normal body accepted, oversized body refused with 413', async ({ request }) => {
	const normal = await request.post(`${apiURL}/api/auth/login`, {
		data: { email: 'personne@medcore.test', password: 'mot-de-passe-invalide-b08' }
	});
	expect(normal.status()).toBe(401); // reached the handler
	const oversized = await request.post(`${apiURL}/api/auth/login`, {
		headers: { 'Content-Type': 'application/json' },
		data: JSON.stringify({ email: 'personne@medcore.test', password: 'x'.repeat(2 << 20) })
	});
	expect(oversized.status()).toBe(413);
	expect((await oversized.json()).error.code).toBe('PAYLOAD_TOO_LARGE');
});

test('B08-HEALTH-001 API health reports the database up', async ({ request }) => {
	const health = await request.get(`${apiURL}/health`);
	expect(health.status()).toBe(200);
	expect(await health.json()).toEqual({ status: 'ok', service: 'medcore-his-api', db: 'up' });
});
