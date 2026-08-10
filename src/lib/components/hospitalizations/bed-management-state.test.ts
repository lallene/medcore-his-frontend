import assert from 'node:assert/strict';
import test from 'node:test';
import {
	activeAssignment,
	administrativeBedStatuses,
	allowedBedActions,
	availableBeds,
	bedAdminActions,
	bedAdminError,
	bedFormDraft,
	bedTypeOptions,
	bedIndicators,
	bedStatusLabel,
	canManageBeds,
	canManageRooms,
	groupRooms,
	generateRoomCode,
	generateBedCode,
	roomFormDraft,
	roomAddBedAction,
	uniqueAssignments
} from './bed-management-state.ts';
import type { Bed, BedAssignment, BedOverview, Room } from '../../types/bed-management.ts';

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

const room = (id: number, overrides: Partial<Room> = {}) =>
	({
		id,
		code: `R${id}`,
		name: `Chambre ${id}`,
		department: 'Médecine',
		floor: '1',
		roomType: 'STANDARD',
		isActive: true,
		bedCount: 0,
		availableBedCount: 0,
		occupiedBedCount: 0,
		reservedBedCount: 0,
		outOfServiceBedCount: 0,
		...overrides
	}) as Room;
const overview = (
	id: number,
	roomValue: Room,
	status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'OUT_OF_SERVICE' = 'AVAILABLE'
) =>
	({
		bed: {
			id,
			code: `B${id}`,
			label: `Lit ${id}`,
			roomId: roomValue.id,
			room: roomValue,
			bedType: 'STANDARD',
			status,
			isActive: true
		} as Bed,
		activeAssignment: null
	}) as BedOverview;

test('rooms without beds remain visible and filters group by service and status', () => {
	const empty = room(1),
		filled = room(2, { department: 'Urgences' }),
		bed = overview(1, filled);
	const groups = groupRooms([empty, filled], [bed]);
	assert.equal(groups.Médecine[0].beds.length, 0);
	assert.equal(groups.Urgences[0].beds.length, 1);
	assert.deepEqual(Object.keys(groupRooms([empty, filled], [bed], 'urgence', 'AVAILABLE')), [
		'Urgences'
	]);
	assert.deepEqual(groupRooms([empty], [], '', 'AVAILABLE'), {});
	assert.deepEqual(
		groupRooms([empty, filled], [bed], '', '', '1', 'STANDARD').Médecine[0].room.id,
		1
	);
});

test('room codes use deterministic abbreviations and the next matching sequence', () => {
	const rooms = [
		room(1, { code: 'URG-RDC-STD-001' }),
		room(2, { code: 'URG-RDC-STD-003' }),
		room(3, { code: 'MED-E1-ISO-001' })
	];
	assert.equal(generateRoomCode('Urgences', 'RDC', 'STANDARD', rooms), 'URG-RDC-STD-004');
	assert.equal(generateRoomCode('Médecine', '1', 'ISOLEMENT', rooms), 'MED-E1-ISO-002');
	assert.equal(generateRoomCode('', '', 'STANDARD', rooms), '');
});
test('bed codes start at L01 and increment only inside the selected room', () => {
	const firstRoom = room(1, { code: 'CHI-RDC-STD-001' }),
		secondRoom = room(2, { code: 'MED-E1-STD-001' });
	const beds = [overview(1, firstRoom), overview(2, firstRoom), overview(3, secondRoom)];
	beds[0].bed.code = 'CHI-RDC-STD-001-L01';
	beds[1].bed.code = 'CHI-RDC-STD-001-L02';
	beds[2].bed.code = 'MED-E1-STD-001-X';
	assert.equal(generateBedCode(1, [firstRoom, secondRoom], beds), 'CHI-RDC-STD-001-L03');
	assert.equal(generateBedCode(2, [firstRoom, secondRoom], beds), 'MED-E1-STD-001-L01');
	assert.equal(generateBedCode(null, [firstRoom], beds), '');
});
test('bed selects expose only supported types and safe administrative statuses', () => {
	assert.deepEqual(bedTypeOptions, [
		'STANDARD',
		'PEDIATRIC',
		'MATERNITY',
		'ICU',
		'EMERGENCY',
		'ISOLATION'
	]);
	assert.deepEqual(administrativeBedStatuses, ['AVAILABLE', 'OUT_OF_SERVICE']);
	assert.equal(administrativeBedStatuses.includes('OCCUPIED' as never), false);
	assert.equal(administrativeBedStatuses.includes('RESERVED' as never), false);
});
test('room counters drive the six indicators', () =>
	assert.deepEqual(
		bedIndicators([
			room(1, {
				bedCount: 4,
				availableBedCount: 1,
				occupiedBedCount: 1,
				reservedBedCount: 1,
				outOfServiceBedCount: 1
			}),
			room(2, { isActive: false, bedCount: 0 })
		]),
		{ activeRooms: 1, total: 4, available: 1, occupied: 1, reserved: 1, outOfService: 1 }
	));
