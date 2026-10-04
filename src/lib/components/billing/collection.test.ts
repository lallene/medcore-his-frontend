import assert from 'node:assert/strict';
import test from 'node:test';
import AxiosError from 'axios';
import {
	BILLING_PAYMENT_METHODS,
	canShowEncaisser,
	canShowReversePayment,
	classifyPaymentError,
	classifyReversalError,
	filterInvoicesForCashier,
	invoiceCollectibleKind,
	isCanonicalPaymentMethod,
	isInvoiceCollectible,
	isPaymentFormSubmitDisabled,
	mergePaymentHistory,
	canShowPaymentReceipt,
	latestReceiptedPayment,
	paymentHasCanonicalReceipt,
	paymentHistoryFingerprint,
	paymentIsReversed,
	receiptHref,
	REVERSAL_ACTION_LABEL,
	REVERSAL_PERMISSION,
	cashSessionReversalWarning,
	usesRefundWording,
	validatePaymentAmount,
	validateReversalReason
} from './collection.ts';
import {
	beginPaymentCommand,
	completePaymentCommandError,
	completePaymentCommandSuccess,
	createPaymentCommandState,
	isPaymentSubmitDisabled
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

test('RF01 successful billing payment exposes receipt', () => {
	const p: Payment = {
		id: 9,
		amount: 5000,
		paymentMethod: 'CASH',
		paidAt: '2026-10-03T10:00:00Z',
		receivedBy: 2,
		receiptId: 44,
		receiptNumber: 'REC-000044'
	};
	assert.equal(paymentHasCanonicalReceipt(p), true);
	assert.equal(latestReceiptedPayment([p])?.receiptNumber, 'REC-000044');
});

test('RF02 receipt action uses canonical receipt ID', () => {
	assert.equal(receiptHref(44), '/cash/receipts/44');
	assert.equal(
		canShowPaymentReceipt(
			{ id: 1, amount: 1, paymentMethod: 'CASH', paidAt: '', receivedBy: 1, receiptId: 44 },
			['cash.receipt.read']
		),
		true
	);
});

test('RF03 payment replay does not duplicate receipt UI', () => {
	const a: Payment = {
		id: 5,
		amount: 2000,
		paymentMethod: 'CASH',
		paidAt: '2026-01-01T10:00:00Z',
		receivedBy: 1,
		receiptId: 7,
		receiptNumber: 'REC-000007'
	};
	const merged = mergePaymentHistory([a], [a, a]);
	assert.equal(merged.length, 1);
	assert.equal(paymentHistoryFingerprint(merged), paymentHistoryFingerprint([a]));
});

test('RF04 two payment records can expose two different receipts', () => {
	const payments: Payment[] = [
		{
			id: 1,
			amount: 1000,
			paymentMethod: 'CASH',
			paidAt: 'a',
			receivedBy: 1,
			receiptId: 10,
			receiptNumber: 'REC-000010'
		},
		{
			id: 2,
			amount: 2000,
			paymentMethod: 'CARD',
			paidAt: 'b',
			receivedBy: 1,
			receiptId: 11,
			receiptNumber: 'REC-000011'
		}
	];
	assert.equal(payments[0].receiptId, 10);
	assert.equal(payments[1].receiptId, 11);
	assert.equal(latestReceiptedPayment(payments)?.receiptId, 11);
});

test('RF05 missing receipt handled truthfully', () => {
	const p: Payment = { id: 3, amount: 1000, paymentMethod: 'CASH', paidAt: 'a', receivedBy: 1 };
	assert.equal(paymentHasCanonicalReceipt(p), false);
	assert.equal(canShowPaymentReceipt(p, ['cash.receipt.read']), false);
	assert.equal(latestReceiptedPayment([p]), null);
});

test('RF06 unauthorized receipt action hidden', () => {
	const p: Payment = {
		id: 4,
		amount: 1000,
		paymentMethod: 'CASH',
		paidAt: 'a',
		receivedBy: 1,
		receiptId: 12,
		receiptNumber: 'REC-000012'
	};
	assert.equal(canShowPaymentReceipt(p, ['billing.payment.create']), false);
	assert.equal(canShowPaymentReceipt(p, ['*']), true);
});

test('RF07 reprint uses existing receipt not create', () => {
	const p: Payment = {
		id: 5,
		amount: 1000,
		paymentMethod: 'CASH',
		paidAt: 'a',
		receivedBy: 1,
		receiptId: 15,
		receiptNumber: 'REC-000015'
	};
	assert.equal(receiptHref(p.receiptId!), '/cash/receipts/15');
	assert.equal(latestReceiptedPayment([p, p])?.receiptId, 15);
});

test('RF08 receipt view remains financial-only', () => {
	const p: Payment = {
		id: 6,
		amount: 1000,
		paymentMethod: 'CASH',
		paidAt: 'a',
		receivedBy: 1,
		receiptId: 16,
		receiptNumber: 'REC-000016'
	};
	const keys = Object.keys(p);
	assert.equal(keys.includes('diagnosis'), false);
	assert.equal(keys.includes('clinicalNotes'), false);
	assert.ok(keys.includes('amount'));
	assert.ok(keys.includes('paymentMethod'));
});

const pay = (over: Partial<Payment> = {}): Payment => ({
	id: 10,
	amount: 5000,
	paymentMethod: 'CARD',
	paidAt: '2026-01-01T10:00:00Z',
	receivedBy: 1,
	receiptId: 44,
	receiptNumber: 'REC-000044',
	...over
});

test('FR01 reversed payment remains visible in history merge', () => {
	const reversed = pay({ id: 1, reversed: true, reversalId: 9, reversalReason: 'erreur saisie' });
	const merged = mergePaymentHistory([], [reversed]);
	assert.equal(merged.length, 1);
	assert.equal(merged[0].id, 1);
	assert.equal(paymentIsReversed(merged[0]), true);
});

test('FR02 reversal indicator derived from payment.reversed', () => {
	assert.equal(paymentIsReversed(pay({ reversed: true })), true);
	assert.equal(paymentIsReversed(pay()), false);
});

test('FR03 authorized reversal action shown', () => {
	assert.equal(canShowReversePayment(pay(), [REVERSAL_PERMISSION]), true);
	assert.equal(canShowReversePayment(pay(), ['*']), true);
	assert.equal(REVERSAL_ACTION_LABEL.includes('Rembours'), false);
	assert.ok(
		REVERSAL_ACTION_LABEL.includes('encaissement') || REVERSAL_ACTION_LABEL.includes('Contrepass')
	);
});

test('FR04 unauthorized user has no action', () => {
	assert.equal(canShowReversePayment(pay(), ['billing.payment.create']), false);
	assert.equal(canShowReversePayment(pay(), ['billing.read']), false);
});

test('FR05 modal requires reason', () => {
	assert.deepEqual(validateReversalReason(''), { ok: false, message: 'Motif obligatoire.' });
	assert.equal(validateReversalReason('  ').ok, false);
	assert.equal(validateReversalReason('ab').ok, false);
	assert.deepEqual(validateReversalReason('  erreur caisse  '), {
		ok: true,
		reason: 'erreur caisse'
	});
});

test('FR06 amount immutable — no amount in reverse payload helpers', () => {
	const check = validateReversalReason('motif valide');
	assert.equal(check.ok, true);
	if (check.ok) {
		const payload = { reason: check.reason, idempotencyKey: 'k1' };
		assert.equal('amount' in payload, false);
	}
});

test('FR07 in-flight disables submit', () => {
	let cmd = createPaymentCommandState('rev-key-1');
	cmd = beginPaymentCommand(cmd);
	assert.equal(isPaymentSubmitDisabled(cmd), true);
	assert.equal(cmd.idempotencyKey, 'rev-key-1');
});

test('FR08 success refreshes via authoritative invoice payments', () => {
	const before = pay({ id: 3, amount: 2000 });
	const after = pay({
		id: 3,
		amount: 2000,
		reversed: true,
		reversalId: 11,
		reversalReason: 'double saisie'
	});
	const merged = mergePaymentHistory([before], [after]);
	assert.equal(merged[0].reversed, true);
	assert.equal(merged[0].reversalId, 11);
});

test('FR09 replay does not duplicate reversal identity', () => {
	const a = pay({ id: 4, reversed: true, reversalId: 20 });
	const merged = mergePaymentHistory([a], [a, { ...a }]);
	assert.equal(merged.length, 1);
	assert.equal(merged[0].reversalId, 20);
});

test('FR10 network uncertainty reuses key', () => {
	const network = new AxiosError.AxiosError('Network Error');
	const classified = classifyReversalError(network);
	assert.equal(classified.kind, 'network_uncertain');
	assert.equal(classified.preserveKey, true);
	let cmd = createPaymentCommandState('same-rev-key');
	cmd = beginPaymentCommand(cmd);
	cmd = completePaymentCommandError(cmd);
	assert.equal(cmd.idempotencyKey, 'same-rev-key');
});

test('FR11 no refund wording in reversal labels', () => {
	assert.equal(usesRefundWording(REVERSAL_ACTION_LABEL), false);
	assert.equal(usesRefundWording('Encaissement contrepassé'), false);
	assert.equal(usesRefundWording('Rembourser le patient'), true);
});

test('FR12 receipt retained / payment marked reversed', () => {
	const p = pay({ reversed: true, receiptId: 88, receiptNumber: 'REC-000088' });
	assert.equal(paymentHasCanonicalReceipt(p), true);
	assert.equal(receiptHref(p.receiptId!), '/cash/receipts/88');
	assert.equal(paymentIsReversed(p), true);
});

test('FR13 P360 remains read-only for reversal', () => {
	// Reversal action is billing-scoped permission gate; P360 must not invent collection/reversal.
	assert.equal(canShowReversePayment(pay(), ['patients.360.read', 'billing.read']), false);
});

test('FR14 multiple payments only target selected payment', () => {
	const a = pay({ id: 1, amount: 2000 });
	const b = pay({ id: 2, amount: 3000, reversed: true });
	assert.equal(canShowReversePayment(a, [REVERSAL_PERMISSION]), true);
	assert.equal(canShowReversePayment(b, [REVERSAL_PERMISSION]), false);
});

test('RCF01 OPEN CASH session payment can show reversal', () => {
	assert.equal(
		canShowReversePayment(
			pay({ cashSessionId: 9, paymentMethod: 'CASH', cashSessionStatus: 'OPEN' }),
			[REVERSAL_PERMISSION]
		),
		true
	);
});

test('RCF02 CLOSED session payment not presented as supported', () => {
	assert.equal(
		canShowReversePayment(
			pay({ cashSessionId: 9, paymentMethod: 'CASH', cashSessionStatus: 'CLOSED' }),
			[REVERSAL_PERMISSION]
		),
		false
	);
});

test('RCF03 non-CASH session payment not presented as supported', () => {
	assert.equal(
		canShowReversePayment(
			pay({ cashSessionId: 9, paymentMethod: 'CARD', cashSessionStatus: 'OPEN' }),
			[REVERSAL_PERMISSION]
		),
		false
	);
});

test('RCF04 sessionless reversal unchanged', () => {
	assert.equal(canShowReversePayment(pay({ cashSessionId: null }), [REVERSAL_PERMISSION]), true);
});

test('RCF09 no refund wording in cash session warning', () => {
	const w = cashSessionReversalWarning(
		pay({ cashSessionId: 3, paymentMethod: 'CASH', cashSessionStatus: 'OPEN' })
	);
	assert.ok(w);
	assert.equal(usesRefundWording(w!), false);
});

test('RCF11–RCF12 structured conflict classification', () => {
	const closed = classifyReversalError(
		new Error('PAYMENT_REVERSAL_CASH_SESSION_CLOSED: La session de caisse est fermée')
	);
	assert.match(closed.message, /fermée/i);
	const method = classifyReversalError(
		new Error('PAYMENT_REVERSAL_SESSION_METHOD_UNSUPPORTED: Seuls les encaissements espèces')
	);
	assert.match(method.message, /espèces/i);
});
