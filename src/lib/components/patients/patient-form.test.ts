import assert from 'node:assert/strict';
import test from 'node:test';

import type { Patient } from '../../types/patient.ts';
import {
	buildCreatePatientPayload,
	buildUpdatePatientPayload,
	formatPatientEmailDisplay,
	patientToFormValues,
	type PatientFormValues
} from './patient-form.ts';

const baseValues = (): PatientFormValues => ({
	nom: 'Doe',
	prenoms: 'Jane',
	sexe: 'F',
	dateNaissance: '1990-01-15',
	age: null,
	telephone: '+2250700000001',
	email: 'jane.doe@example.test',
	quartier: 'Cocody',
	personneContact: 'John',
	isAssure: false,
	tauxCouverture: 0,
	matriculeAssure: ''
});

const seededPatient = (): Patient => ({
	id: 42,
	codePatient: 'P00042',
	numeroDossier: 'D-42',
	nom: 'DOE',
	prenoms: 'Jane',
	sexe: 'F',
	dateNaissance: '1990-01-15T00:00:00Z',
	age: 42,
	telephone: '+2250700000001',
	email: 'keep@example.test',
	quartier: 'Cocody',
	personneContact: 'John',
	isAssure: false,
	tauxCouverture: 0,
	matriculeAssure: ''
});

test('formatPatientEmailDisplay shows email when present', () => {
	assert.equal(formatPatientEmailDisplay('patient@example.test'), 'patient@example.test');
	assert.equal(formatPatientEmailDisplay('  patient@example.test  '), 'patient@example.test');
});

test('formatPatientEmailDisplay uses empty-state dash when absent', () => {
	assert.equal(formatPatientEmailDisplay(undefined), '—');
	assert.equal(formatPatientEmailDisplay(null), '—');
	assert.equal(formatPatientEmailDisplay(''), '—');
	assert.equal(formatPatientEmailDisplay('   '), '—');
});

test('create payload includes trimmed email and preserves case', () => {
	const payload = buildCreatePatientPayload({
		...baseValues(),
		email: '  Patient.Name@Example.test  '
	});
	assert.equal(payload.email, 'Patient.Name@Example.test');
});

test('create payload allows blank email', () => {
	const payload = buildCreatePatientPayload({ ...baseValues(), email: '   ' });
	assert.equal(payload.email, '');
});

test('edit replace sends new email', () => {
	const values = patientToFormValues(seededPatient());
	values.email = 'new@example.test';
	const payload = buildUpdatePatientPayload(values);
	assert.equal(payload.email, 'new@example.test');
});

test('edit clear sends empty email string', () => {
	const values = patientToFormValues(seededPatient());
	values.email = '';
	const payload = buildUpdatePatientPayload(values);
	assert.equal(payload.email, '');
});

test('unrelated edit preserves loaded email in update payload', () => {
	const values = patientToFormValues(seededPatient());
	values.quartier = 'Plateau';
	const payload = buildUpdatePatientPayload(values);
	assert.equal(payload.email, 'keep@example.test');
	assert.equal(payload.quartier, 'Plateau');
});

test('unrelated edit preserves loaded age and email in update payload', () => {
	const patient = seededPatient();
	patient.age = 42;
	patient.email = 'Existing@Example.test';
	const values = patientToFormValues(patient);
	values.quartier = 'Plateau';
	const payload = buildUpdatePatientPayload(values);
	assert.equal(payload.age, 42);
	assert.equal(payload.email, 'Existing@Example.test');
	assert.equal(payload.quartier, 'Plateau');
});

test('null patient age is preserved as null on update payload', () => {
	const patient = seededPatient();
	patient.age = null;
	const values = patientToFormValues(patient);
	values.telephone = '+2250700000099';
	const payload = buildUpdatePatientPayload(values);
	assert.equal(payload.age, null);
});

test('create payload does not include age', () => {
	const payload = buildCreatePatientPayload({ ...baseValues(), age: 42 });
	assert.equal('age' in payload, false);
});

test('patientToFormValues initializes email from Patient.email', () => {
	const values = patientToFormValues(seededPatient());
	assert.equal(values.email, 'keep@example.test');
	assert.equal(values.dateNaissance, '1990-01-15');
});

test('missing patient email initializes as empty string not undefined', () => {
	const patient = seededPatient();
	delete patient.email;
	const values = patientToFormValues(patient);
	assert.equal(values.email, '');
});
