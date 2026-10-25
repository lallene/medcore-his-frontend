import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { can, canAll, canAny, hasWildcard, isAccessDeniedError } from './permissions.ts';
import {
	buildVisibleNavigation,
	canAccessPath,
	defaultLandingRoute,
	flattenNavigation,
	navDestinations,
	navGroupIdForHref,
	resolveActiveNavHref,
	sidebarNavigation,
	type NavHref,
	type VisibleNavSection
} from './navigation.ts';

/** Every destination the sidebar renders for these permissions (group pages and children included). */
function visibleHrefs(permissions: string[]): NavHref[] {
	return buildVisibleNavigation(permissions).flatMap((section: VisibleNavSection) =>
		section.entries.flatMap((entry) =>
			entry.kind === 'link'
				? [entry.item.href]
				: [...(entry.item ? [entry.item.href] : []), ...entry.children.map((c) => c.href)]
		)
	);
}

function visibleGroup(permissions: string[], id: string) {
	for (const section of buildVisibleNavigation(permissions))
		for (const entry of section.entries)
			if (entry.kind === 'group' && entry.id === id) return entry;
	return undefined;
}

describe('rbac permissions', () => {
	it('wildcard grants all', () => {
		assert.equal(can(['*'], 'qa.read'), true);
		assert.equal(hasWildcard(['*']), true);
	});

	it('canAny and canAll', () => {
		const perms = ['billing.read', 'cash.session.read'];
		assert.equal(canAny(perms, ['qa.read', 'billing.read']), true);
		assert.equal(canAny(perms, ['qa.read']), false);
		assert.equal(canAll(perms, ['billing.read', 'cash.session.read']), true);
		assert.equal(canAll(perms, ['billing.read', 'qa.read']), false);
	});

	it('maps axios 403 marker', () => {
		assert.equal(isAccessDeniedError(new Error('ACCESS_DENIED')), true);
	});
});

