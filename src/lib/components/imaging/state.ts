import type { ImagingModality, ImagingStatus } from '$lib/types/imaging';
export const imagingStatuses: ImagingStatus[] = [
	'ORDERED',
	'SCHEDULED',
	'IN_PROGRESS',
	'REPORT_DRAFTED',
	'VALIDATED',
	'CANCELLED'
];
export const imagingModalities: ImagingModality[] = [
	'XRAY',
	'ULTRASOUND',
	'CT',
	'MRI',
	'MAMMOGRAPHY',
	'OTHER'
];
export function isImagingCategory(category: string) {
	return category.trim().toLocaleLowerCase('fr') === 'imagerie';
}
export function imagingStatusLabel(status: ImagingStatus) {
	return (
		{
			ORDERED: 'Prescrit',
			SCHEDULED: 'Planifié',
			IN_PROGRESS: 'En cours',
			REPORT_DRAFTED: 'Compte rendu rédigé',
			VALIDATED: 'Validé',
			CANCELLED: 'Annulé'
		} as Record<ImagingStatus, string>
	)[status];
}
export function imagingModalityLabel(modality: ImagingModality) {
	return (
		{
			XRAY: 'Radiographie',
			ULTRASOUND: 'Échographie',
			CT: 'Scanner',
			MRI: 'IRM',
			MAMMOGRAPHY: 'Mammographie',
			OTHER: 'Autre'
		} as Record<ImagingModality, string>
	)[modality];
}
export function imagingActions(status: ImagingStatus) {
	return {
		schedule: status === 'ORDERED',
		start: status === 'ORDERED' || status === 'SCHEDULED',
		report: status === 'IN_PROGRESS' || status === 'REPORT_DRAFTED',
		validate: status === 'REPORT_DRAFTED',
		cancel: status === 'ORDERED' || status === 'SCHEDULED',
		readonly: status === 'VALIDATED' || status === 'CANCELLED'
	};
}
export function hasImagingPermission(
	claims: { role?: string; permissions?: string[] } | null,
	permission: string
) {
	return Boolean(
		claims &&
		(claims.role === 'admin' ||
			claims.permissions?.includes('*') ||
			claims.permissions?.includes(permission))
	);
}
