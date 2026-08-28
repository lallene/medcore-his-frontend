import assert from 'node:assert/strict';
import test from 'node:test';
import { anyPermission, can, permissionAreas, toggleCode } from './state.ts';
import { readFileSync } from 'node:fs';
test('multi-functions are cumulative without duplicates', () => {
	assert.deepEqual(toggleCode(['FACTURATION'], 'CAISSIER'), ['CAISSIER', 'FACTURATION']);
	assert.deepEqual(toggleCode(['CAISSIER', 'FACTURATION'], 'CAISSIER'), ['FACTURATION']);
});
test('technical admin wildcard remains compatible', () =>
	assert.equal(can(['*'], 'staff.manage'), true));
test('cash stays absent without an explicit cash function', () => {
	assert.equal(anyPermission(['billing.read'], ['cash.payment.create']), false);
	assert.equal(anyPermission(['cash.payment.create'], ['cash.payment.create']), true);
});
test('matrix exposes all required business areas', () => assert.equal(permissionAreas.length, 14));
test('staff administration covers list filters edit multi-dimensions audit inactive and RBAC', () => {
	const page = readFileSync(
		new URL('../../../routes/admin/staff/+page.svelte', import.meta.url),
		'utf8'
	);
	for (const marker of [
		'Nom, email, code agent',
		'Toutes fonctions',
		'Toutes spécialités',
		'Inactifs',
		'Fonctions',
		'Spécialités',
		'Capacités',
		'Matrice RBAC',
		'Historique des affectations',
		'staff.manage',
		'staff.audit.read'
	])
		assert.match(page, new RegExp(marker));
});
test('navigation is permission-driven for clinical financial and staff modules', () => {
	const nav = readFileSync(new URL('../../rbac/navigation.ts', import.meta.url), 'utf8');
	for (const permission of [
		'consultations.read',
		'cash.session.read',
		'laboratory.read',
		'imaging.read',
		'billing.read',
		'insurance_receivables.read',
		'staff.read'
	])
		assert.match(nav, new RegExp(permission.replace('.', '\\.')));
});
