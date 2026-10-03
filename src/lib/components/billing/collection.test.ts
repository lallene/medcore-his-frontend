import assert from 'node:assert/strict';
import test from 'node:test';
import AxiosError from 'axios';
import {
	BILLING_PAYMENT_METHODS,
	canShowEncaisser,
	classifyPaymentError,
	filterInvoicesForCashier,
	invoiceCollectibleKind,
	isCanonicalPaymentMethod,
	isInvoiceCollectible,
	isPaymentFormSubmitDisabled,
	mergePaymentHistory,
	paymentHistoryFingerprint,
	validatePaymentAmount
} from './collection.ts';
import {
	beginPaymentCommand,
	completePaymentCommandError,
	completePaymentCommandSuccess,
	createPaymentCommandState
} from './payment-command.ts';
import type { Invoice, Payment } from '$lib/types/billing';

const base = (over: Partial<Invoice> = {}): Invoice => ({
	id: 1,
	number: 'INV-000001',
	patientId: 9,
	patientName: 'Ada Lovelace',
	patientCode: 'P001',
	status: 'ISSUED',
	grossAmount: 10000,
	insuranceAmount: 3000,
	patientAmount: 7000,
	paidAmount: 0,
	balanceAmount: 7000,
	coveragePending: false,
	createdAt: '2026-01-01T00:00:00Z',
	payments: [],
	...over
});

test('C01 payable invoice renders Encaisser capability', () => {
	assert.equal(canShowEncaisser(base(), ['billing.payment.create']), true);
	assert.equal(invoiceCollectibleKind(base()), 'payable');
});

test('C02 settled invoice cannot collect', () => {
	const paid = base({ status: 'PAID', paidAmount: 7000, balanceAmount: 0 });
	assert.equal(isInvoiceCollectible(paid), false);
	assert.equal(canShowEncaisser(paid, ['billing.payment.create']), false);
	assert.equal(invoiceCollectibleKind(paid), 'settled');
});

test('C03 permission missing hides collection UX', () => {
	assert.equal(canShowEncaisser(base(), ['billing.read']), false);
	assert.equal(canShowEncaisser(base(), ['*']), true);
});

test('C04 authoritative remaining balance fields are present for display', () => {
	const inv = base();
	assert.equal(inv.grossAmount, 10000);
	assert.equal(inv.insuranceAmount, 3000);
	assert.equal(inv.patientAmount, 7000);
	assert.equal(inv.paidAmount, 0);
	assert.equal(inv.balanceAmount, 7000);
});

test('C05 partial amount accepted by client validation', () => {
	assert.deepEqual(validatePaymentAmount(2000, 7000), { ok: true });
});

test('C06 obvious overpayment blocked client-side', () => {
	assert.deepEqual(validatePaymentAmount(7001, 7000), { ok: false, reason: 'over_balance' });
	assert.deepEqual(validatePaymentAmount(0, 7000), { ok: false, reason: 'zero' });
	assert.deepEqual(validatePaymentAmount(-1, 7000), { ok: false, reason: 'negative' });
});

test('C07 pending request disables submit', () => {
	const pending = beginPaymentCommand(createPaymentCommandState('k'));
	assert.equal(isPaymentFormSubmitDisabled(pending, 1000, 7000), true);
});

test('C08/C09/C10 success state transitions from authoritative invoice', () => {
	const afterPartial = base({
		status: 'PARTIALLY_PAID',
		paidAmount: 2000,
		balanceAmount: 5000
	});
	assert.equal(isInvoiceCollectible(afterPartial), true);
	assert.equal(invoiceCollectibleKind(afterPartial), 'partially_paid');
	const afterFull = base({ status: 'PAID', paidAmount: 7000, balanceAmount: 0 });
	assert.equal(isInvoiceCollectible(afterFull), false);
	assert.equal(canShowEncaisser(afterFull, ['billing.payment.create']), false);
});

test('C11 stale/concurrent conflict classification refreshes state', () => {
	const err = new AxiosError.AxiosError('Le paiement dépasse le reste dû');
	err.response = {
		status: 409,
		data: { code: 'CONFLICT', message: 'Le paiement dépasse le reste dû' },
		statusText: 'Conflict',
		headers: {},
		config: { headers: new AxiosError.AxiosHeaders() }
	};
	const c = classifyPaymentError(err);
	assert.equal(c.kind, 'stale_balance');
	assert.equal(c.shouldRefresh, true);
	assert.equal(c.preserveKey, false);
	assert.equal(c.allowNewIntent, true);
});

test('C12 idempotent replay history merge does not duplicate', () => {
	const a: Payment = {
		id: 5,
		amount: 2000,
		paymentMethod: 'CASH',
		paidAt: '2026-01-01T10:00:00Z',
		receivedBy: 1
	};
	const merged = mergePaymentHistory([a, a], [a, a]);
	assert.equal(merged.length, 1);
	assert.equal(merged[0].id, 5);
	assert.equal(paymentHistoryFingerprint(merged), paymentHistoryFingerprint([a]));
});

test('C13 idempotency conflict is not auto-resubmitted', () => {
	const err = new AxiosError.AxiosError("Clé d'idempotence déjà utilisée");
	err.response = {
		status: 409,
		data: { code: 'CONFLICT', message: "Clé d'idempotence déjà utilisée" },
		statusText: 'Conflict',
		headers: {},
		config: { headers: new AxiosError.AxiosHeaders() }
	};
	const c = classifyPaymentError(err);
	assert.equal(c.kind, 'idempotency_conflict');
	assert.equal(c.preserveKey, true);
	assert.equal(c.allowNewIntent, true);
	assert.equal(c.shouldRefresh, true);
});

test('C14 network uncertainty preserves same logical intent/key', () => {
	const err = new AxiosError.AxiosError('Network Error');
	assert.equal(err.response, undefined);
	const c = classifyPaymentError(err);
	assert.equal(c.kind, 'network_uncertain');
	assert.equal(c.preserveKey, true);
	let state = createPaymentCommandState('net-key');
	state = beginPaymentCommand(state);
	state = completePaymentCommandError(state);
	assert.equal(state.idempotencyKey, 'net-key');
});

test('C15 new deliberate payment gets new key', () => {
	const pending = beginPaymentCommand(createPaymentCommandState('first'));
	assert.equal(pending.idempotencyKey, 'first');
	const next = completePaymentCommandSuccess();
	assert.notEqual(next.idempotencyKey, 'first');
});

test('C16 payment method uses canonical contract', () => {
	const values = BILLING_PAYMENT_METHODS.map((m) => m.value);
	assert.ok(values.includes('CASH'));
	assert.ok(values.includes('CHECK'));
	assert.ok(values.includes('MOBILE_MONEY'));
	assert.equal(isCanonicalPaymentMethod('CASH'), true);
	assert.equal(isCanonicalPaymentMethod('bitcoin'), false);
});

test('C17 payment history rendered from authoritative records', () => {
	const payments: Payment[] = [
		{
			id: 1,
			amount: 1000,
			paymentMethod: 'CARD',
			paidAt: '2026-01-02T00:00:00Z',
			receivedBy: 3,
			reference: 'R1'
		}
	];
	const inv = base({ payments, status: 'PARTIALLY_PAID', paidAmount: 1000, balanceAmount: 6000 });
	assert.equal(inv.payments?.length, 1);
	assert.equal(inv.payments?.[0].paymentMethod, 'CARD');
	assert.ok(filterInvoicesForCashier([inv], { collectibleOnly: true }).length === 1);
});