test('refreshed room counters immediately include a newly created available bed', () => {
	const before = room(1);
	const after = room(1, { bedCount: 1, availableBedCount: 1 });
	assert.equal(bedIndicators([before]).total, 0);
	assert.deepEqual(bedIndicators([after]), {
		activeRooms: 1,
		total: 1,
		available: 1,
		occupied: 0,
		reserved: 0,
		outOfService: 0
	});
});
test('administration actions protect occupied and reserved beds', () => {
	assert.equal(bedAdminActions(overview(1, room(1))).outOfService, true);
	assert.equal(bedAdminActions(overview(2, room(1), 'OUT_OF_SERVICE')).restore, true);
	for (const status of ['OCCUPIED', 'RESERVED'] as const) {
		const actions = bedAdminActions(overview(3, room(1), status));
		assert.equal(actions.toggleActive, false);
		assert.equal(actions.outOfService, false);
	}
});
test('forms preload edit values and choose an active room for creation', () => {
	const r = room(4, { code: 'U01', name: 'Urgences' });
	assert.equal(roomFormDraft(r).code, 'U01');
	assert.equal(roomFormDraft(null).roomType, 'STANDARD');
	const bed = overview(7, r, 'OUT_OF_SERVICE').bed;
	assert.deepEqual(bedFormDraft(bed, [r]), {
		code: 'B7',
		label: 'Lit 7',
		roomId: '4',
		bedType: 'STANDARD',
		isActive: true,
		status: 'OUT_OF_SERVICE'
	});
	assert.equal(bedFormDraft(null, [room(1, { isActive: false }), r]).roomId, '4');
	assert.equal(bedFormDraft(null, [room(1), r], 4).roomId, '4');
});

test('room add-bed action follows beds.manage and room activity', () => {
	assert.deepEqual(roomAddBedAction(true, room(1)), { visible: true, enabled: true });
	assert.deepEqual(roomAddBedAction(false, room(1)), { visible: false, enabled: false });
	assert.deepEqual(roomAddBedAction(true, room(2, { isActive: false })), {
		visible: true,
		enabled: false
	});
});
test('permissions hide management and API conflicts keep their message', () => {
	assert.equal(canManageBeds({ role: 'admin' }), true);
	assert.equal(canManageBeds({ permissions: ['beds.manage'] }), true);
	assert.equal(canManageRooms({ permissions: ['rooms.manage'] }), true);
	assert.equal(canManageBeds({ permissions: ['rooms.manage'] }), false);
	assert.equal(canManageBeds({ permissions: ['rooms.read', 'beds.read'] }), false);
	assert.equal(
		bedAdminError({ response: { status: 409, data: { error: { message: 'code déjà utilisé' } } } }),
		'code déjà utilisé'
	);
	assert.equal(bedAdminError({ response: { status: 403, data: {} } }), 'Action non autorisée.');
});
