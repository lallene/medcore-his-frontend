import { api } from './client';
import type { ApiResponse } from '$lib/types/api';
import type {
	Bed,
	BedAssignment,
	BedFilters,
	BedListResult,
	BedOverview,
	Room
} from '$lib/types/bed-management';

export async function listRooms(): Promise<Room[]> {
	return (await api.get<ApiResponse<Room[]>>('/api/rooms')).data.data;
}
export async function createRoom(
	payload: Pick<Room, 'code' | 'name' | 'department' | 'floor' | 'roomType'>
): Promise<Room> {
	return (await api.post<ApiResponse<Room>>('/api/rooms', payload)).data.data;
}
export async function updateRoom(
	id: number,
	payload: Partial<Pick<Room, 'name' | 'department' | 'floor' | 'roomType' | 'isActive'>>
): Promise<Room> {
	return (await api.put<ApiResponse<Room>>(`/api/rooms/${id}`, payload)).data.data;
}
export async function listBeds(filters: BedFilters = {}): Promise<BedListResult> {
	const r = await api.get<ApiResponse<BedOverview[], BedListResult['meta']>>('/api/beds', {
		params: filters
	});
	if (!r.data.meta) throw new Error('Pagination des lits absente.');
	return { data: r.data.data, meta: r.data.meta };
}
export async function createBed(payload: {
	roomId: number;
	code: string;
	label: string;
	bedType: string;
}): Promise<Bed> {
	return (await api.post<ApiResponse<Bed>>('/api/beds', payload)).data.data;
}
export async function updateBed(
	id: number,
	payload: Partial<Pick<Bed, 'roomId' | 'label' | 'bedType' | 'status' | 'isActive'>>
): Promise<Bed> {
	return (await api.put<ApiResponse<Bed>>(`/api/beds/${id}`, payload)).data.data;
}
export async function listBedAssignments(hospitalizationId: number): Promise<BedAssignment[]> {
	return (
		await api.get<ApiResponse<BedAssignment[]>>(
			`/api/hospitalizations/${hospitalizationId}/bed-assignments`
		)
	).data.data;
}
export async function assignBed(hospitalizationId: number, bedId: number): Promise<BedAssignment> {
	return (
		await api.post<ApiResponse<BedAssignment>>(
			`/api/hospitalizations/${hospitalizationId}/bed-assignments`,
			{ bedId }
		)
	).data.data;
}
export async function transferBed(
	hospitalizationId: number,
	bedId: number
): Promise<BedAssignment> {
	return (
		await api.post<ApiResponse<BedAssignment>>(
			`/api/hospitalizations/${hospitalizationId}/transfer`,
			{ bedId }
		)
	).data.data;
}
export async function releaseBed(hospitalizationId: number): Promise<BedAssignment> {
	return (
		await api.post<ApiResponse<BedAssignment>>(
			`/api/hospitalizations/${hospitalizationId}/release-bed`,
			{}
		)
	).data.data;
}
