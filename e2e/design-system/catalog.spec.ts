import { test, expect } from '../fixtures/medcore';

test('QA-DESIGN-001 @critical design system showcase is readable without destructive controls', async ({
	page,
	login
}) => {
	await login();

	await page.goto('/admin/design-system');

	await expect(page.getByTestId('design-system-page')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Charte graphique & composants' })).toBeVisible();

	await expect(page.getByTestId('ds-palette')).toBeVisible();
	await expect(page.getByText('Primary').first()).toBeVisible();

	await page.getByRole('tab', { name: 'Composants' }).click();
	await expect(page.getByTestId('ds-components')).toBeVisible();
	const buttons = page.getByTestId('ds-buttons');
	await expect(buttons).toBeVisible();
	await expect(buttons.getByRole('button', { name: 'Primary', exact: true })).toBeVisible();
	await expect(buttons.getByRole('button', { name: 'Danger', exact: true })).toBeVisible();

	await page.getByRole('tab', { name: 'États' }).click();
	await expect(page.getByTestId('ds-states')).toBeVisible();
	await expect(page.getByText('État vide')).toBeVisible();

	await expect(page.getByRole('button', { name: /exécuter|lancer|shell/i })).toHaveCount(0);
	await expect(page.getByRole('button', { name: /supprimer définitivement/i })).toHaveCount(0);
});
