import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
	authorizationActions,
	authorizationActPresentation,
	hasAuthorizationPermission,
	previewDecision
} from './authorization-state.ts';

test('act lookup controls contextual creation and reuse', () => {
	assert.deepEqual(authorizationActPresentation('NONE'), {
		canCreate: true,
		label: 'Nouvelle PEC nécessaire'
	});
	assert.equal(authorizationActPresentation('DIRECT').canCreate, false);
	assert.equal(authorizationActPresentation('DIRECT').label, 'PEC existante');
	assert.equal(authorizationActPresentation('COVERED').canCreate, false);
	assert.equal(authorizationActPresentation('COVERED').label, 'Couvert par une PEC existante');
});

test('act selector uses readable patient-owned options, search, resolution and RBAC', () => {
	const selector = readFileSync(new URL('./ActSelector.svelte', import.meta.url), 'utf8');
	for (const marker of [
		'CONSULTATION',
		'LABORATORY',
		'IMAGING',
		'HOSPITALIZATION',
		'MEDICATION',
		'getEligibleInsuranceActs',
		'search',
		'act.label',
		'act.secondaryLabel',
		"act.authorizationResolution !== 'NONE'",
		'existingAuthorizationNumber',
		'canLink',
		'Confirmer le rattachement',
		'selected = null'
	])
		assert.ok(selector.includes(marker), marker);
	assert.equal(selector.includes('type="number"'), false);
});

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

test('PEC creation UX hides technical fields and supports contextual multi-act selection', () => {
	const page = readFileSync(
		new URL('../../../routes/insurance/authorizations/+page.svelte', import.meta.url),
		'utf8'
	);
	for (const marker of [
		'Agent demandeur',
		'getPatientCoverages',
		'getEligibleInsuranceActs',
		'selectedActKeys',
		'coveredActs:',
		'listBillableActs',
		"authorizationResolution !== 'NONE'",
		'Patient non assuré',
		'contextLocked'
	])
		assert.ok(page.includes(marker), marker);
	for (const forbidden of ['>Patient ID<', '>ID acte<', '>Type d’acte<', '>Service<input'])
		assert.equal(page.includes(forbidden), false, forbidden);
});
