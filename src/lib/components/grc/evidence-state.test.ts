import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import type { GrcEvidence } from '$lib/types/grc';
import {
	emptyEvidenceFilters,
	emptyEvidenceForm,
	evidenceAccess,
	evidenceFormFrom,
	evidencePayload,
	evidenceQuery,
	evidenceStatusLabel,
	evidenceTypeLabel,
	evidenceValidityLabel,
	evidenceValidityTone,
	externalLink,
	hasActiveEvidenceFilters,
	implementationLabel,
	validateEvidenceForm
} from './evidence-state.ts';

const evidence: GrcEvidence = {
	id: 3,
	reference: 'EVD-001',
	title: 'Rapport de sauvegarde',
	description: 'Mensuel',
	controlImplementationId: 9,
	controlImplementation: {
		id: 9,
		controlId: 1,
		assetId: 7,
		status: 'PARTIAL',
		control: { id: 1, code: 'CTL-SAUV', name: 'Sauvegardes' },
		asset: { id: 7, code: 'APP-DPI', name: 'Dossier patient' }
	},
	type: 'REPORT',
	status: 'VALID',
	externalReference: 'GED-2026-0042',
	collectedAt: '2026-05-01T00:00:00Z',
	validFrom: '2026-05-01T00:00:00Z',
	expiresAt: '2026-12-31T00:00:00Z',
	ownerProfileId: null,
	owningServiceId: 2,
	expired: false,
	validity: 'VALID',
	createdBy: 1,
	updatedBy: 1,
	createdAt: '2026-05-01T10:00:00Z',
	updatedAt: '2026-05-02T10:00:00Z'
};

test('labels cover exactly the backend enums and validity states', () => {
	assert.deepEqual(Object.keys(evidenceTypeLabel), [
		'DOCUMENT',
		'CONFIGURATION',
		'LOG',
		'SCREENSHOT',
		'REPORT',
		'TEST_RESULT',
		'CERTIFICATE',
		'OTHER'
	]);
	assert.deepEqual(Object.keys(evidenceStatusLabel), ['DRAFT', 'VALID', 'REVOKED']);
	assert.deepEqual(Object.keys(evidenceValidityLabel), [
		'VALID',
		'EXPIRING_SOON',
		'EXPIRED',
		'INVALID'
	]);
	assert.deepEqual(Object.keys(evidenceValidityTone), Object.keys(evidenceValidityLabel));
});

test('the frontend never recomputes validity from dates', () => {
	const source = readFileSync(new URL('./evidence-state.ts', import.meta.url), 'utf8');
	assert.doesNotMatch(source, /Date\.now|new Date\(/, 'validity comes from the API only');
});

test('evidence permissions and related reads stay distinct', () => {
	const reader = evidenceAccess(['grc.evidence.read']);
	assert.equal(reader.read && !reader.manage && !reader.readAssessments, true);
	assert.equal(evidenceAccess(['grc.evidence.manage']).manage, true);
	assert.equal(evidenceAccess(['grc.assessment.update']).manage, false);
	assert.equal(Object.values(evidenceAccess(['*'])).every(Boolean), true);
});

test('registry query sends only the filters that are set', () => {
	assert.deepEqual(evidenceQuery(emptyEvidenceFilters()), { page: 1, limit: 20 });
	assert.deepEqual(
		evidenceQuery({
			search: ' rapport ',
			type: 'REPORT',
			status: 'VALID',
			validity: 'EXPIRING_SOON',
			controlImplementationId: 9,
			page: 2
		}),
		{
			page: 2,
			limit: 20,
			search: 'rapport',
			type: 'REPORT',
			status: 'VALID',
			validity: 'EXPIRING_SOON',
			controlImplementationId: 9
		}
	);
	assert.equal(hasActiveEvidenceFilters(emptyEvidenceFilters()), false);
	assert.equal(hasActiveEvidenceFilters({ ...emptyEvidenceFilters(), validity: 'EXPIRED' }), true);
});

test('document reference: link only for plain http(s) URLs, text otherwise', () => {
	assert.equal(externalLink('https://ged.example.org/docs/42'), 'https://ged.example.org/docs/42');
	assert.equal(externalLink('  http://intranet.local/doc  '), 'http://intranet.local/doc');
	assert.equal(externalLink('GED-2026-0042'), null);
	assert.equal(externalLink('javascript:alert(1)'), null);
	assert.equal(externalLink('file:///etc/passwd'), null);
	assert.equal(externalLink('https://user:secret@ged.example.org/x'), null);
	assert.equal(externalLink(''), null);
});

test('implementation label never invents a name', () => {
	assert.equal(implementationLabel(evidence), 'CTL-SAUV sur APP-DPI');
	assert.equal(
		implementationLabel({ ...evidence, controlImplementation: undefined }),
		'Implémentation n° 9'
	);
});

test('form validation mirrors the backend rules for UX only', () => {
	assert.deepEqual(Object.keys(validateEvidenceForm(emptyEvidenceForm())).sort(), [
		'controlImplementationId',
		'reference',
		'title',
		'type'
	]);
	const valid = evidenceFormFrom(evidence);
	assert.deepEqual(validateEvidenceForm(valid), {});
	assert.ok(validateEvidenceForm({ ...valid, reference: 'É'.repeat(61) }).reference);
	assert.deepEqual(validateEvidenceForm({ ...valid, reference: 'É'.repeat(60) }), {});
	assert.ok(validateEvidenceForm({ ...valid, title: 't'.repeat(221) }).title);
	assert.ok(
		validateEvidenceForm({ ...valid, externalReference: 'x'.repeat(501) }).externalReference
	);
	assert.ok(
		validateEvidenceForm({ ...valid, validFromDate: '2026-06-01', expiresDate: '2026-05-31' })
			.expiresDate
	);
	assert.ok(validateEvidenceForm({ ...valid, status: 'ARCHIVED' }).status);
	assert.equal(emptyEvidenceForm(9).controlImplementationId, 9);
});

test('payload carries no server-managed or computed field', () => {
	const payload = evidencePayload({
		...evidenceFormFrom(evidence),
		reference: ' evd-001 ',
		collectedDate: ''
	});
	assert.deepEqual(payload, {
		reference: 'evd-001',
		title: 'Rapport de sauvegarde',
		description: 'Mensuel',
		controlImplementationId: 9,
		type: 'REPORT',
		status: 'VALID',
		externalReference: 'GED-2026-0042',
		collectedAt: null,
		validFrom: '2026-05-01T00:00:00Z',
		expiresAt: '2026-12-31T00:00:00Z',
		ownerProfileId: null,
		owningServiceId: 2
	});
	for (const key of [
		'id',
		'createdBy',
		'updatedBy',
		'createdAt',
		'updatedAt',
		'validity',
		'expired'
	])
		assert.equal(key in payload, false, key);
});
