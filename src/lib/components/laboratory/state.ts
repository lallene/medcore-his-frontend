import type {
	LaboratoryFlag,
	LaboratoryResultInput,
	LaboratoryStatus
} from '$lib/types/laboratory';
export const laboratoryStatuses: LaboratoryStatus[] = [
	'ORDERED',
	'SAMPLE_PENDING',
	'SAMPLE_COLLECTED',
	'IN_PROGRESS',
	'RESULT_ENTERED',
	'VALIDATED',
	'CANCELLED',
	'REJECTED'
];
export const laboratorySampleTypes = [
	'Sang',
	'Urine',
	'Selles',
	'Prélèvement nasal',
	'Autre'
] as const;
const biologicalCategories = new Set([
	'laboratoire',
	'biologie',
	'biochimie',
	'hématologie',
	'hematologie',
	'microbiologie',
	'immunologie',
	'parasitologie'
]);
export function isLaboratoryCategory(category: string): boolean {
	return biologicalCategories.has(category.trim().toLocaleLowerCase('fr'));
}
export function laboratoryStatusLabel(status: LaboratoryStatus): string {
	return (
		{
			ORDERED: 'Prescrit',
			SAMPLE_PENDING: 'Prélèvement attendu',
			SAMPLE_COLLECTED: 'Prélevé',
			IN_PROGRESS: 'En analyse',
			RESULT_ENTERED: 'Résultat saisi',
			VALIDATED: 'Validé',
			CANCELLED: 'Annulé',
			REJECTED: 'Rejeté'
		} as Record<LaboratoryStatus, string>
	)[status];
}
export function computeLaboratoryFlag(input: LaboratoryResultInput): LaboratoryFlag {
	const value = Number(input.value);
	if (!Number.isFinite(value)) return 'NORMAL';
	if (input.criticalMin !== null && value < input.criticalMin) return 'CRITICAL';
	if (input.criticalMax !== null && value > input.criticalMax) return 'CRITICAL';
	if (input.referenceMin !== null && value < input.referenceMin) return 'LOW';
	if (input.referenceMax !== null && value > input.referenceMax) return 'HIGH';
	return 'NORMAL';
}
export function canMutateLaboratory(status: LaboratoryStatus): boolean {
	return status !== 'VALIDATED' && status !== 'CANCELLED';
}
export function hasLaboratoryPermission(
	claims: { role?: string; permissions?: string[] } | null,
	permission: string
): boolean {
	return Boolean(
		claims &&
		(claims.role === 'admin' ||
			claims.permissions?.includes('*') ||
			claims.permissions?.includes(permission))
	);
}
