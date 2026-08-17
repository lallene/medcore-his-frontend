import type { AuthorizationStatus, InsuranceAuthorization } from '../../types/insurance.ts';

export const finalAuthorizationStatuses: AuthorizationStatus[] = [
	'APPROVED',
	'PARTIALLY_APPROVED',
	'REJECTED'
];

export const authorizationStatusLabel: Record<AuthorizationStatus, string> = {
	DRAFT: 'Brouillon',
	SUBMITTED: 'Envoyée',
	PENDING: 'En attente',
	APPROVED: 'Accordée',
	PARTIALLY_APPROVED: 'Partiellement accordée',
	REJECTED: 'Refusée',
	CANCELLED: 'Annulée'
};

export function previewDecision(
	requested: number,
	status: AuthorizationStatus,
	rate: number | null,
	fixed: number | null,
	ceiling: number | null
): { insurance: number; patient: number } {
	if (status === 'REJECTED') return { insurance: 0, patient: requested };
	let insurance = requested;
	if (rate !== null) insurance = (requested * rate) / 100;
	if (fixed !== null && (rate === null || fixed < insurance)) insurance = fixed;
	if (ceiling !== null) insurance = Math.min(insurance, ceiling);
	insurance = Math.max(0, Math.min(requested, insurance));
	return { insurance, patient: requested - insurance };
}

export function authorizationActions(item: InsuranceAuthorization) {
	return {
		editable: item.status === 'DRAFT',
		submittable: item.status === 'DRAFT',
		decidable: item.status === 'SUBMITTED' || item.status === 'PENDING',
		cancellable: ['DRAFT', 'SUBMITTED', 'PENDING'].includes(item.status),
		readonly: finalAuthorizationStatuses.includes(item.status)
	};
}

export function hasAuthorizationPermission(
	claims: { permissions?: string[] } | null,
	permission: string
) {
	return Boolean(claims?.permissions?.includes('*') || claims?.permissions?.includes(permission));
}

export function authorizationActPresentation(match: 'NONE' | 'DIRECT' | 'COVERED') {
	return {
		canCreate: match === 'NONE',
		label:
			match === 'COVERED'
				? 'Couvert par une PEC existante'
				: match === 'DIRECT'
					? 'PEC existante'
					: 'Nouvelle PEC nécessaire'
	};
}
