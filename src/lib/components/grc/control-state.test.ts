import assert from 'node:assert/strict';
import test from 'node:test';
import type { GrcControl, GrcControlImplementation } from '$lib/types/grc';
import {
	assessmentStatusLabel,
	canMapRequirements,
	canMapRisks,
	controlAccess,
	controlFormFrom,
	controlPayload,
	controlQuery,
	controlStatusLabel,
	countLabel,
	emptyControlFilters,
	emptyControlForm,
	emptyImplementationForm,
	evidenceStatusLabel,
	hasActiveControlFilters,
	implementationFormFrom,
	implementationPayload,
	implementationStatusLabel,
	validateControlForm,
	validateImplementationForm
} from './control-state.ts';

const control: GrcControl = {
	id: 4,
	code: 'CTL-SAUV',
	name: 'Sauvegardes chiffrées',
	description: 'Quotidiennes',
	category: 'Continuité',
	ownerProfileId: 5,
	owningServiceId: 2,
	status: 'ACTIVE',
	requirementCount: 3,
	riskCount: 1,
	implementationCount: 2,
	createdBy: 1,
	updatedBy: 1,
	createdAt: '2026-06-01T10:00:00Z',
	updatedAt: '2026-06-02T10:00:00Z'
};

const implementation: GrcControlImplementation = {
	id: 9,
	controlId: 4,
	assetId: 7,
	owningServiceId: null,
	ownerProfileId: 5,
	status: 'PARTIAL',
	implementationDetails: 'VPN',
	implementedAt: '2026-05-01T00:00:00Z',
	lastReviewedAt: null,
	createdBy: 1,
	updatedBy: 1,
	createdAt: '2026-06-01T10:00:00Z',
	updatedAt: '2026-06-02T10:00:00Z'
};

test('labels cover exactly the backend enums', () => {
	assert.deepEqual(Object.keys(controlStatusLabel), ['DRAFT', 'ACTIVE', 'INACTIVE', 'RETIRED']);
	assert.deepEqual(Object.keys(implementationStatusLabel), [
		'PLANNED',
		'IMPLEMENTED',
		'PARTIAL',
		'NOT_IMPLEMENTED',
		'NOT_APPLICABLE'
	]);
	assert.deepEqual(Object.keys(assessmentStatusLabel), ['DRAFT', 'COMPLETED', 'CANCELLED']);
	assert.deepEqual(Object.keys(evidenceStatusLabel), ['DRAFT', 'VALID', 'REVOKED']);
});

test('control, implementation and relation permissions stay distinct', () => {
	const reader = controlAccess(['grc.control.read']);
	assert.equal(reader.read && !reader.manage && !reader.readImplementations, true);
	const implManager = controlAccess(['grc.control.implementation.manage']);
	assert.equal(implManager.manageImplementations && !implManager.manage, true);
	// Mapping uses grc.control.manage plus the read permission of the target.
	assert.equal(canMapRequirements(controlAccess(['grc.control.manage'])), false);
	assert.equal(
		canMapRequirements(controlAccess(['grc.control.manage', 'grc.requirement.read'])),
		true
	);
	assert.equal(canMapRisks(controlAccess(['grc.risk.read', 'grc.requirement.manage'])), false);
	assert.equal(canMapRisks(controlAccess(['grc.control.manage', 'grc.risk.read'])), true);
	const all = controlAccess(['*']);
	assert.equal(Object.values(all).every(Boolean), true);
	assert.equal(controlAccess(['grc.risk.read']).read, false);
});

test('relation counts are always written in text', () => {
	assert.equal(countLabel(0, 'exigence', 'exigences'), 'Aucun(e) exigence');
	assert.equal(countLabel(1, 'risque', 'risques'), '1 risque');
	assert.equal(countLabel(3, 'implémentation', 'implémentations'), '3 implémentations');
});

test('registry query sends only the filters that are set', () => {
	assert.deepEqual(controlQuery(emptyControlFilters()), { page: 1, limit: 20 });
	assert.deepEqual(
		controlQuery({ search: ' ctl ', status: 'ACTIVE', category: ' Accès ', page: 2 }),
		{
			page: 2,
			limit: 20,
			search: 'ctl',
			status: 'ACTIVE',
			category: 'Accès'
		}
	);
	assert.equal(hasActiveControlFilters(emptyControlFilters()), false);
	assert.equal(hasActiveControlFilters({ ...emptyControlFilters(), category: 'Accès' }), true);
});

test('control form: UX validation and payload without server-managed fields', () => {
	assert.deepEqual(Object.keys(validateControlForm(emptyControlForm())).sort(), ['code', 'name']);
	const valid = controlFormFrom(control);
	assert.deepEqual(validateControlForm(valid), {});
	assert.ok(validateControlForm({ ...valid, code: '  ' }).code);
	assert.ok(validateControlForm({ ...valid, code: 'É'.repeat(61) }).code);
	assert.deepEqual(validateControlForm({ ...valid, code: 'É'.repeat(60) }), {});
	assert.ok(validateControlForm({ ...valid, name: 'n'.repeat(221) }).name);
	assert.ok(validateControlForm({ ...valid, category: 'c'.repeat(101) }).category);
	assert.ok(validateControlForm({ ...valid, status: 'ARCHIVED' }).status);
	const payload = controlPayload({ ...valid, code: ' ctl-sauv ', category: '  ' });
	assert.deepEqual(payload, {
		code: 'ctl-sauv',
		name: 'Sauvegardes chiffrées',
		description: 'Quotidiennes',
		category: '',
		ownerProfileId: 5,
		owningServiceId: 2,
		status: 'ACTIVE'
	});
	for (const key of [
		'id',
		'createdBy',
		'updatedBy',
		'createdAt',
		'updatedAt',
		'requirementCount',
		'riskCount',
		'implementationCount'
	])
		assert.equal(key in payload, false, key);
});

test('implementation form keeps the control fixed and maps civil dates', () => {
	assert.deepEqual(Object.keys(validateImplementationForm(emptyImplementationForm(4))), [
		'assetId'
	]);
	const form = implementationFormFrom(implementation);
	assert.equal(form.implementedDate, '2026-05-01');
	assert.deepEqual(validateImplementationForm(form), {});
	assert.ok(validateImplementationForm({ ...form, status: 'DONE' }).status);
	assert.ok(
		validateImplementationForm({ ...form, lastReviewedDate: '01/05/2026' }).lastReviewedDate
	);
	const payload = implementationPayload({
		...form,
		implementationDetails: '  VPN  ',
		lastReviewedDate: '2026-06-01'
	});
	assert.deepEqual(payload, {
		controlId: 4,
		assetId: 7,
		ownerProfileId: 5,
		owningServiceId: null,
		status: 'PARTIAL',
		implementationDetails: 'VPN',
		implementedAt: '2026-05-01T00:00:00Z',
		lastReviewedAt: '2026-06-01T00:00:00Z'
	});
	for (const key of ['id', 'createdBy', 'updatedBy', 'createdAt', 'updatedAt'])
		assert.equal(key in payload, false, key);
});
