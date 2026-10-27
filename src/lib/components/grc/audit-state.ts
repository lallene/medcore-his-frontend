import type { GrcAudit, GrcAuditPayload, GrcFinding, GrcFindingPayload } from '$lib/types/grc';
import { canAny } from '../../rbac/permissions.ts';

/** Enums backend des audits et constats (aucune valeur inventée). */
export const auditStatusLabel: Record<string, string> = {
	PLANNED: 'Planifié',
	IN_PROGRESS: 'En cours',
	COMPLETED: 'Terminé',
	CANCELLED: 'Annulé'
};

export const auditTypeLabel: Record<string, string> = {
	INTERNAL: 'Interne',
	EXTERNAL: 'Externe',
	VENDOR: 'Fournisseur'
};

export const findingStatusLabel: Record<string, string> = {
	OPEN: 'Ouvert',
	IN_REMEDIATION: 'En remédiation',
	RESOLVED: 'Résolu',
	CLOSED: 'Clôturé',
	ACCEPTED: 'Accepté'
};

export const findingSeverityLabel: Record<string, string> = {
	LOW: 'Faible',
	MEDIUM: 'Moyenne',
	HIGH: 'Élevée',
	CRITICAL: 'Critique'
};

export const findingCategoryLabel: Record<string, string> = {
	NON_CONFORMITY: 'Non-conformité',
	CONTROL_DEFICIENCY: 'Défaillance de contrôle',
	OBSERVATION: 'Observation',
	IMPROVEMENT: 'Piste d’amélioration'
};

export const AUDIT_REFERENCE_MAX = 60;
export const AUDIT_TITLE_MAX = 220;
export const AUDIT_PAGE_SIZE = 20;

export const labelOf = (labels: Record<string, string>, key: string) => labels[key] ?? key;

export const auditAccess = (p: string[]) => ({
	read: canAny(p, ['grc.audit.read']),
	create: canAny(p, ['grc.audit.create']),
	update: canAny(p, ['grc.audit.update']),
	complete: canAny(p, ['grc.audit.complete']),
	readFindings: canAny(p, ['grc.finding.read']),
	createFindings: canAny(p, ['grc.finding.create']),
	updateFindings: canAny(p, ['grc.finding.update']),
	closeFindings: canAny(p, ['grc.finding.close']),
	acceptFindings: canAny(p, ['grc.finding.accept']),
	readActions: canAny(p, ['grc.action.read']),
	readRisks: canAny(p, ['grc.risk.read']),
	readImplementations: canAny(p, ['grc.control.implementation.read'])
});

export type AuditAccess = ReturnType<typeof auditAccess>;

/**
 * Statuts proposés par le formulaire, miroir d'ergonomie des transitions serveur
 * (le serveur reste l'autorité et répond 409). COMPLETED, CLOSED et ACCEPTED ne
 * passent jamais par le formulaire : ils ont leurs routes dédiées.
 */
const auditFormTransitions: Record<string, string[]> = {
	PLANNED: ['PLANNED', 'IN_PROGRESS', 'CANCELLED'],
	IN_PROGRESS: ['IN_PROGRESS', 'CANCELLED']
};
const findingFormTransitions: Record<string, string[]> = {
	OPEN: ['OPEN', 'IN_REMEDIATION', 'RESOLVED'],
	IN_REMEDIATION: ['IN_REMEDIATION', 'RESOLVED'],
	RESOLVED: ['RESOLVED', 'OPEN']
};

/** Création : planifié ou directement en cours. Terminal : aucun choix. */
export const auditStatusOptions = (current?: string) =>
	current ? (auditFormTransitions[current] ?? []) : ['PLANNED', 'IN_PROGRESS'];
export const findingStatusOptions = (current?: string) =>
	current ? (findingFormTransitions[current] ?? []) : ['OPEN'];

export const isAuditTerminal = (status: string) => status === 'COMPLETED' || status === 'CANCELLED';
export const isFindingTerminal = (status: string) => status === 'CLOSED' || status === 'ACCEPTED';

