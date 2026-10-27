import type {
	GrcControl,
	GrcControlImplementation,
	GrcControlImplementationPayload,
	GrcControlPayload
} from '$lib/types/grc';
import { canAny } from '../../rbac/permissions.ts';

/** Enums backend des contrôles et de leurs implémentations (aucune valeur inventée). */
export const controlStatusLabel: Record<string, string> = {
	DRAFT: 'Brouillon',
	ACTIVE: 'Actif',
	INACTIVE: 'Inactif',
	RETIRED: 'Retiré'
};

export const implementationStatusLabel: Record<string, string> = {
	PLANNED: 'Planifiée',
	IMPLEMENTED: 'Mise en œuvre',
	PARTIAL: 'Partielle',
	NOT_IMPLEMENTED: 'Non mise en œuvre',
	NOT_APPLICABLE: 'Non applicable'
};

export const assessmentStatusLabel: Record<string, string> = {
	DRAFT: 'Brouillon',
	COMPLETED: 'Terminée',
	CANCELLED: 'Annulée'
};

export const evidenceStatusLabel: Record<string, string> = {
	DRAFT: 'Brouillon',
	VALID: 'Valide',
	REVOKED: 'Révoquée'
};

export const CONTROL_CODE_MAX = 60;
export const CONTROL_NAME_MAX = 220;
export const CONTROL_CATEGORY_MAX = 100;
export const CONTROL_PAGE_SIZE = 20;

export const labelOf = (labels: Record<string, string>, key: string) => labels[key] ?? key;

/** Permissions existantes : contrôles, implémentations et relations restent distincts. */
export const controlAccess = (p: string[]) => ({
	read: canAny(p, ['grc.control.read']),
	manage: canAny(p, ['grc.control.manage']),
	readImplementations: canAny(p, ['grc.control.implementation.read']),
	manageImplementations: canAny(p, ['grc.control.implementation.manage']),
	readRequirements: canAny(p, ['grc.requirement.read']),
	readRisks: canAny(p, ['grc.risk.read']),
	readAssessments: canAny(p, ['grc.assessment.read']),
	readEvidence: canAny(p, ['grc.evidence.read']),
	readAssets: canAny(p, ['grc.asset.read'])
});

export type ControlAccess = ReturnType<typeof controlAccess>;

/** Lier une exigence ou un risque : lecture de la cible + gestion des contrôles (routes existantes). */
export const canMapRequirements = (a: ControlAccess) => a.manage && a.readRequirements;
export const canMapRisks = (a: ControlAccess) => a.manage && a.readRisks;

/** Compteur de relation toujours exprimé en texte. */
export const countLabel = (count: number, singular: string, plural: string) =>
	count === 0 ? `Aucun(e) ${singular}` : `${count} ${count === 1 ? singular : plural}`;

export interface ControlFilters {
	search: string;
	status: string;
	category: string;
	page: number;
}

export const emptyControlFilters = (): ControlFilters => ({
	search: '',
	status: '',
	category: '',
	page: 1
});

export function controlQuery(f: ControlFilters, limit = CONTROL_PAGE_SIZE) {
	const query: Record<string, string | number> = { page: Math.max(1, f.page), limit };
	const search = f.search.trim();
	const category = f.category.trim();
	if (search) query.search = search;
	if (f.status) query.status = f.status;
	if (category) query.category = category;
	return query;
}

export const hasActiveControlFilters = (f: ControlFilters) =>
	!!(f.search.trim() || f.status || f.category.trim());

export interface ControlForm {
	code: string;
	name: string;
	description: string;
	category: string;
	ownerProfileId: number | null;
	owningServiceId: number | null;
	status: string;
}

export const emptyControlForm = (): ControlForm => ({
	code: '',
	name: '',
	description: '',
	category: '',
	ownerProfileId: null,
	owningServiceId: null,
	status: 'DRAFT'
});

export const controlFormFrom = (c: GrcControl): ControlForm => ({
	code: c.code,
	name: c.name,
	description: c.description,
	category: c.category,
	ownerProfileId: c.ownerProfileId,
	owningServiceId: c.owningServiceId,
	status: c.status
});

