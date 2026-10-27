import type {
	GrcGovernancePolicy,
	GrcGovernancePolicyPayload,
	GrcGovernancePolicyUpdatePayload
} from '$lib/types/grc';
import { canAny } from '../../rbac/permissions.ts';

export const policyStatusLabel: Record<string, string> = {
	DRAFT: 'Brouillon',
	IN_REVIEW: 'En revue',
	APPROVED: 'Approuvée',
	PUBLISHED: 'Publiée',
	RETIRED: 'Retirée'
};

export const policyStatusMeaning: Record<string, string> = {
	DRAFT: 'Politique en préparation.',
	IN_REVIEW: 'Politique soumise à revue avant approbation.',
	APPROVED: 'Politique formellement approuvée, pas encore publiée.',
	PUBLISHED: 'Politique publiée dans le registre GRC.',
	RETIRED: 'Politique retirée définitivement. Elle n’est plus modifiable.'
};

/**
 * Cibles du PUT. APPROVED, PUBLISHED et RETIRED n'y figurent jamais :
 * ils passent par /approve, /publish et /retire.
 */
const policyGenericTargets: Record<string, readonly string[]> = {
	DRAFT: ['DRAFT', 'IN_REVIEW'],
	IN_REVIEW: ['IN_REVIEW', 'DRAFT'],
	APPROVED: ['IN_REVIEW'],
	PUBLISHED: [],
	RETIRED: []
};

export const POLICY_REFERENCE_MAX = 60;
export const POLICY_TITLE_MAX = 220;
export const POLICY_VERSION_MAX = 40;
export const POLICY_PAGE_SIZE = 20;

export const labelOf = (labels: Record<string, string>, key: string) => labels[key] ?? key;

export interface PolicyAccess {
	read: boolean;
	create: boolean;
	update: boolean;
	approve: boolean;
	publish: boolean;
	retire: boolean;
	readFrameworks: boolean;
	readControls: boolean;
}

export const policyAccess = (permissions: string[]): PolicyAccess => ({
	read: canAny(permissions, ['grc.policy.read']),
	create: canAny(permissions, ['grc.policy.create']),
	update: canAny(permissions, ['grc.policy.update']),
	approve: canAny(permissions, ['grc.policy.approve']),
	publish: canAny(permissions, ['grc.policy.publish']),
	retire: canAny(permissions, ['grc.policy.retire']),
	readFrameworks: canAny(permissions, ['grc.framework.read']),
	readControls: canAny(permissions, ['grc.control.read'])
});

export const policyActions = (
	item: { status: string; approverProfileId: number | null; effectiveFrom: string | null },
	access: PolicyAccess
) => ({
	edit: access.update && item.status !== 'RETIRED',
	approve: access.approve && item.status === 'IN_REVIEW',
	approveBlocked: item.approverProfileId == null,
	publish: access.publish && item.status === 'APPROVED',
	publishBlocked: item.effectiveFrom == null,
	retire: access.retire && item.status === 'PUBLISHED',
	readOnly: item.status === 'RETIRED'
});

export const policyStatusOptions = (current?: string | null) =>
	current ? [...(policyGenericTargets[current] ?? [])] : [];

export interface PolicyFilters {
	search: string;
	status: string;
	frameworkId: string;
	controlId: string;
	owningServiceId: string;
	ownerProfileId: string;
	page: number;
}

export const emptyPolicyFilters = (): PolicyFilters => ({
	search: '',
	status: '',
	frameworkId: '',
	controlId: '',
	owningServiceId: '',
	ownerProfileId: '',
	page: 1
});

const positive = (raw: string) => {
	const value = Number(raw);
	return raw.trim() && Number.isInteger(value) && value > 0 ? value : undefined;
};

export function policyQuery(f: PolicyFilters, limit = POLICY_PAGE_SIZE) {
	const query: Record<string, string | number> = { page: Math.max(1, f.page), limit };
	const search = f.search.trim();
	if (search) query.search = search;
	if (f.status) query.status = f.status;
	for (const [key, raw] of [
		['frameworkId', f.frameworkId],
		['controlId', f.controlId],
		['owningServiceId', f.owningServiceId],
		['ownerProfileId', f.ownerProfileId]
	] as const) {
		const id = positive(raw);
		if (id) query[key] = id;
	}
	return query;
}

