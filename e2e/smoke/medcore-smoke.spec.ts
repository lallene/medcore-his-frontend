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
	await expect(page.getByRole('heading', { name: 'Gestion des patients' })).toBeVisible();

	// Liste paginée chargée côté serveur — ouvrir un patient réellement visible
	// (pas une recherche limitée à la page courante présentée comme globale).
	const openDossier = page.getByRole('button', { name: /Voir le dossier de/ }).first();
	await expect(openDossier).toBeVisible();
	await openDossier.click();

	await expect(page.getByText(/Patient 360/).first()).toBeVisible();
	await page
		.getByRole('link', { name: /Consultations/ })
		.first()
		.click();
	await expect(page.getByText(/DEMO|Consultations/).first()).toBeVisible();
	await page.getByTitle('Déconnexion').click();
	await expect(page).toHaveURL(/\/login/);
});
