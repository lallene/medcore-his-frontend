import type {
	AuthorizationReferenceType,
	AuthorizationStatus,
	InsuranceAuthorization,
	PatientCoverage
} from '../../types/insurance.ts';
import type { PerformedAct } from '../../types/performed-acts.ts';

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

/** Canonical reference types including additive PERFORMED_ACT (LOT27I-B). */
export const AUTHORIZATION_REFERENCE_TYPES: readonly AuthorizationReferenceType[] = [
	'CONSULTATION',
	'LABORATORY',
	'IMAGING',
	'HOSPITALIZATION',
	'PROCEDURE',
	'MEDICATION',
	'PERFORMED_ACT',
	'OTHER'
] as const;

export const authorizationReferenceLabel: Record<AuthorizationReferenceType, string> = {
	CONSULTATION: 'Consultation',
	LABORATORY: 'Laboratoire',
	IMAGING: 'Imagerie',
	HOSPITALIZATION: 'Hospitalisation',
	PROCEDURE: 'Procédure',
	MEDICATION: 'Médicament',
	PERFORMED_ACT: 'Acte réalisé',
	OTHER: 'Autre'
};

export function formatAuthorizationReferenceType(type: string): string {
	const key = type.toUpperCase() as AuthorizationReferenceType;
	return authorizationReferenceLabel[key] ?? type;
}

/** PERFORMED_ACT must never silently inherit principal/first coverage. */
export function requiresExplicitCoverageSelection(referenceType: string): boolean {
	return referenceType.toUpperCase() === 'PERFORMED_ACT';
}

/**
 * Initial coverage for create form.
 * Legacy types keep principal ?? first.
 * PERFORMED_ACT always starts unselected (0).
 */
export function initialCoverageIdForCreate(
	coverages: PatientCoverage[],
	referenceType: string
): number {
	if (requiresExplicitCoverageSelection(referenceType)) return 0;
	return coverages.find((c) => c.isPrincipal)?.id ?? coverages[0]?.id ?? 0;
}

export function coverageSelectorLabel(coverage: PatientCoverage): string {
	const parts = [
		coverage.companyName || 'Assureur',
		coverage.memberNumber,
		coverage.isPrincipal ? 'Principale' : null,
		coverage.coverageRate != null ? `taux ${coverage.coverageRate}%` : null
	].filter(Boolean);
	return parts.join(' · ');
}

export function canCreatePerformedActPec(
	act: Pick<PerformedAct, 'status' | 'insuranceEligible'>,
	permissions: string[]
): boolean {
	if (act.status !== 'PERFORMED') return false;
	if (!act.insuranceEligible) return false;
	return permissions.includes('*') || permissions.includes('insurance.authorization.create');
}

export function performedActPecDeepLink(patientId: number, performedActId: number): string {
	const q = new URLSearchParams({
		patientId: String(patientId),
		referenceType: 'PERFORMED_ACT',
		referenceId: String(performedActId)
	});
	return `/insurance/authorizations?${q}`;
}

/** RequestedAmount must never be derived from BasePrice snapshot. */
export function requestedAmountFromPerformedActBasePrice(basePrice: number): null {
	void basePrice;
	return null;
}

export function mapAuthorizationConflictMessage(message: string): string {
	const lower = message.toLowerCase();
	if (lower.includes('déjà') || lower.includes('existe déjà') || lower.includes('conflict')) {
		return 'Une PEC active existe déjà pour cet acte et cette couverture. Ouvrez la PEC existante — ne créez pas de doublon.';
	}
	return message;
}

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
