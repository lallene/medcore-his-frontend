import { canAny } from './permissions.ts';

export type NavHref =
	| '/dashboard'
	| '/patients'
	| '/consultations'
	| '/hospitalizations'
	| '/beds'
	| '/insurance'
	| '/insurance/vouchers'
	| '/insurance/authorizations'
	| '/billing'
	| '/billing/refunds'
	| '/billing/refunds/report'
	| '/cash'
	| '/receivables'
	| '/insurance-receivables'
	| '/pharmacy'
	| '/laboratory'
	| '/imaging'
	| '/agenda'
	| '/reports'
	| '/admin/staff'
	| '/admin/access'
	| '/admin/organization'
	| '/admin/act-catalog'
	| '/admin/scheduling'
	| '/admin/qa'
	| '/admin/design-system'
	| '/tickets'
	| '/support/tickets'
	| '/queue'
	| '/queue/reception'
	| '/queue/triage'
	| '/queue/doctor'
	| '/help';

/** One sidebar destination: the single source of truth for its title and required permissions. */
export type NavItem = {
	title: string;
	href: NavHref;
	soon?: boolean;
	permissions: string[];
};

const QUEUE_ANY_READ = [
	'queue.reception.read',
	'queue.triage.read',
	'queue.doctor.read',
	'queue.read.service',
	'queue.read.all'
];

const SCHEDULE_READ = ['schedule.read.own', 'schedule.read.service', 'schedule.read.all'];

export const navDestinations: Record<NavHref, NavItem> = {
	'/dashboard': { title: 'Dashboard', href: '/dashboard', permissions: ['dashboard.read'] },
	'/reports': { title: 'Rapports', href: '/reports', permissions: ['dashboard.read'] },
	'/patients': { title: 'Patients', href: '/patients', permissions: ['patients:read'] },
	'/agenda': { title: 'Agenda', href: '/agenda', permissions: SCHEDULE_READ },
	'/queue': { title: 'File patients', href: '/queue', permissions: QUEUE_ANY_READ },
	'/queue/reception': {
		title: 'Accueil',
		href: '/queue/reception',
		permissions: ['queue.reception.read']
	},
	'/queue/triage': {
		title: 'Pré-triage',
		href: '/queue/triage',
		permissions: ['queue.triage.read']
	},
	'/queue/doctor': {
		title: 'File médecin',
		href: '/queue/doctor',
		permissions: ['queue.doctor.read']
	},
	'/consultations': {
		title: 'Consultations',
		href: '/consultations',
		soon: true,
		permissions: ['consultations.read']
	},
	'/hospitalizations': {
		title: 'Hospitalisations',
		href: '/hospitalizations',
		permissions: ['hospitalizations.read']
	},
	'/beds': { title: 'Chambres & lits', href: '/beds', permissions: ['beds.read'] },
	'/pharmacy': {
		title: 'Pharmacie',
		href: '/pharmacy',
		permissions: ['pharmacy.stock.read', 'pharmacy.dispensation.read']
	},
	'/laboratory': { title: 'Laboratoire', href: '/laboratory', permissions: ['laboratory.read'] },
	'/imaging': { title: 'Imagerie', href: '/imaging', permissions: ['imaging.read'] },
	'/insurance': {
		title: 'Assureurs & couvertures',
		href: '/insurance',
		permissions: ['insurance.company.read', 'insurance.coverage.read']
	},
	'/insurance/vouchers': {
		title: 'Bons PEC',
		href: '/insurance/vouchers',
		permissions: ['insurance.voucher.read']
	},
	'/insurance/authorizations': {
		title: 'Autorisations PEC',
		href: '/insurance/authorizations',
		permissions: ['insurance.authorization.read']
	},
	'/billing': { title: 'Factures', href: '/billing', permissions: ['billing.read'] },
	'/billing/refunds': {
		title: 'Remboursements',
		href: '/billing/refunds',
		permissions: ['billing.refund.read', 'billing.refund.request']
	},
	'/billing/refunds/report': {
		title: 'Rapport remboursements',
		href: '/billing/refunds/report',
		permissions: ['billing.refund.report']
	},
	'/cash': {
		title: 'Caisse',
		href: '/cash',
		permissions: ['cash.session.read', 'cash.payment.create']
	},
	'/receivables': {
		title: 'Créances patients',
		href: '/receivables',
		permissions: ['receivables.read']
	},
	'/insurance-receivables': {
		title: 'Créances assureurs',
		href: '/insurance-receivables',
		permissions: ['insurance_receivables.read']
	},
	'/tickets': { title: 'Mes tickets', href: '/tickets', permissions: ['ticket.read.own'] },
	// LOT AIDE: every authenticated user; entries are filtered by the backend.
	'/help': { title: 'Aide', href: '/help', permissions: [] },
	'/admin/staff': { title: 'Personnel', href: '/admin/staff', permissions: ['staff.read'] },
	'/admin/access': {
		title: "Centre d'accès",
		href: '/admin/access',
		permissions: ['rbac.read', 'staff.read', 'staff.manage']
	},
	'/admin/organization': {
		title: 'Organisation',
		href: '/admin/organization',
		permissions: ['organization.manage']
	},
	'/admin/act-catalog': {
		title: 'Référentiel des actes',
		href: '/admin/act-catalog',
		permissions: ['act_catalog.read', 'act_catalog.manage']
	},
	'/admin/scheduling': {
		title: 'Plannings',
		href: '/admin/scheduling',
		permissions: [
			'schedule.manage.service',
			'schedule.manage.all',
			'schedule.read.service',
			'schedule.read.all',
			'appointment_type.manage'
		]
	},
	'/support/tickets': {
		title: 'Service Desk',
		href: '/support/tickets',
		permissions: ['ticket.read.service', 'ticket.read.all']
	},
	'/admin/qa': { title: 'Automated QA', href: '/admin/qa', permissions: ['qa.read'] },
	'/admin/design-system': {
		title: 'Design System',
		href: '/admin/design-system',
		permissions: ['qa.read']
	}
};

