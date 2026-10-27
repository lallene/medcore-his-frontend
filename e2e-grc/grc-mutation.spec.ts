import {
	adminEmail,
	apiToken,
	apiURL,
	expect,
	recordResult,
	test,
	uiLogin,
	uniqueSuffix
} from './fixtures';

// GRC15-B08 — one real business mutation: Browser → UI → API → service →
// PostgreSQL → UI. The harness then checks the durable GRC_RISK CREATE audit row.
test('B08-MUT-001 create a risk from the UI', async ({ page, request }) => {
	const reference = `B08-UI-${uniqueSuffix()}`;
	const title = `Risque créé depuis le navigateur ${reference}`;

	await uiLogin(page, adminEmail);
	await page.getByRole('link', { name: 'Registre des risques', exact: true }).click();
	await page.getByTestId('grc-risk-create').click();
	const dialog = page.getByRole('dialog', { name: 'Nouveau risque' });
	await expect(dialog).toBeVisible();
	await dialog.getByLabel('Référence').fill(reference);
	await dialog.getByLabel('Titre').fill(title);
	await dialog.getByTestId('risk-form-likelihood').selectOption('3');
	await dialog.getByTestId('risk-form-impact').selectOption('4');
	await dialog.getByTestId('risk-form-residualLikelihood').selectOption('2');
	await dialog.getByTestId('risk-form-residualImpact').selectOption('2');
	await dialog.getByTestId('risk-form-treatment').selectOption('REDUCE');
	await dialog.getByTestId('risk-form-status').selectOption('OPEN');

	const created = page.waitForResponse(
		(r) => r.url() === `${apiURL}/api/grc/risks` && r.request().method() === 'POST'
	);
	await dialog.getByTestId('risk-form-submit').click();
	const response = await created;
	expect(response.status()).toBe(201);
	const risk = await response.json();
	recordResult('risk', risk.id);

	// UI updated from the server answer: detail page of the new risk.
	await expect(page).toHaveURL(new RegExp(`/grc/risks/${risk.id}$`));
	await expect(page.getByRole('heading', { name: title })).toBeVisible();
	await expect(page.getByTestId('grc-risk-inherent-badge')).toContainText('Élevé');
	await expect(page.getByTestId('grc-risk-residual-badge')).toContainText('Faible');

	// Persisted: read back through the API with a fresh session.
	const token = await apiToken(request, adminEmail);
	const stored = await request.get(`${apiURL}/api/grc/risks/${risk.id}`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	expect(stored.status()).toBe(200);
	const body = await stored.json();
	expect(body).toMatchObject({
		reference,
		title,
		status: 'OPEN',
		inherentScore: 12,
		residualScore: 4
	});

	// Still there after a full reload (no client cache).
	await page.reload();
	await expect(page.getByRole('heading', { name: title })).toBeVisible();
});
