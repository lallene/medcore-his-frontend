import { test, expect, type APIRequestContext } from '../fixtures/medcore';

const api = process.env.QA_API_URL ?? 'http://127.0.0.1:8080';
const password = process.env.QA_ADMIN_PASSWORD ?? 'admin123';
const cashierEmail = 'demo.caissiere@medcore.local';
const peerEmail = 'demo.generaliste@medcore.local';
const supportAgentEmail = 'demo.support.agent@medcore.local';
const supportManagerEmail = 'demo.support.manager@medcore.local';
const supportNoServiceEmail = 'demo.support.noservice@medcore.local';

async function loginApi(request: APIRequestContext, email: string) {
	const response = await request.post(`${api}/api/auth/login`, {
		data: { email, password }
	});
	expect(response.ok(), await response.text()).toBeTruthy();
	return (await response.json()).data.token as string;
}

function bearer(token: string) {
	return { Authorization: `Bearer ${token}` };
}

test('QA-TICKET-SMOKE-001 @smoke create and read an own ticket', async ({ page, login }) => {
	await login(cashierEmail, password);
	await page.goto('/tickets');
	await expect(page.getByRole('heading', { name: 'Mes tickets' })).toBeVisible();
	await page.goto('/tickets/create?module=QA&page=/dashboard');
	const subject = `QA ticket ${process.env.QA_RUN_ID ?? 'local'}-${Date.now()}`;
	await page.getByLabel('Sujet').fill(subject);
	await page
		.getByLabel('Description')
		.fill('Incident fonctionnel synthétique sans donnée clinique.');
	await page.getByRole('button', { name: 'Créer le ticket' }).click();
	await expect(page).toHaveURL(/\/tickets\/\d+$/);
	await expect(page.getByText(/INC-\d{4}-\d{6}/)).toBeVisible();
	await page.getByLabel('Ajouter un commentaire').fill('Commentaire public du demandeur.');
	await page.getByRole('button', { name: 'Publier' }).click();
	await expect(page.getByText('Commentaire public du demandeur.')).toBeVisible();
	await page.goto('/tickets');
	await expect(page.getByRole('link', { name: /INC-\d{4}-\d{6}/ }).first()).toBeVisible();
	await expect(page.getByText('INC-DEMO-ASSIGNED')).toHaveCount(0);
	await expect(page.getByRole('columnheader', { name: 'SLA' })).toBeVisible();
	await expect(page.getByText('Dans les délais').first()).toBeVisible();
});

