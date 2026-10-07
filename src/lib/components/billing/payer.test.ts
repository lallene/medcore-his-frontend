import assert from 'node:assert/strict';
import test from 'node:test';
import {
	PAYER_LEGACY_LABEL,
	PAYER_PATIENT_LABEL,
	buildPayerPayload,
	canShowPayerPhone,
	createPayerFormState,
	formatPayerDisplay,
	validatePayerForm
} from './payer.ts';

test('H-P FE patient-is-payer default payload', () => {
	const form = createPayerFormState();
	assert.equal(form.patientIsPayer, true);
	assert.deepEqual(buildPayerPayload(form), { mode: 'PATIENT' });
	assert.equal(validatePayerForm(form), null);
	assert.match(PAYER_PATIENT_LABEL, /patient est le payeur/i);
});

test('H-P FE third-party individual form', () => {
	const form = createPayerFormState();
	form.patientIsPayer = false;
	form.mode = 'INDIVIDUAL';
	form.displayName = 'Parent';
	form.phone = '+2250700112233';
	form.relationship = 'Parent';
	assert.equal(validatePayerForm(form), null);
	assert.deepEqual(buildPayerPayload(form), {
		mode: 'INDIVIDUAL',
		displayName: 'Parent',
		phone: '+2250700112233',
		relationship: 'Parent'
	});
});

test('H-P FE organization form', () => {
	const form = createPayerFormState();
	form.patientIsPayer = false;
	form.mode = 'ORGANIZATION';
	form.displayName = 'NGO';
	assert.deepEqual(buildPayerPayload(form), {
		mode: 'ORGANIZATION',
		displayName: 'NGO',
		phone: undefined
	});
});

test('H-P FE validation', () => {
	const form = createPayerFormState();
	form.patientIsPayer = false;
	form.mode = 'INDIVIDUAL';
	assert.match(validatePayerForm(form)!, /Nom/);
	form.displayName = 'X';
	assert.match(validatePayerForm(form)!, /Téléphone/);
	form.phone = '+2250700112233';
	assert.match(validatePayerForm(form)!, /Lien/);
});

test('H-P FE historical display', () => {
	assert.equal(formatPayerDisplay({}), PAYER_LEGACY_LABEL);
	assert.equal(formatPayerDisplay({ payerProvenance: 'LEGACY_UNCONFIRMED' }), PAYER_LEGACY_LABEL);
	assert.match(
		formatPayerDisplay({
			payerProvenance: 'CAPTURED',
			payerIsPatient: true,
			payerDisplayName: 'A B'
		}),
		/patient/
	);
});

test('H-P FE RBAC phone', () => {
	assert.equal(canShowPayerPhone(['billing.read']), false);
	assert.equal(canShowPayerPhone(['billing.payer.read']), true);
	assert.equal(canShowPayerPhone(['*']), true);
});
