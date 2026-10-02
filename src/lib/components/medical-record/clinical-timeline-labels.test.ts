import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	TIMELINE_CATEGORY_LABEL_PERFORMED_ACT,
	TIMELINE_CATEGORY_PERFORMED_ACT,
	TIMELINE_CATEGORY_VITAL_SIGN_LEGACY,
	TIMELINE_CATEGORY_VITAL_SIGNS,
	TIMELINE_EVENT_PERFORMED_ACT_PERFORMED,
	TIMELINE_EVENT_PERFORMED_ACT_VOIDED,
	TIMELINE_EVENT_VITAL_SIGN_ADDED_LEGACY,
	TIMELINE_EVENT_VITAL_SIGNS_RECORDED,
	TIMELINE_LABEL_PERFORMED_ACT_PERFORMED,
	TIMELINE_LABEL_PERFORMED_ACT_VOIDED,
	TIMELINE_LABEL_VITAL_SIGNS,
	clinicalTimelineCategoryLabel,
	clinicalTimelineEventLabel,
	isMedicalRecordTimelineMetricCategory,
	isPerformedActTimelineCategory,
	isPerformedActTimelineEventType,
	isVitalSignTimelineCategory,
	isVitalSignTimelineEventType
} from './clinical-timeline-labels.ts';
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

describe('LOT28E-B2-D vital_signs_recorded timeline compatibility', () => {
	it('D01 vital_signs_recorded resolves to intended French label', () => {
		assert.equal(
			clinicalTimelineEventLabel(TIMELINE_EVENT_VITAL_SIGNS_RECORDED),
			TIMELINE_LABEL_VITAL_SIGNS
		);
		assert.equal(TIMELINE_LABEL_VITAL_SIGNS, 'Constantes enregistrées');
	});

	it('D02 vital_signs_recorded resolves to intended category helpers', () => {
		assert.equal(isVitalSignTimelineCategory(TIMELINE_CATEGORY_VITAL_SIGNS), true);
		assert.equal(isVitalSignTimelineEventType(TIMELINE_EVENT_VITAL_SIGNS_RECORDED), true);
		assert.equal(isVitalSignTimelineCategory('consultation'), false);
	});

	it('D03 vital_signs_recorded contributes to medical-record metric bucket', () => {
		const events = [
			baseEvent({
				id: 1,
				event_type: TIMELINE_EVENT_VITAL_SIGNS_RECORDED,
				category: TIMELINE_CATEGORY_VITAL_SIGNS,
				title: 'Constantes enregistrées',
				description: 'TA 120/80'
			}),
			baseEvent({ id: 2, event_type: 'document_added', category: 'document' }),
			baseEvent({
				id: 3,
				event_type: 'consultation_created',
				category: 'consultation',
				title: 'Consultation créée'
			})
		];
		const metricCount = events.filter((event) =>
			isMedicalRecordTimelineMetricCategory(event.category)
		).length;
		assert.equal(metricCount, 2);
		assert.equal(isMedicalRecordTimelineMetricCategory(TIMELINE_CATEGORY_VITAL_SIGNS), true);
	});

	it('D04 vital_sign_added legacy alias resolves to same label', () => {
		assert.equal(
			clinicalTimelineEventLabel(TIMELINE_EVENT_VITAL_SIGN_ADDED_LEGACY),
			clinicalTimelineEventLabel(TIMELINE_EVENT_VITAL_SIGNS_RECORDED)
		);
	});

	it('D05 legacy alias category resolves to same bucket', () => {
		assert.equal(isVitalSignTimelineCategory(TIMELINE_CATEGORY_VITAL_SIGN_LEGACY), true);
		assert.equal(
			isMedicalRecordTimelineMetricCategory(TIMELINE_CATEGORY_VITAL_SIGN_LEGACY),
			isMedicalRecordTimelineMetricCategory(TIMELINE_CATEGORY_VITAL_SIGNS)
		);
	});

	it('D06 mapping does not mutate/transform backend event payload', () => {
		const event = baseEvent({
			id: 42,
			event_type: TIMELINE_EVENT_VITAL_SIGNS_RECORDED,
			category: TIMELINE_CATEGORY_VITAL_SIGNS,
			title: 'Constantes enregistrées',
			description: 'TA 120/80 — FC 72 bpm',
			reference_type: 'vital_sign',
			reference_id: 9
		});
		const before = structuredClone(event);
		const label = clinicalTimelineEventLabel(event.event_type, event.title);
		const normalized = normalizeMedicalTimeline([event]);
		assert.equal(label, TIMELINE_LABEL_VITAL_SIGNS);
		assert.deepEqual(event, before);
		assert.equal(normalized[0]?.event_type, TIMELINE_EVENT_VITAL_SIGNS_RECORDED);
		assert.equal(normalized[0]?.category, TIMELINE_CATEGORY_VITAL_SIGNS);
		assert.equal(normalized[0]?.reference_type, 'vital_sign');
		assert.equal(normalized[0]?.reference_id, 9);
	});

	it('D07 unknown event fallback remains intact', () => {
		assert.equal(
			clinicalTimelineEventLabel('future_clinical_signal', 'Titre backend'),
			'Titre backend'
		);
		assert.equal(clinicalTimelineEventLabel('totally_unknown'), 'Événement clinique');
	});

	it('D08 document_added mapping unchanged', () => {
		assert.equal(clinicalTimelineEventLabel('document_added'), 'Document médical ajouté');
	});

	it('D09 document_archived mapping unchanged', () => {
		assert.equal(clinicalTimelineEventLabel('document_archived'), 'Document médical archivé');
	});

	it('D10 billing_event safe rendering unchanged (fallback title)', () => {
		assert.equal(
			clinicalTimelineEventLabel('billing_event', 'Événement de facturation'),
			'Événement de facturation'
		);
		assert.equal(isVitalSignTimelineEventType('billing_event'), false);
		assert.equal(isVitalSignTimelineCategory('billing'), false);
	});

	it('D11 insurance_event safe rendering unchanged (fallback title)', () => {
		assert.equal(
			clinicalTimelineEventLabel('insurance_event', "Événement d'assurance"),
			"Événement d'assurance"
		);
		assert.equal(isVitalSignTimelineEventType('insurance_event'), false);
		assert.equal(isVitalSignTimelineCategory('insurance'), false);
	});

	it('D12 no permission/capability change', () => {
		const deny = derivePatient360Capabilities(['patients.360.read']);
		assert.equal(deny.canReadTimeline, false);
		const allow = derivePatient360Capabilities(['patients.360.read', 'medical_records.read']);
		assert.equal(allow.canReadTimeline, true);
		assert.equal(allow.canReadMedicalRecord, true);
		assert.equal(
			isMedicalRecordTimelineMetricCategory(TIMELINE_CATEGORY_VITAL_SIGNS) &&
				!isMedicalRecordTimelineMetricCategory('billing'),
			true
		);
	});

	it('D03b legacy and canonical do not double-count one event', () => {
		const events = [
			baseEvent({
				id: 7,
				event_type: TIMELINE_EVENT_VITAL_SIGNS_RECORDED,
				category: TIMELINE_CATEGORY_VITAL_SIGNS
			})
		];
		const n = events.filter((e) => isMedicalRecordTimelineMetricCategory(e.category)).length;
		assert.equal(n, 1);
	});
});

