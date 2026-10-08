import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { AxiosError, type AxiosResponse } from 'axios';
import {
	REFUND_APPROVE_PERMISSION,
	REFUND_CANCEL_PERMISSION,
	REFUND_READ_PERMISSION,
	REFUND_REQUEST_PERMISSION,
	allRefundLabelsSafe,
	buildRefundPayload,
	canApproveRefund,
	canCancelRefund,
	canReadRefunds,
	canRejectRefund,
	canRequestRefund,
	canShowApproveAction,
	canShowCancelAction,
	canShowRefundLink,
	canShowRejectAction,
	classifyRefundError,
	createRefundFormState,
	isOwnRefundRequest,
	reasonRequiresAttestation,
	reasonRequiresComment,
	reasonRequiresManagerialApproval,
	refundCopyIsSafe,
	refundHoldsReservation,
	refundMethodLabel,
	refundReasonCodes,
	refundReasonLabel,
	refundStatusLabel,
	refundStatusLabels,
	validateRefundApproval,
	validateRefundDecisionReason,
	validateRefundForm
} from './refund.ts';

const cashier = [REFUND_REQUEST_PERMISSION, REFUND_READ_PERMISSION];
const facturation = [REFUND_REQUEST_PERMISSION, REFUND_CANCEL_PERMISSION, REFUND_READ_PERMISSION];
const comptable = [
	REFUND_REQUEST_PERMISSION,
	REFUND_APPROVE_PERMISSION,
	REFUND_CANCEL_PERMISSION,
	REFUND_READ_PERMISSION
];

function validForm() {
	return createRefundFormState({ patientId: '9', holderPartyId: '3', amount: '5000' });
}

function axiosErr(status: number, data: unknown, message = 'Request failed') {
	const err = new AxiosError(message);
	err.response = { status, data } as AxiosResponse;
	return err;
}

