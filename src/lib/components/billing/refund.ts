/**
 * LOT29F-I-A — Refund request workflow (reserve spendable credit → decision).
 * Presentation + UX validation only. No money execution, no client financial arithmetic.
 */

import axios from 'axios';
import { can } from './state.ts';
import type {
	Refund,
	RefundBeneficiaryMode,
	RefundIntendedMethod,
	RefundReasonCode,
	RefundRequestPayload,
	RefundStatus
} from '$lib/types/billing';

export const REFUND_REQUEST_PERMISSION = 'billing.refund.request';
export const REFUND_APPROVE_PERMISSION = 'billing.refund.approve';
export const REFUND_CANCEL_PERMISSION = 'billing.refund.cancel';
export const REFUND_READ_PERMISSION = 'billing.refund.read';

export const REFUND_PAGE_TITLE = 'Demandes de remboursement';
export const REFUND_REQUEST_SECTION = 'Demande de remboursement';
export const REFUND_REQUEST_ACTION_LABEL = 'Enregistrer la demande';
export const REFUND_APPROVE_ACTION_LABEL = 'Autoriser';
export const REFUND_REJECT_ACTION_LABEL = 'Rejeter la demande';
export const REFUND_CANCEL_ACTION_LABEL = 'Annuler la demande';
export const REFUND_RESERVED_LABEL = 'Montant réservé';
export const REFUND_SPENDABLE_LABEL = 'Crédit utilisable';
export const REFUND_LEDGER_LABEL = 'Crédit au registre';
export const REFUND_LINK_LABEL = 'Demandes de remboursement';

export const MIN_REFUND_DECISION_REASON_LEN = 3;
export const MAX_REFUND_DECISION_REASON_LEN = 1000;
export const MAX_REFUND_COMMENT_LEN = 1000;

/** UX copy: authorization only — no payout implied. */
export const REFUND_NO_PAYOUT_NOTICE =
	'Cette demande réserve du crédit utilisable. Aucune sortie d’argent n’est enregistrée à cette étape.';

// ── Permissions ────────────────────────────────────────────────────────────────

export function canReadRefunds(permissions: string[]): boolean {
	return can(permissions, REFUND_READ_PERMISSION);
}

export function canRequestRefund(permissions: string[]): boolean {
	return can(permissions, REFUND_REQUEST_PERMISSION);
}

export function canApproveRefund(permissions: string[]): boolean {
	return can(permissions, REFUND_APPROVE_PERMISSION);
}

/** Backend: cancel / request / approve permission may cancel. */
export function canCancelRefund(permissions: string[]): boolean {
	return (
		can(permissions, REFUND_CANCEL_PERMISSION) ||
		can(permissions, REFUND_REQUEST_PERMISSION) ||
		can(permissions, REFUND_APPROVE_PERMISSION)
	);
}

/** Reject uses the approve permission on the backend. */
export function canRejectRefund(permissions: string[]): boolean {
	return canApproveRefund(permissions);
}

export function canShowRefundLink(permissions: string[]): boolean {
	return canReadRefunds(permissions);
}

// ── Status ─────────────────────────────────────────────────────────────────────

export const refundStatusLabels: Record<RefundStatus, string> = {
	REQUESTED: 'En attente de validation',
	APPROVED: 'Remboursement autorisé',
	REJECTED: 'Demande rejetée',
	CANCELLED: 'Demande annulée'
};

export const refundStatusFilterOptions: { value: string; label: string }[] = [
	{ value: '', label: 'Tous les statuts' },
	...(Object.entries(refundStatusLabels) as [RefundStatus, string][]).map(([value, label]) => ({
		value,
		label
	}))
];

export function refundStatusLabel(status: string): string {
	return refundStatusLabels[status as RefundStatus] ?? status;
}

/** REQUESTED and APPROVED reserve spendable credit (backend rule — display only). */
export function refundHoldsReservation(status: string): boolean {
	return status === 'REQUESTED' || status === 'APPROVED';
}

