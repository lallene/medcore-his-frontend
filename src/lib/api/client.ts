import { PUBLIC_API_URL } from '$env/static/public';
import axios from 'axios';
import { get } from 'svelte/store';
import { token } from '$lib/stores/auth';

export const api = axios.create({
	baseURL: PUBLIC_API_URL,
	headers: {
		'Content-Type': 'application/json'
	}
});

api.interceptors.request.use((config) => {
	let currentToken = get(token);

	if (!currentToken && typeof localStorage !== 'undefined') {
		currentToken = localStorage.getItem('medcore_token');
	}

	if (currentToken) {
		config.headers.Authorization = `Bearer ${currentToken}`;
	}

	return config;
});

api.interceptors.response.use(
	(response) => response,
	(error) => {
		if (axios.isAxiosError(error)) {
			const status = error.response?.status;
			if (status === 403) {
				error.message = 'ACCESS_DENIED';
			} else if (status === 401) {
				error.message = 'UNAUTHORIZED';
			} else if (
				error.response?.data &&
				typeof error.response.data === 'object' &&
				'message' in error.response.data &&
				typeof (error.response.data as { message?: string }).message === 'string'
			) {
				error.message = (error.response.data as { message: string }).message;
			}
		}
		return Promise.reject(error);
	}
);