describe('LOT29F-I-A refund FE helpers', () => {
	test('status labels are the precise French vocabulary', () => {
		assert.equal(refundStatusLabels.REQUESTED, 'En attente de validation');
		assert.equal(refundStatusLabels.APPROVED, 'Remboursement autorisé');
		assert.equal(refundStatusLabels.REJECTED, 'Demande rejetée');
		assert.equal(refundStatusLabels.CANCELLED, 'Demande annulée');
		assert.equal(refundStatusLabel('UNKNOWN'), 'UNKNOWN');
	});

	test('reservation applies to REQUESTED and APPROVED only', () => {
		assert.equal(refundHoldsReservation('REQUESTED'), true);
		assert.equal(refundHoldsReservation('APPROVED'), true);
		assert.equal(refundHoldsReservation('REJECTED'), false);
		assert.equal(refundHoldsReservation('CANCELLED'), false);
	});

	test('permission helpers mirror backend RBAC', () => {
		assert.equal(canRequestRefund(cashier), true);
		assert.equal(canReadRefunds(cashier), true);
		assert.equal(canApproveRefund(cashier), false);
		assert.equal(canRejectRefund(cashier), false);
		assert.equal(canCancelRefund(cashier), true); // request permission may cancel
		assert.equal(canApproveRefund(comptable), true);
		assert.equal(canRejectRefund(comptable), true);
		assert.equal(canCancelRefund(facturation), true);
		assert.equal(canApproveRefund(facturation), false);
		assert.equal(canReadRefunds(['billing.read']), false);
		assert.equal(canRequestRefund(['billing.read']), false);
		assert.equal(canCancelRefund(['billing.read']), false);
		assert.equal(canShowRefundLink(['billing.refund.read']), true);
		assert.equal(canShowRefundLink(['billing.statement.read']), false);
		assert.equal(canApproveRefund(['*']), true);
	});

	test('row actions are gated by status and permission', () => {
		assert.equal(canShowApproveAction({ status: 'REQUESTED' }, comptable), true);
		assert.equal(canShowApproveAction({ status: 'REQUESTED' }, cashier), false);
		assert.equal(canShowApproveAction({ status: 'APPROVED' }, comptable), false);
		assert.equal(canShowRejectAction({ status: 'REQUESTED' }, comptable), true);
		assert.equal(canShowRejectAction({ status: 'REJECTED' }, comptable), false);
		assert.equal(canShowCancelAction({ status: 'REQUESTED' }, cashier), true);
		assert.equal(canShowCancelAction({ status: 'APPROVED' }, facturation), true);
		assert.equal(canShowCancelAction({ status: 'CANCELLED' }, comptable), false);
		assert.equal(canShowCancelAction({ status: 'REJECTED' }, comptable), false);
	});

	test('isOwnRefundRequest is a hint only', () => {
		assert.equal(isOwnRefundRequest({ requestedBy: 5 }, 5), true);
		assert.equal(isOwnRefundRequest({ requestedBy: 5 }, 6), false);
		assert.equal(isOwnRefundRequest({ requestedBy: 5 }, null), false);
	});

	test('reason codes cover the backend set', () => {
		assert.deepEqual([...refundReasonCodes].sort(), [
			'DUPLICATE_OR_OVERPAYMENT',
			'INSURANCE_COVERAGE_AFTER_PAYMENT',
			'INVOICE_CORRECTION',
			'OTHER',
			'SERVICE_CANCELLED_OR_NOT_PERFORMED',
			'TRANSFER_OR_DEATH_BEFORE_SERVICE',
			'UNUSED_ADVANCE'
		]);
		assert.equal(refundReasonLabel('UNUSED_ADVANCE'), 'Avance non utilisée');
		assert.equal(refundReasonLabel('X'), 'X');
		assert.equal(reasonRequiresComment('OTHER'), true);
		assert.equal(reasonRequiresComment('UNUSED_ADVANCE'), false);
		assert.equal(reasonRequiresAttestation('SERVICE_CANCELLED_OR_NOT_PERFORMED'), true);
		assert.equal(reasonRequiresManagerialApproval('OTHER'), true);
		assert.equal(refundMethodLabel('MOBILE_MONEY'), 'Mobile Money');
	});

	test('form validation', () => {
		assert.equal(validateRefundForm(validForm()), null);
		assert.match(
			validateRefundForm(createRefundFormState({ holderPartyId: '3', amount: '1' })) ?? '',
			/Patient obligatoire/
		);
		assert.match(
			validateRefundForm({ ...validForm(), holderPartyId: '' }) ?? '',
			/Titulaire financier obligatoire/
		);
		assert.match(validateRefundForm({ ...validForm(), amount: '0' }) ?? '', /Montant obligatoire/);
		assert.match(validateRefundForm({ ...validForm(), amount: '-5' }) ?? '', /Montant obligatoire/);
		assert.match(
			validateRefundForm({ ...validForm(), amount: '10.5' }) ?? '',
			/Montant obligatoire/
		);
		assert.match(
			validateRefundForm({ ...validForm(), reasonCode: 'OTHER' }) ?? '',
			/Commentaire obligatoire/
		);
		assert.equal(
			validateRefundForm({ ...validForm(), reasonCode: 'OTHER', reasonComment: 'Cas particulier' }),
			null
		);
		assert.match(
			validateRefundForm({ ...validForm(), reasonCode: 'SERVICE_CANCELLED_OR_NOT_PERFORMED' }) ??
				'',
			/attestation/i
		);
		assert.match(
			validateRefundForm({ ...validForm(), beneficiaryMode: 'ALTERNATE' }) ?? '',
			/bénéficiaire alternatif/
		);
		assert.match(
			validateRefundForm({
				...validForm(),
				beneficiaryMode: 'ALTERNATE',
				beneficiaryDisplayName: 'Awa',
				beneficiaryRelationship: 'Sœur'
			}) ?? '',
			/consentement/i
		);
	});

	test('buildRefundPayload sends command fields only (no status / actor / balances)', () => {
		const p = buildRefundPayload(validForm(), 'key-1');
		assert.deepEqual(p, {
			patientId: 9,
			holderPartyId: 3,
			amount: 5000,
			reasonCode: 'DUPLICATE_OR_OVERPAYMENT',
			beneficiaryMode: 'HOLDER',
			intendedMethod: 'UNSPECIFIED',
			idempotencyKey: 'key-1'
		});
		const alt = buildRefundPayload(
			{
				...validForm(),
				reasonCode: 'OTHER',
				reasonComment: '  cas  ',
				beneficiaryMode: 'ALTERNATE',
				beneficiaryDisplayName: ' Awa ',
				beneficiaryRelationship: ' Sœur ',
				holderConsentRef: ' CONS-1 ',
				intendedMethod: 'MOBILE_MONEY',
				methodOverrideReason: ' demande ',
				clinicalAttestationRef: ' ATT-1 '
			},
			'key-2'
		);
		assert.equal(alt.reasonComment, 'cas');
		assert.equal(alt.beneficiaryDisplayName, 'Awa');
		assert.equal(alt.beneficiaryRelationship, 'Sœur');
		assert.equal(alt.holderConsentRef, 'CONS-1');
		assert.equal(alt.methodOverrideReason, 'demande');
		assert.equal(alt.clinicalAttestationRef, 'ATT-1');
		assert.equal('status' in p, false);
		assert.equal('spendableCredit' in p, false);
	});

	test('reject / cancel reasons are mandatory', () => {
		assert.equal(validateRefundDecisionReason(''), 'Motif obligatoire');
		assert.equal(validateRefundDecisionReason('   '), 'Motif obligatoire');
		assert.match(validateRefundDecisionReason('ab') ?? '', /trop court/);
		assert.equal(validateRefundDecisionReason('Dossier incomplet'), null);
		assert.match(validateRefundDecisionReason('x'.repeat(1001)) ?? '', /trop long/);
	});

	test('OTHER approval requires managerial acknowledgement', () => {
		assert.match(validateRefundApproval({ reasonCode: 'OTHER' }, false) ?? '', /managériale/);
		assert.equal(validateRefundApproval({ reasonCode: 'OTHER' }, true), null);
		assert.equal(validateRefundApproval({ reasonCode: 'UNUSED_ADVANCE' }, false), null);
	});

	test('error classification maps backend refund codes', () => {
		const spend = classifyRefundError(
			axiosErr(409, { error: { code: 'REFUND_INSUFFICIENT_SPENDABLE' }, message: 'x' })
		);
		assert.equal(spend.kind, 'insufficient_spendable');
		assert.equal(spend.shouldRefresh, true);
		assert.equal(classifyRefundError(axiosErr(409, { code: 'REFUND_SOD_VIOLATION' })).kind, 'sod');
		assert.equal(
			classifyRefundError(axiosErr(409, { error: { code: 'REFUND_INVALID_STATUS' } })).kind,
			'invalid_status'
		);
		assert.equal(
			classifyRefundError(axiosErr(409, { error: { code: 'REFUND_OTHER_REQUIRES_MANAGER' } })).kind,
			'manager_required'
		);
		assert.equal(
			classifyRefundError(axiosErr(409, { error: { code: 'REFUND_ATTESTATION_REQUIRED' } })).kind,
			'attestation_required'
		);
		assert.equal(
			classifyRefundError(axiosErr(409, { error: { code: 'REFUND_CONSENT_REQUIRED' } })).kind,
			'consent_required'
		);
		assert.equal(
			classifyRefundError(axiosErr(409, { error: { code: 'IDEMPOTENCY_CONFLICT' } })).kind,
			'idempotency_conflict'
		);
		assert.equal(classifyRefundError(axiosErr(403, {}, 'ACCESS_DENIED')).kind, 'permission');
		assert.equal(classifyRefundError(axiosErr(404, {})).kind, 'not_found');
		const net = classifyRefundError(new AxiosError('Network Error'));
		assert.equal(net.kind, 'network_uncertain');
		assert.equal(net.preserveKey, true);
		assert.equal(classifyRefundError(new Error('boom')).message, 'boom');
	});

	test('error messages never use execution wording', () => {
		const kinds = [
			'REFUND_INSUFFICIENT_SPENDABLE',
			'REFUND_SOD_VIOLATION',
			'REFUND_INVALID_STATUS',
			'REFUND_OTHER_REQUIRES_MANAGER',
			'REFUND_ATTESTATION_REQUIRED',
			'REFUND_CONSENT_REQUIRED',
			'REFUND_ORG_CASH_FORBIDDEN',
			'IDEMPOTENCY_CONFLICT'
		];
		for (const code of kinds) {
			const e = classifyRefundError(axiosErr(409, { error: { code } }));
			assert.equal(refundCopyIsSafe(e.message), true, `${code}: ${e.message}`);
		}
		assert.equal(refundCopyIsSafe(classifyRefundError(axiosErr(403, {})).message), true);
		assert.equal(refundCopyIsSafe(classifyRefundError(new AxiosError('x')).message), true);
	});

	test('copy safety rejects money-execution wording but allows request/authorization wording', () => {
		for (const bad of [
			'Remboursé',
			'Remboursée',
			'remboursé le 12/01',
			'Remboursement effectué',
			'Montant versé',
			'Exécuter le remboursement',
			'Exécution',
			'Argent remis',
			'Refunded',
			'Paid out'
		]) {
			assert.equal(refundCopyIsSafe(bad), false, bad);
		}
		for (const good of [
			'Demande de remboursement',
			'En attente de validation',
			'Remboursement autorisé',
			'Demande rejetée',
			'Demande annulée',
			'Montant réservé',
			'Crédit utilisable',
			'Demandes de remboursement'
		]) {
			assert.equal(refundCopyIsSafe(good), true, good);
		}
	});

	test('all static labels are execution-wording safe', () => {
		assert.equal(allRefundLabelsSafe(), true);
	});
});
