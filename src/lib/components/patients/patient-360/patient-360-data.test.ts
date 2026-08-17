import assert from 'node:assert/strict';
import test from 'node:test';

import type { ClinicalTimelineEvent } from '../../../types/clinical-timeline.ts';
import type { InsuranceAuthorization, PatientCoverage } from '../../../types/insurance.ts';
import type { Patient } from '../../../types/patient.ts';
import {
	insuranceAuthorizationDisplay,
	normalizeInsuranceAuthorizations,
	normalizeMedicalTimeline,
	patientInsuranceBadge,
	resolvePatientInsurance
} from './patient-360-data.ts';

const patient: Patient = {
	id: 7,
	codePatient: 'P-7',
	numeroDossier: 'D-7',
	nom: 'Test',
	prenoms: 'Patient',
	sexe: 'F',
	telephone: '',
	isAssure: true,
	matriculeAssure: 'LEGACY-7',
	tauxCouverture: 40
};

function coverage(overrides: Partial<PatientCoverage> = {}): PatientCoverage {
	return {
		id: 1,
		patientId: 7,
		companyName: 'Assureur structuré',
		guarantorName: 'Garant structuré',
		memberNumber: 'STRUCT-7',
		subscriber: 'Souscripteur',
		beneficiary: 'Bénéficiaire',
		coverageRate: 85,
		validFrom: '2026-01-01',
		validTo: '2026-12-31',
		isPrincipal: true,
		isActive: true,
		...overrides
	};
}

test('active structured coverage has priority and exposes its complete values', () => {
	const result = resolvePatientInsurance(patient, [coverage()], new Date(2026, 7, 10));
	assert.equal(result.source, 'structured');
	assert.equal(result.organization, 'Assureur structuré');
	assert.equal(result.guarantor, 'Garant structuré');
	assert.equal(result.memberNumber, 'STRUCT-7');
	assert.equal(result.coverageRate, 85);
	assert.equal(result.validFrom, '2026-01-01');
	assert.equal(result.validTo, '2026-12-31');
});

test('principal structured coverage wins over another active coverage', () => {
	const result = resolvePatientInsurance(
		patient,
		[coverage({ id: 2, isPrincipal: false, companyName: 'Secondaire' }), coverage()],
		new Date(2026, 7, 10)
	);
	assert.equal(result.organization, 'Assureur structuré');
});

test('legacy patient fields are the fallback when no structured coverage is currently valid', () => {
	const result = resolvePatientInsurance(
		patient,
		[coverage({ validTo: '2025-12-31' })],
		new Date(2026, 7, 10)
	);
	assert.equal(result.source, 'legacy');
	assert.equal(result.memberNumber, 'LEGACY-7');
	assert.equal(result.coverageRate, 40);
});

test('uninsured patient without active structured coverage has an explicit empty state', () => {
	const result = resolvePatientInsurance(
		{ ...patient, isAssure: false },
		[],
		new Date(2026, 7, 10)
	);
	assert.equal(result.source, 'none');
	assert.equal(result.insured, false);
	assert.equal(result.coverageRate, 0);
});

test('patient badge uses structured insurance even when the legacy flag is false', () => {
	const insurance = resolvePatientInsurance(
		{ ...patient, isAssure: false },
		[coverage({ companyName: "Allianz Côte d'Ivoire" })],
		new Date(2026, 7, 10)
	);
	assert.deepEqual(patientInsuranceBadge(insurance), {
		label: 'Assuré',
		detail: "Allianz Côte d'Ivoire"
	});
});