test('QA-TICKET-RBAC-001 @critical API without JWT is rejected', async ({ request }) => {
	expect((await request.get(`${api}/api/tickets`)).status()).toBe(401);
	const cashier = await loginApi(request, cashierEmail);
	const peer = await loginApi(request, peerEmail);
	const agent = await loginApi(request, supportAgentEmail);
	const manager = await loginApi(request, supportManagerEmail);
	const noservice = await loginApi(request, supportNoServiceEmail);

	expect(
		(
			await request.patch(`${api}/api/tickets/1`, {
				headers: bearer(cashier),
				data: { urgency: 'HIGH' }
			})
		).status()
	).toBe(403);
	expect(
		(
			await request.post(`${api}/api/tickets/1/workflow`, {
				headers: bearer(cashier),
				data: { status: 'IN_PROGRESS' }
			})
		).status()
	).toBe(403);

	const created = await request.post(`${api}/api/tickets`, {
		headers: bearer(cashier),
		data: {
			type: 'INCIDENT',
			categoryCode: 'APPLICATION',
			title: `RBAC own ${Date.now()}`,
			description: 'Ticket isolé pour preuves RBAC.'
		}
	});
	expect(created.status(), await created.text()).toBe(201);
	const own = await created.json();

	const urgTicket = await request.get(`${api}/api/tickets?search=INC-DEMO-NEW`, {
		headers: bearer(agent)
	});
	expect(urgTicket.ok(), await urgTicket.text()).toBeTruthy();
	const urg = (await urgTicket.json()).items[0];
	expect(urg.reference).toBe('INC-DEMO-NEW');

	const labTicket = await request.get(`${api}/api/tickets?search=INC-DEMO-ASSIGNED`, {
		headers: bearer(manager)
	});
	expect(labTicket.ok(), await labTicket.text()).toBeTruthy();
	const lab = (await labTicket.json()).items[0];
	expect(lab.reference).toBe('INC-DEMO-ASSIGNED');

	expect(
		(await request.get(`${api}/api/tickets/${lab.id}`, { headers: bearer(agent) })).status()
	).toBe(404);
	expect(
		(await request.get(`${api}/api/tickets/${own.id}`, { headers: bearer(peer) })).status()
	).toBe(404);

	const agentList = await request.get(`${api}/api/tickets?limit=100`, { headers: bearer(agent) });
	expect(agentList.ok()).toBeTruthy();
	const agentBody = JSON.stringify(await agentList.json());
	expect(agentBody).toContain('INC-DEMO-NEW');
	expect(agentBody).not.toContain('INC-DEMO-ASSIGNED');

	const agentKPIs = await request.get(`${api}/api/ticketing/kpis`, { headers: bearer(agent) });
	expect(agentKPIs.ok(), await agentKPIs.text()).toBeTruthy();
	const agentKPIBody = await agentKPIs.json();
	expect(agentKPIBody.reopened).toBeGreaterThanOrEqual(1);

	const managerKPIs = await request.get(`${api}/api/ticketing/kpis`, { headers: bearer(manager) });
	expect(managerKPIs.ok()).toBeTruthy();
	const managerKPIBody = await managerKPIs.json();
	expect(managerKPIBody.reopened).toBeGreaterThanOrEqual(agentKPIBody.reopened);

	expect(
		(await request.get(`${api}/api/ticketing/kpis`, { headers: bearer(noservice) })).status()
	).toBe(403);
	expect(
		(await request.get(`${api}/api/ticketing/kpis`, { headers: bearer(cashier) })).status()
	).toBe(403);

	const hidden = `INTERNAL-${Date.now()}`;
	const internalComment = await request.post(`${api}/api/tickets/${own.id}/comments`, {
		headers: bearer(manager),
		data: { content: hidden, visibility: 'INTERNAL' }
	});
	expect(internalComment.status(), await internalComment.text()).toBe(201);
	expect(
		(
			await request.post(`${api}/api/tickets/${own.id}/comments`, {
				headers: bearer(cashier),
				data: { content: 'tentative interne', visibility: 'INTERNAL' }
			})
		).status()
	).toBe(403);

	const requesterView = await request.get(`${api}/api/tickets/${own.id}`, {
		headers: bearer(cashier)
	});
	expect(requesterView.ok()).toBeTruthy();
	expect(JSON.stringify(await requesterView.json())).not.toContain(hidden);
});

