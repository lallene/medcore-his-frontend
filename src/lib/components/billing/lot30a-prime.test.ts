import assert from 'node:assert/strict';
import test from 'node:test';
import AxiosError from 'axios';
import {
	CASH_SESSION_REQUIRED_CODE,
	CASH_SESSION_REQUIRED_MESSAGE,
	DEFAULT_SESSIONLESS_PAYMENT_METHOD,
	SESSIONLESS_PAYMENT_METHODS,
	backendErrorCode,
	classifyPaymentError,
	isSessionlessPaymentMethod
} from './collection.ts';
import { eligibleTariffsOf, resolveSelectedTariff } from './state.ts';
import type { BillableAct, Tariff } from '$lib/types/billing';

test('LOT30-A′ invoice page never offers sessionless CASH', () => {
	assert.equal(
		SESSIONLESS_PAYMENT_METHODS.some((m) => (m.value as string) === 'CASH'),
		false
	);
	assert.equal(isSessionlessPaymentMethod('CASH'), false);
	assert.equal(isSessionlessPaymentMethod('CARD'), true);
	assert.equal(DEFAULT_SESSIONLESS_PAYMENT_METHOD, 'CARD');
});

test('LOT30-A′ PAYMENT_CASH_SESSION_REQUIRED maps to an explicit cash-session error', () => {
	const err = new AxiosError.AxiosError('conflict');
	err.response = {
		status: 409,
		statusText: 'Conflict',
		headers: {},
		data: {
			success: false,
			message: 'x',
			error: { code: CASH_SESSION_REQUIRED_CODE, message: 'x' }
		},
		config: { headers: new AxiosError.AxiosHeaders() }
	};
	const out = classifyPaymentError(err);
	assert.equal(out.kind, 'cash_session_required');
	assert.equal(out.message, CASH_SESSION_REQUIRED_MESSAGE);
	assert.equal(out.allowNewIntent, false);
	assert.equal(backendErrorCode({ code: 'TOP' }), 'TOP');
	assert.equal(backendErrorCode(undefined), '');
});

const t = (id: number, unitPrice: number): Tariff =>
	({ id, unitPrice, label: `T${id}`, actType: 'CONSULTATION' }) as Tariff;

test('LOT30-A′ tariff choice is restricted to the server eligible set', () => {
	const act = {
		billableKey: 'CONSULTATION:1',
		tariff: t(1, 10000),
		eligibleTariffs: [t(1, 10000), t(2, 15000)]
	} as Pick<BillableAct, 'billableKey' | 'tariff' | 'eligibleTariffs'>;
	assert.deepEqual(
		eligibleTariffsOf(act).map((x) => x.id),
		[1, 2]
	);
	assert.equal(resolveSelectedTariff(act, {})?.id, 1);
	assert.equal(resolveSelectedTariff(act, { 'CONSULTATION:1': 2 })?.id, 2);
	// A tariff outside the eligible set is ignored client-side (backend rejects it anyway).
	assert.equal(resolveSelectedTariff(act, { 'CONSULTATION:1': 99 })?.id, 1);
	assert.equal(
		resolveSelectedTariff({ billableKey: 'x', tariff: null, eligibleTariffs: [] }, {}),
		null
	);
});
