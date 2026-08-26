import { test, expect } from '../fixtures/medcore';
test('QA-SMOKE-001 @smoke login dashboard patients Patient 360 consultations logout', async ({
	page,
	login
}) => {
	await page.goto('/login');
	await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();
	await login();
	await expect(page.getByText('MedCore Command Center')).toBeVisible();
	await page.getByRole('link', { name: 'Patients', exact: true }).click();
	await page.getByTestId('qa-patient-search').fill('P-DEMO-001');
	await expect(page.getByText('P-DEMO-001')).toBeVisible();
	await page
		.getByRole('button', { name: /Voir le dossier de/ })
		.first()
		.click();
	await expect(page.getByText(/Patient 360/).first()).toBeVisible();
	await page
		.getByRole('link', { name: /Consultations/ })
		.first()
		.click();
	await expect(page.getByText(/DEMO|Consultations/).first()).toBeVisible();
	await page.getByTitle('Déconnexion').click();
	await expect(page).toHaveURL(/\/login/);
});