export const hasActivePolicyFilters = (f: PolicyFilters) =>
	!!(
		f.search.trim() ||
		f.status ||
		f.frameworkId.trim() ||
		f.controlId.trim() ||
		f.owningServiceId.trim() ||
		f.ownerProfileId.trim()
	);

export const policyDateInput = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '');

export const policyDateInstant = (day: string) => {
	const value = day.trim();
	return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : null;
};

export interface PolicyForm {
	reference: string;
	title: string;
	description: string;
	version: string;
	effectiveFrom: string;
	effectiveTo: string;
	status: string;
	owningServiceId: number | null;
	ownerProfileId: number | null;
	approverProfileId: number | null;
	frameworkIds: number[];
	controlIds: number[];
}

export const emptyPolicyForm = (): PolicyForm => ({
	reference: '',
	title: '',
	description: '',
	version: '',
	effectiveFrom: '',
	effectiveTo: '',
	status: '',
	owningServiceId: null,
	ownerProfileId: null,
	approverProfileId: null,
	frameworkIds: [],
	controlIds: []
});

export const policyFormFrom = (item: GrcGovernancePolicy): PolicyForm => ({
	reference: item.reference,
	title: item.title,
	description: item.description,
	version: item.version,
	effectiveFrom: policyDateInput(item.effectiveFrom),
	effectiveTo: policyDateInput(item.effectiveTo),
	status: item.status === 'DRAFT' || item.status === 'IN_REVIEW' ? item.status : '',
	owningServiceId: item.owningServiceId,
	ownerProfileId: item.ownerProfileId,
	approverProfileId: item.approverProfileId,
	frameworkIds: (item.frameworks ?? []).map((link) => link.id),
	controlIds: (item.controls ?? []).map((link) => link.id)
});

export interface PolicyFormErrors {
	reference?: string;
	title?: string;
	version?: string;
	effectiveFrom?: string;
	effectiveTo?: string;
	status?: string;
}

const length = (value: string) => [...value.trim()].length;

export function validatePolicyForm(
	form: PolicyForm,
	editing: boolean,
	currentStatus?: string | null
): PolicyFormErrors {
	const errors: PolicyFormErrors = {};
	if (!form.reference.trim()) errors.reference = 'La référence est obligatoire.';
	else if (length(form.reference) > POLICY_REFERENCE_MAX)
		errors.reference = '60 caractères maximum.';
	if (!form.title.trim()) errors.title = 'Le titre est obligatoire.';
	else if (length(form.title) > POLICY_TITLE_MAX) errors.title = '220 caractères maximum.';
	if (!form.version.trim()) errors.version = 'La version est obligatoire.';
	else if (length(form.version) > POLICY_VERSION_MAX) errors.version = '40 caractères maximum.';
	const from = form.effectiveFrom.trim();
	const to = form.effectiveTo.trim();
	if (from && !policyDateInstant(from)) errors.effectiveFrom = 'Date invalide.';
	if (to && !policyDateInstant(to)) errors.effectiveTo = 'Date invalide.';
	else if (to && !from) errors.effectiveTo = 'La fin d’effet exige un début d’effet.';
	else if (from && to && to < from)
		errors.effectiveTo = 'La fin d’effet ne peut pas précéder le début.';
	if (editing && form.status && !policyStatusOptions(currentStatus).includes(form.status)) {
		errors.status =
			'Ce statut n’est pas une transition autorisée. Approbation, publication et retrait sont des actions séparées.';
	}
	return errors;
}

export function policyPayload(
	form: PolicyForm,
	editing: boolean,
	access: PolicyAccess
): GrcGovernancePolicyPayload | GrcGovernancePolicyUpdatePayload {
	const body: GrcGovernancePolicyPayload = {
		reference: form.reference.trim(),
		title: form.title.trim(),
		description: form.description.trim(),
		version: form.version.trim(),
		effectiveFrom: policyDateInstant(form.effectiveFrom),
		effectiveTo: policyDateInstant(form.effectiveTo),
		owningServiceId: form.owningServiceId,
		ownerProfileId: form.ownerProfileId,
		approverProfileId: form.approverProfileId
	};
	if (access.readFrameworks) body.frameworkIds = [...form.frameworkIds];
	if (access.readControls) body.controlIds = [...form.controlIds];
	if (!editing) return body;
	if (form.status === 'DRAFT' || form.status === 'IN_REVIEW')
		return { ...body, status: form.status };
	return body;
}

