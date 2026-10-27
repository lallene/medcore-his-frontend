import type { GrcEvidence, GrcEvidencePayload } from '$lib/types/grc';
import { canAny } from '../../rbac/permissions.ts';

/** Enums backend des preuves (aucune valeur inventée). */
export const evidenceTypeLabel: Record<string, string> = {
	DOCUMENT: 'Document',
	CONFIGURATION: 'Configuration',
	LOG: 'Journal',
	SCREENSHOT: 'Capture d’écran',
	REPORT: 'Rapport',
	TEST_RESULT: 'Résultat de test',
	CERTIFICATE: 'Certificat',
	OTHER: 'Autre'
};

export const evidenceStatusLabel: Record<string, string> = {
	DRAFT: 'Brouillon',
	VALID: 'Valide',
	REVOKED: 'Révoquée'
};

/**
 * États de validité renvoyés par l'API (`validity`) : la définition reste côté serveur
 * (une seule, partagée avec le tableau de bord). Le frontend n'en recalcule aucun.
 */
export const evidenceValidityLabel: Record<string, string> = {
	VALID: 'Valide',
	EXPIRING_SOON: 'Expire bientôt',
	EXPIRED: 'Expirée',
	INVALID: 'Non valide (brouillon ou révoquée)'
};

/** Clé de ton du badge (design system) ; le libellé texte reste toujours affiché. */
export const evidenceValidityTone: Record<string, string> = {
	VALID: 'VALID',
	EXPIRING_SOON: 'EXPIRING_SOON',
	EXPIRED: 'EXPIRED',
	INVALID: 'INACTIVE'
};

export const EVIDENCE_REFERENCE_MAX = 60;
export const EVIDENCE_TITLE_MAX = 220;
export const EVIDENCE_EXTERNAL_REFERENCE_MAX = 500;
export const EVIDENCE_PAGE_SIZE = 20;

export const labelOf = (labels: Record<string, string>, key: string) => labels[key] ?? key;

export const evidenceAccess = (p: string[]) => ({
	read: canAny(p, ['grc.evidence.read']),
	manage: canAny(p, ['grc.evidence.manage']),
	readImplementations: canAny(p, ['grc.control.implementation.read']),
	readControls: canAny(p, ['grc.control.read']),
	readAssets: canAny(p, ['grc.asset.read']),
	readAssessments: canAny(p, ['grc.assessment.read'])
});

export interface EvidenceFilters {
	search: string;
	type: string;
	status: string;
	validity: string;
	controlImplementationId: number | null;
	page: number;
}

export const emptyEvidenceFilters = (): EvidenceFilters => ({
	search: '',
	type: '',
	status: '',
	validity: '',
	controlImplementationId: null,
	page: 1
});

export function evidenceQuery(f: EvidenceFilters, limit = EVIDENCE_PAGE_SIZE) {
	const query: Record<string, string | number> = { page: Math.max(1, f.page), limit };
	const search = f.search.trim();
	if (search) query.search = search;
	if (f.type) query.type = f.type;
	if (f.status) query.status = f.status;
	if (f.validity) query.validity = f.validity;
	if (f.controlImplementationId) query.controlImplementationId = f.controlImplementationId;
	return query;
}

export const hasActiveEvidenceFilters = (f: EvidenceFilters) =>
	!!(f.search.trim() || f.type || f.status || f.validity || f.controlImplementationId);

/**
 * Lien externe seulement pour une URL http(s) analysable ; toute autre référence
 * (identifiant GED, cote papier…) reste du texte. L'URL n'est jamais téléchargée.
 */
export function externalLink(reference: string): string | null {
	const value = reference.trim();
	if (!value) return null;
	try {
		const url = new URL(value);
		if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
		if (url.username || url.password) return null;
		return url.href;
	} catch {
		return null;
	}
}

/** Libellé de l'implémentation liée : contrôle sur actif, sinon son numéro. */
export function implementationLabel(e: GrcEvidence): string {
	const impl = e.controlImplementation;
	if (!impl) return `Implémentation n° ${e.controlImplementationId}`;
	const control = impl.control ? impl.control.code : `contrôle n° ${impl.controlId}`;
	const asset = impl.asset ? impl.asset.code : `actif n° ${impl.assetId}`;
	return `${control} sur ${asset}`;
}

