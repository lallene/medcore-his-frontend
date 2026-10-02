/**
 * LOT28E-A — Patient360 Model B authority E2E.
 */
import { expect, type APIRequestContext } from '@playwright/test';
import { test } from '../fixtures/medcore';

const api = process.env.QA_API_URL ?? 'http://127.0.0.1:18082';
const password = process.env.QA_ADMIN_PASSWORD ?? 'admin123';
const adminEmail = process.env.QA_ADMIN_EMAIL ?? 'admin@medcore.local';
const doctorEmail = 'demo.generaliste@medcore.local';
const receptionEmail = 'demo.accueil@medcore.local';
const biologisteEmail = 'demo.biologiste@medcore.local';
const pharmacienEmail = 'demo.pharmacien@medcore.local';
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

test('QA-LOT28E-A-E01 @critical physician opens Patient360 with consultations', async ({
	page,
	login,
	request
}) => {
	const admin = await loginApi(request, adminEmail);
	const id = await patientId(request, admin);
	await login(doctorEmail, password);
	await page.goto(`/patients/${id}`);
	await expect(page.getByTestId('access-denied')).toHaveCount(0);
	await expect(page.getByTestId('patient-360-tab-consultations')).toBeVisible({ timeout: 20_000 });
});

test('QA-LOT28E-A-E02 @critical aidesoignant opens P360 without consultations tab', async ({
	page,
	login,
	request
}) => {
	const admin = await loginApi(request, adminEmail);
	const id = await patientId(request, admin);
	await login(aideEmail, password);
	await page.goto(`/patients/${id}`);
	await expect(page.getByTestId('access-denied')).toHaveCount(0);
	await expect(page.getByTestId('patient-360-tab-consultations')).toHaveCount(0);
	await expect(page.getByTestId('patient-360-tab-documents')).toHaveCount(0);
	await expect(page.getByTestId('patient-360-tab-hospitalizations')).toBeVisible({
		timeout: 20_000
	});
});

test('QA-LOT28E-A-E03 @critical ACCUEIL keeps patient list but Patient360 denied', async ({
	page,
	login,
	request
}) => {
	const admin = await loginApi(request, adminEmail);
	const id = await patientId(request, admin);
	await login(receptionEmail, password);
	await page.goto('/patients');
	await expect(page.getByRole('heading', { name: /Patients/i }).first()).toBeVisible({
		timeout: 20_000
	});
	await page.goto(`/patients/${id}`);
	await expect(page.getByTestId('access-denied')).toBeVisible({ timeout: 20_000 });
});

test('QA-LOT28E-A-E04 @critical BIOLOGISTE sees lab exams not consultations', async ({
	page,
	login,
	request
}) => {
	const admin = await loginApi(request, adminEmail);
	const id = await patientId(request, admin);
	const token = await loginApi(request, biologisteEmail);
	const legacy = await request.get(`${api}/api/patients/${id}/360`, {
		headers: bearer(token)
	});
	expect(legacy.status()).not.toBe(200);

	await login(biologisteEmail, password);
	await page.goto(`/patients/${id}`);
	await expect(page.getByTestId('access-denied')).toHaveCount(0);
	await expect(page.getByTestId('patient-360-tab-consultations')).toHaveCount(0);
	await expect(page.getByTestId('patient-360-tab-exams')).toBeVisible({ timeout: 20_000 });
});

test('QA-LOT28E-A-E05 @critical PHARMACIEN Patient360 shell denied', async ({
	page,
	login,
	request
}) => {
	const admin = await loginApi(request, adminEmail);
	const id = await patientId(request, admin);
	await login(pharmacienEmail, password);
	await page.goto(`/patients/${id}`);
	await expect(page.getByTestId('access-denied')).toBeVisible({ timeout: 20_000 });
});