export function refundStatusTone(status: string): string {
	switch (status) {
		case 'REQUESTED':
			return 'bg-amber-100 text-amber-900';
		case 'APPROVED':
			return 'bg-emerald-100 text-emerald-900';
		case 'REJECTED':
			return 'bg-red-100 text-red-800';
		case 'CANCELLED':
			return 'bg-slate-200 text-slate-700';
		default:
			return 'bg-slate-100 text-slate-700';
	}
}

// ── Reason codes ───────────────────────────────────────────────────────────────

export const refundReasonLabels: Record<RefundReasonCode, string> = {
	DUPLICATE_OR_OVERPAYMENT: 'Doublon ou trop-perçu',
	SERVICE_CANCELLED_OR_NOT_PERFORMED: 'Prestation annulée ou non réalisée',
	INVOICE_CORRECTION: 'Correction de facture',
	UNUSED_ADVANCE: 'Avance non utilisée',
	INSURANCE_COVERAGE_AFTER_PAYMENT: 'Prise en charge assurance après règlement',
	TRANSFER_OR_DEATH_BEFORE_SERVICE: 'Transfert ou décès avant prestation',
	OTHER: 'Autre (commentaire obligatoire)'
};

export const refundReasonCodes = Object.keys(refundReasonLabels) as RefundReasonCode[];

export const refundReasonOptions: { value: RefundReasonCode; label: string }[] =
	refundReasonCodes.map((value) => ({ value, label: refundReasonLabels[value] }));

export const refundReasonFilterOptions: { value: string; label: string }[] = [
	{ value: '', label: 'Tous les motifs' },
	...refundReasonOptions
];

export function refundReasonLabel(code: string): string {
	return refundReasonLabels[code as RefundReasonCode] ?? code;
}

export function reasonRequiresComment(code: string): boolean {
	return code === 'OTHER';
}

export function reasonRequiresAttestation(code: string): boolean {
	return code === 'SERVICE_CANCELLED_OR_NOT_PERFORMED';
}

/** OTHER requires explicit managerial approval acknowledgement on approve. */
export function reasonRequiresManagerialApproval(code: string): boolean {
	return code === 'OTHER';
}

// ── Beneficiary / method ───────────────────────────────────────────────────────

export const refundBeneficiaryModeLabels: Record<RefundBeneficiaryMode, string> = {
	HOLDER: 'Titulaire du crédit',
	ALTERNATE: 'Bénéficiaire alternatif'
};

export const refundBeneficiaryModeOptions = (
	Object.entries(refundBeneficiaryModeLabels) as [RefundBeneficiaryMode, string][]
).map(([value, label]) => ({ value, label }));

export function refundBeneficiaryModeLabel(mode: string): string {
	return refundBeneficiaryModeLabels[mode as RefundBeneficiaryMode] ?? mode;
}

export const refundMethodLabels: Record<RefundIntendedMethod, string> = {
	UNSPECIFIED: 'Non précisé',
	CASH: 'Espèces',
	CARD: 'Carte bancaire',
	MOBILE_MONEY: 'Mobile Money',
	TRANSFER: 'Virement'
};

export const refundMethodOptions = (
	Object.entries(refundMethodLabels) as [RefundIntendedMethod, string][]
).map(([value, label]) => ({ value, label }));

export function refundMethodLabel(method: string): string {
	return refundMethodLabels[method as RefundIntendedMethod] ?? method;
}

// ── Form state & validation (UX only; backend authoritative) ───────────────────

/** Numeric inputs bind as number in the browser; plain strings in tests / prefill. */
export type RefundFormState = {
	patientId: string | number;
	holderPartyId: string | number;
	amount: string | number;
	reasonCode: string;
	reasonComment: string;
	beneficiaryMode: string;
	beneficiaryDisplayName: string;
	beneficiaryRelationship: string;
	holderConsentRef: string;
	intendedMethod: string;
	methodOverrideReason: string;
	clinicalAttestationRef: string;
};

