import { api } from '$lib/api/client';
import type { ApiResponse } from '$lib/types/api';
import type { InsuranceCompany } from '$lib/types/insurance';

export async function getInsuranceCompanies(): Promise<InsuranceCompany[]> {
	const response = await api.get<ApiResponse<InsuranceCompany[]>>('/api/insurance/companies');
	return response.data.data;
}

export async function getInsuranceCompany(id: number): Promise<InsuranceCompany> {
	const response = await api.get<ApiResponse<InsuranceCompany>>(`/api/insurance/companies/${id}`);
	return response.data.data;
}
