export type ServiceType =
	| 'CLINICAL'
	| 'SURGICAL'
	| 'MATERNITY'
	| 'DIAGNOSTIC'
	| 'PHARMACY'
	| 'ADMINISTRATIVE'
	| 'FINANCIAL'
	| 'EMERGENCY'
	| 'OTHER';

export interface OrganizationService {
	id: number;
	departmentId: number;
	code: string;
	name: string;
	shortName: string;
	serviceType: ServiceType;
	active: boolean;
	clinical: boolean;
	supportsHospitalization: boolean;
	supportsConsultation: boolean;
	supportsBeds: boolean;
	sortOrder: number;
}
export interface OrganizationDepartment {
	id: number;
	code: string;
	name: string;
	description: string;
	active: boolean;
	sortOrder: number;
	services: OrganizationService[];
}
export interface OrganizationCatalog {
	departments: OrganizationDepartment[];
}
export type DepartmentPayload = Pick<
	OrganizationDepartment,
	'code' | 'name' | 'description' | 'active' | 'sortOrder'
>;
export type ServicePayload = Omit<OrganizationService, 'id'>;
