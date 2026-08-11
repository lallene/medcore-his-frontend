import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
	computeLaboratoryFlag,
	canMutateLaboratory,
	hasLaboratoryPermission,
	laboratorySampleTypes,
	isLaboratoryCategory
} from './state.ts';
const base = {
	parameter: 'Hb',
	value: '12',
	unit: 'g/dL',
	referenceMin: 10,
	referenceMax: 15,
	referenceText: '',
	criticalMin: 5,
	criticalMax: 20,
	comment: ''
};
test('flags structured numeric results', () => {
	assert.equal(computeLaboratoryFlag(base), 'NORMAL');
	assert.equal(computeLaboratoryFlag({ ...base, value: '8' }), 'LOW');
	assert.equal(computeLaboratoryFlag({ ...base, value: '18' }), 'HIGH');
	assert.equal(computeLaboratoryFlag({ ...base, value: '3' }), 'CRITICAL');
});
test('validated results are immutable', () => {
	assert.equal(canMutateLaboratory('VALIDATED'), false);
	assert.equal(canMutateLaboratory('IN_PROGRESS'), true);
});
test('laboratory RBAC is granular', () => {
	assert.equal(
		hasLaboratoryPermission({ permissions: ['laboratory.collect'] }, 'laboratory.collect'),
		true
	);
	assert.equal(
		hasLaboratoryPermission({ permissions: ['laboratory.read'] }, 'laboratory.validate'),
		false
	);
	assert.equal(
		hasLaboratoryPermission({ role: 'accueil', permissions: [] }, 'laboratory.result.write'),
		false
	);
});
test('sample form exposes only controlled types and no identifier input', () => {
	assert.deepEqual(
		[...laboratorySampleTypes],
		['Sang', 'Urine', 'Selles', 'Prélèvement nasal', 'Autre']
	);
	const component = readFileSync(
		new URL('../../../routes/laboratory/[id]/+page.svelte', import.meta.url),
		'utf8'
	);
	assert.equal(component.includes('bind:value={sampleIdentifier}'), false);
	assert.equal(component.includes('Identifiant (automatique si vide)'), false);
	assert.equal(component.includes('order.sample.sampleIdentifier'), true);
	assert.equal(component.includes('order.sample.collectedAt'), true);
	assert.equal(component.includes('order.validatedAt'), true);
	assert.equal(component.includes('order.validatedBy'), true);
});
test('business categories separate laboratory from imaging and cardiology', () => {
	assert.equal(isLaboratoryCategory('Laboratoire'), true);
	assert.equal(isLaboratoryCategory('Biologie'), true);
	assert.equal(isLaboratoryCategory('Imagerie'), false);
	assert.equal(isLaboratoryCategory('Cardiologie'), false);
});
