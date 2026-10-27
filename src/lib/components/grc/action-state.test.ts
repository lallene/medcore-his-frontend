import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import type { GrcAction } from '$lib/types/grc';
import {
	actionAccess,
	actionDueStateLabel,
	actionDueStateTone,
	actionFormFrom,
	actionPayload,
	actionPriorityLabel,
	actionQuery,
	actionStatusLabel,
	actionTargets,
	emptyActionFilters,
	emptyActionForm,
	hasActiveActionFilters,
	validateActionForm
} from './action-state.ts';

const action: GrcAction = {
	id: 5,
	reference: 'ACT-001',
	title: 'Mettre en place la redondance',
	description: 'Texte',
	controlImplementationId: 9,
	controlImplementation: {
		id: 9,
		controlId: 1,
		assetId: 7,
		status: 'PARTIAL',
		control: { id: 1, code: 'CTL-SAUV', name: 'Sauvegardes' },
		asset: { id: 7, code: 'APP-DPI', name: 'Dossier patient' }
	},
	riskId: 4,
	risk: { id: 4, reference: 'RISK-001', title: 'Perte de données', status: 'OPEN' },
	findingId: 3,
	finding: { id: 3, reference: 'FND-01', title: 'Absence de test', status: 'OPEN' },
	assigneeProfileId: 2,
	owningServiceId: null,
	priority: 'HIGH',
	status: 'IN_PROGRESS',
	dueAt: '2026-07-01T00:00:00Z',
	completedAt: null,
	overdue: false,
	dueState: 'DUE_SOON',
	createdBy: 1,
	updatedBy: 1,
	createdAt: '2026-06-01T10:00:00Z',
	updatedAt: '2026-06-02T10:00:00Z'
};

test('labels cover exactly the backend enums and due states', () => {
	assert.deepEqual(Object.keys(actionStatusLabel), [
		'OPEN',
		'IN_PROGRESS',
		'BLOCKED',
		'DONE',
		'CANCELLED'
	]);
	assert.deepEqual(Object.keys(actionPriorityLabel), ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
	assert.deepEqual(Object.keys(actionDueStateLabel), [
		'OVERDUE',
		'DUE_SOON',
		'UPCOMING',
		'NO_DUE_DATE',
		'CLOSED'
	]);
	assert.deepEqual(Object.keys(actionDueStateTone), Object.keys(actionDueStateLabel));
	// A delay is always written in text, never conveyed by color only.
	assert.equal(actionDueStateLabel.OVERDUE, 'En retard');
});

test('the frontend never recomputes the due state from dates', () => {
	const source = readFileSync(new URL('./action-state.ts', import.meta.url), 'utf8');
	assert.doesNotMatch(source, /Date\.now|new Date\(/, 'due state comes from the API only');
});

test('read, create and update stay distinct permissions', () => {
	const reader = actionAccess(['grc.action.read']);
	assert.equal(reader.read && !reader.create && !reader.update, true);
	assert.equal(actionAccess(['grc.action.create']).update, false);
	assert.equal(actionAccess(['grc.action.update']).create, false);
	assert.equal(actionAccess(['grc.finding.read', 'grc.risk.read']).read, false);
	assert.equal(Object.values(actionAccess(['*'])).every(Boolean), true);
});

test('registry query sends only the filters that are set', () => {
	assert.deepEqual(actionQuery(emptyActionFilters()), { page: 1, limit: 20 });
	assert.deepEqual(
		actionQuery({
			search: ' redond ',
			status: 'OPEN',
			priority: 'HIGH',
			dueState: 'OVERDUE',
			riskId: 4,
			findingId: 3,
			page: 2
		}),
		{
			page: 2,
			limit: 20,
			search: 'redond',
			status: 'OPEN',
			priority: 'HIGH',
			dueState: 'OVERDUE',
			riskId: 4,
			findingId: 3
		}
	);
	assert.equal(hasActiveActionFilters(emptyActionFilters()), false);
	assert.equal(hasActiveActionFilters({ ...emptyActionFilters(), dueState: 'DUE_SOON' }), true);
});

test('targets are described in text, never invented', () => {
	assert.deepEqual(actionTargets(action), [
		'CTL-SAUV sur APP-DPI',
		'Risque RISK-001',
		'Constat FND-01'
	]);
	assert.deepEqual(
		actionTargets({
			...action,
			controlImplementationId: null,
			risk: undefined,
			finding: undefined
		}),
		['Risque n° 4', 'Constat n° 3']
	);
});

test('form validation requires a target and mirrors backend limits', () => {
	assert.deepEqual(Object.keys(validateActionForm(emptyActionForm())).sort(), [
		'priority',
		'reference',
		'targets',
		'title'
	]);
	const valid = actionFormFrom(action);
	assert.deepEqual(validateActionForm(valid), {});
	assert.ok(
		validateActionForm({ ...valid, controlImplementationId: null, riskId: null, findingId: null })
			.targets
	);
	assert.deepEqual(
		validateActionForm({ ...valid, controlImplementationId: null, riskId: null }),
		{}
	);
	assert.ok(validateActionForm({ ...valid, reference: 'É'.repeat(61) }).reference);
	assert.ok(validateActionForm({ ...valid, title: 't'.repeat(221) }).title);
	assert.ok(validateActionForm({ ...valid, status: 'ARCHIVED' }).status);
	assert.equal(emptyActionForm({ findingId: 3 }).findingId, 3);
});

test('payload carries no server-managed or computed field and never forces completion', () => {
	const payload = actionPayload({
		...actionFormFrom(action),
		reference: ' act-001 ',
		status: 'DONE'
	});
	assert.deepEqual(payload, {
		reference: 'act-001',
		title: 'Mettre en place la redondance',
		description: 'Texte',
		controlImplementationId: 9,
		riskId: 4,
		findingId: 3,
		assigneeProfileId: 2,
		owningServiceId: null,
		priority: 'HIGH',
		status: 'DONE',
		dueAt: '2026-07-01T00:00:00Z',
		completedAt: null
	});
	for (const key of [
		'id',
		'createdBy',
		'updatedBy',
		'createdAt',
		'updatedAt',
		'dueState',
		'overdue'
	])
		assert.equal(key in payload, false, key);
});
