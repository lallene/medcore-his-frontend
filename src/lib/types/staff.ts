export interface StaffProfile {
	id: number;
	userId: number;
	name: string;
	email: string;
	legacyRole: string;
	employeeCode: string;
	jobTitle: string;
	primaryDepartment: string;
	professionalNumber: string;
	active: boolean;
	functions: string[];
	specialties: string[];
	capabilities: string[];
	effectivePermissions: string[];
}
export interface StaffPage {
	items: StaffProfile[];
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}
export interface StaffCatalog {
	functions: Record<string, string>;
	specialties: Record<string, string>;
	capabilities: Record<string, string>;
	matrix: { code: string; label: string; permissions: string[] }[];
}
export interface StaffUserOption {
	id: number;
	name: string;
	email: string;
	hasProfile: boolean;
}
export interface StaffAuditEvent {
	id: number;
	action: string;
	dimension: string;
	value: string;
	actorId: number;
	createdAt: string;
}
export interface StaffPayload {
	userId: number;
	employeeCode: string;
	jobTitle: string;
	primaryDepartment: string;
	professionalNumber: string;
	active: boolean;
	functions: string[];
	specialties: string[];
	capabilities: string[];
}
