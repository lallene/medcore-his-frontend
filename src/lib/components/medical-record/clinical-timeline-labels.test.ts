import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { clinicalTimelineEventLabel } from './clinical-timeline-labels.ts';
import { derivePatient360Capabilities } from '../patients/patient-360/capabilities.ts';
import {
	classifyModuleFetchError,
	createPatientLoadGeneration,
	applyBootstrapModuleResult,
	type BootstrapPageState
} from '../patients/patient-360/patient-360-load.ts';
import { normalizeMedicalTimeline } from '../patients/patient-360/patient-360-data.ts';
import type { ClinicalTimelineEvent } from '../../types/clinical-timeline.ts';

function emptyState(): BootstrapPageState {
	return {
		patient: null,
		pageError: '',
		accessDenied: false,
		modules: {}
	};
}

function baseEvent(overrides: Partial<ClinicalTimelineEvent> = {}): ClinicalTimelineEvent {
	return {
		id: 1,
		medical_record_id: 10,
		patient_id: 7,
		event_type: 'document_added',
		category: 'document',
		title: 'Document médical ajouté',
		description: 'Compte rendu',
		department_id: 0,
		reference_type: 'MedicalDocument',
		reference_id: 99,
		severity: 'info',
		event_date: '2026-10-02T10:00:00Z',
		created_by: 4,
		created_at: '2026-10-02T10:00:00Z',
		...overrides
	};
}

describe('LOT28E-B1 clinical timeline document labels', () => {
	it('F101 document_added maps correctly', () => {
		assert.equal(clinicalTimelineEventLabel('document_added'), 'Document médical ajouté');
	});

	it('F102 document_archived maps correctly', () => {
		assert.equal(clinicalTimelineEventLabel('document_archived'), 'Document médical archivé');
	});

	it('F103 archive wording does not say deleted', () => {
		const label = clinicalTimelineEventLabel('document_archived');
		assert.equal(label.includes('supprim'), false);
		assert.equal(label.toLowerCase().includes('delet'), false);
		assert.equal(label.includes('archivé'), true);
	});

	it('F104 unknown event fallback preserved', () => {
		assert.equal(
			clinicalTimelineEventLabel('future_clinical_signal', 'Titre backend'),
			'Titre backend'
		);
		assert.equal(clinicalTimelineEventLabel('totally_unknown'), 'Événement clinique');
	});

	it('F109 document event rendering does not require URL/domain fetch', () => {
		const event = baseEvent({
			title: 'Document médical ajouté',
			description: 'Compte rendu',
			event_type: 'document_added'
		});
		const label = clinicalTimelineEventLabel(event.event_type, event.title);
		assert.equal(label, 'Document médical ajouté');
		assert.equal(String(event.description).includes('http'), false);
		assert.equal('file_url' in event, false);
		const normalized = normalizeMedicalTimeline([event]);
		assert.equal(normalized.length, 1);
		assert.equal(normalized[0]?.event_type, 'document_added');
	});
});

describe('LOT28E-B1 Patient360 timeline states preserved', () => {
	it('F105 timeline denied state preserved', () => {
		assert.equal(classifyModuleFetchError(new Error('ACCESS_DENIED')), 'denied');
		let state = emptyState();
		state = applyBootstrapModuleResult(state, 'timeline', { status: 'denied' });
		assert.equal(state.modules.timeline.status, 'denied');
	});

	it('F106 timeline error state preserved', () => {
		let state = emptyState();
		state = applyBootstrapModuleResult(state, 'timeline', {
			status: 'error',
			message: 'timeline unavailable'
		});
		assert.equal(state.modules.timeline.status, 'error');
	});

	it('F107 timeline empty state preserved', () => {
		assert.deepEqual(normalizeMedicalTimeline([]), []);
	});

	it('F108 patient switch generation protection preserved', () => {
		const guard = createPatientLoadGeneration();
		const token = guard.bump();
		assert.equal(guard.isCurrent(token), true);
		guard.bump();
		assert.equal(guard.isCurrent(token), false);
	});

	it('F110 Patient360 capability remains medical_records.read', () => {
		const deny = derivePatient360Capabilities(['patients.360.read']);
		assert.equal(deny.canReadTimeline, false);
		const allow = derivePatient360Capabilities(['patients.360.read', 'medical_records.read']);
		assert.equal(allow.canReadTimeline, true);
		assert.equal(allow.canReadMedicalRecord, true);
	});
});
