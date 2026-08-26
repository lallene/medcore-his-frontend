import assert from 'node:assert/strict';
import test from 'node:test';
import {
	allowedNext,
	statusLabels,
	supportAssigneeLabel,
	supportQueueColumns,
	supportRequesterLabel,
	supportServiceLabel
} from './state.ts';

test('closed tickets cannot resume without reopen', () =>
	assert.deepEqual(allowedNext('CLOSED'), []));
test('resolved ticket supports explicit reopen', () =>
	assert.deepEqual(allowedNext('RESOLVED'), ['CLOSED', 'REOPENED']));
test('labels cover waiting states', () =>
	assert.equal(statusLabels.WAITING_USER, 'Attente utilisateur'));

test('support queue keeps requester service assignee and core columns', () => {
	assert.deepEqual(
		[...supportQueueColumns],
		['Référence', 'Sujet', 'Demandeur', 'Service', 'Priorité', 'Statut', 'Assigné', 'SLA']
	);
	for (const required of [
		'Demandeur',
		'Service',
		'Assigné',
		'Référence',
		'Sujet',
		'Priorité',
		'Statut',
		'SLA'
	]) {
		assert.ok(supportQueueColumns.includes(required as (typeof supportQueueColumns)[number]));
	}
});

test('support queue cells fall back without inventing values', () => {
	assert.equal(supportRequesterLabel({ requesterName: '' }), '—');
	assert.equal(supportServiceLabel({ serviceName: '   ' }), '—');
	assert.equal(supportAssigneeLabel({ assignedName: '', assignedQueue: 'N1' }), 'N1');
	assert.equal(supportAssigneeLabel({ assignedName: '', assignedQueue: '' }), '—');
});
