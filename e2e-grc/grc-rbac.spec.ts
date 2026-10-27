import {
	adminEmail,
	apiToken,
	apiURL,
	expect,
	readerEmail,
	seedGrc,
	test,
	uiLogin,
	type GrcFixture
} from './fixtures';

// GRC15-B08 — reader holds grc.dashboard.read, grc.asset.read and grc.risk.read
// only (direct GRANT overrides). Every hidden action is also refused by the API.
let data: GrcFixture;

test.beforeAll(async ({ request }) => {
	data = await seedGrc(request, await apiToken(request, adminEmail));
});

test('B08-RBAC-001 reader can read risks but has no write action', async ({ page }) => {
	await uiLogin(page, readerEmail);
	const nav = page.getByRole('navigation', { name: 'Modules' });
	await expect(nav.getByRole('link', { name: 'Registre des risques', exact: true })).toBeVisible();
	await expect(nav.getByRole('link', { name: 'Incidents de sécurité', exact: true })).toHaveCount(
		0
	);
	await expect(nav.getByRole('link', { name: 'Politiques', exact: true })).toHaveCount(0);

	await nav.getByRole('link', { name: 'Registre des risques', exact: true }).click();
	await expect(page.getByTestId('grc-risks')).toBeVisible();
	await expect(page.getByTestId('grc-risk-create')).toHaveCount(0);
	await page.getByPlaceholder('Référence, titre, description, menace…').fill(data.risk.reference);
	await page.getByRole('button', { name: 'Filtrer' }).click();
	await page.getByRole('link', { name: data.risk.reference }).click();
	await expect(page.getByRole('heading', { name: data.risk.title })).toBeVisible();
	await expect(page.getByTestId('grc-risk-edit')).toHaveCount(0);
});

test('B08-RBAC-002 reader is refused on a page outside its permissions', async ({ page }) => {
	await uiLogin(page, readerEmail);
	await page.goto(`/grc/incidents/${data.incident.id}`);
	await expect(page.getByRole('heading', { level: 2 })).toContainText(
		/non disponible|non autorisé/
	);
	await expect(page.getByText(data.incident.title)).toHaveCount(0);
});

test('B08-RBAC-003 direct API bypass is refused for the reader', async ({ request }) => {
	const reader = { Authorization: `Bearer ${await apiToken(request, readerEmail)}` };
	const admin = { Authorization: `Bearer ${await apiToken(request, adminEmail)}` };
	const riskBody = {
		reference: `B08-BYP-${data.suffix}`,
		title: 'Tentative de contournement',
		description: '',
		assetId: null,
		owningServiceId: null,
		ownerProfileId: null,
		approverProfileId: null,
		threat: '',
		vulnerability: '',
		likelihood: 1,
		impact: 1,
		residualLikelihood: 1,
		residualImpact: 1,
		treatment: 'ACCEPT',
		treatmentDueAt: null,
		status: 'DRAFT'
	};

	// Allowed read.
	expect(
		(await request.get(`${apiURL}/api/grc/risks/${data.risk.id}`, { headers: reader })).status()
	).toBe(200);
	// Hidden in the UI, refused by the backend.
	const create = await request.post(`${apiURL}/api/grc/risks`, { headers: reader, data: riskBody });
	expect(create.status()).toBe(403);
	expect((await create.json()).error.code).toBe('PERMISSION_DENIED');
	expect(
		(
			await request.put(`${apiURL}/api/grc/risks/${data.risk.id}`, {
				headers: reader,
				data: riskBody
			})
		).status()
	).toBe(403);
	expect(
		(
			await request.get(`${apiURL}/api/grc/incidents/${data.incident.id}`, { headers: reader })
		).status()
	).toBe(403);
	expect(
		(
			await request.post(`${apiURL}/api/grc/incidents/${data.incident.id}/close`, {
				headers: reader,
				data: {}
			})
		).status()
	).toBe(403);
	expect(
		(
			await request.post(`${apiURL}/api/grc/policies/${data.policy.id}/approve`, {
				headers: reader
			})
		).status()
	).toBe(403);
	// No token at all.
	expect((await request.get(`${apiURL}/api/grc/risks`)).status()).toBe(401);
	// The refused write left nothing behind; the admin can still read the risk unchanged.
	const list = await request.get(`${apiURL}/api/grc/risks?search=B08-BYP-${data.suffix}`, {
		headers: admin
	});
	expect((await list.json()).items).toEqual([]);
});
