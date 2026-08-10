import assert from 'node:assert/strict';
import test from 'node:test';

import {
	buildMedicalRecordPatch,
	emptyDeletedIDs,
	isMedicalRecordConflict,
	mapMedicalRecordResponse,
	type BackendMedicalRecordResponse
} from './medical-record-mapper.ts';

const metadata = {
	medical_record_id: 7,
	patient_id: 9,
	created_at: '2026-08-01T10:00:00Z',
	updated_at: '2026-08-02T10:00:00Z'
};

function responseFixture(): BackendMedicalRecordResponse {
	return {
		medical_record: {
			id: 7,
			patient_id: 9,
			record_number: 'DM-9',
			status: 'active',
			created_at: metadata.created_at,
			updated_at: metadata.updated_at
		},
		profile: null,
		allergies: [
			{
				...metadata,
				id: 11,
				allergen_type: 'experimental_type',
				allergen_name: 'Produit X',
				reaction: 'Réaction',
				severity: 'critical_unknown',
				comment: 'Commentaire',
				is_active: false,
				created_by: 4
			}
		],
		medical_histories: [
			{
				...metadata,
				id: 12,
				type: 'gyneco',
				title: 'Antécédent',
				description: 'Description distincte',
				start_date: null,
				end_date: null,
				status: 'custom_status',
				severity: 'critical',
				comment: 'Commentaire distinct',
				created_by: 4
			}
		],
		surgical_histories: [],
		family_medical_histories: [],
		regular_treatments: [],
		vaccinations: [],
		disabilities: [],
		lifestyle: null,
		medical_devices: [],
		vital_signs: [
			{
				...metadata,
				id: 13,
				consultation_id: 23,
				weight_kg: null,
				height_cm: null,
				bmi: null,
				temperature_c: 37.2,
				systolic_bp: null,
				diastolic_bp: null,
				heart_rate: null,
				respiratory_rate: null,
				oxygen_saturation: null,
				blood_glucose: null,
				waist_circumference_cm: null,
				pain_score: null,
				pain_location: '',
				pain_type: '',
				pain_duration: '',
				comment: 'Mesure après effort',
				measured_by: 4,
				measured_at: '2026-08-02T10:30:00Z'
			}
		],
		documents: [
			{
				...metadata,
				id: 14,
				consultation_id: 23,
				type: 'custom_document',
				label: 'Document',
				document_date: null,
				file_name: 'preuve.bin',
				mime_type: 'application/octet-stream',
				file_url: '/files/preuve.bin',
				description: 'Description',
				uploaded_by: 4
			}
		]
	};
}

test('GET mapping preserves exhaustive and unknown values', () => {
	const record = mapMedicalRecordResponse(responseFixture());
	assert.equal(record.allergies[0]?.severity, 'critical_unknown');
	assert.equal(record.allergies[0]?.category, 'experimental_type');
	assert.equal(record.allergies[0]?.isActive, false);
	assert.equal(record.medicalHistories[0]?.severity, 'critical');
	assert.equal(record.medicalHistories[0]?.description, 'Description distincte');
	assert.equal(record.medicalHistories[0]?.comment, 'Commentaire distinct');
	assert.equal(record.medicalHistories[0]?.historyType, 'gyneco');
	assert.equal(record.vitalsHistory[0]?.consultationId, 23);
	assert.equal(record.vitalsHistory[0]?.comment, 'Mesure après effort');
	assert.equal(record.documents[0]?.consultationId, 23);
	assert.equal(record.documents[0]?.fileName, 'preuve.bin');
	assert.equal(record.documents[0]?.mimeType, 'application/octet-stream');
	assert.equal(record.documents[0]?.documentDate, null);
});

test('unchanged state produces an expected_updated_at-only no-op payload', () => {
	const original = mapMedicalRecordResponse(responseFixture());
	const patch = buildMedicalRecordPatch(original, structuredClone(original), emptyDeletedIDs());
	assert.deepEqual(patch, { expected_updated_at: metadata.updated_at });
});

test('one changed field produces a minimal patch with its id', () => {
	const original = mapMedicalRecordResponse(responseFixture());
	const current = structuredClone(original);
	current.allergies[0]!.reaction = 'Nouvelle réaction';
	const patch = buildMedicalRecordPatch(original, current, emptyDeletedIDs());
	assert.deepEqual(patch.allergies, {
		upsert: [{ id: 11, reaction: 'Nouvelle réaction' }],
		delete_ids: []
	});
});

test('addition uses upsert without an id', () => {
	const original = mapMedicalRecordResponse(responseFixture());
	const current = structuredClone(original);
	current.allergies.push({
		category: 'MEDICATION',
		name: 'Nouveau',
		reaction: '',
		severity: 'LOW',
		diagnosedAt: '',
		notes: '',
		isActive: true
	});
	const item = buildMedicalRecordPatch(original, current, emptyDeletedIDs()).allergies?.upsert[0];
	assert.equal(item?.id, undefined);
	assert.equal(item?.allergen_name, 'Nouveau');
});

test('existing removal requires an explicit delete id', () => {
	const original = mapMedicalRecordResponse(responseFixture());
	const current = structuredClone(original);
	current.allergies = [];
	const deleted = emptyDeletedIDs();
	deleted.allergies = [11];
	assert.deepEqual(buildMedicalRecordPatch(original, current, deleted).allergies, {
		upsert: [],
		delete_ids: [11]
	});
});

test('removing a new local item emits no delete id', () => {
	const original = mapMedicalRecordResponse(responseFixture());
	const current = structuredClone(original);
	current.allergies.push({
		category: 'OTHER',
		name: 'Temporaire',
		reaction: '',
		severity: 'LOW',
		diagnosedAt: '',
		notes: '',
		isActive: true
	});
	current.allergies.pop();
	assert.equal(buildMedicalRecordPatch(original, current, emptyDeletedIDs()).allergies, undefined);
});

test('null and false remain explicit when changed', () => {
	const original = mapMedicalRecordResponse(responseFixture());
	const current = structuredClone(original);
	current.allergies[0]!.isActive = true;
	current.documents[0]!.documentDate = '2026-08-04';
	let patch = buildMedicalRecordPatch(original, current, emptyDeletedIDs());
	assert.equal(patch.allergies?.upsert[0]?.is_active, true);
	assert.equal(patch.documents?.upsert[0]?.document_date, '2026-08-04T00:00:00Z');
	const next = structuredClone(current);
	next.allergies[0]!.isActive = false;
	next.documents[0]!.documentDate = null;
	patch = buildMedicalRecordPatch(current, next, emptyDeletedIDs());
	assert.equal(patch.allergies?.upsert[0]?.is_active, false);
	assert.equal(patch.documents?.upsert[0]?.document_date, null);
});

test('expected_updated_at and conflict status are handled explicitly', () => {
	const record = mapMedicalRecordResponse(responseFixture());
	assert.equal(
		buildMedicalRecordPatch(record, record, emptyDeletedIDs()).expected_updated_at,
		metadata.updated_at
	);
	assert.equal(isMedicalRecordConflict(409), true);
	assert.equal(isMedicalRecordConflict(400), false);
});
