import assert from 'node:assert/strict';
import test from 'node:test';
import type { GrcAudit, GrcFinding } from '$lib/types/grc';
import {
	auditAccess,
	auditActions,
	auditFormFrom,
	auditPayload,
	auditQuery,
	auditStatusLabel,
	auditStatusOptions,
	auditTypeLabel,
	emptyAuditFilters,
	emptyAuditForm,
	emptyFindingForm,
	findingActions,
	findingCategoryLabel,
	findingCountText,
	findingFormFrom,
	findingPayload,
	findingSeverityLabel,
	findingStatusLabel,
	findingStatusOptions,
	hasActiveAuditFilters,
	validateAuditForm,
	validateFindingForm
} from './audit-state.ts';

const audit: GrcAudit = {
	id: 1,
	reference: 'AUD-001',
	title: 'Audit annuel',
	description: 'Texte',
	scope: 'SI clinique',
	type: 'INTERNAL',
	status: 'IN_PROGRESS',
	leadAuditorProfileId: 2,
	owningServiceId: null,
	plannedStartAt: '2026-06-01T00:00:00Z',
	plannedEndAt: '2026-06-10T00:00:00Z',
	startedAt: '2026-06-02T08:00:00Z',
	completedAt: null,
	findingCount: 3,
	openFindingCount: 2,
	overdueFindingCount: 1,
	createdBy: 1,
	updatedBy: 1,
	createdAt: '2026-05-01T10:00:00Z',
	updatedAt: '2026-06-02T10:00:00Z'
};

const finding: GrcFinding = {
	id: 5,
	reference: 'FND-001',
	title: 'Sauvegardes non testées',
	description: 'Texte',
	auditEngagementId: 1,
	assessmentId: null,
	category: 'CONTROL_DEFICIENCY',
	severity: 'HIGH',
	status: 'RESOLVED',
	controlImplementationId: null,
	riskId: 4,
	ownerProfileId: null,
	owningServiceId: null,
	dueAt: '2026-07-01T00:00:00Z',
	resolvedAt: '2026-06-20T00:00:00Z',
	closedAt: null,
	closureNote: '',
	overdue: false,
	createdBy: 1,
	updatedBy: 1,
	createdAt: '2026-06-02T10:00:00Z',
	updatedAt: '2026-06-20T10:00:00Z'
};

