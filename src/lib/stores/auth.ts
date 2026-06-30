import { writable } from 'svelte/store';
import type { User } from '$lib/types/auth';

export const token = writable<string | null>(null);
export const user = writable<User | null>(null);

export function setSession(sessionToken: string, sessionUser: User) {
	token.set(sessionToken);
	user.set(sessionUser);

	if (typeof localStorage !== 'undefined') {
		localStorage.setItem('medcore_token', sessionToken);
		localStorage.setItem('medcore_user', JSON.stringify(sessionUser));
	}
}

export function clearSession() {
	token.set(null);
	user.set(null);

	if (typeof localStorage !== 'undefined') {
		localStorage.removeItem('medcore_token');
		localStorage.removeItem('medcore_user');
	}
}
