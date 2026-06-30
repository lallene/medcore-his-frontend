import { api } from '$lib/api/client';
import type { ApiResponse } from '$lib/types/api';
import type { LoginResponse } from '$lib/types/auth';

export interface LoginPayload {
	email: string;
	password: string;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
	const response = await api.post<ApiResponse<LoginResponse>>('/api/auth/login', payload);

	return response.data.data;
}
