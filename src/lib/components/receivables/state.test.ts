import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { cashLink, receivableCan, totalPatientBalance } from './state.ts';
test('patient balance excludes insurance and follows payments', () => {
	assert.equal(
		totalPatientBalance([
			{ patientDue: 15000, patientPaid: 10000, insuranceAmount: 35000 } as never
		]),
		5000
	);
});
test('cash remains the payment workflow', () => assert.equal(cashLink(12), '/cash?invoiceId=12'));
test('receivables permissions do not grant cash', () => {
	assert.equal(receivableCan(['receivables.read'], 'receivables.read'), true);
	assert.equal(receivableCan(['receivables.read'], 'cash.payment.create'), false);
});
test('queue exposes patient-only KPIs, search, filters and financial split', () => {
	const page = readFileSync(
		new URL('../../../routes/receivables/+page.svelte', import.meta.url),
		'utf8'
	);
	for (const marker of [
		'Total créances',
		'Échues',
		'Patient, code ou facture',
		'Toutes échéances',
		'Assurance',
		'Part patient',
		'Reste patient'
	]) {
		assert.match(page, new RegExp(marker));
	}
	assert.doesNotMatch(page, />\s*patientId\s*</i);
});
test('detail, Patient 360 and Cash integration keep their responsibilities separate', () => {
	const detail = readFileSync(
		new URL('../../../routes/receivables/[id]/+page.svelte', import.meta.url),
		'utf8'
	);
	const patient360 = readFileSync(
		new URL('../patients/patient-360/PatientBilling.svelte', import.meta.url),
		'utf8'
	);
	const cash = readFileSync(new URL('../../../routes/cash/+page.svelte', import.meta.url), 'utf8');
	assert.match(detail, /Encaisser à la caisse/);
	assert.match(detail, /Promesse/);
	assert.match(patient360, /Créances patient/);
	assert.match(patient360, /part assurance est exclue/);
	assert.match(cash, /invoiceId/);
});
