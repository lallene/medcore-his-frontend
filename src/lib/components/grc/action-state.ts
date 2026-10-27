import type { GrcAction, GrcActionPayload } from '$lib/types/grc';
import { canAny } from '../../rbac/permissions.ts';

/** Enums backend des actions de remédiation (aucune valeur inventée). */
export const actionStatusLabel: Record<string, string> = {
	OPEN: 'Ouverte',
	IN_PROGRESS: 'En cours',
	BLOCKED: 'Bloquée',
	DONE: 'Terminée',
	CANCELLED: 'Annulée'
};

export const actionPriorityLabel: Record<string, string> = {
	LOW: 'Basse',
	MEDIUM: 'Moyenne',
	HIGH: 'Haute',
	CRITICAL: 'Critique'
};

/**
 * États d'échéance renvoyés par l'API (`dueState`) : la définition reste côté serveur
 * (une seule, partagée avec le tableau de bord). Le frontend n'en recalcule aucun.
 */
export const actionDueStateLabel: Record<string, string> = {
	OVERDUE: 'En retard',
	DUE_SOON: 'Échéance proche',
	UPCOMING: 'À venir',
	NO_DUE_DATE: 'Sans échéance',
	CLOSED: 'Terminée ou annulée'
};

/** Clé de ton du badge ; le libellé texte reste toujours affiché. */
export const actionDueStateTone: Record<string, string> = {
	OVERDUE: 'OVERDUE',
	DUE_SOON: 'PENDING',
	UPCOMING: 'OPEN',
	NO_DUE_DATE: 'INACTIVE',
	CLOSED: 'CLOSED'
};

export const findingStatusLabel: Record<string, string> = {
	OPEN: 'Ouvert',
	IN_REMEDIATION: 'En remédiation',
	RESOLVED: 'Résolu',
	CLOSED: 'Clôturé',
	ACCEPTED: 'Accepté'
};

export const ACTION_REFERENCE_MAX = 60;
export const ACTION_TITLE_MAX = 220;
export const ACTION_PAGE_SIZE = 20;

export const labelOf = (labels: Record<string, string>, key: string) => labels[key] ?? key;

export const actionAccess = (p: string[]) => ({
	read: canAny(p, ['grc.action.read']),
	create: canAny(p, ['grc.action.create']),
	update: canAny(p, ['grc.action.update']),
	readFindings: canAny(p, ['grc.finding.read']),
	readRisks: canAny(p, ['grc.risk.read']),
	readImplementations: canAny(p, ['grc.control.implementation.read']),
	readControls: canAny(p, ['grc.control.read']),
	readAssets: canAny(p, ['grc.asset.read'])
});

export interface ActionFilters {
	search: string;
	status: string;
	priority: string;
	dueState: string;
	riskId: number | null;
	findingId: number | null;
	page: number;
}

export const emptyActionFilters = (): ActionFilters => ({
	search: '',
	status: '',
	priority: '',
	dueState: '',
	riskId: null,
	findingId: null,
	page: 1
});

export function actionQuery(f: ActionFilters, limit = ACTION_PAGE_SIZE) {
	const query: Record<string, string | number> = { page: Math.max(1, f.page), limit };
	const search = f.search.trim();
	if (search) query.search = search;
	if (f.status) query.status = f.status;
	if (f.priority) query.priority = f.priority;
	if (f.dueState) query.dueState = f.dueState;
	if (f.riskId) query.riskId = f.riskId;
	if (f.findingId) query.findingId = f.findingId;
	return query;
}

export const hasActiveActionFilters = (f: ActionFilters) =>
	!!(f.search.trim() || f.status || f.priority || f.dueState || f.riskId || f.findingId);