export function createRefundFormState(over: Partial<RefundFormState> = {}): RefundFormState {
	return {
		patientId: '',
		holderPartyId: '',
		amount: '',
		reasonCode: 'DUPLICATE_OR_OVERPAYMENT',
		reasonComment: '',
		beneficiaryMode: 'HOLDER',
		beneficiaryDisplayName: '',
		beneficiaryRelationship: '',
		holderConsentRef: '',
		intendedMethod: 'UNSPECIFIED',
		methodOverrideReason: '',
		clinicalAttestationRef: '',
		...over
	};
}

function positiveInt(raw: string | number): number {
	const n = Number(raw);
	return Number.isInteger(n) && n > 0 ? n : 0;
}

export function validateRefundForm(form: RefundFormState): string | null {
	if (!positiveInt(form.patientId)) return 'Patient obligatoire (identifiant)';
	if (!positiveInt(form.holderPartyId)) return 'Titulaire financier obligatoire (identifiant)';
	if (!positiveInt(form.amount)) return 'Montant obligatoire, entier et strictement positif';
	if (!refundReasonCodes.includes(form.reasonCode as RefundReasonCode)) {
		return 'Motif de la demande obligatoire';
	}
	const comment = form.reasonComment.trim();
	if (reasonRequiresComment(form.reasonCode) && !comment) {
		return 'Commentaire obligatoire pour le motif « Autre »';
	}
	if (comment.length > MAX_REFUND_COMMENT_LEN) return 'Commentaire trop long';
	if (reasonRequiresAttestation(form.reasonCode) && !form.clinicalAttestationRef.trim()) {
		return 'Référence d’attestation clinique obligatoire pour ce motif';
	}
	if (form.beneficiaryMode === 'ALTERNATE') {
		if (!form.beneficiaryDisplayName.trim())
			return 'Identité du bénéficiaire alternatif obligatoire';
		if (!form.beneficiaryRelationship.trim()) return 'Lien du bénéficiaire alternatif obligatoire';
		if (!form.holderConsentRef.trim()) {
			return 'Référence du consentement écrit du titulaire obligatoire';
		}
	}
	return null;
}

export function buildRefundPayload(
	form: RefundFormState,
	idempotencyKey: string
): RefundRequestPayload {
	const payload: RefundRequestPayload = {
		patientId: positiveInt(form.patientId),
		holderPartyId: positiveInt(form.holderPartyId),
		amount: positiveInt(form.amount),
		reasonCode: form.reasonCode,
		beneficiaryMode: form.beneficiaryMode || 'HOLDER',
		intendedMethod: form.intendedMethod || 'UNSPECIFIED',
		idempotencyKey
	};
	const comment = form.reasonComment.trim();
	if (comment) payload.reasonComment = comment;
	const override = form.methodOverrideReason.trim();
	if (override) payload.methodOverrideReason = override;
	const attest = form.clinicalAttestationRef.trim();
	if (attest) payload.clinicalAttestationRef = attest;
	if (form.beneficiaryMode === 'ALTERNATE') {
		payload.beneficiaryDisplayName = form.beneficiaryDisplayName.trim();
		payload.beneficiaryRelationship = form.beneficiaryRelationship.trim();
		payload.holderConsentRef = form.holderConsentRef.trim();
	}
	return payload;
}

/** Mandatory reason for reject / cancel. */
export function validateRefundDecisionReason(reason: string): string | null {
	const t = reason.trim();
	if (!t) return 'Motif obligatoire';
	if (t.length < MIN_REFUND_DECISION_REASON_LEN) {
		return `Motif trop court (min. ${MIN_REFUND_DECISION_REASON_LEN} caractères)`;
	}
	if (t.length > MAX_REFUND_DECISION_REASON_LEN) return 'Motif trop long';
	return null;
}