test('labels cover exactly the backend enums', () => {
	assert.deepEqual(Object.keys(auditStatusLabel), [
		'PLANNED',
		'IN_PROGRESS',
		'COMPLETED',
		'CANCELLED'
	]);
	assert.deepEqual(Object.keys(auditTypeLabel), ['INTERNAL', 'EXTERNAL', 'VENDOR']);
	assert.deepEqual(Object.keys(findingStatusLabel), [
		'OPEN',
		'IN_REMEDIATION',
		'RESOLVED',
		'CLOSED',
		'ACCEPTED'
	]);
	assert.deepEqual(Object.keys(findingSeverityLabel), ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
	assert.deepEqual(Object.keys(findingCategoryLabel), [
		'NON_CONFORMITY',
		'CONTROL_DEFICIENCY',
		'OBSERVATION',
		'IMPROVEMENT'
	]);
});

test('form status options never offer the reserved transitions', () => {
	assert.deepEqual(auditStatusOptions(), ['PLANNED', 'IN_PROGRESS']);
	assert.deepEqual(auditStatusOptions('PLANNED'), ['PLANNED', 'IN_PROGRESS', 'CANCELLED']);
	assert.deepEqual(auditStatusOptions('IN_PROGRESS'), ['IN_PROGRESS', 'CANCELLED']);
	assert.deepEqual(auditStatusOptions('COMPLETED'), []);
	assert.deepEqual(auditStatusOptions('CANCELLED'), []);
	assert.deepEqual(findingStatusOptions(), ['OPEN']);
	assert.deepEqual(findingStatusOptions('RESOLVED'), ['RESOLVED', 'OPEN']);
	assert.deepEqual(findingStatusOptions('CLOSED'), []);
	for (const current of ['OPEN', 'IN_REMEDIATION', 'RESOLVED']) {
		assert.equal(findingStatusOptions(current).includes('CLOSED'), false, current);
		assert.equal(findingStatusOptions(current).includes('ACCEPTED'), false, current);
	}
	for (const current of ['PLANNED', 'IN_PROGRESS'])
		assert.equal(auditStatusOptions(current).includes('COMPLETED'), false);
});

test('lifecycle actions follow status and dedicated permissions', () => {
	const all = auditAccess(['*']);
	assert.deepEqual(auditActions(audit, all), { edit: true, complete: true, addFinding: true });
	assert.deepEqual(auditActions({ status: 'PLANNED' }, all), {
		edit: true,
		complete: false,
		addFinding: false
	});
	assert.deepEqual(auditActions({ status: 'COMPLETED' }, all), {
		edit: false,
		complete: false,
		addFinding: false
	});
	const updater = auditAccess(['grc.audit.read', 'grc.audit.update']);
	assert.equal(auditActions(audit, updater).complete, false, 'complete needs grc.audit.complete');
	assert.deepEqual(findingActions(finding, all), { edit: true, close: true, accept: true });
	assert.equal(
		findingActions({ status: 'OPEN' }, all).close,
		false,
		'only a resolved finding can be closed'
	);
	assert.deepEqual(findingActions({ status: 'ACCEPTED' }, all), {
		edit: false,
		close: false,
		accept: false
	});
	const findingUpdater = auditAccess(['grc.finding.update']);
	assert.deepEqual(findingActions(finding, findingUpdater), {
		edit: true,
		close: false,
		accept: false
	});
	assert.equal(auditAccess(['grc.risk.read']).read, false);
});

test('registry query and finding counters in text', () => {
	assert.deepEqual(auditQuery(emptyAuditFilters()), { page: 1, limit: 20 });
	assert.deepEqual(
		auditQuery({ search: ' annuel ', status: 'IN_PROGRESS', type: 'INTERNAL', page: 2 }),
		{
			page: 2,
			limit: 20,
			search: 'annuel',
			status: 'IN_PROGRESS',
			type: 'INTERNAL'
		}
	);
	assert.equal(hasActiveAuditFilters({ ...emptyAuditFilters(), type: 'VENDOR' }), true);
	assert.equal(findingCountText(audit), '3 constat(s) · 2 ouvert(s) · 1 en retard');
	assert.equal(
		findingCountText({ findingCount: 0, openFindingCount: 0, overdueFindingCount: 0 }),
		'Aucun constat'
	);
});

test('audit form: UX validation and payload without server-managed fields', () => {
	assert.deepEqual(Object.keys(validateAuditForm(emptyAuditForm())).sort(), [
		'reference',
		'title',
		'type'
	]);
	const valid = auditFormFrom(audit);
	assert.deepEqual(validateAuditForm(valid, audit.status), {});
	assert.ok(validateAuditForm({ ...valid, status: 'COMPLETED' }, audit.status).status);
	assert.ok(
		validateAuditForm({ ...valid, plannedEndDate: '2026-05-01' }, audit.status).plannedEndDate
	);
	assert.ok(validateAuditForm({ ...valid, reference: 'É'.repeat(61) }, audit.status).reference);
	const payload = auditPayload(valid);
	assert.deepEqual(payload, {
		reference: 'AUD-001',
		title: 'Audit annuel',
		description: 'Texte',
		scope: 'SI clinique',
		type: 'INTERNAL',
		status: 'IN_PROGRESS',
		leadAuditorProfileId: 2,
		owningServiceId: null,
		plannedStartAt: '2026-06-01T00:00:00Z',
		plannedEndAt: '2026-06-10T00:00:00Z',
		startedAt: '2026-06-02T08:00:00Z'
	});
	for (const key of [
		'id',
		'createdBy',
		'updatedBy',
		'createdAt',
		'updatedAt',
		'completedAt',
		'findingCount'
	])
		assert.equal(key in payload, false, key);
	assert.equal(auditPayload({ ...valid, status: 'PLANNED' }).startedAt, null);
});

test('finding form keeps the source and never sends a terminal status', () => {
	const created = emptyFindingForm(1);
	assert.equal(created.auditEngagementId, 1);
	assert.deepEqual(Object.keys(validateFindingForm(created)).sort(), [
		'category',
		'reference',
		'severity',
		'title'
	]);
	const valid = findingFormFrom(finding);
	assert.deepEqual(validateFindingForm(valid, finding.status), {});
	assert.ok(validateFindingForm({ ...valid, status: 'CLOSED' }, finding.status).status);
	const payload = findingPayload(valid);
	assert.equal(payload.auditEngagementId, 1);
	assert.equal(payload.assessmentId, null);
	assert.equal(payload.closureNote, '');
	for (const key of [
		'id',
		'createdBy',
		'updatedBy',
		'createdAt',
		'updatedAt',
		'overdue',
		'resolvedAt',
		'closedAt'
	])
		assert.equal(key in payload, false, key);
});