/** Cibles de l'action, en texte : implémentation (contrôle sur actif), risque, constat. */
export function actionTargets(a: GrcAction): string[] {
	const targets: string[] = [];
	if (a.controlImplementationId) {
		const impl = a.controlImplementation;
		targets.push(
			impl
				? `${impl.control?.code ?? `contrôle n° ${impl.controlId}`} sur ${impl.asset?.code ?? `actif n° ${impl.assetId}`}`
				: `Implémentation n° ${a.controlImplementationId}`
		);
	}
	if (a.riskId) targets.push(a.risk ? `Risque ${a.risk.reference}` : `Risque n° ${a.riskId}`);
	if (a.findingId)
		targets.push(a.finding ? `Constat ${a.finding.reference}` : `Constat n° ${a.findingId}`);
	return targets;
}

export interface ActionForm {
	reference: string;
	title: string;
	description: string;
	controlImplementationId: number | null;
	riskId: number | null;
	findingId: number | null;
	assigneeProfileId: number | null;
	owningServiceId: number | null;
	priority: string;
	status: string;
	/** Date civile AAAA-MM-JJ, vide si absente. */
	dueDate: string;
}

export const emptyActionForm = (preset: Partial<ActionForm> = {}): ActionForm => ({
	reference: '',
	title: '',
	description: '',
	controlImplementationId: null,
	riskId: null,
	findingId: null,
	assigneeProfileId: null,
	owningServiceId: null,
	priority: '',
	status: 'OPEN',
	dueDate: '',
	...preset
});

export const actionFormFrom = (a: GrcAction): ActionForm => ({
	reference: a.reference,
	title: a.title,
	description: a.description,
	controlImplementationId: a.controlImplementationId,
	riskId: a.riskId,
	findingId: a.findingId,
	assigneeProfileId: a.assigneeProfileId,
	owningServiceId: a.owningServiceId,
	priority: a.priority,
	status: a.status,
	dueDate: a.dueAt ? a.dueAt.slice(0, 10) : ''
});

export type ActionFormErrors = Partial<
	Record<'reference' | 'title' | 'targets' | 'priority' | 'status' | 'dueDate', string>
>;

const length = (value: string) => [...value.trim()].length;

/** Validation d'ergonomie uniquement : le backend reste l'autorité (cibles, constats terminaux…). */
export function validateActionForm(f: ActionForm): ActionFormErrors {
	const errors: ActionFormErrors = {};
	if (!f.reference.trim()) errors.reference = 'La référence est obligatoire.';
	else if (length(f.reference) > ACTION_REFERENCE_MAX)
		errors.reference = `La référence ne doit pas dépasser ${ACTION_REFERENCE_MAX} caractères.`;
	if (!f.title.trim()) errors.title = 'Le titre est obligatoire.';
	else if (length(f.title) > ACTION_TITLE_MAX)
		errors.title = `Le titre ne doit pas dépasser ${ACTION_TITLE_MAX} caractères.`;
	if (!f.controlImplementationId && !f.riskId && !f.findingId)
		errors.targets = 'Choisissez au moins une cible : implémentation, risque ou constat.';
	if (!(f.priority in actionPriorityLabel)) errors.priority = 'Choisissez une priorité.';
	if (!(f.status in actionStatusLabel)) errors.status = 'Choisissez un statut.';
	if (f.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(f.dueDate)) errors.dueDate = 'Date invalide.';
	return errors;
}

/**
 * Corps envoyé : ni identifiant, ni auteur, ni état d'échéance. La date de réalisation
 * n'est jamais imposée : le serveur la fixe au passage à « Terminée » et la conserve ensuite.
 */
export const actionPayload = (f: ActionForm): GrcActionPayload => ({
	reference: f.reference.trim(),
	title: f.title.trim(),
	description: f.description.trim(),
	controlImplementationId: f.controlImplementationId,
	riskId: f.riskId,
	findingId: f.findingId,
	assigneeProfileId: f.assigneeProfileId,
	owningServiceId: f.owningServiceId,
	priority: f.priority,
	status: f.status,
	dueAt: f.dueDate ? `${f.dueDate}T00:00:00Z` : null,
	completedAt: null
});
