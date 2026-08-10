import type { Hospitalization } from './hospitalization';

export type BedStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'OUT_OF_SERVICE';
export type AssignmentType = 'RESERVED' | 'OCCUPIED';
export interface Room {
	id: number;
	code: string;
	name: string;
	department: string;
	floor: string;
	roomType: string;
	isActive: boolean;
}
export interface Bed {
	id: number;
	roomId: number;
	room: Room;
	code: string;
	label: string;
	bedType: string;
	status: BedStatus;
	isActive: boolean;
}
export interface BedAssignment {
	id: number;
	hospitalizationId: number;
	hospitalization: Hospitalization;
	patientId: number;
	patient?: { id: number; nom: string; prenoms: string; codePatient: string };
	bedId: number;
	bed: Bed;
	assignedAt: string;
	releasedAt: string | null;
	assignmentType: AssignmentType;
	createdBy: number | null;
	updatedBy: number | null;
}
export interface BedOverview {
	bed: Bed;
	activeAssignment: BedAssignment | null;
}
export interface BedFilters {
	page?: number;
	limit?: number;
	department?: string;
	roomId?: number;
	status?: BedStatus | '';
	active?: boolean;
	available?: boolean;
}
export interface BedListResult {
	data: BedOverview[];
	meta: { page: number; limit: number; total: number; totalPages: number };
}
