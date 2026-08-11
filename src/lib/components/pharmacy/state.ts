import type {
	MedicationFamily,
	PharmacyBatch,
	PresentationAvailability,
	StockStatus
} from '$lib/types/pharmacy';

export const stockStatusLabel = (status: StockStatus) =>
	({ AVAILABLE: 'Disponible', LOW_STOCK: 'Stock faible', OUT_OF_STOCK: 'Rupture' })[status];

export function sortAvailability(items: PresentationAvailability[]): PresentationAvailability[] {
	const rank: Record<StockStatus, number> = { AVAILABLE: 0, LOW_STOCK: 1, OUT_OF_STOCK: 2 };
	return [...items].sort(
		(a, b) =>
			rank[a.stockStatus] - rank[b.stockStatus] ||
			a.commercialName.localeCompare(b.commercialName, 'fr')
	);
}

export function groupMedicationCatalogue(items: PresentationAvailability[]) {
	const groups = new Map<string, PresentationAvailability[]>();
	for (const item of items) {
		const key = item.family || 'Autres';
		groups.set(key, [...(groups.get(key) ?? []), item]);
	}
	return groups;
}

export function canDispense(claims: { role?: string; permissions?: string[] } | null): boolean {
	return Boolean(
		claims &&
		(claims.role === 'admin' ||
			claims.permissions?.includes('*') ||
			claims.permissions?.includes('pharmacy.dispensation.create') ||
			claims.permissions?.includes('pharmacy.dispense'))
	);
}

export type BatchState = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'DEPLETED' | 'INACTIVE';
export function batchState(batch: PharmacyBatch, now = new Date()): BatchState {
	if (batch.quantityRemaining <= 0) return 'DEPLETED';
	if (!batch.isActive) return 'INACTIVE';
	if (!batch.expirationDate) return 'VALID';
	const expiration = new Date(batch.expirationDate);
	if (expiration < now) return 'EXPIRED';
	return expiration.getTime() - now.getTime() <= 90 * 86_400_000 ? 'EXPIRING_SOON' : 'VALID';
}

export function familyMetrics(families: MedicationFamily[], items: PresentationAvailability[]) {
	return families.map((family) => {
		const presentations = items.filter((item) => item.family === family.name);
		return {
			family,
			medications: new Set(presentations.map((item) => item.commercialName)).size,
			presentations: presentations.length,
			available: presentations.filter((item) => item.stockStatus === 'AVAILABLE').length,
			low: presentations.filter((item) => item.stockStatus === 'LOW_STOCK').length,
			out: presentations.filter((item) => item.stockStatus === 'OUT_OF_STOCK').length
		};
	});
}

export function movementLabel(type: string): string {
	return (
		(
			{
				BATCH_ENTRY: 'Entrée',
				DISPENSATION: 'Dispensation',
				ADJUSTMENT_IN: 'Ajustement entrant',
				ADJUSTMENT_OUT: 'Ajustement sortant',
				RETURN: 'Retour',
				LOSS: 'Perte',
				DAMAGE: 'Détérioration',
				EXPIRED: 'Expiration'
			} as Record<string, string>
		)[type] ?? type
	);
}
