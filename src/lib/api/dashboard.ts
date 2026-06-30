import { api } from '$lib/api/client';
import type { ApiResponse } from '$lib/types/api';
import type { Dashboard } from '$lib/types/dashboard';

export async function getDashboard(): Promise<Dashboard> {
	const response = await api.get<ApiResponse<Dashboard>>('/api/dashboard');

	return response.data.data;
}