export interface PolicySessionStep {
	action: string;
	status: string;
	ok: boolean;
	reason?: string;
}

/**
 * Parcours simulé du registre et du cycle de vie, sans navigateur.
 * Chaque statut reste porté par un libellé texte.
 */
export function simulatePolicySession(permissions: string[]) {
	const access = policyAccess(permissions);
	const filters = emptyPolicyFilters();
	filters.search = 'alpha';
	filters.status = 'DRAFT';
	filters.frameworkId = '4';
	filters.controlId = '8';
	filters.owningServiceId = '2';
	filters.ownerProfileId = '3';
	filters.page = 2;
	const query = policyQuery(filters);
	const labels = Object.values(policyStatusLabel);
	const reservedAbsent = (['APPROVED', 'PUBLISHED', 'RETIRED'] as const).every(
		(status) =>
			!policyStatusOptions('DRAFT').includes(status) &&
			!policyStatusOptions('IN_REVIEW').includes(status) &&
			!policyStatusOptions('APPROVED').includes(status) &&
			!policyStatusOptions('PUBLISHED').includes(status)
	);

	let status = 'DRAFT';
	let approverProfileId: number | null = null;
	let effectiveFrom: string | null = null;
	const steps: PolicySessionStep[] = [];

	const move = (action: string, next: string, allowed: boolean, reason?: string) => {
		if (allowed) status = next;
		steps.push({ action, status, ok: allowed, reason });
	};

	const invalid = validatePolicyForm(emptyPolicyForm(), false);
	steps.push({
		action: 'create-validation',
		status,
		ok: Boolean(invalid.reference && invalid.title && invalid.version)
	});

	move('draft-to-review', 'IN_REVIEW', policyStatusOptions(status).includes('IN_REVIEW'));
	move('review-to-draft', 'DRAFT', policyStatusOptions(status).includes('DRAFT'));
	move('draft-to-review-again', 'IN_REVIEW', policyStatusOptions(status).includes('IN_REVIEW'));

	const withoutApprover = policyActions({ status, approverProfileId, effectiveFrom }, access);
	steps.push({
		action: 'approve-missing-approver',
		status,
		ok: withoutApprover.approve && withoutApprover.approveBlocked,
		reason: 'Un approbateur est obligatoire.'
	});
	approverProfileId = 9;
	const withApprover = policyActions({ status, approverProfileId, effectiveFrom }, access);
	move('approve', 'APPROVED', withApprover.approve && !withApprover.approveBlocked);
	move('approved-to-review', 'IN_REVIEW', policyStatusOptions('APPROVED').includes('IN_REVIEW'));
	move(
		'approve-again',
		'APPROVED',
		policyActions({ status: 'IN_REVIEW', approverProfileId, effectiveFrom }, access).approve
	);

	const blockedPublish = policyActions({ status, approverProfileId, effectiveFrom }, access);
	steps.push({
		action: 'publish-missing-effective',
		status,
		ok: blockedPublish.publish && blockedPublish.publishBlocked,
		reason: 'Un début d’effet est obligatoire.'
	});
	effectiveFrom = '2026-06-01T00:00:00.000Z';
	move(
		'publish',
		'PUBLISHED',
		policyActions({ status, approverProfileId, effectiveFrom }, access).publish &&
			!policyActions({ status, approverProfileId, effectiveFrom }, access).publishBlocked
	);
	move(
		'retire',
		'RETIRED',
		policyActions({ status, approverProfileId, effectiveFrom }, access).retire
	);
	steps.push({
		action: 'retired-readonly',
		status,
		ok:
			policyActions({ status, approverProfileId, effectiveFrom }, access).readOnly &&
			!policyActions({ status, approverProfileId, effectiveFrom }, access).edit
	});

	return { access, query, labels, reservedAbsent, steps };
}
