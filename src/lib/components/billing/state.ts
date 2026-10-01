import type { ActType, BillableAct, Invoice, Tariff } from '$lib/types/billing';
import type { PerformedAct } from '$lib/types/performed-acts';

export const formatXOF = (amount: number) =>
	`${new Intl.NumberFormat('fr-FR').format(amount)} FCFA`;

export const can = (permissions: string[], permission: string) =>
	permissions.includes('*') || permissions.includes(permission);

export const invoiceBalance = (invoice: Pick<Invoice, 'patientAmount' | 'paidAmount'>) =>
	Math.max(0, invoice.patientAmount - invoice.paidAmount);

export const paymentAllowed = (invoice: Invoice) =>
	['ISSUED', 'PARTIALLY_PAID'].includes(invoice.status) && invoice.balanceAmount > 0;

export const printableRows = (invoice: Invoice) =>
	(invoice.lines ?? []).map((line) => ({
		description: line.description,
		quantity: line.quantity,
		unitPrice: line.unitPrice,
		gross: line.grossAmount,
		insurance: line.insuranceAmount,
		patient: line.patientAmount,
		actType: line.actType
	}));

/** Canonical billing act types including additive PERFORMED_ACT (LOT27I-C). */
export const BILLING_ACT_TYPES: readonly ActType[] = [
	'CONSULTATION',
	'LABORATORY',
	'IMAGING',
	'HOSPITALIZATION',
	'MEDICATION',
	'PERFORMED_ACT'
] as const;

export const billingActTypeLabel: Record<ActType, string> = {
	CONSULTATION: 'Consultation',
	LABORATORY: 'Laboratoire',
	IMAGING: 'Imagerie',
	HOSPITALIZATION: 'Hospitalisation',
	MEDICATION: 'Médicament',
	PERFORMED_ACT: 'Acte réalisé'
};

export function formatBillingActType(actType: string): string {
	const key = actType.toUpperCase() as ActType;
	return billingActTypeLabel[key] ?? actType;
}

export function isBillingActType(value: string): value is ActType {
	return (BILLING_ACT_TYPES as readonly string[]).includes(value.toUpperCase());
}

/**
 * Billing CTA from PerformedAct — independent of performed_acts.* permissions.
 * Backend BillableActs remains final eligibility authority.
 */
export function canCreatePerformedActBilling(
	act: Pick<PerformedAct, 'status' | 'billable'>,
	permissions: string[]
): boolean {
	if (act.status !== 'PERFORMED') return false;
	if (!act.billable) return false;
	return can(permissions, 'billing.create');
}

/** Patient (+ optional stable act identity). Never encodes pricing or coverage. */
export function performedActBillingDeepLink(patientId: number, performedActId?: number): string {
	const q = new URLSearchParams({ patientId: String(patientId) });
	if (performedActId != null && performedActId > 0) {
		q.set('actType', 'PERFORMED_ACT');
		q.set('referenceId', String(performedActId));
	}
	return `/billing?${q.toString()}`;
}

export const MISSING_TARIFF_MESSAGE =
	'Aucun tarif de facturation applicable. Configurez un tarif « Acte réalisé » — le prix catalogue de référence ne peut pas être utilisé.';

/**
 * Invoice unit price authority is Tariff.UnitPrice only.
 * BasePrice must never fall back into billing.
 */
export function resolveInvoiceUnitPrice(
	tariffUnitPrice: number | null | undefined,
	_basePrice: number
): number | null {
	void _basePrice;
	if (tariffUnitPrice == null || !(tariffUnitPrice > 0)) return null;
	return tariffUnitPrice;
}

export function billableActSelectable(act: Pick<BillableAct, 'alreadyBilled' | 'tariff'>): boolean {
	return !act.alreadyBilled && !!act.tariff && act.tariff.unitPrice > 0;
}

export function tariffReferenceLabel(tariff: Pick<Tariff, 'actType' | 'referenceId'>): string {
	const typeLabel = formatBillingActType(tariff.actType);
	if (tariff.actType === 'PERFORMED_ACT') {
		return tariff.referenceId == null
			? `${typeLabel} · générique`
			: `${typeLabel} · catalogue #${tariff.referenceId}`;
	}
	return typeLabel;
}

/** Paid/final invoices block Void; do not suggest cancel-as-workaround. */
export function isPaidInvoiceBlockingVoid(invoiceStatus?: string | null): boolean {
	const s = (invoiceStatus ?? '').toUpperCase();
	return s === 'PAID' || s === 'PARTIALLY_PAID';
}

export function voidConflictBillingHref(patientId: number, invoiceId?: number | null): string {
	if (invoiceId != null && invoiceId > 0) return `/billing/${invoiceId}`;
	return performedActBillingDeepLink(patientId);
}
