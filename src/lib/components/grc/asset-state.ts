import type { GrcAsset, GrcAssetPayload, GrcProfileRef, GrcServiceRef } from '$lib/types/grc';
import { canAny } from '../../rbac/permissions.ts';

/** Enums backend des actifs GRC, dans l'ordre du modèle (aucune valeur inventée). */
export const assetTypeLabel: Record<string, string> = {
	APPLICATION: 'Application',
	INFRASTRUCTURE: 'Infrastructure',
	SERVER: 'Serveur',
	DATABASE: 'Base de données',
	NETWORK: 'Réseau',
	DATA: 'Données',
	BUSINESS_SERVICE: 'Service métier',
	VENDOR: 'Fournisseur',
	PROCESS: 'Processus',
	SITE: 'Site'
};

/** Criticité de l'actif : notion distincte du niveau de risque (score 1–25). */
export const assetCriticalityLabel: Record<string, string> = {
	LOW: 'Faible',
	MEDIUM: 'Moyenne',
	HIGH: 'Élevée',
	CRITICAL: 'Critique'
};

export const assetStatusLabel: Record<string, string> = {
	ACTIVE: 'Actif',
	INACTIVE: 'Inactif',
	RETIRED: 'Retiré'
};

export const ASSET_CODE_MAX = 60;
export const ASSET_NAME_MAX = 180;
export const ASSET_PAGE_SIZE = 20;

export const canReadAssets = (permissions: string[]) => canAny(permissions, ['grc.asset.read']);
export const canManageAssets = (permissions: string[]) => canAny(permissions, ['grc.asset.manage']);
export const canReadAssetRisks = (permissions: string[]) => canAny(permissions, ['grc.risk.read']);

export const labelOf = (labels: Record<string, string>, key: string) => labels[key] ?? key;

export interface AssetFilters {
	search: string;
	type: string;
	criticality: string;
	status: string;
	page: number;
}

export const emptyAssetFilters = (): AssetFilters => ({
	search: '',
	type: '',
	criticality: '',
	status: '',
	page: 1
});

/** Paramètres de GET /api/grc/assets : seuls les filtres renseignés sont envoyés. */
export function assetQuery(
	f: AssetFilters,
	limit = ASSET_PAGE_SIZE
): Record<string, string | number> {
	const query: Record<string, string | number> = { page: Math.max(1, f.page), limit };
	const search = f.search.trim();
	if (search) query.search = search;
	if (f.type) query.type = f.type;
	if (f.criticality) query.criticality = f.criticality;
	if (f.status) query.status = f.status;
	return query;
}

export const hasActiveAssetFilters = (f: AssetFilters) =>
	!!(f.search.trim() || f.type || f.criticality || f.status);

export const serviceLabel = (service?: GrcServiceRef | null) =>
	service ? `${service.name}${service.active ? '' : ' (inactif)'}` : 'Non renseigné';

export const ownerLabel = (profile?: GrcProfileRef | null) => {
	if (!profile) return 'Non renseigné';
	const label = profile.jobTitle
		? `${profile.employeeCode} · ${profile.jobTitle}`
		: profile.employeeCode;
	return profile.active ? label : `${label} (inactif)`;
};

export const formatAssetDate = (iso: string) => {
	const date = new Date(iso);
	return Number.isNaN(date.getTime())
		? '—'
		: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
};

/** État du formulaire : chaînes pour les champs saisis, identifiants nullables. */
export interface AssetForm {
	code: string;
	name: string;
	type: string;
	description: string;
	criticality: string;
	status: string;
	owningServiceId: number | null;
	ownerProfileId: number | null;
}

export const emptyAssetForm = (): AssetForm => ({
	code: '',
	name: '',
	type: '',
	description: '',
	criticality: '',
	status: 'ACTIVE',
	owningServiceId: null,
	ownerProfileId: null
});

export const assetFormFrom = (a: GrcAsset): AssetForm => ({
	code: a.code,
	name: a.name,
	type: a.type,
	description: a.description,
	criticality: a.criticality,
	status: a.status,
	owningServiceId: a.owningServiceId,
	ownerProfileId: a.ownerProfileId
});

export type AssetFormErrors = Partial<
	Record<'code' | 'name' | 'type' | 'criticality' | 'status', string>
>;

/** Validation d'ergonomie uniquement : le backend reste l'autorité. */
export function validateAssetForm(f: AssetForm): AssetFormErrors {
	const errors: AssetFormErrors = {};
	const code = f.code.trim();
	const name = f.name.trim();
	if (!code) errors.code = 'Le code est obligatoire.';
	else if ([...code].length > ASSET_CODE_MAX)
		errors.code = `Le code ne doit pas dépasser ${ASSET_CODE_MAX} caractères.`;
	if (!name) errors.name = 'Le nom est obligatoire.';
	else if ([...name].length > ASSET_NAME_MAX)
		errors.name = `Le nom ne doit pas dépasser ${ASSET_NAME_MAX} caractères.`;
	if (!(f.type in assetTypeLabel)) errors.type = 'Choisissez un type.';
	if (!(f.criticality in assetCriticalityLabel)) errors.criticality = 'Choisissez une criticité.';
	if (!(f.status in assetStatusLabel)) errors.status = 'Choisissez un statut.';
	return errors;
}

/** Corps envoyé à l'API : texte nettoyé, jamais d'identifiant ni de champ d'audit. */
export const assetPayload = (f: AssetForm): GrcAssetPayload => ({
	code: f.code.trim(),
	name: f.name.trim(),
	type: f.type,
	description: f.description.trim(),
	criticality: f.criticality,
	owningServiceId: f.owningServiceId,
	ownerProfileId: f.ownerProfileId,
	status: f.status
});
