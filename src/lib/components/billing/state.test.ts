import assert from 'node:assert/strict';
import test from 'node:test';
import {
	BILLING_ACT_TYPES,
	billableActSelectable,
	billingActTypeLabel,
	can,
	canCreatePerformedActBilling,
	formatBillingActType,
	invoiceBalance,
	isBillingActType,
	isPaidInvoiceBlockingVoid,
	MISSING_TARIFF_MESSAGE,
	performedActBillingDeepLink,
	printableRows,
	resolveInvoiceUnitPrice,
	tariffReferenceLabel,
	voidConflictBillingHref
} from './state.ts';
import type { BillableAct, Invoice, Tariff } from '$lib/types/billing';

test('PERFORMED_ACT is an accepted billing act type with friendly label', () => {
	assert.equal(isBillingActType('PERFORMED_ACT'), true);
	assert.ok(BILLING_ACT_TYPES.includes('PERFORMED_ACT'));
	assert.equal(billingActTypeLabel.PERFORMED_ACT, 'Acte réalisé');
	assert.equal(formatBillingActType('PERFORMED_ACT'), 'Acte réalisé');
	assert.equal(formatBillingActType('CONSULTATION'), 'Consultation');
	assert.equal(formatBillingActType('MEDICATION'), 'Médicament');
});

test('legacy billing types remain unchanged', () => {
	for (const t of [
		'CONSULTATION',
		'LABORATORY',
		'IMAGING',
		'HOSPITALIZATION',
		'MEDICATION'
	] as const) {
		assert.equal(isBillingActType(t), true);
		assert.ok(billingActTypeLabel[t].length > 0);
		assert.notEqual(billingActTypeLabel[t], t);
	}
});

test('billing CTA requires PERFORMED + billable + billing.create', () => {
	assert.equal(
		canCreatePerformedActBilling({ status: 'PERFORMED', billable: true }, ['billing.create']),
		true
	);
	assert.equal(
		canCreatePerformedActBilling({ status: 'VOIDED', billable: true }, ['billing.create']),
		false
	);
	assert.equal(
		canCreatePerformedActBilling({ status: 'PERFORMED', billable: false }, ['billing.create']),
		false
	);
	assert.equal(
		canCreatePerformedActBilling({ status: 'PERFORMED', billable: true }, ['performed_acts.read']),
		false
	);
	assert.equal(
		canCreatePerformedActBilling({ status: 'PERFORMED', billable: true }, [
			'performed_acts.create'
		]),
		false
	);
	assert.equal(canCreatePerformedActBilling({ status: 'PERFORMED', billable: true }, ['*']), true);
});

test('BasePrice never becomes invoice UnitPrice fallback', () => {
	assert.equal(resolveInvoiceUnitPrice(8500, 999999), 8500);
	assert.equal(resolveInvoiceUnitPrice(null, 999999), null);
	assert.equal(resolveInvoiceUnitPrice(undefined, 12500), null);
	assert.equal(resolveInvoiceUnitPrice(0, 12500), null);
	assert.match(MISSING_TARIFF_MESSAGE, /tarif/i);
	assert.match(MISSING_TARIFF_MESSAGE, /catalogue|référence/i);
});

test('billable act selection requires tariff; missing tariff is not selectable', () => {
	const withTariff = {
		alreadyBilled: false,
		tariff: { unitPrice: 5000 } as Tariff
	} as Pick<BillableAct, 'alreadyBilled' | 'tariff'>;
	const missing = { alreadyBilled: false, tariff: null } as Pick<
		BillableAct,
		'alreadyBilled' | 'tariff'
	>;
	const billed = {
		alreadyBilled: true,
		tariff: { unitPrice: 5000 } as Tariff
	} as Pick<BillableAct, 'alreadyBilled' | 'tariff'>;
	assert.equal(billableActSelectable(withTariff), true);
	assert.equal(billableActSelectable(missing), false);
	assert.equal(billableActSelectable(billed), false);
});

test('financial display uses backend invoice DTO snapshots only', () => {
	const invoice = {
		patientAmount: 15000,
		paidAmount: 10000,
		lines: [
			{
				description: 'NFS',
				actType: 'PERFORMED_ACT',
				quantity: 2,
				unitPrice: 10000,
				grossAmount: 20000,
				insuranceAmount: 14000,
				patientAmount: 6000
			}
		]
	} as Invoice;
	assert.equal(invoiceBalance(invoice), 5000);
	assert.deepEqual(printableRows(invoice)[0], {
		description: 'NFS',
		quantity: 2,
		unitPrice: 10000,
		gross: 20000,
		insurance: 14000,
		patient: 6000,
		actType: 'PERFORMED_ACT'
	});
});

test('generic vs specific PERFORMED_ACT tariff presentation', () => {
	assert.equal(
		tariffReferenceLabel({ actType: 'PERFORMED_ACT', referenceId: null }),
		'Acte réalisé · générique'
	);
	assert.equal(
		tariffReferenceLabel({ actType: 'PERFORMED_ACT', referenceId: 42 }),
		'Acte réalisé · catalogue #42'
	);
	assert.equal(
		tariffReferenceLabel({ actType: 'CONSULTATION', referenceId: null }),
		'Consultation'
	);
});

test('billing deep-link carries patient and optional stable act identity', () => {
	assert.equal(performedActBillingDeepLink(9), '/billing?patientId=9');
	assert.equal(
		performedActBillingDeepLink(9, 77),
		'/billing?patientId=9&actType=PERFORMED_ACT&referenceId=77'
	);
	assert.doesNotMatch(performedActBillingDeepLink(9, 77), /patientCoverageId|basePrice|unitPrice/i);
});

test('void conflict href prefers invoice detail when known', () => {
	assert.equal(voidConflictBillingHref(3, 55), '/billing/55');
	assert.equal(voidConflictBillingHref(3), '/billing?patientId=3');
	assert.equal(isPaidInvoiceBlockingVoid('PAID'), true);
	assert.equal(isPaidInvoiceBlockingVoid('PARTIALLY_PAID'), true);
	assert.equal(isPaidInvoiceBlockingVoid('ISSUED'), false);
	assert.equal(isPaidInvoiceBlockingVoid('DRAFT'), false);
});

test('billing RBAC is explicit', () => {
	assert.equal(can(['billing.read'], 'billing.read'), true);
	assert.equal(can([], 'billing.create'), false);
	assert.equal(can(['*'], 'billing.cancel'), true);
	assert.equal(can(['billing.tariff.manage'], 'billing.tariff.manage'), true);
	assert.equal(can(['act_catalog.manage'], 'billing.tariff.manage'), false);
});
