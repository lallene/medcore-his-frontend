import { test, expect, type APIRequestContext } from '@playwright/test';
const api = process.env.QA_API_URL ?? 'http://127.0.0.1:8080';
async function auth(request: APIRequestContext) {
	const response = await request.post(`${api}/api/auth/login`, {
		data: {
			email: process.env.QA_ADMIN_EMAIL ?? 'admin@medcore.local',
			password: process.env.QA_ADMIN_PASSWORD ?? 'admin123'
		}
	});
	expect(response.ok()).toBeTruthy();
	return { Authorization: `Bearer ${(await response.json()).data.token}` };
}
for (const scenario of [
	['QA-PATIENT-001', 'patients', '/api/patients?search=P-DEMO-001'],
	['QA-CONSULTATION-001', 'consultations', '/api/consultations?search=DEMO&limit=5'],
	['QA-HOSPITALIZATION-001', 'hospitalizations', '/api/hospitalizations?limit=5'],
	['QA-LABORATORY-001', 'laboratory', '/api/laboratory/orders?search=DEMO&limit=5'],
	['QA-IMAGING-001', 'imaging', '/api/imaging/orders?search=DEMO&limit=5'],
	['QA-PHARMACY-001', 'pharmacy', '/api/pharmacy/dispensations?limit=5'],
	['QA-INSURANCE-001', 'insurance', '/api/insurance/authorizations?search=PEC-DEMO&limit=5'],
	['QA-BILLING-001', 'billing', '/api/billing/invoices?limit=5'],
	['QA-CASH-001', 'cash', '/api/cash/receipts?limit=5'],
	['QA-RECEIVABLES-001', 'receivables', '/api/receivables?limit=5'],
	['QA-INSREC-001', 'insurance-receivables', '/api/insurance-receivables?limit=5'],
	['QA-STAFF-001', 'staff', '/api/staff?limit=5']
] as const) {
	test(`${scenario[0]} @full ${scenario[1]} exposes deterministic DEMO data`, async ({
		request
	}) => {
		const response = await request.get(`${api}${scenario[2]}`, { headers: await auth(request) });
		expect(response.ok(), await response.text()).toBeTruthy();
		const body = await response.json();
		expect(JSON.stringify(body)).toContain('DEMO');
	});
}
