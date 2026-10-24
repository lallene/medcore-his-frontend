import { api } from '$lib/api/client';
import type { ApiResponse } from '$lib/types/api';
import type { Dashboard } from '$lib/types/dashboard';

export interface DashboardFilters {
	serviceId?: number;
	from?: string;
	to?: string;
}

export async function getDashboard(filters: DashboardFilters = {}): Promise<Dashboard> {
	const response = await api.get<ApiResponse<Dashboard>>('/api/dashboard', {
		params: filters
	});

	return response.data.data;
}