export function validateRefundApproval(
	refund: Pick<Refund, 'reasonCode'>,
	managerialApproval: boolean
): string | null {
	if (reasonRequiresManagerialApproval(refund.reasonCode) && !managerialApproval) {
		return 'Le motif « Autre » exige une validation managériale explicite';
	}
	return null;
}

// ── Row actions (status gating; backend remains authoritative) ─────────────────

export function canShowApproveAction(
	refund: Pick<Refund, 'status'>,
	permissions: string[]
): boolean {
	return refund.status === 'REQUESTED' && canApproveRefund(permissions);
}

export function canShowRejectAction(
	refund: Pick<Refund, 'status'>,
	permissions: string[]
): boolean {
	return refund.status === 'REQUESTED' && canRejectRefund(permissions);
}

export function canShowCancelAction(
	refund: Pick<Refund, 'status'>,
	permissions: string[]
): boolean {
	return (
		(refund.status === 'REQUESTED' || refund.status === 'APPROVED') && canCancelRefund(permissions)
	);
}

/** Hint only (SoD is enforced by the backend). */
export function isOwnRefundRequest(
	refund: Pick<Refund, 'requestedBy'>,
	userId: number | null | undefined
): boolean {
	return typeof userId === 'number' && userId > 0 && refund.requestedBy === userId;
}

// ── Error classification ───────────────────────────────────────────────────────

export type RefundUxErrorKind =
	| 'validation'
	| 'permission'
	| 'insufficient_spendable'
	| 'invalid_status'
	| 'sod'
	| 'manager_required'
	| 'attestation_required'
	| 'consent_required'
	| 'org_cash_forbidden'
	| 'idempotency_conflict'
	| 'network_uncertain'
	| 'not_found'
	| 'server';

export type RefundUxError = {
	kind: RefundUxErrorKind;
	message: string;
	/** Keep the same idempotency key on retry of the same logical request. */
	preserveKey: boolean;
	/** Reload authoritative balances / refund before the user retries. */
	shouldRefresh: boolean;
};

function errorCode(error: unknown): string {
	if (!axios.isAxiosError(error)) return '';
	const data = error.response?.data as
		{ code?: string; error?: { code?: string }; message?: string } | undefined;
	return data?.error?.code ?? data?.code ?? '';
}