/** Actions de cycle de vie disponibles, selon le statut et les permissions. */
export const auditActions = (a: Pick<GrcAudit, 'status'>, access: AuditAccess) => ({
	edit: access.update && !isAuditTerminal(a.status),
	complete: access.complete && a.status === 'IN_PROGRESS',
	addFinding: access.createFindings && a.status === 'IN_PROGRESS'
});

export const findingActions = (f: Pick<GrcFinding, 'status'>, access: AuditAccess) => ({
	edit: access.updateFindings && !isFindingTerminal(f.status),
	close: access.closeFindings && f.status === 'RESOLVED',
	accept: access.acceptFindings && !isFindingTerminal(f.status)
});

export interface AuditFilters {
	search: string;
	status: string;
	type: string;
	page: number;
}

export const emptyAuditFilters = (): AuditFilters => ({
	search: '',
	status: '',
	type: '',
	page: 1
});

export function auditQuery(f: AuditFilters, limit = AUDIT_PAGE_SIZE) {
	const query: Record<string, string | number> = { page: Math.max(1, f.page), limit };
	const search = f.search.trim();
	if (search) query.search = search;
	if (f.status) query.status = f.status;
	if (f.type) query.type = f.type;
	return query;
}

export const hasActiveAuditFilters = (f: AuditFilters) => !!(f.search.trim() || f.status || f.type);

/** Compteurs de constats, toujours en texte. */
export const findingCountText = (
	a: Pick<GrcAudit, 'findingCount' | 'openFindingCount' | 'overdueFindingCount'>
) =>
	a.findingCount === 0
		? 'Aucun constat'
		: `${a.findingCount} constat(s) · ${a.openFindingCount} ouvert(s)${a.overdueFindingCount ? ` · ${a.overdueFindingCount} en retard` : ''}`;

const civil = (iso: string | null) => (iso ? iso.slice(0, 10) : '');
const iso = (date: string) => (date ? `${date}T00:00:00Z` : null);
const length = (value: string) => [...value.trim()].length;

export interface AuditForm {
	reference: string;
	title: string;
	description: string;
	scope: string;
	type: string;
	status: string;
	leadAuditorProfileId: number | null;
	owningServiceId: number | null;
	plannedStartDate: string;
	plannedEndDate: string;
	/** Conservée telle quelle ; le serveur la fixe au démarrage si elle est absente. */
	startedAt: string | null;
}

export const emptyAuditForm = (): AuditForm => ({
	reference: '',
	title: '',
	description: '',
	scope: '',
	type: '',
	status: 'PLANNED',
	leadAuditorProfileId: null,
	owningServiceId: null,
	plannedStartDate: '',
	plannedEndDate: '',
	startedAt: null
});

export const auditFormFrom = (a: GrcAudit): AuditForm => ({
	reference: a.reference,
	title: a.title,
	description: a.description,
	scope: a.scope,
	type: a.type,
	status: a.status,
	leadAuditorProfileId: a.leadAuditorProfileId,
	owningServiceId: a.owningServiceId,
	plannedStartDate: civil(a.plannedStartAt),
	plannedEndDate: civil(a.plannedEndAt),
	startedAt: a.startedAt
});

export type AuditFormErrors = Partial<
	Record<'reference' | 'title' | 'type' | 'status' | 'plannedEndDate', string>
>;

/** Validation d'ergonomie uniquement : le backend reste l'autorité. */
export function validateAuditForm(f: AuditForm, current?: string): AuditFormErrors {
	const errors: AuditFormErrors = {};
	if (!f.reference.trim()) errors.reference = 'La référence est obligatoire.';
	else if (length(f.reference) > AUDIT_REFERENCE_MAX)
		errors.reference = `La référence ne doit pas dépasser ${AUDIT_REFERENCE_MAX} caractères.`;
	if (!f.title.trim()) errors.title = 'Le titre est obligatoire.';
	else if (length(f.title) > AUDIT_TITLE_MAX)
		errors.title = `Le titre ne doit pas dépasser ${AUDIT_TITLE_MAX} caractères.`;
	if (!(f.type in auditTypeLabel)) errors.type = 'Choisissez un type.';
	if (!auditStatusOptions(current).includes(f.status)) errors.status = 'Statut non disponible.';
	if (f.plannedStartDate && f.plannedEndDate && f.plannedEndDate < f.plannedStartDate)
		errors.plannedEndDate = 'La fin prévue précède le début prévu.';
	return errors;
}

