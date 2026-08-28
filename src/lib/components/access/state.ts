import { canAny } from '../../rbac/permissions.ts';

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
	return canAny(permissions, ['rbac.read', 'staff.read', 'staff.manage']);
}

export function canManageAccess(permissions: string[]) {
	return canAny(permissions, ['rbac.user.manage', 'staff.manage']);
}

export function canManageOverrides(permissions: string[]) {
	return canAny(permissions, ['rbac.override.manage', 'staff.manage']);
}

export function canManageMatrix(permissions: string[]) {
	return canAny(permissions, ['rbac.matrix.manage']);
}
