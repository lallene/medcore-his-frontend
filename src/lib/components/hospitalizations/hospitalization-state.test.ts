import assert from 'node:assert/strict';
import test from 'node:test';
import {
	availableHospitalizationActions,
	deduplicateHospitalizations,
	hospitalizationStatusLabel,
	consultationHospitalizationDecision
} from './hospitalization-state.ts';
import type { Hospitalization } from '../../types/hospitalization.ts';

test('actions follow the hospitalization lifecycle', () => {
	assert.deepEqual(availableHospitalizationActions('PLANNED'), ['admit', 'cancel']);
	assert.deepEqual(availableHospitalizationActions('ADMITTED'), ['discharge']);
	assert.deepEqual(availableHospitalizationActions('DISCHARGED'), []);
	assert.deepEqual(availableHospitalizationActions('CANCELLED'), []);
});
test('statuses have stable labels', () =>
	assert.deepEqual(
		['PLANNED', 'ADMITTED', 'DISCHARGED', 'CANCELLED'].map((status) =>
			hospitalizationStatusLabel(status as never)
		),
		['Planifiée', 'Admise', 'Sortie', 'Annulée']
	));
test('hospitalizations are deduplicated by source consultation and sorted', () => {
	const base = {
		sourceConsultationId: 3,
		createdAt: '2026-08-01T00:00:00Z',
		id: 1
	} as Hospitalization;
	const latest = {
		sourceConsultationId: 4,
		createdAt: '2026-08-02T00:00:00Z',
		id: 2
	} as Hospitalization;
	assert.deepEqual(
		deduplicateHospitalizations([base, { ...base, id: 9 }, latest]).map((item) => item.id),
		[2, 1]
	);
});

test('consultation decision proposes creation once, then opening the existing stay', () => {
	assert.equal(consultationHospitalizationDecision(false, null), 'none');
	assert.equal(consultationHospitalizationDecision(true, null), 'create');
	assert.equal(consultationHospitalizationDecision(true, { id: 8 } as Hospitalization), 'open');
});
