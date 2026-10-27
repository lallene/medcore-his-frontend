import assert from 'node:assert/strict';
import test from 'node:test';
import type { GrcAsset } from '$lib/types/grc';
import {
	assetCriticalityLabel,
	assetFormFrom,
	assetPayload,
	assetQuery,
	assetStatusLabel,
	assetTypeLabel,
	canManageAssets,
	canReadAssetRisks,
	canReadAssets,
	emptyAssetFilters,
	emptyAssetForm,
	hasActiveAssetFilters,
	labelOf,
	ownerLabel,
	serviceLabel,
	validateAssetForm
} from './asset-state.ts';

const asset: GrcAsset = {
	id: 12,
	code: 'APP-DPI',
	name: 'Dossier patient',
	type: 'APPLICATION',
	description: 'Base clinique',
	criticality: 'CRITICAL',
	owningServiceId: 3,
	owningService: { id: 3, code: 'SEC', name: 'Sécurité', active: true },
	ownerProfileId: 5,
	ownerProfile: { id: 5, employeeCode: 'EMP-5', jobTitle: 'RSSI', active: false },
	status: 'ACTIVE',
	createdBy: 1,
	updatedBy: 2,
	createdAt: '2026-06-01T10:00:00Z',
	updatedAt: '2026-06-02T10:00:00Z'
};

test('labels cover exactly the backend asset enums', () => {
	assert.deepEqual(Object.keys(assetTypeLabel), [
		'APPLICATION',
		'INFRASTRUCTURE',
		'SERVER',
		'DATABASE',
		'NETWORK',
		'DATA',
		'BUSINESS_SERVICE',
		'VENDOR',
		'PROCESS',
		'SITE'
	]);
	assert.deepEqual(Object.keys(assetCriticalityLabel), ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
	assert.deepEqual(Object.keys(assetStatusLabel), ['ACTIVE', 'INACTIVE', 'RETIRED']);
	// An unknown value stays visible with its code.
	assert.equal(labelOf(assetStatusLabel, 'ARCHIVED'), 'ARCHIVED');
});

test('registry actions follow the asset permissions; the backend stays the authority', () => {
	assert.equal(canReadAssets(['grc.asset.read']), true);
	assert.equal(canManageAssets(['grc.asset.read']), false);
	assert.equal(canManageAssets(['grc.asset.manage']), true);
	assert.equal(canReadAssets(['grc.risk.read', 'grc.dashboard.read']), false);
	assert.equal(canReadAssets(['*']) && canManageAssets(['*']), true);
	assert.equal(canReadAssetRisks(['grc.asset.read']), false);
	assert.equal(canReadAssetRisks(['grc.risk.read']), true);
});

test('list query sends only the filters that are set, with page and limit', () => {
	assert.deepEqual(assetQuery(emptyAssetFilters()), { page: 1, limit: 20 });
	assert.equal(hasActiveAssetFilters(emptyAssetFilters()), false);
	const filters = {
		search: '  dossier ',
		type: 'APPLICATION',
		criticality: 'HIGH',
		status: 'ACTIVE',
		page: 3
	};
	assert.deepEqual(assetQuery(filters), {
		page: 3,
		limit: 20,
		search: 'dossier',
		type: 'APPLICATION',
		criticality: 'HIGH',
		status: 'ACTIVE'
	});
	assert.equal(hasActiveAssetFilters({ ...emptyAssetFilters(), search: '   ' }), false);
	assert.equal(hasActiveAssetFilters({ ...emptyAssetFilters(), status: 'RETIRED' }), true);
	assert.equal(assetQuery({ ...emptyAssetFilters(), page: 0 }).page, 1);
});

test('ownership labels never invent a name', () => {
	assert.equal(ownerLabel(asset.ownerProfile), 'EMP-5 · RSSI (inactif)');
	assert.equal(ownerLabel({ id: 1, employeeCode: 'EMP-1', jobTitle: '', active: true }), 'EMP-1');
	assert.equal(ownerLabel(undefined), 'Non renseigné');
	assert.equal(serviceLabel(asset.owningService), 'Sécurité');
	assert.equal(
		serviceLabel({ id: 4, code: 'OLD', name: 'Ancien', active: false }),
		'Ancien (inactif)'
	);
	assert.equal(serviceLabel(null), 'Non renseigné');
});

test('form validation is for UX only and mirrors the backend limits', () => {
	assert.deepEqual(Object.keys(validateAssetForm(emptyAssetForm())).sort(), [
		'code',
		'criticality',
		'name',
		'type'
	]);
	const valid = {
		...emptyAssetForm(),
		code: 'APP',
		name: 'App',
		type: 'SERVER',
		criticality: 'LOW'
	};
	assert.deepEqual(validateAssetForm(valid), {});
	assert.ok(validateAssetForm({ ...valid, code: '   ' }).code);
	assert.ok(validateAssetForm({ ...valid, code: 'É'.repeat(61) }).code);
	assert.deepEqual(validateAssetForm({ ...valid, code: 'É'.repeat(60) }), {});
	assert.ok(validateAssetForm({ ...valid, name: 'n'.repeat(181) }).name);
	assert.ok(validateAssetForm({ ...valid, criticality: 'VERY_HIGH' }).criticality);
	assert.ok(validateAssetForm({ ...valid, status: 'DELETED' }).status);
});

test('payload maps the form without any server-managed field', () => {
	const payload = assetPayload({ ...assetFormFrom(asset), code: ' app-dpi ', description: '  ' });
	assert.deepEqual(payload, {
		code: 'app-dpi',
		name: 'Dossier patient',
		type: 'APPLICATION',
		description: '',
		criticality: 'CRITICAL',
		owningServiceId: 3,
		ownerProfileId: 5,
		status: 'ACTIVE'
	});
	for (const key of ['id', 'createdBy', 'updatedBy', 'createdAt', 'updatedAt'])
		assert.equal(key in payload, false, key);
	assert.deepEqual(assetPayload({ ...emptyAssetForm(), code: 'X' }).ownerProfileId, null);
});
