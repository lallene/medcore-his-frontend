export interface AccessKPIs {
	users: number;
	active: number;
	disabled: number;
	privileged: number;
	withoutService: number;
	withOverrides: number;
}

export interface AccessServiceRef {
	id: number;
	code: string;
	name: string;
	isPrimary: boolean;
}

export interface AccessUserSummary {
	profileId: number;
	userId: number;
	name: string;
	email: string;
	employeeCode: string;
	active: boolean;
	functions: string[];
	specialties: string[];
	services: AccessServiceRef[];
	accessLevel: string;
	overrideCount: number;
	privileged: boolean;
	updatedAt: string;
}

export interface AccessUserList {
	items: AccessUserSummary[];
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export interface EffectiveEntry {
	permission: string;
	allowed: boolean;
	source: string;
	sourceName?: string;
	domain?: string;
	label?: string;
	sensitive?: boolean;
	scopeHint?: string;
}

export interface AccessOverride {
	id: number;
	userId: number;
	permission: string;
	effect: 'GRANT' | 'DENY';
	reason: string;
	active: boolean;
}

export interface AccessUserDetail extends AccessUserSummary {
	jobTitle: string;
	primaryDepartment: string;
	professionalNumber: string;
	primaryServiceId: number | null;
	effective: EffectiveEntry[];
	effectiveCodes: string[];
	overrides: AccessOverride[];
}

export interface AccessMatrix {
	functions: string[];
	permissions: string[];
	cells: { functionCode: string; permission: string; allowed: boolean }[];
	overlays: { functionCode: string; permission: string; effect: string }[];
}

export interface AccessPermission {
	key: string;
	label: string;
	domain: string;
	scopeHint: string;
	sensitive: boolean;
	functions: string[];
}

export interface AccessSimulation {
	userId: number;
	profileId: number;
	name: string;
	navigation: { title: string; href: string; visible: boolean }[];
	actions: { code: string; label: string; allowed: boolean }[];
	services: AccessServiceRef[];
	permissions: string[];
	note: string;
}

export interface AccessAuditEvent {
	id: number;
	targetUserId: number;
	actorUserId: number;
	action: string;
	permission: string;
	oldValue: string;
	newValue: string;
	functionCode: string;
	reason: string;
	createdAt: string;
}
