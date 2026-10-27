import { appendFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test';

// GRC15-B08 — values exported by scripts/grc-b08-e2e.sh for one throwaway stack.
function env(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`${name} is required: run scripts/grc-b08-e2e.sh`);
	return value;
}

export const apiURL = env('GRC_B08_API_URL');
export const adminEmail = env('GRC_B08_ADMIN_EMAIL');
export const readerEmail = env('GRC_B08_READER_EMAIL');
const password = () => env('GRC_B08_PASSWORD');

/** Records a business id for the harness (audit durability is checked in PostgreSQL). */
export function recordResult(kind: string, id: number) {
	appendFileSync(env('GRC_B08_RESULT_FILE'), `${kind} ${id}\n`);
}

/** Bearer token from the real login endpoint. Never logged nor attached. */
export async function apiToken(request: APIRequestContext, email: string): Promise<string> {
	const res = await request.post(`${apiURL}/api/auth/login`, {
		data: { email, password: password() }
	});
	expect(res.status(), 'API login').toBe(200);
	return (await res.json()).data.token;
}

export async function apiPost<T = { id: number }>(
	request: APIRequestContext,
	token: string,
	path: string,
	data: unknown,
	status = 201
): Promise<T> {
	const res = await request.post(`${apiURL}${path}`, {
		data,
		headers: { Authorization: `Bearer ${token}` }
	});
	if (res.status() !== status)
		throw new Error(`POST ${path}: ${res.status()} ${(await res.text()).slice(0, 300)}`);
	return (await res.json()) as T;
}

export const uniqueSuffix = () => randomBytes(4).toString('hex').toUpperCase();

export interface GrcFixture {
	suffix: string;
	asset: { id: number; code: string; name: string };
	risk: { id: number; reference: string; title: string };
	framework: { id: number; code: string; name: string };
	control: { id: number; code: string; name: string };
	implementation: { id: number };
	evidence: { id: number; reference: string; title: string };
	action: { id: number; reference: string; title: string };
	audit: { id: number; reference: string; title: string };
	finding: { id: number; reference: string; title: string };
	incident: { id: number; reference: string; title: string };
	policy: { id: number; reference: string; title: string };
}

/** Smallest deterministic GRC data set, created through the real API by the admin. */
export async function seedGrc(request: APIRequestContext, token: string): Promise<GrcFixture> {
	const s = uniqueSuffix();
	const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString();
	const post = <T = { id: number }>(path: string, data: unknown) =>
		apiPost<T>(request, token, path, data);

	const asset = { code: `B08-AST-${s}`, name: `Serveur DPI B08 ${s}` };
	const assetId = (
		await post('/api/grc/assets', {
			...asset,
			type: 'SERVER',
			description: 'Fixture GRC15-B08',
			criticality: 'HIGH',
			owningServiceId: null,
			ownerProfileId: null,
			status: 'ACTIVE'
		})
	).id;
	const risk = { reference: `B08-RSK-${s}`, title: `Indisponibilité DPI B08 ${s}` };
	const riskId = (
		await post('/api/grc/risks', {
			...risk,
			description: 'Fixture GRC15-B08',
			assetId,
			owningServiceId: null,
			ownerProfileId: null,
			approverProfileId: null,
			threat: 'Panne',
			vulnerability: 'Point unique',
			likelihood: 3,
			impact: 4,
			residualLikelihood: 2,
			residualImpact: 3,
			treatment: 'REDUCE',
			treatmentDueAt: null,
			status: 'OPEN'
		})
	).id;
	const framework = { code: `B08-FW-${s}`, name: `Référentiel B08 ${s}` };
	const frameworkId = (
		await post('/api/grc/frameworks', {
			...framework,
			version: '1.0',
			description: 'Fixture GRC15-B08',
			source: 'B08',
			status: 'ACTIVE',
			publishedAt: null
		})
	).id;
	await post('/api/grc/requirements', {
		frameworkId,
		code: `B08-REQ-${s}`,
		title: `Exigence B08 ${s}`,
		description: '',
		parentRequirementId: null,
		status: 'ACTIVE'
	});
	const control = { code: `B08-CTL-${s}`, name: `Sauvegarde B08 ${s}` };
	const controlId = (
		await post('/api/grc/controls', {
			...control,
			description: 'Fixture GRC15-B08',
			category: 'Sauvegarde',
			ownerProfileId: null,
			owningServiceId: null,
			status: 'ACTIVE'
		})
	).id;
	// A finding may target this risk only through a linked control.
	await apiPost(request, token, '/api/grc/control-risks', { controlId, riskId }, 201);
	const implementationId = (
		await post('/api/grc/control-implementations', {
			controlId,
			assetId,
			owningServiceId: null,
			ownerProfileId: null,
			status: 'IMPLEMENTED',
			implementationDetails: 'Fixture GRC15-B08',
			implementedAt: day(-10),
			lastReviewedAt: null
		})
	).id;
	const evidence = { reference: `B08-EVD-${s}`, title: `Rapport de sauvegarde B08 ${s}` };
	const evidenceId = (
		await post('/api/grc/evidence', {
			...evidence,
			description: 'Fixture GRC15-B08',
			controlImplementationId: implementationId,
			type: 'DOCUMENT',
			status: 'VALID',
			externalReference: 'GED/B08/sauvegarde',
			collectedAt: day(-1),
			validFrom: day(-1),
			expiresAt: day(90),
			ownerProfileId: null,
			owningServiceId: null
		})
	).id;
	const audit = { reference: `B08-AUD-${s}`, title: `Audit interne B08 ${s}` };
	const auditId = (
		await post('/api/grc/audits', {
			...audit,
			description: 'Fixture GRC15-B08',
			scope: 'DPI',
			type: 'INTERNAL',
			status: 'IN_PROGRESS',
			leadAuditorProfileId: null,
			owningServiceId: null,
			plannedStartAt: day(-2),
			plannedEndAt: day(20),
			startedAt: day(-1)
		})
	).id;
	const finding = { reference: `B08-FND-${s}`, title: `Constat sauvegarde B08 ${s}` };
	const findingId = (
		await post('/api/grc/findings', {
			...finding,
			description: 'Fixture GRC15-B08',
			auditEngagementId: auditId,
			assessmentId: null,
			category: 'CONTROL_DEFICIENCY',
			severity: 'MEDIUM',
			status: 'OPEN',
			controlImplementationId: implementationId,
			riskId,
			ownerProfileId: null,
			owningServiceId: null,
			dueAt: day(30),
			closureNote: ''
		})
	).id;
	const action = { reference: `B08-ACT-${s}`, title: `Corriger la sauvegarde B08 ${s}` };
	const actionId = (
		await post('/api/grc/actions', {
			...action,
			description: 'Fixture GRC15-B08',
			controlImplementationId: null,
			riskId: null,
			findingId,
			assigneeProfileId: null,
			owningServiceId: null,
			priority: 'HIGH',
			status: 'OPEN',
			dueAt: day(15),
			completedAt: null
		})
	).id;
	const incident = { reference: `B08-INC-${s}`, title: `Accès suspect B08 ${s}` };
	const incidentId = (
		await post('/api/grc/incidents', {
			...incident,
			description: 'Fixture GRC15-B08',
			severity: 'HIGH',
			detectedAt: day(-1),
			occurredAt: null,
			riskId,
			assetId,
			owningServiceId: null,
			ownerProfileId: null
		})
	).id;
	const policy = { reference: `B08-POL-${s}`, title: `Politique de sauvegarde B08 ${s}` };
	const policyId = (
		await post('/api/grc/policies', {
			...policy,
			description: 'Fixture GRC15-B08',
			version: '1.0',
			effectiveFrom: null,
			effectiveTo: null,
			owningServiceId: null,
			ownerProfileId: null,
			approverProfileId: null,
			frameworkIds: [frameworkId],
			controlIds: [controlId]
		})
	).id;

	return {
		suffix: s,
		asset: { id: assetId, ...asset },
		risk: { id: riskId, ...risk },
		framework: { id: frameworkId, ...framework },
		control: { id: controlId, ...control },
		implementation: { id: implementationId },
		evidence: { id: evidenceId, ...evidence },
		action: { id: actionId, ...action },
		audit: { id: auditId, ...audit },
		finding: { id: findingId, ...finding },
		incident: { id: incidentId, ...incident },
		policy: { id: policyId, ...policy }
	};
}