export type ControlFormErrors = Partial<Record<'code' | 'name' | 'category' | 'status', string>>;

const tooLong = (value: string, max: number) => [...value.trim()].length > max;

/** Validation d'ergonomie uniquement : le backend reste l'autorité. */
export function validateControlForm(f: ControlForm): ControlFormErrors {
	const errors: ControlFormErrors = {};
	if (!f.code.trim()) errors.code = 'Le code est obligatoire.';
	else if (tooLong(f.code, CONTROL_CODE_MAX))
		errors.code = `Le code ne doit pas dépasser ${CONTROL_CODE_MAX} caractères.`;
	if (!f.name.trim()) errors.name = 'Le nom est obligatoire.';
	else if (tooLong(f.name, CONTROL_NAME_MAX))
		errors.name = `Le nom ne doit pas dépasser ${CONTROL_NAME_MAX} caractères.`;
	if (tooLong(f.category, CONTROL_CATEGORY_MAX))
		errors.category = `La catégorie ne doit pas dépasser ${CONTROL_CATEGORY_MAX} caractères.`;
	if (!(f.status in controlStatusLabel)) errors.status = 'Choisissez un statut.';
	return errors;
}

export const controlPayload = (f: ControlForm): GrcControlPayload => ({
	code: f.code.trim(),
	name: f.name.trim(),
	description: f.description.trim(),
	category: f.category.trim(),
	ownerProfileId: f.ownerProfileId,
	owningServiceId: f.owningServiceId,
	status: f.status
});

export interface ImplementationForm {
	controlId: number;
	assetId: number | null;
	ownerProfileId: number | null;
	owningServiceId: number | null;
	status: string;
	implementationDetails: string;
	/** Dates civiles AAAA-MM-JJ, vides si absentes. */
	implementedDate: string;
	lastReviewedDate: string;
}

export const emptyImplementationForm = (controlId: number): ImplementationForm => ({
	controlId,
	assetId: null,
	ownerProfileId: null,
	owningServiceId: null,
	status: 'PLANNED',
	implementationDetails: '',
	implementedDate: '',
	lastReviewedDate: ''
});

const civilDate = (iso: string | null) => (iso ? iso.slice(0, 10) : '');
const isoDate = (date: string) => (date ? `${date}T00:00:00Z` : null);

export const implementationFormFrom = (i: GrcControlImplementation): ImplementationForm => ({
	controlId: i.controlId,
	assetId: i.assetId,
	ownerProfileId: i.ownerProfileId,
	owningServiceId: i.owningServiceId,
	status: i.status,
	implementationDetails: i.implementationDetails,
	implementedDate: civilDate(i.implementedAt),
	lastReviewedDate: civilDate(i.lastReviewedAt)
});

export type ImplementationFormErrors = Partial<
	Record<'assetId' | 'status' | 'implementedDate' | 'lastReviewedDate', string>
>;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function validateImplementationForm(f: ImplementationForm): ImplementationFormErrors {
	const errors: ImplementationFormErrors = {};
	if (!f.assetId) errors.assetId = 'Choisissez un actif.';
	if (!(f.status in implementationStatusLabel)) errors.status = 'Choisissez un statut.';
	if (f.implementedDate && !DATE.test(f.implementedDate)) errors.implementedDate = 'Date invalide.';
	if (f.lastReviewedDate && !DATE.test(f.lastReviewedDate))
		errors.lastReviewedDate = 'Date invalide.';
	return errors;
}

export const implementationPayload = (f: ImplementationForm): GrcControlImplementationPayload => ({
	controlId: f.controlId,
	assetId: f.assetId ?? 0,
	ownerProfileId: f.ownerProfileId,
	owningServiceId: f.owningServiceId,
	status: f.status,
	implementationDetails: f.implementationDetails.trim(),
	implementedAt: isoDate(f.implementedDate),
	lastReviewedAt: isoDate(f.lastReviewedDate)
});
