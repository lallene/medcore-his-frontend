/** LOT29E-B: one idempotency key per logical open/close command. */

export type SessionCommandPhase = 'idle' | 'pending' | 'error';

export type SessionCommandState = {
	phase: SessionCommandPhase;
	idempotencyKey: string;
};

export function newSessionIdempotencyKey(prefix: string): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return `${prefix}-${crypto.randomUUID()}`;
	}
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createSessionCommandState(prefix: string): SessionCommandState {
	return { phase: 'idle', idempotencyKey: newSessionIdempotencyKey(prefix) };
}

export function beginSessionCommand(state: SessionCommandState): SessionCommandState {
	const key = state.idempotencyKey || newSessionIdempotencyKey('cash');
	return { phase: 'pending', idempotencyKey: key };
}

export function completeSessionCommandSuccess(prefix: string): SessionCommandState {
	return { phase: 'idle', idempotencyKey: newSessionIdempotencyKey(prefix) };
}

export function completeSessionCommandError(state: SessionCommandState): SessionCommandState {
	return { phase: 'error', idempotencyKey: state.idempotencyKey };
}

export function isSessionSubmitDisabled(state: SessionCommandState): boolean {
	return state.phase === 'pending';
}
