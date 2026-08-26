import assert from 'node:assert/strict';
import test from 'node:test';
import {
	dashboardQueueColumns,
	doctorQueueColumns,
	formatWaitMinutes,
	priorityLabels,
	receptionQueueColumns,
	sourceLabels,
	stageLabels,
	triageQueueColumns
} from './state.ts';

test('stage labels cover clinical queue stages', () => {
	assert.equal(stageLabels.WAITING_TRIAGE, 'Attente triage');
	assert.equal(stageLabels.DOCTOR_IN_PROGRESS, 'Consultation en cours');
	assert.equal(stageLabels.ON_HOLD, 'En pause');
});

test('priority and source labels are in French', () => {
	assert.equal(priorityLabels.URGENT, 'Urgent');
	assert.equal(sourceLabels.WALK_IN, 'Sans rendez-vous');
});

test('queue tables keep stable column order', () => {
	assert.deepEqual(
		[...receptionQueueColumns],
		['Patient', 'Service', 'Heure RDV', 'Source', 'Priorité', 'Attente', 'Actions']
	);
	assert.ok(triageQueueColumns.includes('Actions'));
	assert.ok(doctorQueueColumns.includes('Médecin'));
	assert.ok(dashboardQueueColumns.includes('Référence'));
});

test('formatWaitMinutes renders human-readable durations', () => {
	assert.equal(formatWaitMinutes(0), '< 1 min');
	assert.equal(formatWaitMinutes(45), '45 min');
	assert.equal(formatWaitMinutes(90), '1 h 30 min');
});
