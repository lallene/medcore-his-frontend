import { test, expect, type APIRequestContext } from '@playwright/test';

const api = process.env.QA_API_URL ?? 'http://127.0.0.1:8080';
const password = process.env.QA_ADMIN_PASSWORD ?? 'admin123';

async function login(request: APIRequestContext, email: string) {
	const res = await request.post(`${api}/api/auth/login`, {
		data: { email, password }
	});
	expect(res.ok(), await res.text()).toBeTruthy();
	return (await res.json()).data.token as string;
}

test('QA-LOT28D-PHARM-001 @critical PHARMACIEN can read pharmacy and create dispensation is authorized shape', async ({
	request
}) => {
	const token = await login(request, 'demo.pharmacien@medcore.local');
	const headers = { Authorization: `Bearer ${token}` };

	const stocks = await request.get(`${api}/api/pharmacy/stocks`, { headers });
	expect(stocks.status(), await stocks.text()).toBe(200);

	const vouchers = await request.get(`${api}/api/pharmacy/vouchers?limit=5`, { headers });
	expect(vouchers.status(), await vouchers.text()).toBe(200);

	// Unauthorized clinical write domain must stay closed (least privilege).
	const consult = await request.get(`${api}/api/consultations`, { headers });
	expect(consult.status()).toBe(403);
});

test('QA-LOT28D-PHARM-002 @critical INFIRMIER and caissier cannot create dispensation', async ({
	request
}) => {
	for (const email of ['demo.infirmier@medcore.local', 'demo.caissiere@medcore.local']) {
		const token = await login(request, email);
		const res = await request.post(`${api}/api/pharmacy/dispensations`, {
			headers: { Authorization: `Bearer ${token}` },
			data: {
				presentationId: 1,
				quantity: 1,
				idempotencyKey: `lot28d-deny-${email}-${Date.now()}`
			}
		});
		expect(res.status(), `${email} ${await res.text()}`).toBe(403);
	}
});