export interface EvidenceForm {
	reference: string;
	title: string;
	description: string;
	controlImplementationId: number | null;
	type: string;
	status: string;
	externalReference: string;
	/** Dates civiles AAAA-MM-JJ, vides si absentes. */
	collectedDate: string;
	validFromDate: string;
	expiresDate: string;
	ownerProfileId: number | null;
	owningServiceId: number | null;
}

export const emptyEvidenceForm = (controlImplementationId: number | null = null): EvidenceForm => ({
	reference: '',
	title: '',
	description: '',
	controlImplementationId,
	type: '',
	status: 'DRAFT',
	externalReference: '',
	collectedDate: '',
	validFromDate: '',
	expiresDate: '',
	ownerProfileId: null,
	owningServiceId: null
});

const civil = (iso: string | null) => (iso ? iso.slice(0, 10) : '');
const iso = (date: string) => (date ? `${date}T00:00:00Z` : null);

export const evidenceFormFrom = (e: GrcEvidence): EvidenceForm => ({
	reference: e.reference,
	title: e.title,
	description: e.description,
	controlImplementationId: e.controlImplementationId,
	type: e.type,
	status: e.status,
	externalReference: e.externalReference,
	collectedDate: civil(e.collectedAt),
	validFromDate: civil(e.validFrom),
	expiresDate: civil(e.expiresAt),
	ownerProfileId: e.ownerProfileId,
	owningServiceId: e.owningServiceId
});

export type EvidenceFormErrors = Partial<
	Record<
		| 'reference'
		| 'title'
		| 'controlImplementationId'
		| 'type'
		| 'status'
		| 'externalReference'
		| 'expiresDate',
		string
	>
>;

const length = (value: string) => [...value.trim()].length;

/** Validation d'ergonomie uniquement : le backend reste l'autorité. */
export function validateEvidenceForm(f: EvidenceForm): EvidenceFormErrors {
	const errors: EvidenceFormErrors = {};
	if (!f.reference.trim()) errors.reference = 'La référence est obligatoire.';
	else if (length(f.reference) > EVIDENCE_REFERENCE_MAX)
		errors.reference = `La référence ne doit pas dépasser ${EVIDENCE_REFERENCE_MAX} caractères.`;
	if (!f.title.trim()) errors.title = 'Le titre est obligatoire.';
	else if (length(f.title) > EVIDENCE_TITLE_MAX)
		errors.title = `Le titre ne doit pas dépasser ${EVIDENCE_TITLE_MAX} caractères.`;
	if (!f.controlImplementationId)
		errors.controlImplementationId = 'Choisissez l’implémentation de contrôle prouvée.';
	if (!(f.type in evidenceTypeLabel)) errors.type = 'Choisissez un type.';
	if (!(f.status in evidenceStatusLabel)) errors.status = 'Choisissez un statut.';
	if (length(f.externalReference) > EVIDENCE_EXTERNAL_REFERENCE_MAX)
		errors.externalReference = `La référence documentaire ne doit pas dépasser ${EVIDENCE_EXTERNAL_REFERENCE_MAX} caractères.`;
	if (f.validFromDate && f.expiresDate && f.expiresDate < f.validFromDate)
		errors.expiresDate = 'L’expiration précède le début de validité.';
	return errors;
}

/** Corps envoyé : ni identifiant, ni auteur, ni validité calculée. */
export const evidencePayload = (f: EvidenceForm): GrcEvidencePayload => ({
	reference: f.reference.trim(),
	title: f.title.trim(),
	description: f.description.trim(),
	controlImplementationId: f.controlImplementationId ?? 0,
	type: f.type,
	status: f.status,
	externalReference: f.externalReference.trim(),
	collectedAt: iso(f.collectedDate),
	validFrom: iso(f.validFromDate),
	expiresAt: iso(f.expiresDate),
	ownerProfileId: f.ownerProfileId,
	owningServiceId: f.owningServiceId
});
