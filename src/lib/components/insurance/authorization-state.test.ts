import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
	AUTHORIZATION_REFERENCE_TYPES,
	authorizationActions,
	authorizationActPresentation,
	authorizationReferenceLabel,
	canCreatePerformedActPec,
	formatAuthorizationReferenceType,
	hasAuthorizationPermission,
	initialCoverageIdForCreate,
	mapAuthorizationConflictMessage,
	performedActPecDeepLink,
	previewDecision,
	requestedAmountFromPerformedActBasePrice,
	requiresExplicitCoverageSelection
} from './authorization-state.ts';
import type { PatientCoverage } from '../../types/insurance.ts';

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

test('PERFORMED_ACT is a canonical authorization reference type', () => {
	assert.ok(AUTHORIZATION_REFERENCE_TYPES.includes('PERFORMED_ACT'));
	assert.equal(authorizationReferenceLabel.PERFORMED_ACT, 'Acte réalisé');
	assert.equal(formatAuthorizationReferenceType('PERFORMED_ACT'), 'Acte réalisé');
});

test('legacy reference labels remain unchanged', () => {
	assert.equal(formatAuthorizationReferenceType('CONSULTATION'), 'Consultation');
	assert.equal(formatAuthorizationReferenceType('LABORATORY'), 'Laboratoire');
	assert.equal(formatAuthorizationReferenceType('IMAGING'), 'Imagerie');
	assert.equal(formatAuthorizationReferenceType('MEDICATION'), 'Médicament');
});

test('medication PEC remains prescription-based (not rewritten to PERFORMED_ACT)', () => {
	assert.equal(authorizationReferenceLabel.MEDICATION, 'Médicament');
	assert.notEqual(
		authorizationReferenceLabel.MEDICATION,
		authorizationReferenceLabel.PERFORMED_ACT
	);
	const pharmacy = readFileSync(
		new URL('../../../routes/pharmacy/+page.svelte', import.meta.url),
		'utf8'
	);
	assert.ok(pharmacy.includes('referenceType="MEDICATION"'));
	assert.equal(pharmacy.includes('referenceType="PERFORMED_ACT"'), false);
});

test('performed-act PEC CTA gating', () => {
	const perms = ['insurance.authorization.create'];
	assert.equal(
		canCreatePerformedActPec({ status: 'PERFORMED', insuranceEligible: true }, perms),
		true
	);
	assert.equal(
		canCreatePerformedActPec({ status: 'VOIDED', insuranceEligible: true }, perms),
		false
	);
	assert.equal(
		canCreatePerformedActPec({ status: 'PERFORMED', insuranceEligible: false }, perms),
		false
	);
	assert.equal(
		canCreatePerformedActPec({ status: 'PERFORMED', insuranceEligible: true }, [
			'performed_acts.read'
		]),
		false
	);
});

test('PERFORMED_ACT deep-link has patient + reference and no coverage id', () => {
	const link = performedActPecDeepLink(42, 99);
	assert.ok(link.startsWith('/insurance/authorizations?'));
	const q = new URLSearchParams(link.split('?')[1]);
	assert.equal(q.get('patientId'), '42');
	assert.equal(q.get('referenceType'), 'PERFORMED_ACT');
	assert.equal(q.get('referenceId'), '99');
	assert.equal(q.get('patientCoverageId'), null);
});

test('explicit coverage required only for PERFORMED_ACT', () => {
	assert.equal(requiresExplicitCoverageSelection('PERFORMED_ACT'), true);
	assert.equal(requiresExplicitCoverageSelection('CONSULTATION'), false);
	assert.equal(requiresExplicitCoverageSelection('MEDICATION'), false);
});

test('coverage selection: principal/first never auto-picked for PERFORMED_ACT', () => {
	const coverages = [
		{
			id: 10,
			isPrincipal: true,
			companyName: 'A',
			memberNumber: '1',
			coverageRate: 80
		},
		{
			id: 20,
			isPrincipal: false,
			companyName: 'B',
			memberNumber: '2',
			coverageRate: 70
		}
	] as PatientCoverage[];
	assert.equal(initialCoverageIdForCreate(coverages, 'PERFORMED_ACT'), 0);
	assert.equal(initialCoverageIdForCreate([coverages[0]], 'PERFORMED_ACT'), 0);
	assert.equal(initialCoverageIdForCreate([], 'PERFORMED_ACT'), 0);
	assert.equal(initialCoverageIdForCreate(coverages, 'CONSULTATION'), 10);
	assert.equal(initialCoverageIdForCreate([coverages[1]], 'CONSULTATION'), 20);
});

test('BasePrice never auto-populates RequestedAmount', () => {
	assert.equal(requestedAmountFromPerformedActBasePrice(12_500), null);
	assert.equal(requestedAmountFromPerformedActBasePrice(0), null);
});

test('duplicate/conflict mapping is actionable in French', () => {
	const msg = mapAuthorizationConflictMessage(
		'Une PEC active existe déjà pour cet acte et cette couverture'
	);
	assert.ok(msg.includes('PEC active'));
	assert.ok(msg.includes('doublon') || msg.includes('existante'));
});

test('financial preview uses provided decision inputs (display aid only)', () => {
	assert.deepEqual(previewDecision(50_000, 'APPROVED', 70, null, null), {
		insurance: 35_000,
		patient: 15_000
	});
});

test('act selector uses readable patient-owned options, search, resolution and RBAC', () => {
	const selector = readFileSync(new URL('./ActSelector.svelte', import.meta.url), 'utf8');
	for (const marker of [
		'CONSULTATION',
		'LABORATORY',
		'IMAGING',
		'HOSPITALIZATION',
		'MEDICATION',
		'PERFORMED_ACT',
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

test('PEC creation UX: PERFORMED_ACT explicit coverage + eligible types', () => {
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
		'contextLocked',
		'PERFORMED_ACT',
		'initialCoverageIdForCreate',
		'auth-coverage-select',
		'mapAuthorizationConflictMessage'
	])
		assert.ok(page.includes(marker), marker);
	assert.ok(page.includes('Sélectionner une couverture'));
	for (const forbidden of ['>Patient ID<', '>ID acte<', '>Type d’acte<', '>Service<input'])
		assert.equal(page.includes(forbidden), false, forbidden);
});

test('PatientPerformedActs exposes PEC CTA with deep-link helper', () => {
	const page = readFileSync(
		new URL('../patients/patient-360/PatientPerformedActs.svelte', import.meta.url),
		'utf8'
	);
	assert.ok(page.includes('performed-act-pec-cta'));
	assert.ok(page.includes('canCreatePerformedActPec'));
	assert.ok(page.includes('referenceType=PERFORMED_ACT'));
	assert.ok(page.includes('AuthorizationStatus'));
	assert.ok(page.includes('allowCreate={false}'));
});
