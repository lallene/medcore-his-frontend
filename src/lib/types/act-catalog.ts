export type ActCategory =
	'CONSULTATION' | 'LABORATORY' | 'IMAGING' | 'HOSPITALIZATION' | 'PROCEDURE' | 'OTHER';

export const ACT_CATEGORIES: ActCategory[] = [
	'CONSULTATION',
	'LABORATORY',
	'IMAGING',
	'HOSPITALIZATION',
	'PROCEDURE',
	'OTHER'
];

export interface ActCatalogEntry {
	id: number;
	code: string;
	label: string;
	description: string;
	category: ActCategory;
	basePrice: number;
	currency: string;
	billable: boolean;
	insuranceEligible: boolean;
	isActive: boolean;
	createdBy: number;
	updatedBy: number;
	createdAt: string;
	updatedAt: string;
}

export interface ActCatalogCreateRequest {
	code: string;
	label: string;
	description?: string;
	category: ActCategory;
	basePrice: number;
	currency?: string;
	billable?: boolean;
	insuranceEligible?: boolean;
	isActive?: boolean;
}

export interface ActCatalogUpdateRequest {
	label: string;
	description?: string;
	category: ActCategory;
	basePrice: number;
	currency?: string;
	billable?: boolean;
	insuranceEligible?: boolean;
	isActive?: boolean;
}

export interface ActCatalogPage {
	data: ActCatalogEntry[];
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export interface ActCatalogListParams {
	search?: string;
	category?: ActCategory | '';
	active?: boolean;
	page?: number;
	limit?: number;
}
