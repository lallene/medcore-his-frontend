import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { classifyDocumentsView } from './patient-360-documents-state.ts';

describe('LOT28E-C1 Documents view states', () => {
	it('D01 list when documents present', () => {
		assert.equal(classifyDocumentsView({ denied: false, error: '', documentCount: 2 }), 'list');
	});

	it('D02 empty when success with zero documents', () => {
		assert.equal(classifyDocumentsView({ denied: false, error: '', documentCount: 0 }), 'empty');
	});

	it('D03 denied is not empty', () => {
		assert.equal(classifyDocumentsView({ denied: true, error: '', documentCount: 0 }), 'denied');
	});

	it('D04 error is not empty', () => {
		assert.equal(
			classifyDocumentsView({
				denied: false,
				error: 'Consultations indisponibles.',
				documentCount: 0
			}),
			'error'
		);
	});

	it('denied wins over error and count', () => {
		assert.equal(classifyDocumentsView({ denied: true, error: 'x', documentCount: 5 }), 'denied');
	});
});
