import assert from 'node:assert/strict';
import test from 'node:test';
import type { GrcSecurityIncident } from '$lib/types/grc';
import {
	emptyIncidentForm,
	incidentAccess,
	incidentActions,
	incidentFormFrom,
	incidentPayload,
	incidentQuery,
	incidentSeverityLabel,
	incidentStatusLabel,
	incidentStatusOptions,
	simulateIncidentSession,
	validateIncidentForm
} from './incident-state.ts';

const now = new Date('2026-06-01T12:00:00Z');

const incident: GrcSecurityIncident = {
	id: 3,
	reference: 'INC-1',
	title: 'Perte d’accès',
	description: 'Texte libre',
	severity: 'HIGH',
	status: 'OPEN',
	detectedAt: '2026-05-01T10:00:00Z',
	occurredAt: null,
	resolvedAt: null,
	closedAt: null,
	riskId: 4,
	assetId: null,
	owningServiceId: null,
	ownerProfileId: null,
	createdBy: 1,
	updatedBy: 1,
	createdAt: '2026-05-01T10:05:00Z',
	updatedAt: '2026-05-01T10:05:00Z'
};

test('incident form rejects an incomplete create and a future detection', () => {
	const errors = validateIncidentForm(emptyIncidentForm(), false, now);
	assert.ok(errors.reference);
	assert.ok(errors.title);
	assert.ok(errors.severity);
	assert.ok(errors.detectedAt);

	const future = incidentFormFrom(incident);
	future.detectedAt = '2026-06-02T10:00';
	assert.match(validateIncidentForm(future, false, now).detectedAt ?? '', /futur/);

	const occurred = incidentFormFrom(incident);
	occurred.detectedAt = '2026-06-01T10:00';
	occurred.occurredAt = '2026-06-01T11:00';
	assert.match(validateIncidentForm(occurred, false, now).occurredAt ?? '', /détection/);
});

test('incident payload never sends a closure and create has no status', () => {
	const form = incidentFormFrom(incident);
	const created = incidentPayload(form, false);
	assert.equal('status' in created, false);
	assert.equal('resolvedAt' in created, false);
	assert.equal('closedAt' in created, false);
	assert.equal(created.reference, 'INC-1');

	form.status = 'INVESTIGATING';
	const updated = incidentPayload(form, true);
	assert.equal('status' in updated && updated.status, 'INVESTIGATING');
	assert.equal(incidentStatusOptions('RESOLVED').includes('CLOSED'), false);
	assert.ok(validateIncidentForm({ ...form, status: 'CLOSED' }, true, now, 'RESOLVED').status);
	assert.equal(
		validateIncidentForm({ ...form, status: 'RESOLVED' }, true, now, 'RESOLVED').status,
		undefined
	);
});

test('incident query keeps filters parent-safe and paginated', () => {
	const query = incidentQuery({
		search: ' alpha ',
		status: 'OPEN',
		severity: 'HIGH',
		riskId: '4',
		assetId: '0',
		page: 2
	});
	assert.deepEqual(query, {
		page: 2,
		limit: 20,
		search: 'alpha',
		status: 'OPEN',
		severity: 'HIGH',
		riskId: 4
	});
});

test('incident close is separate from update, including for a wildcard', () => {
	const wildcard = incidentAccess(['*']);
	assert.equal(wildcard.close, true);
	assert.equal(incidentActions({ status: 'RESOLVED' }, wildcard).close, true);
	assert.equal(incidentActions({ status: 'OPEN' }, wildcard).close, false);
	assert.equal(
		incidentActions({ status: 'RESOLVED' }, incidentAccess(['grc.incident.update'])).close,
		false
	);
	assert.equal(incidentActions({ status: 'CLOSED' }, wildcard).edit, false);
	for (const severity of Object.keys(incidentSeverityLabel))
		assert.ok(incidentSeverityLabel[severity]);
	for (const status of Object.keys(incidentStatusLabel)) assert.ok(incidentStatusLabel[status]);
});

test('simulated incident session covers registry, lifecycle and permissions', () => {
	const denied = simulateIncidentSession(['grc.risk.read']);
	assert.equal(denied.access.read, false);
	assert.equal(denied.closeWhenResolved, false);
	assert.equal(denied.closedInOptions, false);
	assert.deepEqual(denied.query, {
		page: 2,
		limit: 20,
		search: 'alpha',
		status: 'OPEN',
		severity: 'HIGH',
		riskId: 4,
		assetId: 8
	});
	assert.ok(denied.createErrors.reference);
	assert.deepEqual(denied.ready, {});
	assert.equal('status' in denied.created, false);

	const session = simulateIncidentSession(['grc.incident.read', 'grc.incident.close']);
	assert.deepEqual(
		session.trace.map((step) => step.status),
		['INVESTIGATING', 'CONTAINED', 'RESOLVED', 'INVESTIGATING', 'RESOLVED']
	);
	assert.equal(
		session.trace.every((step) => step.allowed),
		true
	);
	assert.equal(session.closeWhileOpen, false);
	assert.equal(session.closeWhenResolved, true);
	assert.equal(session.labels.severity, true);
	assert.equal(session.labels.status, true);
});
