import type { GrcRisk, GrcRiskPayload } from '$lib/types/grc';
import { canAny } from '../../rbac/permissions.ts';

/** Enums backend des risques GRC (aucune valeur inventée). */
export const riskStatusLabel: Record<string, string> = {
	DRAFT: 'Brouillon',
	OPEN: 'Ouvert',
	IN_TREATMENT: 'En traitement',
	ACCEPTED: 'Accepté',
	CLOSED: 'Clôturé'
};

export const riskTreatmentLabel: Record<string, string> = {
	REDUCE: 'Réduire',
	ACCEPT: 'Accepter',
	AVOID: 'Éviter',
	TRANSFER: 'Transférer'
};

/**
 * Noms des niveaux renvoyés par l'API (`inherentLevel`, `residualLevel`). Les seuils
 * restent côté serveur (RiskLevel) : le frontend n'en calcule aucun.
 */
export const riskLevelName: Record<string, string> = {
	LOW: 'Faible',
	MEDIUM: 'Modéré',
	HIGH: 'Élevé',
	CRITICAL: 'Critique'
};

export const RISK_REFERENCE_MAX = 60;
export const RISK_TITLE_MAX = 220;
export const RISK_PAGE_SIZE = 20;
/** Échelle des composantes (probabilité, impact). */
export const RISK_SCALE = [1, 2, 3, 4, 5] as const;

export const canReadRisks = (p: string[]) => canAny(p, ['grc.risk.read']);
export const canCreateRisks = (p: string[]) => canAny(p, ['grc.risk.create']);
export const canUpdateRisks = (p: string[]) => canAny(p, ['grc.risk.update']);

/** Chaque relation du détail reste soumise à sa propre permission de lecture. */
export const riskRelationAccess = (p: string[]) => ({
	controls: canAny(p, ['grc.control.read']),
	actions: canAny(p, ['grc.action.read']),
	findings: canAny(p, ['grc.finding.read'])
});

export const labelOf = (labels: Record<string, string>, key: string) => labels[key] ?? key;

/** « 20 · Critique » : score de référence du serveur et son niveau, toujours en texte. */
export const scoreText = (score: number, level: string) =>
	`${score} · ${labelOf(riskLevelName, level)}`;

export interface RiskFilters {
	search: string;
	status: string;
	treatment: string;
	inherentLevel: string;
	residualLevel: string;
	assetId: number | null;
	page: number;
}

export const emptyRiskFilters = (): RiskFilters => ({
	search: '',
	status: '',
	treatment: '',
	inherentLevel: '',
	residualLevel: '',
	assetId: null,
	page: 1
});

export function riskQuery(f: RiskFilters, limit = RISK_PAGE_SIZE): Record<string, string | number> {
	const query: Record<string, string | number> = { page: Math.max(1, f.page), limit };
	const search = f.search.trim();
	if (search) query.search = search;
	if (f.status) query.status = f.status;
	if (f.treatment) query.treatment = f.treatment;
	if (f.inherentLevel) query.inherentLevel = f.inherentLevel;
	if (f.residualLevel) query.residualLevel = f.residualLevel;
	if (f.assetId) query.assetId = f.assetId;
	return query;
}

export const hasActiveRiskFilters = (f: RiskFilters) =>
	!!(f.search.trim() || f.status || f.treatment || f.inherentLevel || f.residualLevel || f.assetId);

export interface RiskForm {
	reference: string;
	title: string;
	description: string;
	assetId: number | null;
	owningServiceId: number | null;
	ownerProfileId: number | null;
	approverProfileId: number | null;
	threat: string;
	vulnerability: string;
	likelihood: number | null;
	impact: number | null;
	residualLikelihood: number | null;
	residualImpact: number | null;
	treatment: string;
	/** Date civile AAAA-MM-JJ (champ date), vide si absente. */
	treatmentDueDate: string;
	status: string;
}

