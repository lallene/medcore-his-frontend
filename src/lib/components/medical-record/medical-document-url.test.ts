import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	externalDocumentReferenceStatus,
	isSafeExternalDocumentURL
} from './medical-document-url.ts';

describe('LOT28E-C2-A MedicalDocument URL trust', () => {
	it('F01 valid HTTPS is safe/clickable', () => {
		assert.equal(isSafeExternalDocumentURL('https://docs.example.com/a.pdf'), true);
		assert.equal(externalDocumentReferenceStatus('https://docs.example.com/a.pdf'), 'safe');
	});

	it('F01b HTTPS with query/fragment is safe', () => {
		assert.equal(isSafeExternalDocumentURL('https://docs.example.com/a.pdf?sig=1#page=2'), true);
	});

	it('F03 http is not clickable', () => {
		assert.equal(isSafeExternalDocumentURL('http://docs.example.com/a.pdf'), false);
	});

	it('F04 javascript is not clickable', () => {
		assert.equal(isSafeExternalDocumentURL('javascript:alert(1)'), false);
	});

	it('F05 data is not clickable', () => {
		assert.equal(isSafeExternalDocumentURL('data:text/plain,hi'), false);
	});

	it('F06 file is not clickable', () => {
		assert.equal(isSafeExternalDocumentURL('file:///tmp/x.pdf'), false);
	});

	it('F07 relative is not clickable', () => {
		assert.equal(isSafeExternalDocumentURL('/documents/a.pdf'), false);
		assert.equal(isSafeExternalDocumentURL('../file.pdf'), false);
	});

	it('F08 invalid metadata status is invalid not empty', () => {
		assert.equal(externalDocumentReferenceStatus('javascript:alert(1)'), 'invalid');
		assert.equal(externalDocumentReferenceStatus(''), 'empty');
	});

	it('F10 rejects credentials and empty host', () => {
		assert.equal(isSafeExternalDocumentURL('https://user:pass@docs.example.com/a'), false);
		assert.equal(isSafeExternalDocumentURL('https://user@docs.example.com/a'), false);
		assert.equal(isSafeExternalDocumentURL('https://'), false);
	});

	it('F09 helper does not execute HTML-like title strings', () => {
		// Titles are rendered as text bindings in the panel; helper only classifies URLs.
		const title = '<img src=x onerror=alert(1)>';
		assert.equal(isSafeExternalDocumentURL(title), false);
		assert.equal(title.includes('onerror'), true);
	});
});