test('QA-TICKET-FULL-001 support workflow rejects invalid transition @full', async ({
	page,
	login,
	request
}) => {
	test.setTimeout(90_000);
	const agent = await loginApi(request, supportAgentEmail);
	const manager = await loginApi(request, supportManagerEmail);

	const demoNew = await request.get(`${api}/api/tickets?search=INC-DEMO-NEW`, {
		headers: bearer(agent)
	});
	expect(demoNew.ok(), await demoNew.text()).toBeTruthy();
	const scoped = (await demoNew.json()).items[0];
	expect(scoped.reference).toBe('INC-DEMO-NEW');

	const created = await request.post(`${api}/api/tickets`, {
		headers: bearer(manager),
		data: {
			type: 'INCIDENT',
			categoryCode: 'APPLICATION',
			title: `Workflow ${process.env.QA_RUN_ID ?? 'local'}-${Date.now()}`,
			description: 'Ticket de parcours support isolé.'
		}
	});
	expect(created.status(), await created.text()).toBe(201);
	const ticket = await created.json();
	expect(ticket.status).toBe('NEW');
	expect(ticket.responseSlaBreached).toBeFalsy();

	expect(
		(
			await request.post(`${api}/api/tickets/${ticket.id}/workflow`, {
				headers: bearer(manager),
				data: { status: 'CLOSED' }
			})
		).status()
	).toBe(409);

	const agents = await request.get(`${api}/api/ticketing/agents`, { headers: bearer(manager) });
	expect(agents.ok(), await agents.text()).toBeTruthy();
	const agentRow = (await agents.json()).find(
		(item: { name: string }) => item.name === 'Agent support DEMO'
	);
	expect(agentRow?.userId).toBeTruthy();

	const assigned = await request.post(`${api}/api/tickets/${ticket.id}/assign`, {
		headers: bearer(manager),
		data: { userId: agentRow.userId, queue: 'SUPPORT_APPLICATION' }
	});
	expect(assigned.status(), await assigned.text()).toBe(200);
	expect((await assigned.json()).status).toBe('ASSIGNED');

	for (const [status, extra] of [
		['IN_PROGRESS', {}],
		['WAITING_USER', {}],
		['IN_PROGRESS', {}],
		['RESOLVED', { resolutionSummary: 'Correctif DEMO appliqué', resolutionCode: 'FIXED' }],
		['REOPENED', {}],
		['IN_PROGRESS', {}],
		['RESOLVED', { resolutionSummary: 'Correctif DEMO rejoué', resolutionCode: 'FIXED' }],
		['CLOSED', {}]
	] as const) {
		const response = await request.post(`${api}/api/tickets/${ticket.id}/workflow`, {
			headers: bearer(manager),
			data: { status, ...extra }
		});
		expect(response.status(), `${status}: ${await response.text()}`).toBe(200);
		expect((await response.json()).status).toBe(status);
	}

	const deniedUpload = await request.post(`${api}/api/tickets/${ticket.id}/attachments`, {
		headers: bearer(manager),
		multipart: {
			file: {
				name: 'malware.bin',
				mimeType: 'application/octet-stream',
				buffer: Buffer.from([0, 1, 2, 3, 4, 5, 6, 7])
			}
		}
	});
	expect(deniedUpload.status(), await deniedUpload.text()).toBe(422);

	const allowedUpload = await request.post(`${api}/api/tickets/${ticket.id}/attachments`, {
		headers: bearer(manager),
		multipart: {
			file: {
				name: 'preuve.txt',
				mimeType: 'text/plain',
				buffer: Buffer.from('preuve QA ticketing')
			}
		}
	});
	expect(allowedUpload.status(), await allowedUpload.text()).toBe(201);

	await login(supportAgentEmail, password);
	await page.goto('/support/tickets');
	await expect(page.getByRole('heading', { name: 'File support' })).toBeVisible();
	await page.getByLabel('Recherche').fill('INC-DEMO-NEW');
	await page.getByRole('button', { name: 'Filtrer' }).click();
	await expect(page.getByRole('link', { name: 'INC-DEMO-NEW' })).toBeVisible();
	await page.getByLabel('Recherche').fill('INC-DEMO-ASSIGNED');
	await page.getByRole('button', { name: 'Filtrer' }).click();
	await expect(page.getByRole('link', { name: 'INC-DEMO-ASSIGNED' })).toHaveCount(0);
	await page.getByLabel('Recherche').fill('');
	await page.getByLabel('SLA dépassé').check();
	await page.getByRole('button', { name: 'Filtrer' }).click();
	await expect(page.getByRole('link', { name: 'INC-DEMO-BREACHED' })).toBeVisible();

	await login(supportManagerEmail, password);
	await page.goto(`/tickets/${ticket.id}`);
	await expect(page.getByText(/INC-\d{4}-\d{6}/)).toBeVisible();
	await expect(page.getByText('Fermé')).toBeVisible();
	await expect(page.getByText('preuve.txt')).toBeVisible();
	await expect(page.getByText('Réponse :')).toBeVisible();
});
