import assert from 'node:assert/strict';
import test from 'node:test';

import type { GrcGovernancePolicy } from '$lib/types/grc';
import {
	policyAccess,
	policyActions,
	policyFormFrom,
	policyPayload,
	policyQuery,
	policyStatusLabel,
	policyStatusOptions,
	simulatePolicySession,
	validatePolicyForm,
	emptyPolicyForm,
	type PolicyForm
} from './policy-state.ts';

const policy: GrcGovernancePolicy = {
	id: 3,
	reference: 'POL-1',
	title: 'Politique',
	description: 'secret',
	version: '1.0',
	status: 'APPROVED',
	effectiveFrom: '2026-06-01T00:00:00.000Z',
	effectiveTo: null,
	owningServiceId: null,
	ownerProfileId: null,
	approverProfileId: 4,
	approvedAt: '2026-06-01T12:00:00.000Z',
	publishedAt: null,
	retiredAt: null,
	frameworks: [{ id: 8, code: 'ISO', name: 'ISO', status: 'ACTIVE' }],
	controls: [],
	frameworkCount: 1,
	controlCount: 0,
	createdBy: 1,
	updatedBy: 1,
	createdAt: '2026-06-01T12:00:00.000Z',
	updatedAt: '2026-06-01T12:00:00.000Z'
};

test('policy form rejects an incomplete create and an inverted effect window', () => {
	const errors = validatePolicyForm(emptyPolicyForm(), false);
	assert.ok(errors.reference);
	assert.ok(errors.title);
	assert.ok(errors.version);
	const form: PolicyForm = {
		...emptyPolicyForm(),
		reference: 'POL-1',
		title: 'Titre',
		version: '1.0',
		effectiveFrom: '2026-06-02',
		effectiveTo: '2026-06-01'
	};
	assert.match(validatePolicyForm(form, false).effectiveTo ?? '', /précéder/);
});

test('policy update never targets a sensitive status and omits unread relations', () => {
	assert.deepEqual(policyStatusOptions('APPROVED'), ['IN_REVIEW']);
	assert.deepEqual(policyStatusOptions('PUBLISHED'), []);
	for (const status of ['APPROVED', 'PUBLISHED', 'RETIRED']) {
		assert.equal(policyStatusLabel[status].length > 0, true);
	}
	const form = policyFormFrom(policy);
	assert.equal(form.status, '');
	const access = policyAccess(['grc.policy.update']);
	const payload = policyPayload(form, true, access);
	assert.equal('status' in payload, false);
	assert.equal('frameworkIds' in payload, false);
	const withLinks = policyPayload(form, true, policyAccess(['*', 'grc.policy.update']));
	assert.deepEqual(withLinks.frameworkIds, [8]);
	assert.deepEqual(withLinks.controlIds, []);
});

test('policy query drops a zero id and keeps the filters parenthesised by field', () => {
	const query = policyQuery({
		search: ' alpha ',
		status: 'DRAFT',
		frameworkId: '4',
		controlId: '0',
		owningServiceId: '',
		ownerProfileId: '3',
		page: 2
	});
	assert.equal(query.frameworkId, 4);
	assert.equal(query.controlId, undefined);
	assert.equal(query.ownerProfileId, 3);
	assert.equal(query.page, 2);
});

test('wildcard cannot approve through the generic status options', () => {
	const access = policyAccess(['*']);
	assert.equal(access.approve, true);
	assert.equal(policyStatusOptions('IN_REVIEW').includes('APPROVED'), false);
	const actions = policyActions(
		{ status: 'IN_REVIEW', approverProfileId: null, effectiveFrom: null },
		access
	);
	assert.equal(actions.approve, true);
	assert.equal(actions.approveBlocked, true);
});

test('simulated policy session covers the lifecycle without a browser', () => {
	const session = simulatePolicySession([
		'grc.policy.read',
		'grc.policy.create',
		'grc.policy.update',
		'grc.policy.approve',
		'grc.policy.publish',
		'grc.policy.retire',
		'grc.framework.read',
		'grc.control.read'
	]);
	assert.equal(session.query.search, 'alpha');
	assert.equal(session.query.status, 'DRAFT');
	assert.equal(session.query.frameworkId, 4);
	assert.equal(session.query.controlId, 8);
	assert.equal(session.query.page, 2);
	assert.equal(session.labels.length, 5);
	assert.equal(session.reservedAbsent, true);
	assert.deepEqual(
		session.steps.map((step) => step.action),
		[
			'create-validation',
			'draft-to-review',
			'review-to-draft',
			'draft-to-review-again',
			'approve-missing-approver',
			'approve',
			'approved-to-review',
			'approve-again',
			'publish-missing-effective',
			'publish',
			'retire',
			'retired-readonly'
		]
	);
	assert.equal(
		session.steps.every((step) => step.ok),
		true
	);
	assert.equal(session.steps.at(-1)?.status, 'RETIRED');
});
