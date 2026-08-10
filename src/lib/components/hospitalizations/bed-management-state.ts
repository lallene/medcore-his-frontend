import type { BedAssignment, BedOverview, BedStatus } from '$lib/types/bed-management';
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
