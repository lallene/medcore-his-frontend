import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { insuranceReceivableCan, insurerBalance, settlementUnallocated } from './state.ts';
test('patient and insurer balances are independent', () => {
	assert.equal(insurerBalance(35000, 0), 35000);
	assert.equal(insurerBalance(35000, 20000), 15000);
	assert.equal(insurerBalance(35000, 35000), 0);
});
test('unallocated settlement amount is explicit', () => {
	assert.equal(settlementUnallocated(100000, 80000), 20000);
	assert.equal(settlementUnallocated(100000, 110000), 0);
});
test('insurance permissions never grant Cash', () => {
	assert.equal(
		insuranceReceivableCan(['insurance_settlements.allocate'], 'insurance_settlements.allocate'),
		true
	);
	assert.equal(
		insuranceReceivableCan(['insurance_settlements.allocate'], 'cash.payment.create'),
		false
	);
});
test('UX covers queue company settlement allocation batches Billing and Patient 360', () => {
	const queue = readFileSync(
		new URL('../../../routes/insurance-receivables/+page.svelte', import.meta.url),
		'utf8'
	);
	const settlement = readFileSync(
		new URL('../../../routes/insurance-receivables/settlements/[id]/+page.svelte', import.meta.url),
		'utf8'
	);
	const batches = readFileSync(
		new URL('../../../routes/insurance-receivables/batches/+page.svelte', import.meta.url),
		'utf8'
	);
	const detail = readFileSync(
		new URL('../../../routes/insurance-receivables/[id]/+page.svelte', import.meta.url),
		'utf8'
	);
	const billing = readFileSync(
		new URL('../../../routes/billing/[id]/+page.svelte', import.meta.url),
		'utf8'
	);
	const patient = readFileSync(
		new URL('../patients/patient-360/PatientBilling.svelte', import.meta.url),
		'utf8'
	);
	for (const marker of [
		'À recouvrer',
		'Non alloué',
		'Assureur, patient, facture, PEC',
		'Part assurance'
	])
		assert.match(queue, new RegExp(marker));
	assert.match(settlement, /Allocation assistée/);
	assert.match(settlement, /Comptabiliser le règlement/);
	assert.match(batches, /ne constitue jamais un paiement/);
	assert.match(detail, /Historique administratif/);
	assert.match(detail, /insurance_receivables\.followup/);
	assert.match(settlement, /insurance_settlements\.allocate/);
	assert.match(batches, /insurance_batches\.create/);
	assert.match(batches, /insurance_batches\.submit/);
	assert.match(billing, /RECOUVREMENT ASSURANCE/);
	assert.match(patient, /Reste assurance/);
});
