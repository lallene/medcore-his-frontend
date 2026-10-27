import type {
	GrcSecurityIncident,
	GrcSecurityIncidentPayload,
	GrcSecurityIncidentUpdatePayload
} from '$lib/types/grc';
import { canAny } from '../../rbac/permissions.ts';

/**
 * Sévérité d'un incident de sécurité. Ce n'est pas le niveau d'un risque
 * (RiskLevel) : les deux échelles ne se calculent pas l'une l'autre.
 */
export const incidentSeverityLabel: Record<string, string> = {
	LOW: 'Sévérité faible',
	MEDIUM: 'Sévérité modérée',
	HIGH: 'Sévérité élevée',
	CRITICAL: 'Sévérité critique'
};

export const incidentStatusLabel: Record<string, string> = {
	OPEN: 'Ouvert',
	INVESTIGATING: 'En investigation',
	CONTAINED: 'Contenu',
	RESOLVED: 'Résolu',
	CLOSED: 'Clôturé'
};

export const incidentStatusMeaning: Record<string, string> = {
	OPEN: 'Incident enregistré, investigation non encore commencée.',
	INVESTIGATING: 'Incident en cours d’analyse.',
	CONTAINED: 'Mesures de confinement appliquées ; l’investigation peut continuer.',
	RESOLVED: 'Incident résolu, pas encore clôturé administrativement.',
	CLOSED: 'Incident clôturé définitivement. Il n’est pas réouvrable.'
};

/** Transitions du PUT. CLOSED n'y figure pas : il passe par POST /close. */
const incidentTransitions: Record<string, readonly string[]> = {
	OPEN: ['OPEN', 'INVESTIGATING'],
	INVESTIGATING: ['INVESTIGATING', 'CONTAINED', 'RESOLVED'],
	CONTAINED: ['CONTAINED', 'INVESTIGATING', 'RESOLVED'],
	RESOLVED: ['RESOLVED', 'INVESTIGATING'],
	CLOSED: []
};

export const INCIDENT_REFERENCE_MAX = 60;
export const INCIDENT_TITLE_MAX = 220;
export const INCIDENT_PAGE_SIZE = 20;

export const labelOf = (labels: Record<string, string>, key: string) => labels[key] ?? key;

export interface IncidentAccess {
	read: boolean;
	create: boolean;
	update: boolean;
	close: boolean;
	readRisks: boolean;
	readAssets: boolean;
	readActions: boolean;
}

export const incidentAccess = (permissions: string[]): IncidentAccess => ({
	read: canAny(permissions, ['grc.incident.read']),
	create: canAny(permissions, ['grc.incident.create']),
	update: canAny(permissions, ['grc.incident.update']),
	close: canAny(permissions, ['grc.incident.close']),
	readRisks: canAny(permissions, ['grc.risk.read']),
	readAssets: canAny(permissions, ['grc.asset.read']),
	readActions: canAny(permissions, ['grc.action.read'])
});

export const incidentActions = (item: { status: string }, access: IncidentAccess) => ({
	edit: access.update && item.status !== 'CLOSED',
	close: access.close && item.status === 'RESOLVED'
});

export const incidentStatusOptions = (current?: string | null) =>
	current ? [...(incidentTransitions[current] ?? [])] : [];

export interface IncidentFilters {
	search: string;
	status: string;
	severity: string;
	riskId: string;
	assetId: string;
	page: number;
}

export const emptyIncidentFilters = (): IncidentFilters => ({
	search: '',
	status: '',
	severity: '',
	riskId: '',
	assetId: '',
	page: 1
});

const positive = (raw: string) => {
	const value = Number(raw);
	return raw.trim() && Number.isInteger(value) && value > 0 ? value : undefined;
};

export function incidentQuery(f: IncidentFilters, limit = INCIDENT_PAGE_SIZE) {
	const query: Record<string, string | number> = { page: Math.max(1, f.page), limit };
	const search = f.search.trim();
	if (search) query.search = search;
	if (f.status) query.status = f.status;
	if (f.severity) query.severity = f.severity;
	const riskId = positive(f.riskId);
	const assetId = positive(f.assetId);
	if (riskId) query.riskId = riskId;
	if (assetId) query.assetId = assetId;
	return query;
}

export const hasActiveIncidentFilters = (f: IncidentFilters) =>
	!!(f.search.trim() || f.status || f.severity || f.riskId.trim() || f.assetId.trim());

const pad = (value: number) => String(value).padStart(2, '0');

