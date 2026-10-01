import type { ActCategory } from '../../types/act-catalog.ts';
import type { PerformedAct, PerformedActStatus } from '../../types/performed-acts.ts';

/** Whole XOF units — never divide/multiply by 100. */
export function formatCatalogPrice(amount: number, currency = 'XOF'): string {
	const formatted = new Intl.NumberFormat('fr-FR').format(amount);
	return currency === 'XOF' ? `${formatted} FCFA` : `${formatted} ${currency}`;
}

export const BASE_PRICE_LABEL = 'Prix catalogue de référence';

export const BASE_PRICE_HINT =
	'Valeur de référence du catalogue — le montant facturé dépend du tarif de facturation.';

export const actCategoryLabel: Record<ActCategory, string> = {
	CONSULTATION: 'Consultation',
	LABORATORY: 'Laboratoire',
	IMAGING: 'Imagerie',
	HOSPITALIZATION: 'Hospitalisation',
	PROCEDURE: 'Procédure',
	OTHER: 'Autre'
};

export const performedActStatusLabel: Record<PerformedActStatus, string> = {
	PERFORMED: 'Réalisé',
	VOIDED: 'Annulé'
};

export function originBadgeLabel(sourceType?: string | null): string | null {
	const key = (sourceType ?? '').trim().toUpperCase();
	if (!key) return null;
	const known: Record<string, string> = {
		CONSULTATION: 'Consultation',
		LABORATORY: 'Laboratoire',
		IMAGING: 'Imagerie'
	};
	return known[key] ?? 'Origine clinique';
}

export function canManageActCatalog(permissions: string[]): boolean {
	return permissions.includes('*') || permissions.includes('act_catalog.manage');
}

export function canReadActCatalog(permissions: string[]): boolean {
	return (
		permissions.includes('*') ||
		permissions.includes('act_catalog.read') ||
		permissions.includes('act_catalog.manage')
	);
}

export function canReadPerformedActs(permissions: string[]): boolean {
	return permissions.includes('*') || permissions.includes('performed_acts.read');
}

export function canCreatePerformedActs(permissions: string[]): boolean {
	return permissions.includes('*') || permissions.includes('performed_acts.create');
}

/** Create UX needs catalog selection — both create + catalog read required. */
export function canCreatePerformedActFromCatalog(permissions: string[]): boolean {
	return canCreatePerformedActs(permissions) && canReadActCatalog(permissions);
}

export function canVoidPerformedActs(permissions: string[]): boolean {
	return permissions.includes('*') || permissions.includes('performed_acts.void');
}

export function canVoidPerformedAct(
	act: Pick<PerformedAct, 'status'>,
	permissions: string[]
): boolean {
	return act.status === 'PERFORMED' && canVoidPerformedActs(permissions);
}

export function isActiveInvoiceVoidConflict(message: string): boolean {
	const lower = message.toLowerCase();
	return (
		(lower.includes('factur') || lower.includes('bill')) &&
		(lower.includes('actif') || lower.includes('active') || lower.includes('encore'))
	);
}

export const ACTIVE_INVOICE_VOID_MESSAGE =
	"Cet acte possède une facturation active. Résolvez ou annulez la facture éligible depuis la facturation avant d'annuler l'acte.";

export const PAID_INVOICE_VOID_MESSAGE =
	"Cet acte est lié à une facture déjà encaissée. L'annulation de facture n'est pas disponible après paiement — un avoir ou remboursement futur sera requis.";

export function resolveVoidErrorMessage(
	error: unknown,
	opts?: { invoiceStatus?: string | null }
): string {
	const raw =
		error instanceof Error && error.message && !error.message.startsWith('Request failed')
			? error.message
			: '';
	if (!raw || raw === 'ACCESS_DENIED' || raw === 'UNAUTHORIZED') {
		if (raw === 'ACCESS_DENIED') return "Vous n'avez pas la permission d'annuler cet acte.";
		if (raw === 'UNAUTHORIZED') return 'Session expirée. Reconnectez-vous.';
		return "Impossible d'annuler l'acte réalisé.";
	}
	if (isActiveInvoiceVoidConflict(raw)) {
		const status = (opts?.invoiceStatus ?? '').toUpperCase();
		if (status === 'PAID' || status === 'PARTIALLY_PAID') return PAID_INVOICE_VOID_MESSAGE;
		return ACTIVE_INVOICE_VOID_MESSAGE;
	}
	return raw;
}

/** Cancel is only suggested for non-paid active invoices. */
export function voidConflictAllowsInvoiceCancelSuggestion(invoiceStatus?: string | null): boolean {
	const status = (invoiceStatus ?? '').toUpperCase();
	return status !== 'PAID' && status !== 'PARTIALLY_PAID';
}

export function normalizeVoidReason(reason: string): string {
	return reason.trim().slice(0, 240);
}
