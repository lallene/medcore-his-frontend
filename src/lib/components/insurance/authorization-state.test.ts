import assert from 'node:assert/strict';
import test from 'node:test';
import {
	authorizationActions,
	hasAuthorizationPermission,
	previewDecision
} from './authorization-state.ts';

test('contract rate is never treated as an act decision', () => {
	assert.deepEqual(previewDecision(50_000, 'APPROVED', 70, null, null), {
		insurance: 35_000,
		patient: 15_000
	});
});
test('fixed amount, ceiling and refusal previews match backend priority', () => {
	assert.deepEqual(previewDecision(100_000, 'APPROVED', null, 50_000, null), {
		insurance: 50_000,
		patient: 50_000
	});
	assert.deepEqual(previewDecision(120_000, 'PARTIALLY_APPROVED', 80, null, 70_000), {
		insurance: 70_000,
		patient: 50_000
	});
	assert.deepEqual(previewDecision(100_000, 'REJECTED', null, null, null), {
		insurance: 0,
		patient: 100_000
	});
});
test('final decisions are readonly and RBAC remains granular', () => {
	const item = { status: 'APPROVED' } as Parameters<typeof authorizationActions>[0];
	assert.equal(authorizationActions(item).readonly, true);
	assert.equal(
		hasAuthorizationPermission(
			{ permissions: ['insurance.authorization.decide'] },
			'insurance.authorization.decide'
		),
		true
	);
	assert.equal(
		hasAuthorizationPermission(
			{ permissions: ['insurance.authorization.read'] },
			'insurance.authorization.decide'
		),
		false
	);
});
