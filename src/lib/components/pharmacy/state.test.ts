import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
	batchState,
	canDispense,
	familyMetrics,
	groupMedicationCatalogue,
	movementLabel,
	sortAvailability,
	stockStatusLabel
} from './state.ts';
import type { PresentationAvailability } from '../../types/pharmacy.ts';

const item = (
	commercialName: string,
	stockStatus: PresentationAvailability['stockStatus'],
	family = 'Antalgiques',
	form = 'Comprimé'
): PresentationAvailability => ({
	presentationId: Math.random(),
	commercialName,
	genericName: 'Paracétamol',
	family,
	dosage: '1000 mg',
	form,
	route: 'Orale',
	unit: 'unité',
	packaging: 'Boîte',
	availableQuantity: stockStatus === 'OUT_OF_STOCK' ? 0 : 10,
	alertThreshold: 5,
	stockStatus,
	isActive: true
});

test('nom commercial prioritaire, DCI secondaire et disponibilité ordonnée', () => {
	const sorted = sortAvailability([
		item('ZETA', 'OUT_OF_STOCK'),
		item('BETA', 'AVAILABLE'),
		item('ALPHA', 'AVAILABLE'),
		item('GAMMA', 'LOW_STOCK')
	]);
	assert.deepEqual(
		sorted.map((i) => i.commercialName),
		['ALPHA', 'BETA', 'GAMMA', 'ZETA']
	);
	assert.equal(stockStatusLabel('OUT_OF_STOCK'), 'Rupture');
	assert.equal(sorted[0].genericName, 'Paracétamol');
});

test('catalogue groupé par famille et forme disponible', () => {
	const grouped = groupMedicationCatalogue([
		item('DOLIPRANE', 'AVAILABLE'),
		item('AUGMENTIN', 'LOW_STOCK', 'Antibiotiques', 'Comprimé')
	]);
	assert.equal(grouped.get('Antalgiques')?.[0].form, 'Comprimé');
	assert.equal(grouped.get('Antibiotiques')?.[0].commercialName, 'AUGMENTIN');
});

test('compteurs famille reflètent médicaments, présentations et statuts', () => {
	const families = [{ id: 1, code: 'ANA', name: 'Antalgiques', description: '', isActive: true }];
	const metrics = familyMetrics(families, [
		item('DOLIPRANE', 'AVAILABLE'),
		item('DOLIPRANE', 'LOW_STOCK'),
		item('EFFERALGAN', 'OUT_OF_STOCK')
	])[0];
	assert.deepEqual(
		{
			medications: metrics.medications,
			presentations: metrics.presentations,
			available: metrics.available,
			low: metrics.low,
			out: metrics.out
		},
		{ medications: 2, presentations: 3, available: 1, low: 1, out: 1 }
	);
});

test('états lots et libellés mouvements sont stables', () => {
	const base = {
		id: 1,
		presentationId: 1,
		presentation: {} as never,
		batchNumber: 'LOT-A',
		quantityReceived: 10,
		quantityRemaining: 10,
		expirationDate: '2027-01-01',
		supplier: '',
		isActive: true,
		createdAt: '',
		updatedAt: ''
	};
	assert.equal(batchState(base, new Date('2026-01-01')), 'VALID');
	assert.equal(
		batchState({ ...base, expirationDate: '2025-01-01' }, new Date('2026-01-01')),
		'EXPIRED'
	);
	assert.equal(batchState({ ...base, quantityRemaining: 0 }, new Date('2026-01-01')), 'DEPLETED');
	assert.equal(movementLabel('DISPENSATION'), 'Dispensation');
});

test('dispensation soumise au RBAC', () => {
	assert.equal(canDispense({ permissions: ['pharmacy.dispensation.create'] }), true);
	assert.equal(canDispense({ role: 'accueil', permissions: [] }), false);
});

test('UX pharmacie couvre file, stock, lots, mouvements, FEFO et état vide', () => {
	const page = readFileSync(
		new URL('../../../routes/pharmacy/+page.svelte', import.meta.url),
		'utf8'
	);
	for (const marker of [
		'File de dispensation',
		'Stock',
		'Médicaments',
		'Familles',
		'Lots',
		'Mouvements',
		'FEFO',
		'Aucun bon à traiter'
	])
		assert.ok(page.includes(marker), marker);
	for (const marker of [
		'Quantité à délivrer',
		'remainingQuantity',
		'Partiellement disponible',
		'Toutes les familles',
		'Tous les services',
		'Toutes disponibilités',
		'Tous les états',
		'Tous les types',
		'Voir les médicaments',
		'Prochaine expiration',
		'Priorité FEFO'
	])
		assert.ok(page.includes(marker), marker);
	assert.ok(page.includes('quantities[line.prescriptionId] = line.remainingQuantity'));
	assert.ok(page.includes('{#if item.genericName}'));
	for (const marker of [
		'filteredVouchers',
		'Bon pharmacie',
		'NON ASSURÉ',
		'Information administrative — aucune décision PEC appliquée',
		'window.print()',
		'dispenseVoucherLine'
	])
		assert.ok(page.includes(marker), marker);
	assert.equal(page.includes('Pris en charge'), false);
});

test('PrescriptionForm utilise la disponibilité backend sans mutation de stock', () => {
	const form = readFileSync(
		new URL('../consultations/PrescriptionForm.svelte', import.meta.url),
		'utf8'
	);
	assert.ok(form.includes('getPresentationAvailability'));
	assert.ok(form.includes('Disponible'));
	assert.equal(form.includes('dispensePrescription'), false);
	assert.ok(form.includes('getPrescriptionDispensationStatus'));
	assert.ok(form.includes('délivrés'));
	assert.ok(form.includes('Présentation verrouillée'));
	assert.ok(form.includes('disabled={prescription.fullyDispensed}'));
	assert.ok(form.includes('disabled={prescription.dispensedQuantity > 0}'));
	assert.ok(form.includes('item.isActive && item.medication.isActive'));
	assert.ok(form.includes('existingPresentationIds.has(item.id)'));
});

test('scénarios DEMO ordonnent disponible, faible et rupture par présentation', () => {
	const sorted = sortAvailability([
		{ ...item('AMOXIL', 'OUT_OF_STOCK', 'Antibiotiques', 'Gélule'), genericName: 'Amoxicilline' },
		{
			...item('ADVIL', 'LOW_STOCK', 'Anti-inflammatoires'),
			genericName: 'Ibuprofène',
			availableQuantity: 8
		},
		{ ...item('DOLIPRANE', 'AVAILABLE'), genericName: 'Paracétamol', availableQuantity: 320 },
		{ ...item('DOLIPRANE', 'AVAILABLE'), dosage: '1 g', availableQuantity: 104 }
	]);
	assert.deepEqual(
		sorted.map((value) => value.stockStatus),
		['AVAILABLE', 'AVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK']
	);
	assert.equal(sorted.filter((value) => value.commercialName === 'DOLIPRANE').length, 2);
	assert.equal(sorted[0].genericName, 'Paracétamol');
});
