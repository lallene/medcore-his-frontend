import assert from 'node:assert/strict';
import test from 'node:test';
import {
	ACTIVE_INVOICE_VOID_MESSAGE,
	BASE_PRICE_LABEL,
	BASE_PRICE_HINT,
	actCategoryLabel,
	canCreatePerformedActs,
	canManageActCatalog,
	canCreatePerformedActFromCatalog,
	canReadActCatalog,
	canReadPerformedActs,
	canVoidPerformedAct,
	canVoidPerformedActs,
	formatCatalogPrice,
	isActiveInvoiceVoidConflict,
	normalizeVoidReason,
	originBadgeLabel,
	resolveVoidErrorMessage
} from './state.ts';

test('formatCatalogPrice formats whole XOF without scaling', () => {
	assert.equal(formatCatalogPrice(15000), '15 000 FCFA');
	assert.equal(formatCatalogPrice(0), '0 FCFA');
	assert.equal(formatCatalogPrice(15000, 'EUR').endsWith('EUR'), true);
});

test('BasePrice wording is reference-only', () => {
	assert.match(BASE_PRICE_LABEL, /référence/i);
	assert.doesNotMatch(BASE_PRICE_LABEL, /factur|payer/i);
	assert.match(BASE_PRICE_HINT, /tarif de facturation/i);
});

test('category and origin labels', () => {
	assert.equal(actCategoryLabel.LABORATORY, 'Laboratoire');
	assert.equal(originBadgeLabel('CONSULTATION'), 'Consultation');
	assert.equal(originBadgeLabel('IMAGING'), 'Imagerie');
	assert.equal(originBadgeLabel(''), null);
	assert.equal(originBadgeLabel('FUTURE_SOURCE'), 'Origine clinique');
});

test('RBAC helpers do not infer permissions', () => {
	assert.equal(canReadActCatalog(['act_catalog.read']), true);
	assert.equal(canManageActCatalog(['act_catalog.read']), false);
	assert.equal(canManageActCatalog(['act_catalog.manage']), true);
	assert.equal(canReadPerformedActs(['performed_acts.read']), true);
	assert.equal(canCreatePerformedActs(['performed_acts.read']), false);
	assert.equal(canVoidPerformedActs(['performed_acts.create']), false);
	assert.equal(canVoidPerformedActs(['*']), true);
});

test('create-from-catalog requires performed_acts.create AND act_catalog.read', () => {
	assert.equal(canCreatePerformedActFromCatalog(['performed_acts.create']), false);
	assert.equal(canCreatePerformedActFromCatalog(['act_catalog.read']), false);
	assert.equal(
		canCreatePerformedActFromCatalog(['performed_acts.create', 'act_catalog.read']),
		true
	);
	assert.equal(
		canCreatePerformedActFromCatalog(['performed_acts.create', 'act_catalog.manage']),
		true
	);
	assert.equal(canCreatePerformedActFromCatalog(['*']), true);
	assert.equal(
		canCreatePerformedActs(['performed_acts.create']) &&
			!canCreatePerformedActFromCatalog(['performed_acts.create']),
		true
	);
});

test('void availability is PERFORMED-only', () => {
	assert.equal(canVoidPerformedAct({ status: 'PERFORMED' }, ['performed_acts.void']), true);
	assert.equal(canVoidPerformedAct({ status: 'VOIDED' }, ['performed_acts.void']), false);
	assert.equal(canVoidPerformedAct({ status: 'PERFORMED' }, ['performed_acts.read']), false);
});

test('active invoice void conflict messaging', () => {
	assert.equal(
		isActiveInvoiceVoidConflict("Impossible d'annuler un acte encore facturé activement"),
		true
	);
	assert.equal(isActiveInvoiceVoidConflict('Seul un acte réalisé peut être annulé'), false);
	assert.equal(
		resolveVoidErrorMessage(new Error("Impossible d'annuler un acte encore facturé activement")),
		ACTIVE_INVOICE_VOID_MESSAGE
	);
	assert.equal(
		resolveVoidErrorMessage(new Error('ACCESS_DENIED')),
		"Vous n'avez pas la permission d'annuler cet acte."
	);
	assert.equal(normalizeVoidReason('  motif  ').length, 5);
	assert.equal(normalizeVoidReason('x'.repeat(300)).length, 240);
});
