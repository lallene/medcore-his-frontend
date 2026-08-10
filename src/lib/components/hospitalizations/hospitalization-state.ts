import type {
	Hospitalization,
	HospitalizationAction,
	HospitalizationStatus
} from '../../types/hospitalization.ts';

export function availableHospitalizationActions(
	status: HospitalizationStatus
): HospitalizationAction[] {
	if (status === 'PLANNED') return ['admit', 'cancel'];
	if (status === 'ADMITTED') return ['discharge'];
	return [];
}

export function deduplicateHospitalizations(items: Hospitalization[]): Hospitalization[] {
	const byConsultation = new Map<number, Hospitalization>();
	for (const item of items)
		if (!byConsultation.has(item.sourceConsultationId))
			byConsultation.set(item.sourceConsultationId, item);
	return [...byConsultation.values()].sort(
		(a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id
	);
}

export function hospitalizationStatusLabel(status: HospitalizationStatus): string {
	return { PLANNED: 'Planifiée', ADMITTED: 'Admise', DISCHARGED: 'Sortie', CANCELLED: 'Annulée' }[
		status
	];
}

export function consultationHospitalizationDecision(
	recommended: boolean,
	existing: Hospitalization | null
): 'none' | 'create' | 'open' {
	if (!recommended) return 'none';
	return existing ? 'open' : 'create';
}
