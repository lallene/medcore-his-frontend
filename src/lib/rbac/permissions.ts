import { jwtDecode } from 'jwt-decode';

export type PermissionClaims = { permissions?: string[] };

/** Read permissions embedded in the current JWT (login snapshot). */
export function getStoredPermissions(): string[] {
	if (typeof localStorage === 'undefined') return [];
	const raw = localStorage.getItem('medcore_token');
	if (!raw) return [];
	try {
		return jwtDecode<PermissionClaims>(raw).permissions ?? [];
	} catch {
		return [];
	}
}

export function hasWildcard(permissions: string[]): boolean {
	return permissions.includes('*');
}

export function can(permissions: string[], permission: string): boolean {
	if (hasWildcard(permissions)) return true;
	return permissions.includes(permission);
}

export function canAny(permissions: string[], required: string[]): boolean {
	if (!required.length) return true;
	if (hasWildcard(permissions)) return true;
	return required.some((p) => permissions.includes(p));
}

export function canAll(permissions: string[], required: string[]): boolean {
	if (!required.length) return true;
	if (hasWildcard(permissions)) return true;
	return required.every((p) => permissions.includes(p));
}

export function isAccessDeniedError(error: unknown): boolean {
	return error instanceof Error && error.message === 'ACCESS_DENIED';
}

export function isUnauthorizedError(error: unknown): boolean {
	return error instanceof Error && error.message === 'UNAUTHORIZED';
}

/** User-facing message; returns empty string for expected access denial. */
export function resolveUserErrorMessage(
	error: unknown,
	fallback = 'Une erreur est survenue.'
): string {
	if (isAccessDeniedError(error) || isUnauthorizedError(error)) return '';
	if (error instanceof Error && error.message && !error.message.startsWith('Request failed')) {
		return error.message;
	}
	return fallback;
}
