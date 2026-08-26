import { test, expect } from '@playwright/test';
const api = process.env.QA_API_URL ?? 'http://127.0.0.1:8080';
test('QA-RBAC-001 @critical API rejects missing JWT and forbidden cashier clinical access', async ({
	request
}) => {
	expect((await request.get(`${api}/api/consultations`)).status()).toBe(401);
	const login = await request.post(`${api}/api/auth/login`, {
		data: {
			email: 'demo.caissiere@medcore.local',
			password: process.env.QA_ADMIN_PASSWORD ?? 'admin123'
		}
	});
	expect(login.ok()).toBeTruthy();
	const token = (await login.json()).data.token;
	const forbidden = await request.get(`${api}/api/consultations`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	expect(forbidden.status()).toBe(403);
	const allowed = await request.get(`${api}/api/cash/registers`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	expect(allowed.ok()).toBeTruthy();
});
test('QA-AUTH-002 @critical invalid and inactive accounts are refused', async ({ request }) => {
	expect(
		(
			await request.post(`${api}/api/auth/login`, {
				data: { email: 'admin@medcore.local', password: 'invalid' }
			})
		).status()
	).toBe(401);
	expect(
		(
			await request.post(`${api}/api/auth/login`, {
				data: {
					email: 'demo.inactive@medcore.local',
					password: process.env.QA_ADMIN_PASSWORD ?? 'admin123'
				}
			})
		).status()
	).toBe(401);
});