describe('rbac navigation', () => {
	it('cashier sees authorised finance destinations, not clinical services', () => {
		const cashier = [
			'billing.read',
			'cash.register.read',
			'cash.session.read',
			'cash.payment.create',
			'ticket.read.own',
			'organization.read'
		];
		const visible = visibleHrefs(cashier);
		assert.deepEqual(visible, ['/billing', '/cash', '/tickets', '/help']);
		for (const href of ['/patients', '/dashboard', '/queue', '/pharmacy', '/laboratory'] as const)
			assert.ok(!visible.includes(href), href);
		assert.ok(!visible.some((href) => href.startsWith('/admin')));
		assert.deepEqual(
			buildVisibleNavigation(cashier).map((section) => section.id),
			['finance', 'support']
		);
		const billing = visibleGroup(cashier, 'billing');
		assert.deepEqual(
			billing?.children.map((c) => c.href),
			['/billing']
		);
		assert.equal(visibleGroup(cashier, 'recovery'), undefined);
	});

	it('doctor lands on worklist not dashboard', () => {
		const doctor = [
			'patients:read',
			'queue.doctor.read',
			'laboratory.read',
			'ticket.read.own',
			'organization.read'
		];
		assert.equal(defaultLandingRoute(doctor), '/queue/doctor');
		assert.equal(canAccessPath('/laboratory', doctor), true);
		assert.equal(canAccessPath('/admin/access', doctor), false);
		assert.deepEqual(visibleHrefs(doctor), [
			'/patients',
			'/queue',
			'/queue/doctor',
			'/laboratory',
			'/tickets',
			'/help'
		]);
	});

	it('admin wildcard keeps access center and sees every administration destination', () => {
		assert.equal(defaultLandingRoute(['*']), '/dashboard');
		assert.equal(canAccessPath('/admin/access', ['*']), true);
		const visible = visibleHrefs(['*']);
		assert.deepEqual(
			visible,
			flattenNavigation().map((item) => item.href)
		);
		const admin = buildVisibleNavigation(['*']).find((section) => section.id === 'admin');
		assert.deepEqual(
			admin?.entries.map((entry) => (entry.kind === 'link' ? entry.item.title : entry.title)),
			[
				'Personnel',
				"Centre d'accès",
				'Organisation',
				'Référentiel des actes',
				'Plannings',
				'Service Desk',
				'Outils techniques'
			]
		);
		assert.deepEqual(
			visibleGroup(['*'], 'tech-tools')?.children.map((c) => c.href),
			['/admin/qa', '/admin/design-system']
		);
	});

	it('sidebar follows the validated section architecture', () => {
		assert.deepEqual(
			sidebarNavigation.map((section) => section.label),
			[
				'Pilotage',
				'Parcours patient',
				'Médico-technique',
				'Assurance & PEC',
				'Finances',
				'Support',
				'Administration'
			]
		);
		const groups = sidebarNavigation.flatMap((section) =>
			section.entries.flatMap((entry) => (entry.kind === 'group' ? [entry.id] : []))
		);
		assert.deepEqual(groups, ['queue', 'hospitalization', 'billing', 'recovery', 'tech-tools']);
		// Each destination appears exactly once in the sidebar.
		const hrefs = flattenNavigation().map((item) => item.href);
		assert.equal(new Set(hrefs).size, hrefs.length);
		assert.deepEqual([...hrefs].sort(), (Object.keys(navDestinations) as NavHref[]).sort());
	});

	it('/administration placeholder is no longer a sidebar entry (route stays reachable)', () => {
		assert.ok(!visibleHrefs(['*']).some((href) => (href as string) === '/administration'));
		assert.ok(!flattenNavigation().some((item) => item.title === 'Administration'));
		assert.equal(canAccessPath('/administration', ['*']), true);
	});

	it('File patients children are filtered individually', () => {
		const doctorOnly = visibleGroup(['queue.doctor.read'], 'queue');
		assert.equal(doctorOnly?.item?.href, '/queue');
		assert.deepEqual(
			doctorOnly?.children.map((c) => c.href),
			['/queue/doctor']
		);
		assert.deepEqual(
			visibleGroup(['queue.triage.read', 'queue.reception.read'], 'queue')?.children.map(
				(c) => c.href
			),
			['/queue/reception', '/queue/triage']
		);
		// Service-wide queue readers reach /queue but none of the dedicated worklists.
		const serviceReader = buildVisibleNavigation(['queue.read.service'])[0];
		assert.deepEqual(serviceReader.entries, [{ kind: 'link', item: navDestinations['/queue'] }]);
	});

	it('fully inaccessible groups are not displayed', () => {
		assert.equal(visibleGroup([], 'queue'), undefined);
		assert.equal(visibleGroup(['patients:read'], 'hospitalization'), undefined);
		assert.equal(visibleGroup(['patients:read'], 'recovery'), undefined);
		assert.equal(visibleGroup(['staff.read'], 'tech-tools'), undefined);
		assert.deepEqual(
			buildVisibleNavigation([]).map((section) => section.id),
			['support']
		);
		assert.deepEqual(
			visibleGroup(['beds.read'], 'hospitalization')?.children.map((c) => c.href),
			['/beds']
		);
		assert.deepEqual(
			visibleGroup(['insurance_receivables.read'], 'recovery')?.children.map((c) => c.href),
			['/insurance-receivables']
		);
	});

	it('groups never widen permissions', () => {
		// Destination permissions are exactly those of the previous flat menus.
		const expected: Record<NavHref, string[]> = {
			'/dashboard': ['dashboard.read'],
			'/reports': ['dashboard.read'],
			'/patients': ['patients:read'],
			'/agenda': ['schedule.read.own', 'schedule.read.service', 'schedule.read.all'],
			'/queue': [
				'queue.reception.read',
				'queue.triage.read',
				'queue.doctor.read',
				'queue.read.service',
				'queue.read.all'
			],
			'/queue/reception': ['queue.reception.read'],
			'/queue/triage': ['queue.triage.read'],
			'/queue/doctor': ['queue.doctor.read'],
			'/consultations': ['consultations.read'],
			'/hospitalizations': ['hospitalizations.read'],
			'/beds': ['beds.read'],
			'/pharmacy': ['pharmacy.stock.read', 'pharmacy.dispensation.read'],
			'/laboratory': ['laboratory.read'],
			'/imaging': ['imaging.read'],
			'/insurance': ['insurance.company.read', 'insurance.coverage.read'],
			'/insurance/vouchers': ['insurance.voucher.read'],
			'/insurance/authorizations': ['insurance.authorization.read'],
			'/billing': ['billing.read'],
			'/billing/refunds': ['billing.refund.read', 'billing.refund.request'],
			'/billing/refunds/report': ['billing.refund.report'],
			'/cash': ['cash.session.read', 'cash.payment.create'],
			'/receivables': ['receivables.read'],
			'/insurance-receivables': ['insurance_receivables.read'],
			'/tickets': ['ticket.read.own'],
			'/help': [],
			'/admin/staff': ['staff.read'],
			'/admin/access': ['rbac.read', 'staff.read', 'staff.manage'],
			'/admin/organization': ['organization.manage'],
			'/admin/act-catalog': ['act_catalog.read', 'act_catalog.manage'],
			'/admin/scheduling': [
				'schedule.manage.service',
				'schedule.manage.all',
				'schedule.read.service',
				'schedule.read.all',
				'appointment_type.manage'
			],
			'/support/tickets': ['ticket.read.service', 'ticket.read.all'],
			'/admin/qa': ['qa.read'],
			'/admin/design-system': ['qa.read']
		};
		for (const [href, item] of Object.entries(navDestinations))
			assert.deepEqual(item.permissions, expected[href as NavHref], href);

		// With any single permission, every visible destination is individually granted
		// and reachable through the route guard.
		const allPermissions = [...new Set(Object.values(expected).flat())];
		for (const permission of allPermissions) {
			for (const href of visibleHrefs([permission])) {
				const required = navDestinations[href].permissions;
				assert.ok(!required.length || required.includes(permission), `${permission} → ${href}`);
				assert.equal(canAccessPath(href, [permission]), true, `${permission} → ${href}`);
			}
		}
	});

	it('active destination is the most specific match and opens its group', () => {
		assert.equal(resolveActiveNavHref('/queue/triage'), '/queue/triage');
		assert.equal(navGroupIdForHref(resolveActiveNavHref('/queue/triage')), 'queue');
		assert.equal(resolveActiveNavHref('/queue'), '/queue');
		assert.equal(resolveActiveNavHref('/billing/refunds/report'), '/billing/refunds/report');
		assert.equal(resolveActiveNavHref('/billing/refunds/42'), '/billing/refunds');
		assert.equal(resolveActiveNavHref('/billing/17'), '/billing');
		assert.equal(resolveActiveNavHref('/patients/12'), '/patients');
		assert.equal(resolveActiveNavHref('/insurance/companies/3'), '/insurance');
		assert.equal(resolveActiveNavHref('/insurance/vouchers/9'), '/insurance/vouchers');
		assert.equal(resolveActiveNavHref('/insurance/other'), undefined);
		assert.equal(resolveActiveNavHref('/administration'), undefined);
		const expectations: Array<[string, string]> = [
			['/hospitalizations', 'hospitalization'],
			['/beds', 'hospitalization'],
			['/billing/refunds', 'billing'],
			['/billing/refunds/report', 'billing'],
			['/receivables', 'recovery'],
			['/insurance-receivables', 'recovery'],
			['/admin/qa', 'tech-tools'],
			['/admin/design-system', 'tech-tools']
		];
		for (const [path, group] of expectations)
			assert.equal(navGroupIdForHref(resolveActiveNavHref(path)), group, path);
		assert.equal(navGroupIdForHref(resolveActiveNavHref('/cash')), undefined);
	});

	it('agenda requires schedule.read not consultations.read', () => {
		assert.equal(canAccessPath('/agenda', ['consultations.read']), false);
		assert.equal(canAccessPath('/agenda', ['queue.checkin']), false);
		assert.equal(canAccessPath('/agenda', ['schedule.read.service']), true);
		assert.equal(canAccessPath('/agenda', ['schedule.read.own']), true);
		assert.equal(canAccessPath('/agenda', ['*']), true);
		assert.ok(!visibleHrefs(['consultations.read']).includes('/agenda'));
	});

	it('act catalog admin path requires act_catalog permissions', () => {
		assert.equal(canAccessPath('/admin/act-catalog', ['dashboard.read']), false);
		assert.equal(canAccessPath('/admin/act-catalog', ['act_catalog.read']), true);
		assert.equal(canAccessPath('/admin/act-catalog', ['act_catalog.manage']), true);
		assert.equal(canAccessPath('/admin/act-catalog', ['*']), true);
	});

	it('LOT28E-A Patient360 path requires patients.360.read; list stays patients:read', () => {
		assert.equal(canAccessPath('/patients', ['patients:read']), true);
		assert.equal(canAccessPath('/patients/12', ['patients:read']), false);
		assert.equal(canAccessPath('/patients/12', ['patients.360.read']), true);
		assert.equal(canAccessPath('/patients/12/edit', ['patients:read']), true);
		assert.equal(canAccessPath('/patients/12/edit', ['patients.360.read']), false);
		assert.equal(canAccessPath('/patients/abc', ['patients:read']), true);
		assert.equal(canAccessPath('/patients/12?tab=documents', ['patients.360.read']), true);
	});
});
