import type { Page } from '@playwright/test';
import { adminEmail, apiToken, expect, seedGrc, test, uiLogin, type GrcFixture } from './fixtures';

// GRC15-B08 — read journeys as the admin, frontend → real API → PostgreSQL.
// One read-only fixture set for the file; no test mutates it.
let data: GrcFixture;

test.beforeAll(async ({ request }) => {
	data = await seedGrc(request, await apiToken(request, adminEmail));
});

test.beforeEach(async ({ page }) => {
	await uiLogin(page, adminEmail);
});

/** Sidebar → list → server-side search → row link → detail, all client-side. */
async function openFromList(
	page: Page,
	menu: string,
	placeholder: string,
	reference: string,
	detail: string
) {
	await page.getByRole('link', { name: menu, exact: true }).click();
	await page.getByPlaceholder(placeholder, { exact: true }).fill(reference);
	await page.getByRole('button', { name: 'Filtrer' }).click();
	await page.getByRole('link', { name: reference }).first().click();
	await expect(page.getByTestId(detail)).toBeVisible();
}

test('B08-GRC-001 dashboard renders server aggregates', async ({ page }) => {
	const dashboard = page.waitForResponse(
		(r) => r.url().includes('/api/grc/dashboard') && r.status() === 200
	);
	await page.getByRole('link', { name: 'Tableau de bord GRC', exact: true }).click();
	await dashboard;
	await expect(page.getByRole('heading', { name: 'Tableau de bord GRC' })).toBeVisible();
	await expect(page.getByTestId('grc-generated-at')).toContainText('Calculé le');
	await expect(page.getByTestId('grc-risks-residual')).toBeVisible();
	await expect(page.getByTestId('grc-coverage')).toBeVisible();
	// Interactive: changing a window refetches the dashboard.
	const refreshed = page.waitForResponse(
		(r) =>
			r.url().includes('/api/grc/dashboard') &&
			r.url().includes('expiringSoonDays=') &&
			r.status() === 200
	);
	await page.getByTestId('grc-window-expiring').selectOption({ index: 1 });
	await refreshed;
});

test('B08-GRC-002 asset list and detail', async ({ page }) => {
	await openFromList(
		page,
		'Registre des actifs',
		'Code, nom ou description',
		data.asset.code,
		'grc-asset-detail'
	);
	await expect(page.getByRole('heading', { name: data.asset.name })).toBeVisible();
	await expect(page.getByTestId('grc-asset-risks')).toContainText(data.risk.reference);
});

test('B08-GRC-003 risk list and detail with server-computed level', async ({ page }) => {
	await openFromList(
		page,
		'Registre des risques',
		'Référence, titre, description, menace…',
		data.risk.reference,
		'grc-risk-detail'
	);
	await expect(page.getByRole('heading', { name: data.risk.title })).toBeVisible();
	await expect(page.getByTestId('grc-risk-asset')).toContainText(data.asset.code);
	// 3 × 4 = 12 → HIGH (10–14), computed by the server.
	await expect(page.getByTestId('grc-risk-inherent-badge')).toContainText('Élevé');
});

test('B08-GRC-004 compliance framework and controls', async ({ page }) => {
	await openFromList(
		page,
		'Conformité',
		'Code, nom ou version',
		data.framework.code,
		'grc-framework-detail'
	);
	await expect(page.getByTestId('grc-framework-requirements')).toContainText(
		`B08-REQ-${data.suffix}`
	);
	await openFromList(
		page,
		'Contrôles',
		'Code, nom ou catégorie',
		data.control.code,
		'grc-control-detail'
	);
	await expect(page.getByRole('heading', { name: data.control.name })).toBeVisible();
});

test('B08-GRC-005 evidence list and detail', async ({ page }) => {
	await openFromList(
		page,
		'Preuves & documents',
		'Référence ou titre',
		data.evidence.reference,
		'grc-evidence-detail'
	);
	await expect(page.getByRole('heading', { name: data.evidence.title })).toBeVisible();
	await expect(page.getByTestId('grc-evidence-document-text')).toHaveText('GED/B08/sauvegarde');
});

test('B08-GRC-006 remediation action list and detail', async ({ page }) => {
	await openFromList(
		page,
		'Plans d’actions',
		'Référence ou titre',
		data.action.reference,
		'grc-action-detail'
	);
	await expect(page.getByRole('heading', { name: data.action.title })).toBeVisible();
	await expect(page.getByTestId('grc-action-finding')).toContainText(data.finding.reference);
});

test('B08-GRC-007 audit engagement and its finding', async ({ page }) => {
	await openFromList(
		page,
		'Audits',
		'Référence ou titre',
		data.audit.reference,
		'grc-audit-detail'
	);
	await expect(page.getByRole('heading', { name: data.audit.title })).toBeVisible();
	await page.getByRole('link', { name: data.finding.reference }).first().click();
	await expect(page.getByTestId('grc-finding-detail')).toBeVisible();
	await expect(page.getByRole('heading', { name: data.finding.title })).toBeVisible();
});

test('B08-GRC-008 security incident list and detail', async ({ page }) => {
	await openFromList(
		page,
		'Incidents de sécurité',
		'Référence ou titre',
		data.incident.reference,
		'grc-incident-detail'
	);
	await expect(page.getByRole('heading', { name: data.incident.title })).toBeVisible();
	await expect(page.getByTestId('grc-incident-severity')).toContainText('élevée');
});

test('B08-GRC-009 governance policy list and detail', async ({ page }) => {
	await openFromList(
		page,
		'Politiques',
		'Référence, titre ou version',
		data.policy.reference,
		'grc-policy-detail'
	);
	await expect(page.getByRole('heading', { name: data.policy.title })).toBeVisible();
	await expect(page.getByTestId('grc-policy-status')).toContainText('Brouillon');
});

test('B08-GRC-010 reporting aggregates from the real endpoint', async ({ page }) => {
	const reporting = page.waitForResponse(
		(r) => r.url().includes('/api/grc/reporting') && r.status() === 200
	);
	await page.getByRole('link', { name: 'Reporting', exact: true }).click();
	const body = await (await reporting).json();
	expect(body).toHaveProperty('generatedAt');
	for (const section of ["Vue d'ensemble", 'Risques', 'Conformité', 'Incidents'])
		await expect(page.getByRole('heading', { name: section, exact: true })).toBeVisible();
});
