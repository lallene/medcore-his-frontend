import { api } from '$lib/api/client';
import type { ApiResponse } from '$lib/types/api';
import type { CreateVoucherPayload, InsuranceVoucher } from '$lib/types/voucher';

export async function createVoucher(payload: CreateVoucherPayload): Promise<InsuranceVoucher> {
	const response = await api.post<ApiResponse<InsuranceVoucher>>(
		'/api/insurance/vouchers',
		payload
	);
	return response.data.data;
}

export async function getVouchers(): Promise<InsuranceVoucher[]> {
	const response = await api.get<ApiResponse<InsuranceVoucher[]>>('/api/insurance/vouchers');
	return response.data.data;
}

export async function getVoucher(id: number): Promise<InsuranceVoucher> {
	const response = await api.get<ApiResponse<InsuranceVoucher>>(`/api/insurance/vouchers/${id}`);
	return response.data.data;
}
