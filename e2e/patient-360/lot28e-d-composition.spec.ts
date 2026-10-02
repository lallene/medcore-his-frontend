/**
 * LOT28E-D — Patient360 composition hardening E2E.
 *
 * Active-care stale-response proof is unit-tested (patient-360-load.test.ts):
 * QA queue fixtures are not reliably present for deterministic banner E2E.
 */
import { expect, type APIRequestContext } from '@playwright/test';
import { test } from '../fixtures/medcore';

const api = process.env.QA_API_URL ?? 'http://127.0.0.1:18082';
const password = process.env.QA_ADMIN_PASSWORD ?? 'admin123';
const adminEmail = process.env.QA_ADMIN_EMAIL ?? 'admin@medcore.local';
const doctorEmail = 'demo.generaliste@medcore.local';

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

async function patientId(request: APIRequestContext, token: string, code: string) {
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

test('QA-LOT28E-D-E01 @critical client-side patient switch clears prior identity and scoped state', async ({
	page,
	login,
	request
}) => {
	const admin = await loginApi(request, adminEmail);
	const idAlice = await patientId(request, admin, 'P-DEMO-001');
	const idBoris = await patientId(request, admin, 'P-DEMO-002');

	await login(doctorEmail, password);
	await page.goto(`/patients/${idAlice}`);
	await expect(page.getByTestId('patient-360-header-code')).toContainText('P-DEMO-001', {
		timeout: 20_000
	});
	await expect(page.getByTestId('patient-360-header-name')).toContainText('Alice');

	// Leave overview so tab reset on patient change is observable.
	await page.getByTestId('patient-360-tab-consultations').click();
	await expect(page.getByTestId('patient-360-tab-consultations')).toHaveAttribute(
		'aria-current',
		'page'
	);

	// Client-side navigation (no full reload required for SPA route reuse).
	await page.goto(`/patients/${idBoris}`);

	await expect(page).toHaveURL(new RegExp(`/patients/${idBoris}(\\?|$)`));
	await expect(page.getByTestId('patient-360-header-code')).toContainText('P-DEMO-002', {
		timeout: 20_000
	});
	await expect(page.getByTestId('patient-360-header-name')).toContainText('Boris');
	await expect(page.getByTestId('patient-360-header-name')).not.toContainText('Alice');
	await expect(page.getByText('P-DEMO-001')).toHaveCount(0);

	// activeTab resets to overview (stale consultations tab must not remain selected).
	await expect(page.getByTestId('patient-360-tab-overview')).toHaveAttribute(
		'aria-current',
		'page'
	);

	// Patient-scoped non-header datum: insurance overview differs (001 uninsured vs 002 insured).
	await expect(page.getByText(/Assuré|Non assuré/i).first()).toBeVisible({ timeout: 15_000 });
	await expect(page.getByTestId('patient-360-header-name')).toContainText('Boris');
});
