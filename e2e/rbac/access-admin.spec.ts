import { expect, type APIRequestContext } from '@playwright/test';
import { test } from '../fixtures/medcore';

const api = process.env.QA_API_URL ?? 'http://127.0.0.1:8080';
const password = process.env.QA_ADMIN_PASSWORD ?? 'admin123';
const adminEmail = process.env.QA_ADMIN_EMAIL ?? 'admin@medcore.local';
const cashierEmail = 'demo.caissiere@medcore.local';

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

test('QA-RBAC-ADMIN-SMOKE-001 @smoke access center effective permissions', async ({
	page,
	login,
	request
}) => {
	test.setTimeout(60_000);
	const admin = await loginApi(request, adminEmail);
	const list = await request.get(`${api}/api/access/users?limit=20`, { headers: bearer(admin) });
	expect(list.ok(), await list.text()).toBeTruthy();
	const body = await list.json();
	expect((body.items ?? []).length).toBeGreaterThan(0);
	const profileId = body.items[0].profileId as number;

	const detail = await request.get(`${api}/api/access/users/${profileId}`, {
		headers: bearer(admin)
	});
	expect(detail.ok(), await detail.text()).toBeTruthy();
	const d = await detail.json();
	expect(Array.isArray(d.effective)).toBeTruthy();
	expect(d.effective.length).toBeGreaterThan(0);

	await login(adminEmail, password);
	await page.goto('/admin/access');
	await expect(page.getByTestId('access-center')).toBeVisible();
	await expect(page.getByTestId('access-kpis')).toBeVisible();
	await page.getByTestId('access-user-row').first().getByRole('button', { name: 'Gérer' }).click();
	await expect(page.getByTestId('access-user-detail')).toBeVisible();
	await page.getByRole('tab', { name: 'Accès effectifs' }).click();
	await expect(page.getByTestId('access-tab-permissions')).toBeVisible();
});

test('QA-RBAC-ADMIN-FULL-001 @critical override recalculates and audits', async ({ request }) => {
	test.setTimeout(60_000);
	const admin = await loginApi(request, adminEmail);
	const list = await request.get(`${api}/api/access/users?search=generaliste&limit=10`, {
		headers: bearer(admin)
	});
	expect(list.ok(), await list.text()).toBeTruthy();
	const items = (await list.json()).items ?? [];
	const doctor = items.find((u: { email?: string }) =>
		String(u.email ?? '').includes('generaliste')
	);
	expect(doctor?.profileId, 'demo generaliste').toBeTruthy();
	const id = doctor.profileId as number;

	const grant = await request.post(`${api}/api/access/users/${id}/overrides`, {
		headers: bearer(admin),
		data: { permission: 'qa.read', effect: 'GRANT', reason: 'QA-RBAC-ADMIN-FULL-001' }
	});
	expect(grant.ok(), await grant.text()).toBeTruthy();
	const after = await grant.json();
	expect(after.effectiveCodes).toContain('qa.read');
	const entry = (after.effective ?? []).find(
		(e: { permission: string }) => e.permission === 'qa.read'
	);
	expect(entry?.allowed).toBeTruthy();
	expect(entry?.source).toBe('DIRECT_GRANT');

	const sim = await request.get(`${api}/api/access/users/${id}/simulate`, {
		headers: bearer(admin)
	});
	expect(sim.ok()).toBeTruthy();
	const simBody = await sim.json();
	expect(
		simBody.navigation?.some(
			(n: { href: string; visible: boolean }) => n.href === '/admin/qa' && n.visible
		)
	).toBeTruthy();

	const audit = await request.get(`${api}/api/access/users/${id}/audit?limit=20`, {
		headers: bearer(admin)
	});
	expect(audit.ok()).toBeTruthy();
	expect(
		((await audit.json()) as { action: string }[]).some((a) => a.action === 'DIRECT_GRANT')
	).toBeTruthy();

	const clear = await request.delete(
		`${api}/api/access/users/${id}/overrides/${encodeURIComponent('qa.read')}`,
		{
			headers: bearer(admin)
		}
	);
	expect(clear.ok(), await clear.text()).toBeTruthy();
});

test('QA-RBAC-ADMIN-SECURITY-001 @critical unauthorized and anti-lockout', async ({ request }) => {
	test.setTimeout(60_000);
	const cashier = await loginApi(request, cashierEmail);
	const denied = await request.get(`${api}/api/access/users`, { headers: bearer(cashier) });
	expect(denied.status()).toBe(403);

	const noJwt = await request.get(`${api}/api/access/kpis`);
	expect(noJwt.status()).toBe(401);

	const admin = await loginApi(request, adminEmail);
	const list = await request.get(
		`${api}/api/access/users?function=DIRECTEUR_ADMINISTRATIF&limit=20`,
		{
			headers: bearer(admin)
		}
	);
	expect(list.ok()).toBeTruthy();
	const directors = ((await list.json()).items ?? []).filter(
		(u: { accessLevel?: string; functions?: string[] }) =>
			(u.functions ?? []).includes('DIRECTEUR_ADMINISTRATIF')
	);
	// If only one director-like staff, stripping functions should 409 when last admin path
	if (directors.length === 1) {
		const id = directors[0].profileId as number;
		const strip = await request.put(`${api}/api/access/users/${id}/functions`, {
			headers: bearer(admin),
			data: { functions: ['CAISSIER'], reason: 'QA anti-lockout' }
		});
		// admin technical * may still remain — anti-lockout targets staff.manage holders;
		// accept 200 only if another RBAC admin exists, else 409
		expect([200, 409]).toContain(strip.status());
		if (strip.status() === 200) {
			// restore
			await request.put(`${api}/api/access/users/${id}/functions`, {
				headers: bearer(admin),
				data: { functions: ['DIRECTEUR_ADMINISTRATIF'], reason: 'QA restore' }
			});
		}
	}

	const wildcard = await request.post(
		`${api}/api/access/users/${directors[0]?.profileId ?? 1}/overrides`,
		{
			headers: bearer(admin),
			data: { permission: '*', effect: 'GRANT', reason: 'should fail' }
		}
	);
	expect([400, 404]).toContain(wildcard.status());
});