describe('LOT28E-B3 performed_act timeline vocabulary (P112)', () => {
	it('P112 performed_act_performed maps to Acte réalisé', () => {
		assert.equal(
			clinicalTimelineEventLabel(TIMELINE_EVENT_PERFORMED_ACT_PERFORMED),
			TIMELINE_LABEL_PERFORMED_ACT_PERFORMED
		);
		assert.equal(TIMELINE_LABEL_PERFORMED_ACT_PERFORMED, 'Acte réalisé');
	});

	it('P112 performed_act_voided maps to Acte annulé', () => {
		assert.equal(
			clinicalTimelineEventLabel(TIMELINE_EVENT_PERFORMED_ACT_VOIDED),
			TIMELINE_LABEL_PERFORMED_ACT_VOIDED
		);
		assert.equal(TIMELINE_LABEL_PERFORMED_ACT_VOIDED, 'Acte annulé');
	});

	it('P112 performed_act category recognized with French label', () => {
		assert.equal(isPerformedActTimelineCategory(TIMELINE_CATEGORY_PERFORMED_ACT), true);
		assert.equal(
			clinicalTimelineCategoryLabel(TIMELINE_CATEGORY_PERFORMED_ACT),
			TIMELINE_CATEGORY_LABEL_PERFORMED_ACT
		);
		assert.equal(TIMELINE_CATEGORY_LABEL_PERFORMED_ACT, 'Actes réalisés');
		assert.equal(isPerformedActTimelineEventType(TIMELINE_EVENT_PERFORMED_ACT_PERFORMED), true);
		assert.equal(isPerformedActTimelineEventType(TIMELINE_EVENT_PERFORMED_ACT_VOIDED), true);
	});

	it('P112 performed_act is not a medical-record metric bucket', () => {
		assert.equal(isMedicalRecordTimelineMetricCategory(TIMELINE_CATEGORY_PERFORMED_ACT), false);
	});

	it('P112 no invented legacy aliases', () => {
		assert.equal(clinicalTimelineEventLabel('performed_act_recorded', 'fallback'), 'fallback');
		assert.equal(clinicalTimelineEventLabel('act_performed', 'x'), 'x');
		assert.equal(clinicalTimelineEventLabel('act_voided', 'y'), 'y');
		assert.equal(isPerformedActTimelineEventType('performed_act_recorded'), false);
	});

	it('P112 no navigation fields required for label rendering', () => {
		const event = baseEvent({
			event_type: TIMELINE_EVENT_PERFORMED_ACT_PERFORMED,
			category: TIMELINE_CATEGORY_PERFORMED_ACT,
			title: 'Acte réalisé',
			description: 'Suture',
			reference_type: '',
			reference_id: 0
		});
		assert.equal(clinicalTimelineEventLabel(event.event_type, event.title), 'Acte réalisé');
		assert.equal(clinicalTimelineCategoryLabel(event.category), 'Actes réalisés');
	});
});
