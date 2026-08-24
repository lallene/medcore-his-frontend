import type { OrganizationDepartment, OrganizationService } from '../../types/organization';

export type ServiceCapability = 'consultation' | 'hospitalization' | 'beds' | '';
export function eligibleServices(
	services: OrganizationService[],
	capability: ServiceCapability,
	includeInactive = false
) {
	return services.filter(
		(service) =>
			(includeInactive || service.active) &&
			(!capability ||
				(capability === 'consultation'
					? service.supportsConsultation
					: capability === 'hospitalization'
						? service.supportsHospitalization
						: service.supportsBeds))
	);
}
export function organizationTree(departments: OrganizationDepartment[]) {
	return [...departments]
		.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'fr'))
		.map((department) => ({
			...department,
			services: [...department.services].sort(
				(a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'fr')
			)
		}));
}
