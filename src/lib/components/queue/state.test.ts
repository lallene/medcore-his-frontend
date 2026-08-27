import assert from 'node:assert/strict';
import test from 'node:test';
import {
	ageSexLabel,
	careStateLabel,
	dashboardQueueColumns,
	doctorQueueColumns,
	doctorWorklistColumns,
	filterDoctorWorklist,
	formatVitalSummary,
	formatWaitMinutes,
	isDoctorWorklistTicket,
	priorityLabels,
	receptionQueueColumns,
	sourceLabels,
	stageLabels,
	triageQueueColumns,
	vitalsHaveAbnormal
} from './state.ts';
import type { QueueTicketRow } from '$lib/types/queue';

test('stage labels cover clinical queue stages', () => {
	assert.equal(stageLabels.WAITING_TRIAGE, 'Attente triage');
	assert.equal(stageLabels.DOCTOR_IN_PROGRESS, 'En consultation');
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
	assert.deepEqual(
		[...doctorWorklistColumns],
		[
			'Priorité',
			'Patient',
			'Âge / Sexe',
			'Arrivé',
			'Attente',
			'Constantes',
			'Motif',
			'Prise en charge',
			'Actions'
		]
	);
});

test('formatWaitMinutes renders human-readable durations', () => {
	assert.equal(formatWaitMinutes(0), '< 1 min');
	assert.equal(formatWaitMinutes(45), '45 min');
	assert.equal(formatWaitMinutes(90), '1 h 30 min');
});

test('doctor worklist never treats triage stages as visible', () => {
	assert.equal(isDoctorWorklistTicket({ stage: 'WAITING_TRIAGE' }), false);
	assert.equal(isDoctorWorklistTicket({ stage: 'TRIAGE_IN_PROGRESS' }), false);
	assert.equal(isDoctorWorklistTicket({ stage: 'WAITING_DOCTOR' }), true);
	assert.equal(isDoctorWorklistTicket({ stage: 'DOCTOR_IN_PROGRESS' }), true);
});

test('filterDoctorWorklist drops triage tickets even if present client-side', () => {
	const rows = [
		{
			id: 1,
			stage: 'WAITING_TRIAGE',
			priority: 'NORMAL',
			patientName: 'A',
			patientCode: 'P1',
			reference: 'Q-1'
		},
		{
			id: 2,
			stage: 'WAITING_DOCTOR',
			priority: 'URGENT',
			patientName: 'Jean',
			patientCode: 'P2',
			reference: 'Q-2'
		},
		{
			id: 3,
			stage: 'DOCTOR_IN_PROGRESS',
			priority: 'NORMAL',
			patientName: 'Marie',
			patientCode: 'P3',
			reference: 'Q-3'
		}
	] as QueueTicketRow[];
	const filtered = filterDoctorWorklist(rows, {});
	assert.deepEqual(
		filtered.map((t) => t.id),
		[2, 3]
	);
	assert.equal(filterDoctorWorklist(rows, { search: 'jean' }).length, 1);
	assert.equal(filterDoctorWorklist(rows, { priority: 'URGENT' })[0]?.id, 2);
});

test('vitals formatting and abnormal flag', () => {
	assert.equal(formatVitalSummary(undefined), '—');
	const v = {
		id: 1,
		temperatureC: 38.7,
		systolicBp: 150,
		diastolicBp: 95,
		heartRate: 102,
		abnormalTemp: true,
		abnormalBp: true,
		abnormalHr: true,
		abnormalSpo2: false
	};
	assert.match(formatVitalSummary(v), /38\.7/);
	assert.equal(vitalsHaveAbnormal(v), true);
});

test('age sex and care state labels', () => {
	assert.equal(ageSexLabel({ patientAgeYears: 42, patientSex: 'M' }), '42 ans Homme');
	assert.equal(
		careStateLabel({
			stage: 'DOCTOR_IN_PROGRESS',
			doctorTakenByName: 'Dr Dupont'
		} as QueueTicketRow),
		'En charge — Dr Dupont'
	);
	assert.equal(careStateLabel({ stage: 'WAITING_DOCTOR' } as QueueTicketRow), 'Prêt');
});
