/**
 * LOT28E-C1 — Documents tab visibility + physician access (integration).
 * PDF binary content is covered by backend unit/API tests.
 */
import { expect, type APIRequestContext } from '@playwright/test';
import { test } from '../fixtures/medcore';

const api = process.env.QA_API_URL ?? 'http://127.0.0.1:18082';
const password = process.env.QA_ADMIN_PASSWORD ?? 'admin123';
const adminEmail = process.env.QA_ADMIN_EMAIL ?? 'admin@medcore.local';
const doctorEmail = 'demo.generaliste@medcore.local';
const aideEmail = 'demo.aidesoignant@medcore.local';

async function loginApi(request: APIRequestContext, email: string) {
	const response = await request.post(`${api}/api/auth/login`, {
		data: { email, password }
	});
	expect(response.ok(), await response.text()).toBeTruthy();
	const body = await response.json();
	return (body.data?.token ?? body.token) as string;
}

function bearer(token: string) {
	return { Authorization: `Bearer ${token}` };
}

async function patientId(request: APIRequestContext, token: string, code = 'P-DEMO-001') {
	const response = await request.get(`${api}/api/patients?search=${encodeURIComponent(code)}`, {
		headers: bearer(token)
	});
	expect(response.ok(), await response.text()).toBeTruthy();
	const body = await response.json();
	const items = body.data ?? body.items ?? [];
	const row = (Array.isArray(items) ? items : []).find(
		(p: { codePatient?: string; code_patient?: string }) =>
			p.codePatient === code || p.code_patient === code
	);
	expect(row?.id, `patient ${code}`).toBeTruthy();
	return row.id as number;
}

test('QA-LOT28E-C1-E01 @critical physician Documents tab is reachable', async ({
	page,
	login,
	request
}) => {
	const admin = await loginApi(request, adminEmail);
	const id = await patientId(request, admin);
	await login(doctorEmail, password);
	await page.goto(`/patients/${id}`);
	await expect(page.getByTestId('patient-360-tab-documents')).toBeVisible({ timeout: 20_000 });
	await page.getByTestId('patient-360-tab-documents').click();
	await expect(page.getByTestId('patient-360-documents')).toBeVisible({ timeout: 15_000 });
	// Either list or authoritative empty — never denied/error for authorized clinician on demo.
	await expect(page.getByTestId('patient-360-documents-denied')).toHaveCount(0);
	await expect(page.getByTestId('patient-360-documents-error')).toHaveCount(0);
});

test('QA-LOT28E-C1-E02 @critical without consultations.read Documents tab hidden', async ({
	page,
	login,
	request
}) => {
	const admin = await loginApi(request, adminEmail);
	const id = await patientId(request, admin);
	await login(aideEmail, password);
	await page.goto(`/patients/${id}`);
	await expect(page.getByTestId('access-denied')).toHaveCount(0);
	await expect(page.getByTestId('patient-360-tab-documents')).toHaveCount(0);
});
