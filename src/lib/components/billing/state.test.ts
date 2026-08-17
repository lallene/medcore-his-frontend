import assert from 'node:assert/strict';
import test from 'node:test';
import { can, invoiceBalance, printableRows } from './state.ts';
import type { Invoice } from '$lib/types/billing';
test('financial display uses backend snapshots', () => {
	const invoice = {
		patientAmount: 15000,
		paidAmount: 10000,
		lines: [
			{
				description: 'NFS',
				quantity: 1,
				unitPrice: 20000,
				grossAmount: 20000,
				insuranceAmount: 14000,
				patientAmount: 6000
			}
		]
	} as Invoice;
	assert.equal(invoiceBalance(invoice), 5000);
	assert.deepEqual(printableRows(invoice)[0], {
		description: 'NFS',
		quantity: 1,
		unitPrice: 20000,
		gross: 20000,
		insurance: 14000,
		patient: 6000
	});
});
test('billing RBAC is explicit', () => {
	assert.equal(can(['billing.read'], 'billing.read'), true);
	assert.equal(can([], 'billing.create'), false);
	assert.equal(can(['*'], 'billing.cancel'), true);
});