export const incidentLocalInput = (iso: string | null | undefined) => {
	if (!iso) return '';
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return '';
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const incidentInstant = (local: string) => {
	if (!local.trim()) return null;
	const date = new Date(local);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export interface IncidentForm {
	reference: string;
	title: string;
	description: string;
	severity: string;
	detectedAt: string;
	occurredAt: string;
	status: string;
	riskId: number | null;
	assetId: number | null;
	owningServiceId: number | null;
	ownerProfileId: number | null;
}

export const emptyIncidentForm = (): IncidentForm => ({
	reference: '',
	title: '',
	description: '',
	severity: '',
	detectedAt: '',
	occurredAt: '',
	status: '',
	riskId: null,
	assetId: null,
	owningServiceId: null,
	ownerProfileId: null
});

export const incidentFormFrom = (item: GrcSecurityIncident): IncidentForm => ({
	reference: item.reference,
	title: item.title,
	description: item.description,
	severity: item.severity,
	detectedAt: incidentLocalInput(item.detectedAt),
	occurredAt: incidentLocalInput(item.occurredAt),
	status: item.status,
	riskId: item.riskId,
	assetId: item.assetId,
	owningServiceId: item.owningServiceId,
	ownerProfileId: item.ownerProfileId
});

export interface IncidentFormErrors {
	reference?: string;
	title?: string;
	severity?: string;
	detectedAt?: string;
	occurredAt?: string;
	status?: string;
}

const length = (value: string) => [...value.trim()].length;

export function validateIncidentForm(
	form: IncidentForm,
	editing: boolean,
	now = new Date(),
	currentStatus?: string | null
): IncidentFormErrors {
	const errors: IncidentFormErrors = {};
	if (!form.reference.trim()) errors.reference = 'La référence est obligatoire.';
	else if (length(form.reference) > INCIDENT_REFERENCE_MAX)
		errors.reference = '60 caractères maximum.';
	if (!form.title.trim()) errors.title = 'Le titre est obligatoire.';
	else if (length(form.title) > INCIDENT_TITLE_MAX) errors.title = '220 caractères maximum.';
	if (!(form.severity in incidentSeverityLabel)) errors.severity = 'Choisissez une sévérité.';
	const detected = incidentInstant(form.detectedAt);
	if (!detected) errors.detectedAt = 'La détection est obligatoire.';
	else if (new Date(detected).getTime() > now.getTime())
		errors.detectedAt = 'La détection ne peut pas être dans le futur.';
	const occurred = incidentInstant(form.occurredAt);
	if (form.occurredAt.trim() && !occurred) errors.occurredAt = 'La survenue est invalide.';
	else if (detected && occurred && new Date(occurred).getTime() > new Date(detected).getTime())
		errors.occurredAt = 'La survenue ne peut pas suivre la détection.';
	if (editing && !incidentStatusOptions(currentStatus).includes(form.status)) {
		errors.status =
			'Ce statut n’est pas une transition autorisée. La clôture est une action séparée.';
	}
	return errors;
}

export function incidentPayload(
	form: IncidentForm,
	editing: boolean
): GrcSecurityIncidentPayload | GrcSecurityIncidentUpdatePayload {
	const body: GrcSecurityIncidentPayload = {
		reference: form.reference.trim(),
		title: form.title.trim(),
		description: form.description.trim(),
		severity: form.severity,
		detectedAt: incidentInstant(form.detectedAt) ?? '',
		occurredAt: incidentInstant(form.occurredAt),
		riskId: form.riskId,
		assetId: form.assetId,
		owningServiceId: form.owningServiceId,
		ownerProfileId: form.ownerProfileId
	};
	if (!editing) return body;
	return { ...body, status: form.status };
}

/**
 * Parcours simulé du registre et du cycle de vie, sans navigateur.
 * Les libellés restent du texte pour chaque sévérité et chaque statut.
 */
export function simulateIncidentSession(
	permissions: string[],
	now = new Date('2026-06-01T12:00:00Z')
) {
	const access = incidentAccess(permissions);
	const filters = emptyIncidentFilters();
	filters.search = 'alpha';
	filters.status = 'OPEN';
	filters.severity = 'HIGH';
	filters.riskId = '4';
	filters.assetId = '8';
	filters.page = 2;
	const query = incidentQuery(filters);
	const form = emptyIncidentForm();
	const createErrors = validateIncidentForm(form, false, now);
	form.reference = 'INC-1';
	form.title = 'Perte d’accès';
	form.severity = 'CRITICAL';
	form.detectedAt = '2026-06-01T10:00';
	const ready = validateIncidentForm(form, false, now);
	const created = incidentPayload(form, false);
	let status = 'OPEN';
	const closeWhileOpen = incidentActions({ status }, access).close;
	const steps = ['INVESTIGATING', 'CONTAINED', 'RESOLVED', 'INVESTIGATING', 'RESOLVED'] as const;
	const trace = steps.map((target) => {
		const options = incidentStatusOptions(status);
		const allowed = options.includes(target);
		if (allowed) status = target;
		return { target, allowed, status };
	});
	const closeWhenResolved = incidentActions({ status }, access).close;
	return {
		access,
		query,
		createErrors,
		ready,
		created,
		closedInOptions: incidentStatusOptions('RESOLVED').includes('CLOSED'),
		trace,
		closeWhileOpen,
		closeWhenResolved,
		labels: {
			severity: Object.values(incidentSeverityLabel).every((label) => label.trim().length > 0),
			status: Object.values(incidentStatusLabel).every((label) => label.trim().length > 0)
		}
	};
}
