export interface InsuranceCompany {
	id: number;
	code: string;
	name: string;
	description?: string;
	phone?: string;
	email?: string;
	city?: string;
	country?: string;
	isActive: boolean;
}

export interface CompanyRow extends Record<string, unknown> {
	id: number;
	code: string;
	name: string;
	city: string;
	status: string;
}
