import assert from 'node:assert/strict';
import test from 'node:test';
import {
	activeAssignment,
	allowedBedActions,
	availableBeds,
	bedStatusLabel,
	uniqueAssignments
} from './bed-management-state.ts';
import type { BedAssignment, BedOverview } from '../../types/bed-management.ts';

const assignment = (id: number, releasedAt: string | null = null) =>
	({
		id,
		assignedAt: `2026-08-0${id}T00:00:00Z`,
		releasedAt,
		assignmentType: 'OCCUPIED',
		bed: { id, room: { isActive: true } }
	}) as BedAssignment;
test('bed statuses have stable labels', () =>
	assert.deepEqual(
		['AVAILABLE', 'OCCUPIED', 'RESERVED', 'OUT_OF_SERVICE'].map((s) => bedStatusLabel(s as never)),
		['Disponible', 'Occupé', 'Réservé', 'Hors service']
	));
test('active assignment and history are stable and deduplicated', () => {
	const old = assignment(1, '2026-08-03T00:00:00Z'),
		current = assignment(2);
	assert.equal(activeAssignment([old, current])?.id, 2);
	assert.deepEqual(
		uniqueAssignments([old, current, current]).map((x) => x.id),
		[2, 1]
	);
});
test('availability rejects inactive, occupied and reserved beds', () => {
	const make = (
		status: string,
		active = true,
		roomActive = true,
		current: null | BedAssignment = null
	) =>
		({
			bed: { id: Math.random(), status, isActive: active, room: { isActive: roomActive } },
			activeAssignment: current
		}) as BedOverview;
	assert.equal(
		availableBeds([
			make('AVAILABLE'),
			make('OCCUPIED'),
			make('RESERVED'),
			make('AVAILABLE', false),
			make('AVAILABLE', true, false),
			make('AVAILABLE', true, true, assignment(9))
		]).length,
		1
	);
});
test('actions follow stay status and current assignment', () => {
	assert.deepEqual(allowedBedActions('PLANNED', null), {
		assign: true,
		transfer: false,
		release: false
	});
	assert.deepEqual(allowedBedActions('ADMITTED', assignment(1)), {
		assign: false,
		transfer: true,
		release: true
	});
	assert.deepEqual(allowedBedActions('DISCHARGED', null), {
		assign: false,
		transfer: false,
		release: false
	});
});
test('empty history has no active assignment', () => assert.equal(activeAssignment([]), null));
