import type { Bed, BedAssignment, BedOverview, BedStatus, Room } from '$lib/types/bed-management';
export const bedStatusLabel = (status: BedStatus) =>
	({
		AVAILABLE: 'Disponible',
		OCCUPIED: 'Occupé',
		RESERVED: 'Réservé',
		OUT_OF_SERVICE: 'Hors service'
	})[status];
export const activeAssignment = (items: BedAssignment[]) =>
	items.find((item) => !item.releasedAt) ?? null;
export const uniqueAssignments = (items: BedAssignment[]) =>
	[...new Map(items.map((item) => [item.id, item])).values()].sort(
		(a, b) => Date.parse(b.assignedAt) - Date.parse(a.assignedAt)
	);
export const availableBeds = (items: BedOverview[]) =>
	items.filter(
		({ bed, activeAssignment }) =>
			bed.isActive && bed.room.isActive && bed.status === 'AVAILABLE' && !activeAssignment
	);
export function allowedBedActions(status: string, current: BedAssignment | null) {
	return {
		assign: (status === 'PLANNED' || status === 'ADMITTED') && !current,
		transfer: status === 'ADMITTED' && current?.assignmentType === 'OCCUPIED',
		release: (status === 'PLANNED' || status === 'ADMITTED') && !!current
	};
}

function canManage(claims: { role?: string; permissions?: string[] } | null, permission: string) {
	return Boolean(
		claims &&
		(claims.role === 'admin' ||
			claims.permissions?.includes('*') ||
			claims.permissions?.includes(permission))
	);
}
export const canManageRooms = (claims: { role?: string; permissions?: string[] } | null) =>
	canManage(claims, 'rooms.manage');
export const canManageBeds = (claims: { role?: string; permissions?: string[] } | null) =>
	canManage(claims, 'beds.manage');

export function bedAdminActions(entry: BedOverview) {
	const locked =
		entry.bed.status === 'OCCUPIED' ||
		entry.bed.status === 'RESERVED' ||
		Boolean(entry.activeAssignment);
	return {
		edit: true,
		toggleActive: !locked,
		outOfService: entry.bed.isActive && entry.bed.status === 'AVAILABLE' && !locked,
		restore: entry.bed.status === 'OUT_OF_SERVICE' && !locked
	};
}

export function bedIndicators(rooms: Room[]) {
	return rooms.reduce(
		(result, room) => ({
			activeRooms: result.activeRooms + (room.isActive ? 1 : 0),
			total: result.total + room.bedCount,
			available: result.available + room.availableBedCount,
			occupied: result.occupied + room.occupiedBedCount,
			reserved: result.reserved + room.reservedBedCount,
			outOfService: result.outOfService + room.outOfServiceBedCount
		}),
		{ activeRooms: 0, total: 0, available: 0, occupied: 0, reserved: 0, outOfService: 0 }
	);
}

export function groupRooms(
	rooms: Room[],
	beds: BedOverview[],
	department = '',
	status: BedStatus | '' = '',
	floor = '',
	roomType = ''
) {
	const needle = department.trim().toLocaleLowerCase('fr');
	return rooms
		.filter((room) => !needle || room.department.toLocaleLowerCase('fr').includes(needle))
		.filter((room) => !floor || room.floor === floor)
		.filter((room) => !roomType || room.roomType === roomType)
		.map((room) => ({
			room,
			beds: beds.filter(
				(entry) => entry.bed.roomId === room.id && (!status || entry.bed.status === status)
			)
		}))
		.filter((group) => !status || group.beds.length > 0)
		.reduce<Record<string, { room: Room; beds: BedOverview[] }[]>>((groups, group) => {
			(groups[group.room.department] ??= []).push(group);
			return groups;
		}, {});
}

