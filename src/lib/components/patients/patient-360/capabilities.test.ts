import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { derivePatient360Capabilities, canEnterPatient360 } from './capabilities.ts';

const physician = [
	'patients:read',
	'patients.360.read',
	'medical_records.read',
	'consultations.read',
	'hospitalizations.read',
	'laboratory.read',
	'imaging.read',
	'performed_acts.read',
	'billing.read',
	'insurance.authorization.read',
	'schedule.read.own',
	'queue.doctor.read'
];

describe('Patient360 capabilities LOT28E-A', () => {
	it('F01 patients:read only → cannot enter P360', () => {
		assert.equal(canEnterPatient360(['patients:read']), false);
	});

	it('F02 patients.360.read → can enter shell', () => {
		assert.equal(canEnterPatient360(['patients.360.read']), true);
	});

	it('F03 no consultations.read → consultations/documents/prescriptions hidden', () => {
		const c = derivePatient360Capabilities(['patients.360.read', 'laboratory.read']);
		assert.equal(c.canReadConsultations, false);
		assert.equal(c.canReadDocuments, false);
		assert.equal(c.canReadPrescriptions, false);
	});

	it('F04/F05 consultations.read → consultations + documents visible', () => {
		const c = derivePatient360Capabilities(['patients.360.read', 'consultations.read']);
		assert.equal(c.canReadConsultations, true);
		assert.equal(c.canReadDocuments, true);
		assert.equal(c.canReadPrescriptions, true);
	});

	it('F06/F07 medical_records.read controls dossier + timeline', () => {
		const deny = derivePatient360Capabilities(['patients.360.read']);
		assert.equal(deny.canReadMedicalRecord, false);
		assert.equal(deny.canReadTimeline, false);
		const allow = derivePatient360Capabilities(['patients.360.read', 'medical_records.read']);
		assert.equal(allow.canReadMedicalRecord, true);
		assert.equal(allow.canReadTimeline, true);
	});

	it('F08 lab only → Exams visible with lab scope', () => {
		const c = derivePatient360Capabilities(['patients.360.read', 'laboratory.read']);
		assert.equal(c.canReadExams, true);
		assert.equal(c.canReadLaboratory, true);
		assert.equal(c.canReadImaging, false);
	});

	it('F09 imaging only → Exams visible with imaging scope', () => {
		const c = derivePatient360Capabilities(['patients.360.read', 'imaging.read']);
		assert.equal(c.canReadExams, true);
		assert.equal(c.canReadImaging, true);
		assert.equal(c.canReadLaboratory, false);
	});

	it('F10 neither lab nor imaging nor consults → Exams hidden', () => {
		const c = derivePatient360Capabilities(['patients.360.read', 'hospitalizations.read']);
		assert.equal(c.canReadExams, false);
	});

	it('F11 hospitalizations.read controls hospitalization tab', () => {
		assert.equal(
			derivePatient360Capabilities(['patients.360.read']).canReadHospitalizations,
			false
		);
		assert.equal(
			derivePatient360Capabilities(['patients.360.read', 'hospitalizations.read'])
				.canReadHospitalizations,
			true
		);
	});

	it('F12 performed_acts.read controls performed acts', () => {
		assert.equal(derivePatient360Capabilities(['patients.360.read']).canReadPerformedActs, false);
		assert.equal(
			derivePatient360Capabilities(['patients.360.read', 'performed_acts.read'])
				.canReadPerformedActs,
			true
		);
	});

	it('F13 billing sections require actual financial perms', () => {
		const none = derivePatient360Capabilities(['patients.360.read']);
		assert.equal(none.canReadBilling, false);
		const inv = derivePatient360Capabilities(['patients.360.read', 'billing.read']);
		assert.equal(inv.canReadBilling, true);
		assert.equal(inv.canReadBillingInvoices, true);
		assert.equal(inv.canReadReceivables, false);
	});

	it('F14 unauthorized overview counts not derived from unauthorized modules', () => {
		const c = derivePatient360Capabilities(['patients.360.read', 'patients:read']);
		assert.equal(c.canReadConsultations, false);
		assert.equal(c.canReadHospitalizations, false);
		assert.equal(c.canReadBilling, false);
		assert.equal(c.canReadInsurance, false);
	});

	it('F15 PHARMACIEN no P360 shell', () => {
		const c = derivePatient360Capabilities([
			'pharmacy.stock.read',
			'pharmacy.dispensation.read',
			'pharmacy.dispensation.create'
		]);
		assert.equal(c.canEnterPatient360, false);
	});

	it('F16 privileged medical role retains expected authorized tabs', () => {
		const c = derivePatient360Capabilities(physician);
		assert.equal(c.canEnterPatient360, true);
		assert.equal(c.canReadConsultations, true);
		assert.equal(c.canReadMedicalRecord, true);
		assert.equal(c.canReadTimeline, true);
		assert.equal(c.canReadLaboratory, true);
		assert.equal(c.canReadImaging, true);
		assert.equal(c.canReadHospitalizations, true);
		assert.equal(c.canReadPerformedActs, true);
		assert.equal(c.canReadBilling, true);
		assert.equal(c.canReadAppointments, true);
	});
});