export const emptyRiskForm = (): RiskForm => ({
	reference: '',
	title: '',
	description: '',
	assetId: null,
	owningServiceId: null,
	ownerProfileId: null,
	approverProfileId: null,
	threat: '',
	vulnerability: '',
	likelihood: null,
	impact: null,
	residualLikelihood: null,
	residualImpact: null,
	treatment: '',
	treatmentDueDate: '',
	status: 'DRAFT'
});

export const riskFormFrom = (r: GrcRisk): RiskForm => ({
	reference: r.reference,
	title: r.title,
	description: r.description,
	assetId: r.assetId,
	owningServiceId: r.owningServiceId,
	ownerProfileId: r.ownerProfileId,
	approverProfileId: r.approverProfileId,
	threat: r.threat,
	vulnerability: r.vulnerability,
	likelihood: r.likelihood,
	impact: r.impact,
	residualLikelihood: r.residualLikelihood,
	residualImpact: r.residualImpact,
	treatment: r.treatment,
	treatmentDueDate: r.treatmentDueAt ? r.treatmentDueAt.slice(0, 10) : '',
	status: r.status
});

type ScaleField = 'likelihood' | 'impact' | 'residualLikelihood' | 'residualImpact';
export type RiskFormErrors = Partial<
	Record<'reference' | 'title' | 'treatment' | 'status' | 'treatmentDueDate' | ScaleField, string>
>;

const onScale = (v: number | null) => v !== null && (RISK_SCALE as readonly number[]).includes(v);

/** Validation d'ergonomie uniquement : le backend reste l'autorité. */
export function validateRiskForm(f: RiskForm): RiskFormErrors {
	const errors: RiskFormErrors = {};
	const reference = f.reference.trim();
	const title = f.title.trim();
	if (!reference) errors.reference = 'La référence est obligatoire.';
	else if ([...reference].length > RISK_REFERENCE_MAX)
		errors.reference = `La référence ne doit pas dépasser ${RISK_REFERENCE_MAX} caractères.`;
	if (!title) errors.title = 'Le titre est obligatoire.';
	else if ([...title].length > RISK_TITLE_MAX)
		errors.title = `Le titre ne doit pas dépasser ${RISK_TITLE_MAX} caractères.`;
	for (const field of ['likelihood', 'impact', 'residualLikelihood', 'residualImpact'] as const)
		if (!onScale(f[field])) errors[field] = 'Choisissez une valeur de 1 à 5.';
	if (!(f.treatment in riskTreatmentLabel)) errors.treatment = 'Choisissez un traitement.';
	if (!(f.status in riskStatusLabel)) errors.status = 'Choisissez un statut.';
	if (f.treatmentDueDate && !/^\d{4}-\d{2}-\d{2}$/.test(f.treatmentDueDate))
		errors.treatmentDueDate = 'Date invalide.';
	return errors;
}

/**
 * Aperçu « probabilité × impact » pendant la saisie, sans niveau : le score et le
 * niveau enregistrés sont toujours ceux calculés par le serveur.
 */
export const productPreview = (a: number | null, b: number | null) =>
	a !== null && b !== null ? `${a} × ${b} = ${a * b}` : '—';

/** Corps envoyé : aucun identifiant, auteur, score ni niveau. Échéance = minuit UTC du jour choisi. */
export const riskPayload = (f: RiskForm): GrcRiskPayload => ({
	reference: f.reference.trim(),
	title: f.title.trim(),
	description: f.description.trim(),
	assetId: f.assetId,
	owningServiceId: f.owningServiceId,
	ownerProfileId: f.ownerProfileId,
	approverProfileId: f.approverProfileId,
	threat: f.threat.trim(),
	vulnerability: f.vulnerability.trim(),
	likelihood: f.likelihood ?? 0,
	impact: f.impact ?? 0,
	residualLikelihood: f.residualLikelihood ?? 0,
	residualImpact: f.residualImpact ?? 0,
	treatment: f.treatment,
	treatmentDueAt: f.treatmentDueDate ? `${f.treatmentDueDate}T00:00:00Z` : null,
	status: f.status
});

export const formatRiskDate = (iso: string | null) => {
	if (!iso) return '—';
	const date = new Date(iso);
	return Number.isNaN(date.getTime())
		? '—'
		: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(date);
};