export type NavSectionId =
	'pilotage' | 'patient-journey' | 'medtech' | 'insurance' | 'finance' | 'support' | 'admin';

export type NavGroupId = 'queue' | 'hospitalization' | 'billing' | 'recovery' | 'tech-tools';

/** Direct link to one destination. */
export type NavLinkEntry = { kind: 'link'; href: NavHref };

/**
 * Collapsible group (one sub-level max). `href` is the group's own destination when the
 * group label is itself a page (File patients → /queue); otherwise the group is structural.
 * A group never grants access to its children: each child keeps its own permissions.
 */
export type NavGroupEntry = {
	kind: 'group';
	id: NavGroupId;
	title: string;
	href?: NavHref;
	children: NavHref[];
};

export type NavEntry = NavLinkEntry | NavGroupEntry;

export type NavSection = { id: NavSectionId; label: string; entries: NavEntry[] };

const link = (href: NavHref): NavLinkEntry => ({ kind: 'link', href });

/** Validated sidebar architecture (presentation order only — permissions live in navDestinations). */
export const sidebarNavigation: NavSection[] = [
	{ id: 'pilotage', label: 'Pilotage', entries: [link('/dashboard'), link('/reports')] },
	{
		id: 'patient-journey',
		label: 'Parcours patient',
		entries: [
			link('/patients'),
			link('/agenda'),
			{
				kind: 'group',
				id: 'queue',
				title: 'File patients',
				href: '/queue',
				children: ['/queue/reception', '/queue/triage', '/queue/doctor']
			},
			link('/consultations'),
			{
				kind: 'group',
				id: 'hospitalization',
				title: 'Hospitalisation',
				children: ['/hospitalizations', '/beds']
			}
		]
	},
	{
		id: 'medtech',
		label: 'Médico-technique',
		entries: [link('/pharmacy'), link('/laboratory'), link('/imaging')]
	},
	{
		id: 'insurance',
		label: 'Assurance & PEC',
		entries: [link('/insurance'), link('/insurance/vouchers'), link('/insurance/authorizations')]
	},
	{
		id: 'finance',
		label: 'Finances',
		entries: [
			{
				kind: 'group',
				id: 'billing',
				title: 'Facturation',
				children: ['/billing', '/billing/refunds', '/billing/refunds/report']
			},
			link('/cash'),
			{
				kind: 'group',
				id: 'recovery',
				title: 'Recouvrement',
				children: ['/receivables', '/insurance-receivables']
			}
		]
	},
	{ id: 'support', label: 'Support', entries: [link('/tickets'), link('/help')] },
	{
		id: 'admin',
		label: 'Administration',
		entries: [
			link('/admin/staff'),
			link('/admin/access'),
			link('/admin/organization'),
			link('/admin/act-catalog'),
			link('/admin/scheduling'),
			link('/support/tickets'),
			{
				kind: 'group',
				id: 'tech-tools',
				title: 'Outils techniques',
				children: ['/admin/qa', '/admin/design-system']
			}
		]
	}
];