/** Real login form, then wait for the client-side redirect away from /login. */
export async function uiLogin(page: Page, email: string) {
	await page.goto('/login');
	await page.getByLabel('Email professionnel').fill(email);
	await page.getByLabel('Mot de passe', { exact: true }).fill(password());
	await page.getByRole('button', { name: 'Se connecter' }).click();
	await page.waitForURL((url) => !url.pathname.endsWith('/login'));
}

type Fixtures = {
	/** API statuses >= 400 a test expects (negative RBAC/auth tests only). */
	expectedStatuses: number[];
	browserGuard: void;
};

/**
 * Fails the test on any pageerror, console.error, CSP violation, failed request,
 * HTTP 5xx or unexpected API 4xx. Chrome reports an HTTP error as a console
 * "Failed to load resource" line: it is accepted only when that status is
 * expected by the test, every other console error fails.
 */
export const test = base.extend<Fixtures>({
	expectedStatuses: [[], { option: true }],
	browserGuard: [
		async ({ page, expectedStatuses }, use) => {
			const problems: string[] = [];
			await page.addInitScript(() => {
				document.addEventListener('securitypolicyviolation', (e) => {
					console.error(`CSP violation: ${e.violatedDirective} blocked ${e.blockedURI}`);
				});
			});
			page.on('pageerror', (error) =>
				problems.push(
					`pageerror: ${error.message} at ${page.url()} ${error.stack?.split('\n')[1]?.trim() ?? ''}`
				)
			);
			page.on('console', (message) => {
				if (message.type() !== 'error') return;
				const text = message.text();
				const status = /status of (\d{3})/.exec(text)?.[1];
				if (status && expectedStatuses.includes(Number(status))) return;
				problems.push(`console.error: ${text}`);
			});
			page.on('requestfailed', (request) =>
				problems.push(
					`requestfailed: ${request.method()} ${request.url()} ${request.failure()?.errorText}`
				)
			);
			page.on('response', (response) => {
				const status = response.status();
				if (status >= 500) problems.push(`http ${status}: ${response.url()}`);
				else if (
					status >= 400 &&
					response.url().startsWith(apiURL) &&
					!expectedStatuses.includes(status)
				)
					problems.push(`unexpected http ${status}: ${response.url()}`);
			});
			await use();
			expect(problems, 'browser console/page/network errors').toEqual([]);
		},
		{ auto: true }
	]
});

export { expect };
