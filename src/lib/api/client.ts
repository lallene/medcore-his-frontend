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
