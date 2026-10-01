import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';

import { consultationOccUserMessage, isConsultationOccConflict } from './consultation-occ';

describe('consultation OCC helpers (LOT28B)', () => {
	it('detects 409 conflict from axios error', () => {
		const err = new axios.AxiosError('conflict');
		err.response = { status: 409, data: { error: 'état de la consultation obsolète' } } as never;
		assert.equal(isConsultationOccConflict(err), true);
		assert.match(consultationOccUserMessage(err, 'x'), /obsolète|actualisées/i);
	});

	it('ignores non-409 errors', () => {
		const err = new axios.AxiosError('bad');
		err.response = { status: 400, data: { error: 'validation' } } as never;
		assert.equal(isConsultationOccConflict(err), false);
	});

	it('update payload contract includes expectedVersion', () => {
		const payload = {
			expectedVersion: 3,
			diagnosis: 'x'
		};
		assert.equal(typeof payload.expectedVersion, 'number');
		assert.ok(payload.expectedVersion >= 1);
	});
});
