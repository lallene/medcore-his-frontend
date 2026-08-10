export interface ApiResponse<T, M = unknown> {
	success: boolean;
	message: string;
	data: T;
	meta?: M;
	timestamp?: string;
}

export interface ApiErrorDetail {
	code: string;
	message: string;
	details?: unknown;
}

export interface ApiErrorResponse {
	success: false;
	message?: string;
	error: ApiErrorDetail;
	timestamp: string;
}
