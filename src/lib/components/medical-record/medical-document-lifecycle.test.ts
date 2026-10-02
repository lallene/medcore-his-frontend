import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	medicalDocumentRemoveAriaLabel,
	medicalDocumentRemoveTitle
} from './medical-document-lifecycle.ts';

describe('LOT28E-C2-B MedicalDocument lifecycle UI', () => {
	it('F01 unsaved remove copy is discard', () => {
		assert.equal(medicalDocumentRemoveTitle(undefined), 'Retirer');
		assert.match(
			medicalDocumentRemoveAriaLabel(undefined, 0),
			/Retirer le document non enregistré/
		);
	});

	it('F03 persisted remove copy is archive', () => {
		assert.equal(medicalDocumentRemoveTitle(14), 'Archiver');
		assert.match(medicalDocumentRemoveAriaLabel(14, 0), /Archiver le document/);
		assert.doesNotMatch(medicalDocumentRemoveAriaLabel(14, 0), /Supprimer/);
	});
});
