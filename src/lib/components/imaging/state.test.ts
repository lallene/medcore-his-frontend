import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
	imagingActions,
	imagingModalities,
	imagingStatusLabel,
	isImagingCategory,
	hasImagingPermission
} from './state.ts';
test('imaging categories remain separate', () => {
	assert.equal(isImagingCategory('Imagerie'), true);
	for (const category of ['Laboratoire', 'Biologie', 'Cardiologie', 'ORL'])
		assert.equal(isImagingCategory(category), false);
});
test('workflow actions follow status and validation is readonly', () => {
	assert.equal(imagingActions('ORDERED').schedule, true);
	assert.equal(imagingActions('SCHEDULED').start, true);
	assert.equal(imagingActions('IN_PROGRESS').report, true);
	assert.equal(imagingActions('REPORT_DRAFTED').validate, true);
	assert.equal(imagingActions('VALIDATED').readonly, true);
	assert.equal(imagingActions('VALIDATED').report, false);
});
test('modalities and labels are stable', () => {
	assert.deepEqual(imagingModalities, ['XRAY', 'ULTRASOUND', 'CT', 'MRI', 'MAMMOGRAPHY', 'OTHER']);
	assert.equal(imagingStatusLabel('REPORT_DRAFTED'), 'Compte rendu rédigé');
});
test('RBAC is granular', () => {
	assert.equal(
		hasImagingPermission({ permissions: ['imaging.schedule'] }, 'imaging.schedule'),
		true
	);
	assert.equal(hasImagingPermission({ permissions: ['imaging.read'] }, 'imaging.validate'), false);
	assert.equal(
		hasImagingPermission({ role: 'accueil', permissions: [] }, 'imaging.perform'),
		false
	);
});
test('queue and detail expose filters pagination workflow and readonly report', () => {
	const queue = readFileSync(
		new URL('../../../routes/imaging/+page.svelte', import.meta.url),
		'utf8'
	);
	const detail = readFileSync(
		new URL('../../../routes/imaging/[id]/+page.svelte', import.meta.url),
		'utf8'
	);
	for (const marker of ['search', 'status', 'modality', 'service', 'dateFilter', 'totalPages'])
		assert.equal(queue.includes(marker), true);
	for (const marker of [
		'scheduleImagingOrder',
		'startImagingOrder',
		'saveImagingReport',
		'validateImagingOrder',
		'order.report'
	])
		assert.equal(detail.includes(marker), true);
	assert.equal(detail.includes("order.status === 'VALIDATED'"), true);
});
test('Patient 360 and consultation use real ImagingOrder without merging other categories', () => {
	const patient = readFileSync(
		new URL('../patients/patient-360/PatientExams.svelte', import.meta.url),
		'utf8'
	);
	const consultation = readFileSync(
		new URL('../consultations/ConsultationImagingStatus.svelte', import.meta.url),
		'utf8'
	);
	assert.equal(patient.includes('listImagingOrders'), true);
	assert.equal(patient.includes('Autres examens cliniques'), true);
	assert.equal(patient.includes('imagingDetail.report.conclusion'), true);
	assert.equal(consultation.includes('listImagingOrders'), true);
});
