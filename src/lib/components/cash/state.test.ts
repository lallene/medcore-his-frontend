import test from 'node:test';
import assert from 'node:assert/strict';
import { cashCan, cashKpis, difference, methods, needsOperator, needsReference } from './state.ts';
test('cash excludes non-cash', () => {
	const x = cashKpis({
		session: { openingFloat: 50000 } as never,
		cashPayments: 5000,
		cardPayments: 3000,
		mobileMoneyPayments: 10000,
		bankTransferPayments: 0,
		checkPayments: 0,
		totalPayments: 18000,
		operationCount: 3,
		expectedCash: 55000
	});
	assert.equal(x.expected, 55000);
	assert.equal(x.other, 13000);
});
test('conditional fields', () => {
	assert.equal(methods.length, 5);
	assert.equal(needsOperator('MOBILE_MONEY'), true);
	assert.equal(needsReference('CHECK'), true);
	assert.equal(needsReference('CASH'), false);
});
test('differences', () => {
	assert.equal(difference(98000, 100000), -2000);
	assert.equal(difference(102000, 100000), 2000);
});
test('cash permissions are explicit', () => {
	assert.equal(cashCan([], 'cash.payment.create'), false);
	assert.equal(cashCan(['cash.payment.create'], 'cash.payment.create'), true);
	assert.equal(cashCan(['*'], 'cash.session.close'), true);
});
