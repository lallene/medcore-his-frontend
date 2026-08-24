export interface User {
	id: number;
	name: string;
	email: string;
	role: string;
	functions?: string[];
	specialties?: string[];
	capabilities?: string[];
}

export interface LoginResponse {
	token: string;
	user: User;
}
