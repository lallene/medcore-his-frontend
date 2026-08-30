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
	| '/cash'
	| '/receivables'
	| '/insurance-receivables'
	| '/pharmacy'
	| '/laboratory'
	| '/imaging'
	| '/agenda'
	| '/reports'
	| '/administration'
	| '/admin/staff'
	| '/admin/access'
	| '/admin/organization'
	| '/admin/qa'
	| '/admin/design-system'
	| '/tickets'
	| '/support/tickets'
	| '/queue'
	| '/queue/reception'
	| '/queue/triage'
	| '/queue/doctor';

export type NavItem = {
	title: string;
	href: NavHref;
	soon?: boolean;
	permissions: string[];
};

export const workspaceMenu: NavItem[] = [
	{ title: 'Dashboard', href: '/dashboard', permissions: ['dashboard.read'] },
	{ title: 'Patients', href: '/patients', permissions: ['patients:read'] },
	{
		title: 'Consultations',
		href: '/consultations',
		soon: true,
		permissions: ['consultations.read']
	},
	{
		title: 'File patients',
		href: '/queue',
		permissions: [
			'queue.reception.read',
			'queue.triage.read',
			'queue.doctor.read',
			'queue.read.service',
			'queue.read.all'
		]
	},
	{ title: 'Accueil', href: '/queue/reception', permissions: ['queue.reception.read'] },
	{ title: 'Pré-triage', href: '/queue/triage', permissions: ['queue.triage.read'] },
	{ title: 'File médecin', href: '/queue/doctor', permissions: ['queue.doctor.read'] },
	{ title: 'Hospitalisations', href: '/hospitalizations', permissions: ['hospitalizations.read'] },
	{ title: 'Chambres & lits', href: '/beds', permissions: ['beds.read'] },
	{
		title: 'Assurances',
		href: '/insurance',
		permissions: ['insurance.company.read', 'insurance.coverage.read']
	},
	{ title: 'Bons PEC', href: '/insurance/vouchers', permissions: ['insurance.voucher.read'] },
	{
		title: 'Autorisations PEC',
		href: '/insurance/authorizations',
		permissions: ['insurance.authorization.read']
	},
	{ title: 'Facturation', href: '/billing', permissions: ['billing.read'] },
	{
		title: 'Caisse',
		href: '/cash',
		permissions: ['cash.session.read', 'cash.payment.create']
	},
	{ title: 'Créances patients', href: '/receivables', permissions: ['receivables.read'] },
	{
		title: 'Créances assureurs',
		href: '/insurance-receivables',
		permissions: ['insurance_receivables.read']
	},
	{ title: 'Mes tickets', href: '/tickets', permissions: ['ticket.read.own'] }
];

export const servicesMenu: NavItem[] = [
	{
		title: 'Pharmacie',
		href: '/pharmacy',
		permissions: ['pharmacy.stock.read', 'pharmacy.dispensation.read']
	},
	{ title: 'Laboratoire', href: '/laboratory', permissions: ['laboratory.read'] },
	{ title: 'Imagerie', href: '/imaging', permissions: ['imaging.read'] },
	{
		title: 'Agenda',
		href: '/agenda',
		permissions: ['schedule.read.own', 'schedule.read.service', 'schedule.read.all']
	}
];

export const adminMenu: NavItem[] = [
	{ title: 'Rapports', href: '/reports', permissions: ['dashboard.read'] },
	{ title: 'Administration', href: '/administration', permissions: ['*'] },
	{ title: 'Personnel', href: '/admin/staff', permissions: ['staff.read'] },
	{
		title: "Centre d'accès",
		href: '/admin/access',
		permissions: ['rbac.read', 'staff.read', 'staff.manage']
	},
	{ title: 'Organisation', href: '/admin/organization', permissions: ['organization.manage'] },
	{ title: 'Automated QA', href: '/admin/qa', permissions: ['qa.read'] },
	{ title: 'Design System', href: '/admin/design-system', permissions: ['qa.read'] },
	{
		title: 'Service Desk',
		href: '/support/tickets',
		permissions: ['ticket.read.service', 'ticket.read.all']
	}
];

/** Route → permissions for direct URL guards (prefix match for nested routes). */
export const routePermissionRules: Array<{ prefix: string; permissions: string[] }> = [
	{ prefix: '/admin/access', permissions: ['rbac.read', 'staff.read', 'staff.manage'] },
	{ prefix: '/admin/staff', permissions: ['staff.read'] },
	{ prefix: '/admin/organization', permissions: ['organization.read', 'organization.manage'] },
	{ prefix: '/admin/qa', permissions: ['qa.read'] },
	{ prefix: '/admin/design-system', permissions: ['qa.read'] },
	{ prefix: '/dashboard', permissions: ['dashboard.read'] },
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