export const roomServiceOptions = [
	'Urgences',
	'Médecine',
	'Chirurgie',
	'Maternité',
	'Pédiatrie',
	'Réanimation',
	'Cardiologie'
];
export const roomFloorOptions = [
	{ value: 'RDC', label: 'Rez-de-chaussée' },
	{ value: '1', label: '1er étage' },
	{ value: '2', label: '2e étage' },
	{ value: '3', label: '3e étage' },
	{ value: '4', label: '4e étage' }
];
export const roomTypeOptions = [
	{ value: 'STANDARD', label: 'Standard' },
	{ value: 'URGENCE', label: 'Urgence' },
	{ value: 'DOUBLE', label: 'Double' },
	{ value: 'ISOLEMENT', label: 'Isolement' },
	{ value: 'SOINS_INTENSIFS', label: 'Soins intensifs' }
];
export const bedTypeOptions = [
	'STANDARD',
	'PEDIATRIC',
	'MATERNITY',
	'ICU',
	'EMERGENCY',
	'ISOLATION'
];
export const administrativeBedStatuses = ['AVAILABLE', 'OUT_OF_SERVICE'] as const;

const knownAbbreviations: Record<string, string> = {
	urgences: 'URG',
	médecine: 'MED',
	medecine: 'MED',
	chirurgie: 'CHI',
	maternité: 'MAT',
	maternite: 'MAT',
	pédiatrie: 'PED',
	pediatrie: 'PED',
	réanimation: 'REA',
	reanimation: 'REA',
	cardiologie: 'CAR',
	RDC: 'RDC',
	'1': 'E1',
	'2': 'E2',
	'3': 'E3',
	'4': 'E4',
	STANDARD: 'STD',
	URGENCE: 'URG',
	DOUBLE: 'DBL',
	ISOLEMENT: 'ISO',
	SOINS_INTENSIFS: 'SI'
};
function abbreviation(value: string) {
	const normalized = value.trim();
	return (
		knownAbbreviations[normalized] ??
		knownAbbreviations[normalized.toLocaleLowerCase('fr')] ??
		normalized
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-zA-Z0-9]/g, '')
			.toUpperCase()
			.slice(0, 3)
	);
}
export function generateRoomCode(service: string, floor: string, roomType: string, rooms: Room[]) {
	if (!service || !floor || !roomType) return '';
	const prefix = `${abbreviation(service)}-${abbreviation(floor)}-${abbreviation(roomType)}`;
	const sequence =
		rooms.reduce((max, room) => {
			const match = room.code.match(new RegExp(`^${prefix}-(\\d+)$`, 'i'));
			return match ? Math.max(max, Number(match[1])) : max;
		}, 0) + 1;
	return `${prefix}-${String(sequence).padStart(3, '0')}`;
}

export function generateBedCode(roomId: number | null, rooms: Room[], beds: BedOverview[]) {
	const room = rooms.find((item) => item.id === roomId);
	if (!room) return '';
	const escaped = room.code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const sequence =
		beds
			.filter((entry) => entry.bed.roomId === room.id)
			.reduce((max, entry) => {
				const match = entry.bed.code.match(new RegExp(`^${escaped}-L(\\d+)$`, 'i'));
				return match ? Math.max(max, Number(match[1])) : max;
			}, 0) + 1;
	return `${room.code}-L${String(sequence).padStart(2, '0')}`;
}

export function roomFormDraft(room: Room | null) {
	return {
		code: room?.code ?? '',
		name: room?.name ?? '',
		department: room?.department ?? '',
		floor: room?.floor ?? '',
		roomType: room?.roomType ?? 'STANDARD',
		isActive: room?.isActive ?? true
	};
}

export function bedFormDraft(bed: Bed | null, rooms: Room[], preferredRoomId?: number | null) {
	return {
		code: bed?.code ?? '',
		label: bed?.label ?? '',
		roomId: String(bed?.roomId ?? preferredRoomId ?? rooms.find((room) => room.isActive)?.id ?? ''),
		bedType: bed?.bedType ?? 'STANDARD',
		isActive: bed?.isActive ?? true,
		status: bed?.status === 'OUT_OF_SERVICE' ? ('OUT_OF_SERVICE' as const) : ('AVAILABLE' as const)
	};
}

export function roomAddBedAction(canManage: boolean, room: Room) {
	return { visible: canManage, enabled: canManage && room.isActive };
}

export function bedAdminError(value: unknown) {
	if (typeof value === 'object' && value !== null && 'response' in value) {
		const response = (
			value as {
				response?: { data?: { error?: { message?: string }; message?: string }; status?: number };
			}
		).response;
		return (
			response?.data?.error?.message ||
			response?.data?.message ||
			(response?.status === 403 ? 'Action non autorisée.' : 'Erreur API.')
		);
	}
	return value instanceof Error ? value.message : 'Action impossible.';
}
