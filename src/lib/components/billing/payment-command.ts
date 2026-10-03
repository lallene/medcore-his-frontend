/** LOT29B: one idempotency key per logical payment command (retry-safe). */

export type PaymentCommandPhase = 'idle' | 'pending' | 'error';

export type PaymentCommandState = {
	phase: PaymentCommandPhase;
	/** Stable across retries of the same logical payment; rotated after success. */
	idempotencyKey: string;
};

export function newPaymentIdempotencyKey(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `pay-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createPaymentCommandState(key = newPaymentIdempotencyKey()): PaymentCommandState {
	return { phase: 'idle', idempotencyKey: key };
}

/** Begin submit: enter pending; keep existing key (retry) or mint if missing. */
export function beginPaymentCommand(state: PaymentCommandState): PaymentCommandState {
	const key = state.idempotencyKey || newPaymentIdempotencyKey();
	return { phase: 'pending', idempotencyKey: key };
}

/** Success: clear pending and rotate key for the next distinct payment. */
export function completePaymentCommandSuccess(): PaymentCommandState {
	return { phase: 'idle', idempotencyKey: newPaymentIdempotencyKey() };
}

/** Failure / uncertain outcome: keep same key so retry is the same logical command. */
export function completePaymentCommandError(state: PaymentCommandState): PaymentCommandState {
	return { phase: 'error', idempotencyKey: state.idempotencyKey };
}

export function isPaymentSubmitDisabled(state: PaymentCommandState): boolean {
	return state.phase === 'pending';
}

/**
 * Pure helper for tests: simulate double-click / retry lifecycle without HTTP.
 * Returns the sequence of keys that would be sent.
 */
export function simulatePaymentSubmitKeys(opts: {
	initialKey: string;
	clicksWhilePending: number;
	retryAfterError: boolean;
	thenNewPaymentAfterSuccess: boolean;
}): string[] {
	let state = createPaymentCommandState(opts.initialKey);
	const sent: string[] = [];

	state = beginPaymentCommand(state);
	sent.push(state.idempotencyKey);
	for (let i = 0; i < opts.clicksWhilePending; i++) {
		if (isPaymentSubmitDisabled(state)) continue;
		state = beginPaymentCommand(state);
		sent.push(state.idempotencyKey);
	}

	if (opts.retryAfterError) {
		state = completePaymentCommandError(state);
		state = beginPaymentCommand(state);
		sent.push(state.idempotencyKey);
	} else {
		state = completePaymentCommandSuccess();
	}

	if (opts.thenNewPaymentAfterSuccess && state.phase === 'idle') {
		state = beginPaymentCommand(state);
		sent.push(state.idempotencyKey);
	}

	return sent;
}