function authorization(overrides: Partial<InsuranceAuthorization> = {}): InsuranceAuthorization {
	return {
		id: 1,
		authorizationNumber: 'PEC-000001',
		patientId: 6,
		medicalRecordId: 6,
		patientCoverageId: 7,
		insuranceCompanyId: 1,
		guarantorId: 1,
		referenceType: 'IMAGING',
		referenceId: 9,
		referenceLabel: 'Radiographie thoracique',
		service: 'Imagerie',
		requestedAmount: 50_000,
		requestedAt: '2026-08-17T10:00:00Z',
		status: 'APPROVED',
		externalReference: 'DEMO-ASSUR-000001',
		externalDecisionDate: '2026-08-17T11:00:00Z',
		approvedRate: 70,
		approvedAmount: 35_000,
		insuranceAmount: 35_000,
		patientAmount: 15_000,
		ceilingAmount: null,
		rejectionReason: '',
		comment: '',
		patientName: 'BAMBA Serge',
		patientCode: 'PAT-000006',
		companyName: "Allianz Côte d'Ivoire",
		memberNumber: 'ALLIANZ-000006',
		contractRate: 90,
		guarantorName: '',
		createdAt: '2026-08-17T10:00:00Z',
		coveredActs: [],
		...overrides
	};
}

test('approved PEC displays backend decision values without replacing the contractual rate', () => {
	const item = authorization();
	const display = insuranceAuthorizationDisplay(item);
	assert.equal(display.requestedAmount, `${(50_000).toLocaleString('fr-FR')} FCFA`);
	assert.equal(display.approvedRate, '70 %');
	assert.equal(display.insuranceAmount, `${(35_000).toLocaleString('fr-FR')} FCFA`);
	assert.equal(display.patientAmount, `${(15_000).toLocaleString('fr-FR')} FCFA`);
	assert.equal(display.externalReference, 'DEMO-ASSUR-000001');
	assert.equal(item.contractRate, 90);
	assert.equal(item.approvedRate, 70);
});

test('approved amount is used when the final insurance amount is absent', () => {
	assert.equal(
		insuranceAuthorizationDisplay(authorization({ insuranceAmount: null })).insuranceAmount,
		`${(35_000).toLocaleString('fr-FR')} FCFA`
	);
});

test('zero PEC values remain visible and are not replaced by an empty state', () => {
	const display = insuranceAuthorizationDisplay(
		authorization({ requestedAmount: 0, approvedRate: 0, insuranceAmount: 0, patientAmount: 0 })
	);
	assert.equal(display.requestedAmount, '0 FCFA');
	assert.equal(display.approvedRate, '0 %');
	assert.equal(display.insuranceAmount, '0 FCFA');
	assert.equal(display.patientAmount, '0 FCFA');
});

test('Patient 360 authorization list removes duplicate PEC entries', () => {
	const item = authorization();
	assert.deepEqual(normalizeInsuranceAuthorizations([item, { ...item }]), [item]);
});

function event(id: number, eventDate: string, category: string): ClinicalTimelineEvent {
	return {
		id,
		medical_record_id: 10,
		patient_id: 7,
		event_type: `${category}_updated`,
		category,
		title: category,
		description: '',
		department_id: 0,
		reference_type: category,
		reference_id: id,
		severity: 'info',
		event_date: eventDate,
		created_by: 4,
		created_at: eventDate
	};
}

test('backend timeline events are deduplicated and ordered newest first', () => {
	const older = event(1, '2026-08-01T08:00:00Z', 'allergy');
	const newer = event(2, '2026-08-03T08:00:00Z', 'consultation');
	assert.deepEqual(
		normalizeMedicalTimeline([older, newer, { ...newer }]).map((item) => item.id),
		[2, 1]
	);
});

test('timeline preserves all backend event types and supports an empty state', () => {
	const events = [
		event(1, '2026-08-01T08:00:00Z', 'consultation'),
		event(2, '2026-08-02T08:00:00Z', 'prescription'),
		event(3, '2026-08-03T08:00:00Z', 'exam'),
		event(4, '2026-08-04T08:00:00Z', 'medical_record'),
		event(5, '2026-08-05T08:00:00Z', 'document')
	];
	assert.deepEqual(
		new Set(normalizeMedicalTimeline(events).map((item) => item.category)),
		new Set(['consultation', 'prescription', 'exam', 'medical_record', 'document'])
	);
	assert.deepEqual(normalizeMedicalTimeline([]), []);
});