/** Every destination reachable from the sidebar, in display order. */
export function flattenNavigation(sections: NavSection[] = sidebarNavigation): NavItem[] {
	return sections.flatMap((section) =>
		section.entries.flatMap((entry) => {
			const hrefs =
				entry.kind === 'link'
					? [entry.href]
					: [...(entry.href ? [entry.href] : []), ...entry.children];
			return hrefs.map((href) => navDestinations[href]);
		})
	);
}

export type VisibleNavLink = { kind: 'link'; item: NavItem };

export type VisibleNavGroup = {
	kind: 'group';
	id: NavGroupId;
	title: string;
	/** Group's own destination, present only when the user may reach it. */
	item?: NavItem;
	children: NavItem[];
};

export type VisibleNavEntry = VisibleNavLink | VisibleNavGroup;

export type VisibleNavSection = { id: NavSectionId; label: string; entries: VisibleNavEntry[] };

/**
 * Sidebar filtered for the given permissions. Each destination is checked individually;
 * a group is kept only when at least one of its destinations is visible, and a group whose
 * only visible destination is its own page collapses to a plain link.
 */
export function buildVisibleNavigation(
	permissions: string[],
	sections: NavSection[] = sidebarNavigation
): VisibleNavSection[] {
	const visible = (href: NavHref) => {
		const item = navDestinations[href];
		return isNavItemVisible(item, permissions) ? item : undefined;
	};
	return sections
		.map((section) => ({
			id: section.id,
			label: section.label,
			entries: section.entries.flatMap((entry): VisibleNavEntry[] => {
				if (entry.kind === 'link') {
					const item = visible(entry.href);
					return item ? [{ kind: 'link', item }] : [];
				}
				const item = entry.href ? visible(entry.href) : undefined;
				const children = entry.children.map(visible).filter((child): child is NavItem => !!child);
				if (!children.length) return item ? [{ kind: 'link', item }] : [];
				return [{ kind: 'group', id: entry.id, title: entry.title, item, children }];
			})
		}))
		.filter((section) => section.entries.length > 0);
}

/**
 * Sidebar destination matching the current path (most specific prefix wins), so that
 * /billing/refunds highlights Remboursements and not Factures.
 */
export function resolveActiveNavHref(pathname: string): NavHref | undefined {
	const path = pathname.split('?')[0];
	let best: NavHref | undefined;
	for (const href of Object.keys(navDestinations) as NavHref[]) {
		if (path !== href && !path.startsWith(`${href}/`)) continue;
		if (!best || href.length > best.length) best = href;
	}
	// Insurer catalogue: only the list and company pages, not unrelated /insurance/* screens.
	if (best === '/insurance' && path !== '/insurance' && !path.startsWith('/insurance/companies')) {
		return undefined;
	}
	return best;
}

/** Group owning the destination (own page or child), used to auto-expand the active group. */
export function navGroupIdForHref(
	href: NavHref | undefined,
	sections: NavSection[] = sidebarNavigation
): NavGroupId | undefined {
	if (!href) return undefined;
	for (const section of sections)
		for (const entry of section.entries)
			if (entry.kind === 'group' && (entry.href === href || entry.children.includes(href)))
				return entry.id;
	return undefined;
}