export function classifyRefundError(error: unknown): RefundUxError {
	const code = errorCode(error);
	const raw = error instanceof Error ? error.message : '';
	const status = axios.isAxiosError(error) ? error.response?.status : undefined;

	if (axios.isAxiosError(error) && !error.response) {
		return {
			kind: 'network_uncertain',
			message:
				'Résultat de la demande indéterminé (réseau). Actualisez la liste avant de réessayer — la même intention sera rejouée.',
			preserveKey: true,
			shouldRefresh: true
		};
	}
	if (status === 403 || raw === 'ACCESS_DENIED') {
		return {
			kind: 'permission',
			message: 'Vous n’avez pas l’autorisation d’effectuer cette action sur les remboursements.',
			preserveKey: false,
			shouldRefresh: false
		};
	}
	const by = (c: string, re: RegExp) => code === c || re.test(raw);
	if (by('REFUND_INSUFFICIENT_SPENDABLE', /Crédit utilisable insuffisant/i)) {
		return {
			kind: 'insufficient_spendable',
			message: 'Crédit utilisable insuffisant pour cette demande — actualisez les soldes.',
			preserveKey: false,
			shouldRefresh: true
		};
	}
	if (by('REFUND_SOD_VIOLATION', /ne peut pas (autoriser|rejeter) sa propre/i)) {
		return {
			kind: 'sod',
			message:
				'Séparation des tâches : le demandeur ne peut pas décider de sa propre demande. Un autre utilisateur doit valider.',
			preserveKey: false,
			shouldRefresh: false
		};
	}
	if (by('REFUND_INVALID_STATUS', /ne peut plus être annulée|Seule une demande/i)) {
		return {
			kind: 'invalid_status',
			message: 'Le statut de cette demande a changé — actualisez avant de continuer.',
			preserveKey: false,
			shouldRefresh: true
		};
	}
	if (by('REFUND_OTHER_REQUIRES_MANAGER', /validation managériale/i)) {
		return {
			kind: 'manager_required',
			message: 'Le motif « Autre » exige une validation managériale explicite.',
			preserveKey: false,
			shouldRefresh: false
		};
	}
	if (by('REFUND_ATTESTATION_REQUIRED', /Attestation clinique/i)) {
		return {
			kind: 'attestation_required',
			message: 'Une attestation clinique de non-réalisation est requise pour ce motif.',
			preserveKey: true,
			shouldRefresh: false
		};
	}
	if (by('REFUND_CONSENT_REQUIRED', /Consentement écrit/i)) {
		return {
			kind: 'consent_required',
			message: 'Le consentement écrit du titulaire est requis pour un bénéficiaire alternatif.',
			preserveKey: true,
			shouldRefresh: false
		};
	}
	if (by('REFUND_ORG_CASH_FORBIDDEN', /mode espèces n'est pas autorisé/i)) {
		return {
			kind: 'org_cash_forbidden',
			message: 'Le mode espèces n’est pas autorisé pour un titulaire de type organisation.',
			preserveKey: true,
			shouldRefresh: false
		};
	}
	if (code === 'IDEMPOTENCY_CONFLICT' || /idempotence/i.test(raw)) {
		return {
			kind: 'idempotency_conflict',
			message: 'Clé d’idempotence déjà utilisée avec une autre demande.',
			preserveKey: false,
			shouldRefresh: true
		};
	}
	if (status === 404) {
		return {
			kind: 'not_found',
			message: 'Demande introuvable.',
			preserveKey: false,
			shouldRefresh: true
		};
	}
	if (status === 400 || status === 422) {
		return {
			kind: 'validation',
			message: raw || 'Demande invalide.',
			preserveKey: true,
			shouldRefresh: false
		};
	}
	return {
		kind: 'server',
		message: raw && !raw.startsWith('Request failed') ? raw : 'Action impossible pour le moment.',
		preserveKey: true,
		shouldRefresh: false
	};
}

// ── Copy safety (no money-execution wording) ───────────────────────────────────

/** Wording that would imply money left the clinic. Refund *request* wording stays allowed. */
const FORBIDDEN_EXECUTION_PATTERNS: RegExp[] = [
	/rembours[ée]e?s?(?![\p{L}])/iu,
	/rembours(ement|ements)\s+(effectu|ex[ée]cut|vers[ée])/iu,
	/montant\s+vers[ée]/iu,
	/\bex[ée]cut/iu,
	/argent\s+remis/iu,
	/\bremis\s+(au|à|en)\b/iu,
	/\brefunded\b/i,
	/\bpaid\s*out\b/i,
	/\bexecute[d]?\b/i
];

export function refundCopyIsSafe(text: string): boolean {
	return !FORBIDDEN_EXECUTION_PATTERNS.some((re) => re.test(text));
}

/** All static refund UX strings pass the execution-wording guard. */
export function allRefundLabelsSafe(): boolean {
	const samples: string[] = [
		REFUND_PAGE_TITLE,
		REFUND_REQUEST_SECTION,
		REFUND_REQUEST_ACTION_LABEL,
		REFUND_APPROVE_ACTION_LABEL,
		REFUND_REJECT_ACTION_LABEL,
		REFUND_CANCEL_ACTION_LABEL,
		REFUND_RESERVED_LABEL,
		REFUND_SPENDABLE_LABEL,
		REFUND_LEDGER_LABEL,
		REFUND_LINK_LABEL,
		REFUND_NO_PAYOUT_NOTICE,
		...Object.values(refundStatusLabels),
		...Object.values(refundReasonLabels),
		...Object.values(refundBeneficiaryModeLabels),
		...Object.values(refundMethodLabels)
	];
	return samples.every((s) => refundCopyIsSafe(s));
}
