export interface ApiResponse<T> {
	success: boolean;
	message: string;
	data: T;
	timestamp: string;
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