/** Route → permissions for direct URL guards (prefix match for nested routes). */
export const routePermissionRules: Array<{ prefix: string; permissions: string[] }> = [
	{ prefix: '/admin/access', permissions: ['rbac.read', 'staff.read', 'staff.manage'] },
	{ prefix: '/admin/staff', permissions: ['staff.read'] },
	{ prefix: '/admin/organization', permissions: ['organization.read', 'organization.manage'] },
	{ prefix: '/admin/act-catalog', permissions: ['act_catalog.read', 'act_catalog.manage'] },
	{
		prefix: '/admin/scheduling',
		permissions: [
			'schedule.manage.service',
			'schedule.manage.all',
			'schedule.read.service',
			'schedule.read.all',
			'schedule.read.own',
			'appointment_type.manage'
		]
	},
	{ prefix: '/admin/qa', permissions: ['qa.read'] },
	{ prefix: '/admin/design-system', permissions: ['qa.read'] },
	{ prefix: '/dashboard', permissions: ['dashboard.read'] },
	// LOT28E-A: Patient360 shell is /patients/:numericId — require patients.360.read.
	// Ordinary list /patients stays patients:read (matched after the exact-id check in canAccessPath).
	{ prefix: '/patients', permissions: ['patients:read'] },
	{ prefix: '/consultations', permissions: ['consultations.read'] },
	{ prefix: '/queue/doctor', permissions: ['queue.doctor.read'] },
	{ prefix: '/queue/triage', permissions: ['queue.triage.read'] },
	{ prefix: '/queue/reception', permissions: ['queue.reception.read'] },
	{
		prefix: '/queue',
		permissions: [
			'queue.reception.read',
			'queue.triage.read',
			'queue.doctor.read',
			'queue.read.service',
			'queue.read.all'
		]
	},
	{ prefix: '/hospitalizations', permissions: ['hospitalizations.read'] },
	{ prefix: '/beds', permissions: ['beds.read', 'rooms.read'] },
	{ prefix: '/insurance/authorizations', permissions: ['insurance.authorization.read'] },
	{ prefix: '/insurance/vouchers', permissions: ['insurance.voucher.read'] },
	{ prefix: '/insurance', permissions: ['insurance.company.read', 'insurance.coverage.read'] },
	{
		prefix: '/billing/refunds/report',
		permissions: ['billing.refund.report']
	},
	{
		prefix: '/billing/refunds',
		permissions: ['billing.refund.read', 'billing.refund.request']
	},
	{ prefix: '/billing', permissions: ['billing.read'] },
	{
		prefix: '/cash',
		permissions: ['cash.session.read', 'cash.payment.create', 'cash.register.read']
	},
	{ prefix: '/receivables', permissions: ['receivables.read'] },
	{ prefix: '/insurance-receivables', permissions: ['insurance_receivables.read'] },
	{ prefix: '/pharmacy', permissions: ['pharmacy.stock.read', 'pharmacy.dispensation.read'] },
	{ prefix: '/laboratory', permissions: ['laboratory.read'] },
	{ prefix: '/imaging', permissions: ['imaging.read'] },
	{
		prefix: '/agenda',
		permissions: ['schedule.read.own', 'schedule.read.service', 'schedule.read.all']
	},
	{ prefix: '/support/tickets', permissions: ['ticket.read.service', 'ticket.read.all'] },
	{ prefix: '/tickets', permissions: ['ticket.read.own', 'ticket.read.service', 'ticket.read.all'] }
];

export function isNavItemVisible(item: NavItem, permissions: string[]): boolean {
	return canAny(permissions, item.permissions);
}

export function filterVisibleNav(items: NavItem[], permissions: string[]): NavItem[] {
	return items.filter((item) => isNavItemVisible(item, permissions));
}

export function canAccessPath(pathname: string, permissions: string[]): boolean {
	const path = pathname.split('?')[0];
	// LOT28E-A Model B: Patient360 page requires patients.360.read (not patients:read alone).
	if (/^\/patients\/\d+$/.test(path)) {
		return canAny(permissions, ['patients.360.read']);
	}
	for (const rule of routePermissionRules) {
		if (path === rule.prefix || path.startsWith(`${rule.prefix}/`)) {
			return canAny(permissions, rule.permissions);
		}
	}
	return true;
}

/** First safe landing route after login (no dashboard.read for most clinical/cash roles). */
export function defaultLandingRoute(permissions: string[]): string {
	const candidates: Array<{ href: NavHref; permissions: string[] }> = [
		{ href: '/dashboard', permissions: ['dashboard.read'] },
		{ href: '/queue/doctor', permissions: ['queue.doctor.read'] },
		{ href: '/queue/triage', permissions: ['queue.triage.read'] },
		{ href: '/queue/reception', permissions: ['queue.reception.read'] },
		{ href: '/cash', permissions: ['cash.session.read', 'cash.payment.create'] },
		{ href: '/billing', permissions: ['billing.read'] },
		{ href: '/patients', permissions: ['patients:read'] },
		{
			href: '/agenda',
			permissions: ['schedule.read.own', 'schedule.read.service', 'schedule.read.all']
		},
		{ href: '/pharmacy', permissions: ['pharmacy.stock.read', 'pharmacy.dispensation.read'] },
		{ href: '/laboratory', permissions: ['laboratory.read'] },
		{ href: '/imaging', permissions: ['imaging.read'] },
		{ href: '/admin/access', permissions: ['rbac.read', 'staff.read', 'staff.manage'] },
		{ href: '/tickets', permissions: ['ticket.read.own'] }
	];
	for (const c of candidates) {
		if (canAny(permissions, c.permissions)) return c.href;
	}
	return '/tickets';
}