/** Corps envoyé : ni identifiant, ni auteur, ni date de clôture, ni compteur. */
export const auditPayload = (f: AuditForm): GrcAuditPayload => ({
	reference: f.reference.trim(),
	title: f.title.trim(),
	description: f.description.trim(),
	scope: f.scope.trim(),
	type: f.type,
	status: f.status,
	leadAuditorProfileId: f.leadAuditorProfileId,
	owningServiceId: f.owningServiceId,
	plannedStartAt: iso(f.plannedStartDate),
	plannedEndAt: iso(f.plannedEndDate),
	startedAt: f.status === 'PLANNED' ? null : f.startedAt
});

export interface FindingForm {
	reference: string;
	title: string;
	description: string;
	/** Source fixée à la création, jamais modifiable ensuite. */
	auditEngagementId: number | null;
	assessmentId: number | null;
	category: string;
	severity: string;
	status: string;
	controlImplementationId: number | null;
	riskId: number | null;
	ownerProfileId: number | null;
	owningServiceId: number | null;
	dueDate: string;
}

export const emptyFindingForm = (auditEngagementId: number): FindingForm => ({
	reference: '',
	title: '',
	description: '',
	auditEngagementId,
	assessmentId: null,
	category: '',
	severity: '',
	status: 'OPEN',
	controlImplementationId: null,
	riskId: null,
	ownerProfileId: null,
	owningServiceId: null,
	dueDate: ''
});

export const findingFormFrom = (f: GrcFinding): FindingForm => ({
	reference: f.reference,
	title: f.title,
	description: f.description,
	auditEngagementId: f.auditEngagementId,
	assessmentId: f.assessmentId,
	category: f.category,
	severity: f.severity,
	status: f.status,
	controlImplementationId: f.controlImplementationId,
	riskId: f.riskId,
	ownerProfileId: f.ownerProfileId,
	owningServiceId: f.owningServiceId,
	dueDate: civil(f.dueAt)
});

export type FindingFormErrors = Partial<
	Record<'reference' | 'title' | 'category' | 'severity' | 'status', string>
>;

export function validateFindingForm(f: FindingForm, current?: string): FindingFormErrors {
	const errors: FindingFormErrors = {};
	if (!f.reference.trim()) errors.reference = 'La référence est obligatoire.';
	else if (length(f.reference) > AUDIT_REFERENCE_MAX)
		errors.reference = `La référence ne doit pas dépasser ${AUDIT_REFERENCE_MAX} caractères.`;
	if (!f.title.trim()) errors.title = 'Le titre est obligatoire.';
	else if (length(f.title) > AUDIT_TITLE_MAX)
		errors.title = `Le titre ne doit pas dépasser ${AUDIT_TITLE_MAX} caractères.`;
	if (!(f.category in findingCategoryLabel)) errors.category = 'Choisissez une catégorie.';
	if (!(f.severity in findingSeverityLabel)) errors.severity = 'Choisissez une sévérité.';
	if (!findingStatusOptions(current).includes(f.status)) errors.status = 'Statut non disponible.';
	return errors;
}

/** Corps envoyé : la source est reprise telle quelle (immuable côté serveur). */
export const findingPayload = (f: FindingForm): GrcFindingPayload => ({
	reference: f.reference.trim(),
	title: f.title.trim(),
	description: f.description.trim(),
	auditEngagementId: f.auditEngagementId,
	assessmentId: f.assessmentId,
	category: f.category,
	severity: f.severity,
	status: f.status,
	controlImplementationId: f.controlImplementationId,
	riskId: f.riskId,
	ownerProfileId: f.ownerProfileId,
	owningServiceId: f.owningServiceId,
	dueAt: iso(f.dueDate),
	closureNote: ''
});
