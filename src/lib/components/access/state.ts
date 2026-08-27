export function accessLevelLabel(level: string) {
	switch (level) {
		case 'WILDCARD':
			return 'Wildcard';
		case 'RBAC_ADMIN':
			return 'Admin accès';
		case 'ELEVATED':
			return 'Élevé';
		default:
			return 'Standard';
	}
}

export function sourceLabel(source: string, sourceName?: string) {
	switch (source) {
		case 'FUNCTION':
			return `Hérité de : ${sourceName ?? 'fonction'}`;
		case 'SPECIALTY':
			return `Spécialité : ${sourceName ?? ''}`;
		case 'DIRECT_GRANT':
			return 'Ajout direct (GRANT)';
		case 'DIRECT_DENY':
			return 'Refus explicite (DENY)';
		case 'BASE':
			return 'Base système';
		case 'WILDCARD':
			return 'Wildcard admin';
		default:
			return source;
	}
}

export function canAccessCenter(permissions: string[]) {
	return (
		permissions.includes('*') ||
		permissions.includes('rbac.read') ||
		permissions.includes('staff.read') ||
		permissions.includes('staff.manage')
	);
}

export function canManageAccess(permissions: string[]) {
	return (
		permissions.includes('*') ||
		permissions.includes('rbac.user.manage') ||
		permissions.includes('staff.manage')
	);
}

export function canManageOverrides(permissions: string[]) {
	return (
		permissions.includes('*') ||
		permissions.includes('rbac.override.manage') ||
		permissions.includes('staff.manage')
	);
}

export function canManageMatrix(permissions: string[]) {
	return permissions.includes('*') || permissions.includes('rbac.matrix.manage');
}
