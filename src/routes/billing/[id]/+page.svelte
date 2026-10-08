<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { jwtDecode } from 'jwt-decode';
	import {
		applyCredit,
		cancelInvoice,
		getInvoice,
		issueCreditNote,
		issueInvoice,
		listPatientCreditBalances,
		payInvoice,
		reversePayment
	} from '$lib/api/billing';
	import { executeCashCorrection, getCorrectionEligibility } from '$lib/api/cash';
	import { listInsuranceReceivables } from '$lib/api/insurance-receivables';
	import {
		canShowExecuteCorrection,
		classifyCorrectionError,
		CORRECTION_EXECUTE_LABEL,
		CORRECTION_EXECUTED_LABEL,
		CORRECTION_EXPLAIN,
		correctionExecuteUnavailableReason
	} from '$lib/components/cash/correction';
	import type { CorrectionEligibility } from '$lib/types/cash';
	import {
		can,
		formatBillingActType,
		formatXOF,
		paymentAllowed
	} from '$lib/components/billing/state';
	import {
		beginPaymentCommand,
		completePaymentCommandError,
		completePaymentCommandSuccess,
		createPaymentCommandState,
		isPaymentSubmitDisabled
	} from '$lib/components/billing/payment-command';
	import {
		BILLING_PAYMENT_METHODS,
		canShowEncaisser,
		classifyPaymentError,
		collectibleStatusLabel,
		COLLECTION_PERMISSION,
		invoiceCollectibleKind,
		isPaymentFormSubmitDisabled,
		canShowPaymentReceipt,
		canShowReversePayment,
		cashSessionReversalWarning,
		classifyReversalError,
		latestReceiptedPayment,
		mergePaymentHistory,
		paymentAmountErrorMessage,
		paymentIsPostCloseCorrection,
		paymentIsReversed,
		POST_CLOSE_CORRECTION_LABEL,
		REVERSAL_ACTION_LABEL,
		validateReversalReason,
		validatePaymentAmount,
		type PaymentUxError
	} from '$lib/components/billing/collection';
	import {
		canShowCreditNoteDocument,
		canShowIssueCreditNote,
		classifyCreditNoteError,
		CREDIT_NOTE_ACTION_LABEL,
		canShowCustomerCredit,
		creditNoteDefaultAmount,
		validateCreditNoteAmount,
		validateCreditNoteReason
	} from '$lib/components/billing/credit-note';
	import {
		canShowApplyCredit,
		canShowCreditBalances,
		classifyCreditApplyError,
		CREDIT_APPLY_ACTION_LABEL,
		CREDIT_APPLIED_LABEL,
		CREDIT_AVAILABLE_LABEL,
		CREDIT_SETTLEMENT_LABEL,
		eligibleHolders,
		maxApplicableAmount,
		validateCreditApplyAmount,
		type CreditBalance
	} from '$lib/components/billing/credit-application';
	import {
		canShowFinancialStatement,
		STATEMENT_PAGE_TITLE
	} from '$lib/components/billing/financial-statement';
	import type { Payment } from '$lib/types/billing';
	import type { Invoice } from '$lib/types/billing';
	import type { InsuranceReceivable } from '$lib/types/insurance-receivables';
	import {
		PAYER_PATIENT_LABEL,
		buildPayerPayload,
		createPayerFormState,
		formatPayerDisplay,
		validatePayerForm
	} from '$lib/components/billing/payer';

	let invoice = $state<Invoice | null>(null);
	let error = $state('');
	let paymentError = $state<PaymentUxError | null>(null);
	let successMessage = $state('');
	let permissions = $state<string[]>([]);
	let insuranceReceivables = $state<InsuranceReceivable[]>([]);
	let payment = $state({ amount: 0, paymentMethod: 'CASH', reference: '' });
	let payerForm = $state(createPayerFormState());
	let payerHint = $state('');
	let paymentCmd = $state(createPaymentCommandState());
	let amountHint = $state('');
	let reverseTarget = $state<Payment | null>(null);
	let reverseReason = $state('');
	let reverseCmd = $state(createPaymentCommandState());
	let reverseError = $state<PaymentUxError | null>(null);
	let reverseConfirm = $state(false);
	let creditOpen = $state(false);
	let creditReason = $state('');
	let creditAmount = $state(0);
	let creditConfirm = $state(false);
	let creditCmd = $state(createPaymentCommandState());
	let creditError = $state<PaymentUxError | null>(null);
	let creditBalances = $state<CreditBalance[]>([]);
	let applyOpen = $state(false);
	let applyHolderId = $state(0);
	let applyAmount = $state(0);
	let applyConfirm = $state(false);
	let applyCmd = $state(createPaymentCommandState());
	let applyError = $state<PaymentUxError | null>(null);
	let execTarget = $state<Payment | null>(null);
	let execElig = $state<CorrectionEligibility | null>(null);
	let execNote = $state('');
	let execConfirm = $state(false);
	let execCmd = $state(createPaymentCommandState());
	let execError = $state<string | null>(null);
	let execLoading = $state(false);

	const collectibleKind = $derived(invoice ? invoiceCollectibleKind(invoice) : null);
	const showCollection = $derived(invoice ? canShowEncaisser(invoice, permissions) : false);
	const showCreditNote = $derived(invoice ? canShowIssueCreditNote(invoice, permissions) : false);
	const showCreditBalances = $derived(
		invoice ? canShowCreditBalances(invoice, permissions) : false
	);
	const showApplyCredit = $derived(
		invoice ? canShowApplyCredit(invoice, permissions, creditBalances) : false
	);
	const showFinancialStatement = $derived(canShowFinancialStatement(permissions));
	const applyHolders = $derived(eligibleHolders(creditBalances));
	const selectedApplyHolder = $derived(
		applyHolders.find((h) => h.holderPartyId === applyHolderId) ?? applyHolders[0] ?? null
	);

	async function refreshCreditBalances(patientId: number) {
		if (!can(permissions, 'billing.credit.read')) {
			creditBalances = [];
			return;
		}
		try {
			creditBalances = await listPatientCreditBalances(patientId);
		} catch {
			creditBalances = [];
		}
	}

	async function refresh(opts?: { resetAmount?: boolean }) {
		const id = Number(page.params.id);
		invoice = await getInvoice(id);
		insuranceReceivables =
			invoice.insuranceAmount > 0
				? (await listInsuranceReceivables({ search: invoice.number, limit: 100 })).items.filter(
						(x) => x.invoiceId === invoice!.id
					)
				: [];
		invoice = {
			...invoice,
			payments: mergePaymentHistory(invoice.payments, invoice.payments)
		};
		await refreshCreditBalances(invoice.patientId);
		if (opts?.resetAmount !== false && invoice) {
			payment.amount = invoice.balanceAmount;
		}
	}

	async function load() {
		error = '';
		try {
			await refresh();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Facture introuvable';
		}
	}

	async function issue() {
		if (!invoice) return;
		try {
			invoice = await issueInvoice(invoice.id);
			successMessage = 'Facture émise';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Émission impossible';
		}
	}

	function startNewPaymentIntent() {
		paymentCmd = createPaymentCommandState();
		paymentError = null;
		amountHint = '';
		payerHint = '';
		payerForm = createPayerFormState();
		if (invoice) payment.amount = invoice.balanceAmount;
	}

	async function pay() {
		if (!invoice || isPaymentSubmitDisabled(paymentCmd)) return;
		const check = validatePaymentAmount(payment.amount, invoice.balanceAmount);
		if (!check.ok) {
			amountHint = paymentAmountErrorMessage(check.reason);
			return;
		}
		const payerErr = validatePayerForm(payerForm);
		if (payerErr) {
			payerHint = payerErr;
			return;
		}
		amountHint = '';
		payerHint = '';
		paymentCmd = beginPaymentCommand(paymentCmd);
		const key = paymentCmd.idempotencyKey;
		paymentError = null;
		successMessage = '';
		error = '';
		try {
			const updated = await payInvoice(invoice.id, {
				...payment,
				idempotencyKey: key,
				payer: buildPayerPayload(payerForm)
			});
			invoice = {
				...updated,
				payments: mergePaymentHistory(invoice.payments, updated.payments)
			};
			paymentCmd = completePaymentCommandSuccess();
			payerForm = createPayerFormState();
			payment.amount = updated.balanceAmount;
			const receipted = latestReceiptedPayment(updated.payments);
			successMessage =
				updated.balanceAmount === 0
					? 'Paiement enregistré — facture soldée (solde patient = 0).'
					: `Paiement enregistré — reste patient ${formatXOF(updated.balanceAmount)}.`;
			if (receipted?.receiptNumber) {
				successMessage += ` Reçu ${receipted.receiptNumber} disponible.`;
			}
			if (updated.insuranceAmount > 0) {
				insuranceReceivables = (
					await listInsuranceReceivables({ search: updated.number, limit: 100 })
				).items.filter((x) => x.invoiceId === updated.id);
			}
		} catch (e) {
			const classified = classifyPaymentError(e);
			paymentError = classified;
			if (classified.preserveKey) {
				paymentCmd = completePaymentCommandError(paymentCmd);
			} else {
				paymentCmd = createPaymentCommandState();
			}
			if (classified.shouldRefresh) {
				try {
					await refresh({ resetAmount: classified.kind === 'stale_balance' });
					if (classified.kind === 'stale_balance') {
						paymentCmd = createPaymentCommandState();
					}
				} catch {
					/* keep payment error */
				}
			}
		}
	}

	function openReverse(p: Payment) {
		reverseTarget = p;
		reverseReason = '';
		reverseConfirm = false;
		reverseError = null;
		reverseCmd = createPaymentCommandState();
	}

	function closeReverse() {
		reverseTarget = null;
		reverseReason = '';
		reverseConfirm = false;
		reverseError = null;
		reverseCmd = createPaymentCommandState();
	}

	async function openExecute(p: Payment) {
		execTarget = p;
		execNote = '';
		execConfirm = false;
		execError = null;
		execCmd = createPaymentCommandState();
		execElig = null;
		execLoading = true;
		try {
			execElig = await getCorrectionEligibility(p.id);
		} catch (e) {
			execError = e instanceof Error ? e.message : 'Éligibilité indisponible';
		} finally {
			execLoading = false;
		}
	}

	function closeExecute() {
		execTarget = null;
		execElig = null;
		execNote = '';
		execConfirm = false;
		execError = null;
		execCmd = createPaymentCommandState();
	}

	async function submitExecute() {
		if (!invoice || !execTarget || !execElig?.eligible || isPaymentSubmitDisabled(execCmd)) return;
		if (!execConfirm) {
			execError = 'Confirmez explicitement l’exécution de la sortie de caisse.';
			return;
		}
		const revId = execElig.paymentReversalId || execTarget.reversalId;
		if (!revId) {
			execError = 'Contrepassation introuvable.';
			return;
		}
		execCmd = beginPaymentCommand(execCmd);
		const key = execCmd.idempotencyKey;
		execError = null;
		try {
			await executeCashCorrection({
				paymentReversalId: revId,
				hostSessionId: execElig.hostSession?.session.id,
				note: execNote.trim() || undefined,
				idempotencyKey: key
			});
			execCmd = completePaymentCommandSuccess();
			successMessage = 'Correction de caisse exécutée — sortie enregistrée sur la session hôte.';
			closeExecute();
			await refresh({ resetAmount: false });
		} catch (e) {
			const classified = classifyCorrectionError(e);
			execError = classified.message;
			if (classified.preserveKey) {
				execCmd = completePaymentCommandError(execCmd);
			} else {
				execCmd = createPaymentCommandState();
			}
			if (classified.shouldRefresh) {
				try {
					execElig = await getCorrectionEligibility(execTarget.id);
					await refresh({ resetAmount: false });
				} catch {
					/* keep */
				}
			}
		}
	}

	async function submitReverse() {
		if (!invoice || !reverseTarget || isPaymentSubmitDisabled(reverseCmd)) return;
		const check = validateReversalReason(reverseReason);
		if (!check.ok) {
			reverseError = {
				kind: 'validation',
				message: check.message,
				preserveKey: true,
				shouldRefresh: false,
				allowNewIntent: false
			};
			return;
		}
		if (!reverseConfirm) {
			reverseError = {
				kind: 'validation',
				message: 'Confirmez explicitement la contrepassation.',
				preserveKey: true,
				shouldRefresh: false,
				allowNewIntent: false
			};
			return;
		}
		reverseCmd = beginPaymentCommand(reverseCmd);
		const key = reverseCmd.idempotencyKey;
		reverseError = null;
		try {
			const updated = await reversePayment(reverseTarget.id, {
				reason: check.reason,
				idempotencyKey: key
			});
			invoice = {
				...updated,
				payments: mergePaymentHistory(invoice.payments, updated.payments)
			};
			reverseCmd = completePaymentCommandSuccess();
			successMessage = `Encaissement contrepassé — reste patient ${formatXOF(updated.balanceAmount)}.`;
			closeReverse();
			payment.amount = updated.balanceAmount;
		} catch (e) {
			const classified = classifyReversalError(e);
			reverseError = classified;
			if (classified.preserveKey) {
				reverseCmd = completePaymentCommandError(reverseCmd);
			} else {
				reverseCmd = createPaymentCommandState();
			}
			if (classified.shouldRefresh) {
				try {
					await refresh();
				} catch {
					/* keep */
				}
			}
		}
	}

	async function cancel() {
		if (!invoice) return;
		const reason = prompt("Motif d'annulation");
		if (!reason) return;
		try {
			invoice = await cancelInvoice(invoice.id, reason);
			successMessage = '';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Annulation impossible';
		}
	}

	function openCredit() {
		creditOpen = true;
		creditReason = '';
		creditAmount = invoice ? creditNoteDefaultAmount(invoice) : 0;
		creditConfirm = false;
		creditError = null;
		creditCmd = createPaymentCommandState();
	}

	function closeCredit() {
		creditOpen = false;
		creditReason = '';
		creditAmount = 0;
		creditConfirm = false;
		creditError = null;
		creditCmd = createPaymentCommandState();
	}

	async function submitCredit() {
		if (!invoice || isPaymentSubmitDisabled(creditCmd)) return;
		const maxAmt = creditNoteDefaultAmount(invoice);
		const amtCheck = validateCreditNoteAmount(Number(creditAmount), maxAmt);
		if (!amtCheck.ok) {
			creditError = {
				kind: 'validation',
				message: amtCheck.message,
				preserveKey: false,
				shouldRefresh: false,
				allowNewIntent: false
			};
			return;
		}
		const check = validateCreditNoteReason(creditReason);
		if (!check.ok) {
			creditError = {
				kind: 'validation',
				message: check.message,
				preserveKey: false,
				shouldRefresh: false,
				allowNewIntent: false
			};
			return;
		}
		if (!creditConfirm) {
			creditError = {
				kind: 'validation',
				message: 'Confirmez l’émission de l’avoir.',
				preserveKey: false,
				shouldRefresh: false,
				allowNewIntent: false
			};
			return;
		}
		creditCmd = beginPaymentCommand(creditCmd);
		const key = creditCmd.idempotencyKey;
		creditError = null;
		try {
			invoice = await issueCreditNote(invoice.id, {
				amount: Number(creditAmount),
				reason: check.reason,
				idempotencyKey: key
			});
			const creditCreated = invoice.customerCreditAmount ?? 0;
			successMessage =
				creditCreated > 0
					? `Avoir émis — crédit financier créé ${formatXOF(creditCreated)}.`
					: 'Avoir émis — facture corrigée (aucun crédit client).';
			creditCmd = completePaymentCommandSuccess();
			closeCredit();
		} catch (e) {
			const classified = classifyCreditNoteError(e);
			creditError = classified;
			if (classified.preserveKey) {
				creditCmd = completePaymentCommandError(creditCmd);
			} else {
				creditCmd = createPaymentCommandState();
			}
			if (classified.shouldRefresh) {
				try {
					await refresh();
				} catch {
					/* keep */
				}
			}
		}
	}

	function openApplyCredit() {
		applyOpen = true;
		applyError = null;
		applyConfirm = false;
		applyCmd = createPaymentCommandState();
		const holders = eligibleHolders(creditBalances);
		applyHolderId = holders[0]?.holderPartyId ?? 0;
		const holder = holders[0] ?? null;
		applyAmount = invoice && holder ? maxApplicableAmount(invoice, holder) : 0;
	}

	function closeApplyCredit() {
		applyOpen = false;
		applyHolderId = 0;
		applyAmount = 0;
		applyConfirm = false;
		applyError = null;
		applyCmd = createPaymentCommandState();
	}

	function onApplyHolderChange() {
		if (!invoice || !selectedApplyHolder) return;
		applyAmount = maxApplicableAmount(invoice, selectedApplyHolder);
	}

	async function submitApplyCredit() {
		if (!invoice || isPaymentSubmitDisabled(applyCmd)) return;
		const holder = selectedApplyHolder;
		const amtCheck = validateCreditApplyAmount(Number(applyAmount), invoice, holder);
		if (amtCheck) {
			applyError = {
				kind: 'validation',
				message: amtCheck,
				preserveKey: true,
				shouldRefresh: false,
				allowNewIntent: false
			};
			return;
		}
		if (!applyConfirm) {
			applyError = {
				kind: 'validation',
				message: 'Confirmez le règlement par crédit disponible.',
				preserveKey: true,
				shouldRefresh: false,
				allowNewIntent: false
			};
			return;
		}
		applyCmd = beginPaymentCommand(applyCmd);
		const key = applyCmd.idempotencyKey;
		applyError = null;
		try {
			const res = await applyCredit(invoice.id, {
				holderPartyId: holder!.holderPartyId,
				amount: Number(applyAmount),
				idempotencyKey: key
			});
			applyCmd = completePaymentCommandSuccess();
			successMessage = `${CREDIT_SETTLEMENT_LABEL} ${formatXOF(res.amountApplied)} — reste dû ${formatXOF(res.remainingReceivable)}.`;
			closeApplyCredit();
			await refresh();
		} catch (e) {
			const classified = classifyCreditApplyError(e);
			applyError = classified;
			if (classified.preserveKey) {
				applyCmd = completePaymentCommandError(applyCmd);
			} else {
				applyCmd = createPaymentCommandState();
			}
			if (classified.shouldRefresh) {
				try {
					await refresh();
					onApplyHolderChange();
				} catch {
					/* keep */
				}
			}
		}
	}

	onMount(() => {
		const raw = localStorage.getItem('medcore_token');
		if (raw)
			try {
				permissions = jwtDecode<{ permissions?: string[] }>(raw).permissions ?? [];
			} catch {
				permissions = [];
			}
		void load();
	});
</script>

<svelte:head><title>{invoice?.number ?? 'Facture'}</title></svelte:head>
<div class="mx-auto max-w-6xl space-y-6 p-6 print:p-0">
	<p class="print:hidden">
		<a class="text-sm font-bold text-blue-700" href={resolve('/billing')}>← Facturation</a>
	</p>
	{#if error}<p class="rounded-xl bg-red-50 p-3 text-red-700" data-testid="invoice-error">
			{error}
		</p>{/if}
	{#if successMessage}<div
			class="rounded-xl bg-emerald-50 p-3 font-medium text-emerald-800"
			data-testid="invoice-pay-success"
			role="status"
		>
			<p>{successMessage}</p>
			{#if invoice}
				{@const lastReceipt = latestReceiptedPayment(invoice.payments)}
				{#if lastReceipt && canShowPaymentReceipt(lastReceipt, permissions)}
					<p class="mt-2">
						<a
							class="font-bold text-teal-900 underline"
							href={resolve(`/cash/receipts/${lastReceipt.receiptId}`)}
							data-testid="invoice-pay-receipt-link">Voir le reçu {lastReceipt.receiptNumber}</a
						>
					</p>
				{/if}
			{/if}
		</div>{/if}
	{#if invoice}<header class="flex flex-wrap justify-between gap-4" data-testid="invoice-detail">
			<div>
				<p class="text-sm font-bold text-blue-700">FACTURE</p>
				<h1 class="text-3xl font-black" data-testid="invoice-number">{invoice.number}</h1>
				<p>
					{invoice.patientCode} — {invoice.patientName}
					{#if showFinancialStatement}
						·
						<a
							class="text-sm font-bold text-indigo-800 underline"
							href={resolve(`/billing/patients/${invoice.patientId}/statement`)}
							data-testid="invoice-financial-statement-link">{STATEMENT_PAGE_TITLE}</a
						>
					{/if}
				</p>
				<p class="text-sm text-slate-500" data-testid="invoice-status">
					{new Date(invoice.createdAt).toLocaleString('fr-FR')} · {invoice.status}
					{#if collectibleKind}
						· <span data-testid="invoice-collectible-label"
							>{collectibleStatusLabel(collectibleKind)}</span
						>
					{/if}
				</p>
			</div>
			<div class="flex gap-2 print:hidden">
				{#if invoice.status === 'DRAFT' && can(permissions, 'billing.issue')}<button
						class="rounded-xl bg-blue-700 px-4 py-2 font-bold text-white"
						data-testid="invoice-issue"
						onclick={issue}
						disabled={invoice.coveragePending}>Émettre</button
					>{/if}{#if ['DRAFT', 'ISSUED'].includes(invoice.status) && can(permissions, 'billing.cancel') && !invoice.creditNote}<button
						class="rounded-xl border border-red-300 px-4 py-2 font-bold text-red-700"
						data-testid="invoice-cancel"
						onclick={cancel}>Annuler</button
					>{/if}{#if showCreditNote}<button
						class="rounded-xl border border-amber-400 px-4 py-2 font-bold text-amber-900"
						data-testid="invoice-credit-note"
						onclick={openCredit}>{CREDIT_NOTE_ACTION_LABEL}</button
					>{/if}{#if showApplyCredit}<button
						class="rounded-xl border border-indigo-400 px-4 py-2 font-bold text-indigo-900"
						data-testid="invoice-apply-credit"
						onclick={openApplyCredit}>{CREDIT_APPLY_ACTION_LABEL}</button
					>{/if}<button class="rounded-xl border px-4 py-2" onclick={() => print()}>Imprimer</button
				>
			</div>
		</header>
		{#if invoice.creditNote}<section
				class="rounded-2xl border border-amber-200 bg-amber-50 p-5"
				data-testid="invoice-credit-note-panel"
			>
				<p class="text-sm font-bold text-amber-900">AVOIR ÉMIS</p>
				<p class="mt-1 font-black" data-testid="invoice-credit-note-number">
					{invoice.creditNote.number}
				</p>
				<p class="text-sm" data-testid="invoice-credit-note-amount">
					Montant : {formatXOF(invoice.creditNote.amount)}
				</p>
				<p class="text-sm" data-testid="invoice-credit-note-reason">
					Motif : {invoice.creditNote.reason}
				</p>
				<p class="text-sm text-slate-600" data-testid="invoice-credit-note-issued-at">
					Émis le {new Date(invoice.creditNote.issuedAt).toLocaleString('fr-FR')}
				</p>
				{#if canShowCustomerCredit(invoice, permissions)}
					<p
						class="mt-2 text-sm font-semibold text-emerald-900"
						data-testid="invoice-customer-credit"
					>
						Crédit financier créé : {formatXOF(invoice.customerCreditAmount ?? 0)}
					</p>
				{:else if (invoice.customerCreditAmount ?? 0) > 0}
					<p class="mt-2 text-sm text-slate-600" data-testid="invoice-customer-credit-present">
						Crédit financier créé (détail réservé aux comptes financiers).
					</p>
				{/if}
				{#if canShowCreditNoteDocument(invoice, permissions)}
					<a
						class="mt-3 inline-block font-bold text-amber-950 underline"
						href={resolve(`/billing/credit-notes/${invoice.creditNote.id}`)}
						data-testid="invoice-credit-note-link">Voir l’avoir imprimable</a
					>
				{/if}
			</section>{/if}
		{#if invoice.coveragePending}<p
				class="rounded-xl bg-amber-50 p-3 font-bold text-amber-800"
				data-testid="invoice-coverage-pending"
			>
				PEC en attente : la répartition financière n’est pas définitive et l’émission est bloquée.
			</p>{/if}
		<div class="overflow-x-auto rounded-2xl border bg-white">
			<table class="w-full text-left text-sm">
				<thead class="bg-slate-50"
					><tr
						><th class="p-3">Acte</th><th>Qté</th><th>PU</th><th>Brut</th><th>PEC</th><th
							>Assurance</th
						><th>Patient</th></tr
					></thead
				><tbody
					>{#each invoice.lines ?? [] as line (line.id)}<tr class="border-t"
							><td class="p-3"
								><strong>{line.description}</strong><small class="block text-slate-500"
									>{formatBillingActType(line.actType)}</small
								></td
							><td>{line.quantity}</td><td data-testid={`invoice-line-unit-${line.id}`}
								>{formatXOF(line.unitPrice)}</td
							><td data-testid={`invoice-line-gross-${line.id}`}>{formatXOF(line.grossAmount)}</td
							><td>{line.authorizationNumber || line.coverageResolution}</td><td
								data-testid={`invoice-line-insurance-${line.id}`}
								>{formatXOF(line.insuranceAmount)}</td
							><td data-testid={`invoice-line-patient-${line.id}`}
								>{formatXOF(line.patientAmount)}</td
							></tr
						>{/each}</tbody
				>
			</table>
		</div>
		<div
			class="ml-auto grid max-w-lg grid-cols-2 gap-2 rounded-2xl border bg-white p-5"
			data-testid="invoice-amounts"
		>
			<span>Montant brut</span><strong class="text-right" data-testid="invoice-gross"
				>{formatXOF(invoice.grossAmount)}</strong
			><span>Part assurance</span><strong class="text-right" data-testid="invoice-insurance"
				>{formatXOF(invoice.insuranceAmount)}</strong
			><span>Part patient</span><strong class="text-right" data-testid="invoice-patient"
				>{formatXOF(invoice.patientAmount)}</strong
			><span>Déjà payé (argent)</span><strong class="text-right" data-testid="invoice-paid"
				>{formatXOF(invoice.paidAmount)}</strong
			><span>{CREDIT_APPLIED_LABEL}</span><strong
				class="text-right"
				data-testid="invoice-credit-applied">{formatXOF(invoice.creditAppliedAmount ?? 0)}</strong
			><span class="text-lg">Reste patient</span><strong
				class="text-right text-lg text-blue-700"
				data-testid="invoice-balance">{formatXOF(invoice.balanceAmount)}</strong
			>
		</div>
		{#if showCreditBalances}<section
				class="space-y-2 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 print:hidden"
				data-testid="invoice-credit-balances"
			>
				<h2 class="font-black text-indigo-950">{CREDIT_AVAILABLE_LABEL}</h2>
				<p class="text-sm text-slate-600">
					Soldes autoritatifs du serveur (titulaire × patient). Ce n’est pas un encaissement.
				</p>
				{#if applyHolders.length === 0}
					<p class="text-sm text-slate-600" data-testid="invoice-credit-balances-empty">
						Aucun crédit disponible pour ce patient.
					</p>
				{:else}
					<ul class="space-y-1 text-sm" data-testid="invoice-credit-balances-list">
						{#each applyHolders as bal (bal.holderPartyId)}
							<li data-testid={`invoice-credit-holder-${bal.holderPartyId}`}>
								Titulaire #{bal.holderPartyId} —
								<strong>{formatXOF(bal.availableCredit)}</strong>
								<span class="text-slate-500"
									>(crédité {formatXOF(bal.totalCredited)}, utilisé {formatXOF(
										bal.totalApplied
									)})</span
								>
							</li>
						{/each}
					</ul>
				{/if}
			</section>{/if}
		{#if showCollection}<section
				class="space-y-3 rounded-2xl border border-emerald-200 bg-white p-5 print:hidden"
				data-testid="invoice-collection"
				aria-labelledby="collection-title"
			>
				<h2 id="collection-title" class="font-black text-emerald-900">Encaissement patient</h2>
				<p class="text-sm text-slate-600">
					Le reste affiché provient du serveur. Un paiement concurrent peut le rendre obsolète —
					l’encaissement reste contrôlé côté API.
				</p>
				{#if paymentError}<div
						class="rounded-xl bg-amber-50 p-3 text-amber-950"
						data-testid="invoice-pay-error"
						role="alert"
					>
						<p class="font-medium">{paymentError.message}</p>
						<div class="mt-2 flex flex-wrap gap-2">
							{#if paymentError.kind === 'network_uncertain'}<button
									type="button"
									class="rounded-lg border border-amber-400 px-3 py-1 text-sm font-bold"
									data-testid="invoice-pay-retry"
									onclick={pay}>Réessayer (même intention)</button
								><button
									type="button"
									class="rounded-lg border px-3 py-1 text-sm font-bold"
									data-testid="invoice-pay-verify"
									onclick={() => void refresh()}>Vérifier la facture</button
								>{/if}
							{#if paymentError.allowNewIntent}<button
									type="button"
									class="rounded-lg border px-3 py-1 text-sm font-bold"
									data-testid="invoice-pay-new-intent"
									onclick={startNewPaymentIntent}>Nouvelle intention de paiement</button
								>{/if}
						</div>
					</div>{/if}
				{#if amountHint}<p
						class="text-sm font-medium text-red-700"
						data-testid="invoice-amount-hint"
					>
						{amountHint}
					</p>{/if}
				<div class="grid gap-3 md:grid-cols-4">
					<label class="block text-sm"
						><span class="font-bold">Montant</span><input
							class="mt-1 w-full rounded-xl border p-2"
							type="number"
							min="1"
							max={invoice.balanceAmount}
							bind:value={payment.amount}
							data-testid="invoice-pay-amount"
							aria-invalid={amountHint ? 'true' : undefined}
						/></label
					><label class="block text-sm"
						><span class="font-bold">Mode</span><select
							class="mt-1 w-full rounded-xl border p-2"
							bind:value={payment.paymentMethod}
							data-testid="invoice-pay-method"
							>{#each BILLING_PAYMENT_METHODS as m (m.value)}<option value={m.value}
									>{m.label}</option
								>{/each}</select
						></label
					><label class="block text-sm md:col-span-1"
						><span class="font-bold">Référence</span><input
							class="mt-1 w-full rounded-xl border p-2"
							placeholder="Facultatif"
							bind:value={payment.reference}
							data-testid="invoice-pay-reference"
						/></label
					><button
						type="button"
						class="self-end rounded-xl bg-emerald-700 px-4 py-2 font-bold text-white disabled:opacity-40"
						onclick={pay}
						disabled={isPaymentFormSubmitDisabled(
							paymentCmd,
							payment.amount,
							invoice.balanceAmount
						) || !can(permissions, COLLECTION_PERMISSION)}
						data-testid="invoice-pay"
						>{isPaymentSubmitDisabled(paymentCmd) ? 'Encaissement…' : 'Encaisser'}</button
					>
				</div>
				<div
					class="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3"
					data-testid="invoice-payer-panel"
				>
					<label class="flex items-center gap-2 text-sm font-semibold"
						><input
							type="checkbox"
							bind:checked={payerForm.patientIsPayer}
							data-testid="invoice-payer-is-patient"
						/>{PAYER_PATIENT_LABEL}</label
					>
					{#if !payerForm.patientIsPayer}
						<div class="grid gap-2 md:grid-cols-4">
							<label class="block text-sm"
								><span class="font-bold">Type</span><select
									class="mt-1 w-full rounded-xl border p-2"
									bind:value={payerForm.mode}
									data-testid="invoice-payer-mode"
									><option value="INDIVIDUAL">Personne physique</option><option value="ORGANIZATION"
										>Organisation</option
									></select
								></label
							><label class="block text-sm md:col-span-1"
								><span class="font-bold">Nom</span><input
									class="mt-1 w-full rounded-xl border p-2"
									bind:value={payerForm.displayName}
									data-testid="invoice-payer-name"
								/></label
							><label class="block text-sm"
								><span class="font-bold">Téléphone</span><input
									class="mt-1 w-full rounded-xl border p-2"
									bind:value={payerForm.phone}
									data-testid="invoice-payer-phone"
								/></label
							>{#if payerForm.mode === 'INDIVIDUAL'}<label class="block text-sm"
									><span class="font-bold">Lien</span><input
										class="mt-1 w-full rounded-xl border p-2"
										placeholder="Parent, conjoint…"
										bind:value={payerForm.relationship}
										data-testid="invoice-payer-relationship"
									/></label
								>{/if}
						</div>
					{/if}
					{#if payerHint}<p
							class="text-sm font-medium text-red-700"
							data-testid="invoice-payer-hint"
						>
							{payerHint}
						</p>{/if}
				</div>
			</section>{:else if paymentAllowed(invoice) && !can(permissions, COLLECTION_PERMISSION)}
			<p
				class="rounded-xl bg-slate-50 p-3 text-sm text-slate-600 print:hidden"
				data-testid="invoice-pay-denied"
			>
				Encaissement réservé aux comptes autorisés ({COLLECTION_PERMISSION}).
			</p>
		{/if}
		<section class="rounded-2xl border bg-white p-5" data-testid="invoice-payments">
			<h2 class="mb-3 font-black">Historique des paiements</h2>
			{#if invoice.payments?.length}<div class="overflow-x-auto">
					<table class="w-full text-left text-sm">
						<thead class="bg-slate-50 text-xs uppercase text-slate-500"
							><tr
								><th class="p-2">Date</th><th>Mode</th><th>Référence</th><th>Montant</th><th
									>Payeur</th
								><th>Reçu par</th><th>État</th><th>Reçu</th><th class="print:hidden">Action</th></tr
							></thead
						><tbody
							>{#each invoice.payments as p (p.id)}<tr
									class="border-t"
									data-testid={`invoice-payment-${p.id}`}
									><td class="p-2">{new Date(p.paidAt).toLocaleString('fr-FR')}</td><td
										>{p.paymentMethod}</td
									><td>{p.reference || '—'}</td><td class="font-bold">{formatXOF(p.amount)}</td><td
										data-testid={`invoice-payment-payer-${p.id}`}>{formatPayerDisplay(p)}</td
									><td>{p.receivedBy}</td><td
										>{#if paymentIsReversed(p)}<span
												class="font-semibold text-amber-800"
												data-testid={`invoice-reversed-${p.id}`}>Contrepassé</span
											>{#if paymentIsPostCloseCorrection(p)}<span
													class="mt-1 block text-xs font-semibold text-amber-900"
													data-testid={`invoice-post-close-${p.id}`}
													>{POST_CLOSE_CORRECTION_LABEL}</span
												>{/if}{#if p.cashCorrectionExecuted}<span
													class="mt-1 block text-xs font-semibold text-emerald-900"
													data-testid={`invoice-correction-executed-${p.id}`}
													>{CORRECTION_EXECUTED_LABEL}</span
												>{/if}{:else}<span class="text-slate-500">Effectif</span>{/if}</td
									><td
										>{#if canShowPaymentReceipt(p, permissions)}<a
												class="font-semibold text-teal-800 underline"
												href={resolve(`/cash/receipts/${p.receiptId}`)}
												data-testid={`invoice-receipt-${p.id}`}>Voir le reçu</a
											>{:else if p.receiptId}<span
												class="text-slate-400"
												data-testid={`invoice-receipt-denied-${p.id}`}>Reçu</span
											>{:else}<span class="text-slate-400">—</span>{/if}</td
									><td class="print:hidden space-y-1"
										>{#if canShowReversePayment(p, permissions)}<button
												type="button"
												class="block text-sm font-semibold text-amber-900 underline"
												data-testid={`invoice-reverse-${p.id}`}
												onclick={() => openReverse(p)}>{REVERSAL_ACTION_LABEL}</button
											>{/if}{#if paymentIsPostCloseCorrection(p) && can(permissions, 'cash.correction.execute') && !p.cashCorrectionExecuted}<button
												type="button"
												class="block text-sm font-semibold text-teal-900 underline"
												data-testid={`invoice-execute-correction-${p.id}`}
												onclick={() => openExecute(p)}>{CORRECTION_EXECUTE_LABEL}</button
											>{:else if p.cashCorrectionExecuted}<span
												class="text-xs text-emerald-800"
												data-testid={`invoice-correction-done-${p.id}`}>Exécutée</span
											>{:else if !canShowReversePayment(p, permissions)}<span class="text-slate-400"
												>—</span
											>{/if}</td
									></tr
								>{/each}</tbody
						>
					</table>
				</div>{:else}<p class="text-sm text-slate-500" data-testid="invoice-payments-empty">
					Aucun paiement enregistré.
				</p>{/if}
		</section>
		{#if invoice.insuranceAmount > 0}<section
				class="rounded-2xl border border-indigo-200 bg-indigo-50 p-5"
			>
				<h2 class="font-black text-indigo-900">RECOUVREMENT ASSURANCE</h2>
				<p class="text-sm text-indigo-700">
					Le statut payé du patient ne vaut pas règlement assureur.
				</p>
				{#each insuranceReceivables as debt (debt.invoiceLineId)}<div
						class="mt-3 grid gap-2 border-t border-indigo-200 pt-3 md:grid-cols-6"
					>
						<span>{debt.companyName}</span><span>{debt.authorizationNumber}</span><span
							>{debt.description}</span
						><span>Part {formatXOF(debt.insuranceDue)}</span><span
							>Réglé {formatXOF(debt.insurancePaid)}</span
						><span
							>Reste {formatXOF(debt.insuranceBalance)} · {debt.batchNumber ||
								'sans bordereau'}</span
						>
					</div>{/each}
			</section>{/if}{/if}
	{#if reverseTarget}<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 print:hidden"
			data-testid="invoice-reverse-modal"
			role="dialog"
			aria-modal="true"
		>
			<div class="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 shadow-xl">
				<h2 class="text-lg font-black text-amber-950">{REVERSAL_ACTION_LABEL}</h2>
				<p class="text-sm text-slate-600">
					Corrige l’effet financier HIS de cet encaissement. Cela n’enregistre pas un remboursement
					externe.
				</p>
				{#if cashSessionReversalWarning(reverseTarget)}<p
						class="rounded-xl bg-amber-50 p-3 text-sm text-amber-950"
						data-testid="invoice-reverse-cash-session-warn"
					>
						{cashSessionReversalWarning(reverseTarget)}
					</p>{/if}
				<dl class="grid grid-cols-2 gap-2 text-sm">
					<dt class="text-slate-500">Montant</dt>
					<dd class="font-bold" data-testid="invoice-reverse-amount">
						{formatXOF(reverseTarget.amount)}
					</dd>
					<dt class="text-slate-500">Mode</dt>
					<dd data-testid="invoice-reverse-method">{reverseTarget.paymentMethod}</dd>
					<dt class="text-slate-500">Date</dt>
					<dd>{new Date(reverseTarget.paidAt).toLocaleString('fr-FR')}</dd>
					<dt class="text-slate-500">Référence</dt>
					<dd>{reverseTarget.reference || '—'}</dd>
				</dl>
				<label class="block text-sm">
					<span class="font-bold">Motif</span>
					<textarea
						class="mt-1 w-full rounded-xl border p-2"
						rows="3"
						bind:value={reverseReason}
						data-testid="invoice-reverse-reason"></textarea>
				</label>
				<label class="flex items-start gap-2 text-sm">
					<input
						type="checkbox"
						bind:checked={reverseConfirm}
						data-testid="invoice-reverse-confirm"
					/>
					<span
						>Je confirme la contrepassation de cet encaissement (sans remboursement automatique).</span
					>
				</label>
				{#if reverseError}<p
						class="text-sm text-amber-900"
						data-testid="invoice-reverse-error"
						role="alert"
					>
						{reverseError.message}
					</p>{/if}
				<div class="flex justify-end gap-2">
					<button
						type="button"
						class="rounded-xl border px-4 py-2 font-bold"
						onclick={closeReverse}
						data-testid="invoice-reverse-cancel">Fermer</button
					>
					<button
						type="button"
						class="rounded-xl bg-amber-800 px-4 py-2 font-bold text-white disabled:opacity-40"
						onclick={submitReverse}
						disabled={isPaymentSubmitDisabled(reverseCmd)}
						data-testid="invoice-reverse-submit"
						>{isPaymentSubmitDisabled(reverseCmd)
							? 'Contrepassation…'
							: REVERSAL_ACTION_LABEL}</button
					>
				</div>
			</div>
		</div>{/if}
	{#if execTarget}<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 print:hidden"
			data-testid="invoice-execute-correction-modal"
			role="dialog"
			aria-modal="true"
		>
			<div class="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 shadow-xl">
				<h2 class="text-lg font-black text-teal-950">{CORRECTION_EXECUTE_LABEL}</h2>
				<p class="text-sm text-slate-600" data-testid="invoice-execute-correction-explain">
					{CORRECTION_EXPLAIN}
				</p>
				{#if execLoading}<p data-testid="invoice-execute-correction-loading">Chargement…</p>{/if}
				{#if execElig}
					{#if !execElig.eligible}<p
							class="rounded-xl bg-amber-50 p-3 text-sm text-amber-950"
							data-testid="invoice-execute-correction-unavailable"
						>
							{correctionExecuteUnavailableReason(execElig)}
						</p>{/if}
					{#if execElig.hostSession}<dl class="grid grid-cols-2 gap-2 text-sm">
							<dt class="text-slate-500">Montant</dt>
							<dd class="font-bold" data-testid="invoice-execute-correction-amount">
								{formatXOF(execElig.amount)}
							</dd>
							<dt class="text-slate-500">Session hôte</dt>
							<dd data-testid="invoice-execute-correction-host">
								#{execElig.hostSession.session.id} — {execElig.hostSession.session.register?.code}
							</dd>
							<dt class="text-slate-500">Espèces attendues</dt>
							<dd data-testid="invoice-execute-correction-expected">
								{formatXOF(execElig.hostSession.expectedCash)}
							</dd>
						</dl>{/if}
				{/if}
				<label class="block text-sm">
					<span class="font-bold">Note d’exécution (optionnelle)</span>
					<textarea
						class="mt-1 w-full rounded-xl border p-2"
						rows="2"
						bind:value={execNote}
						data-testid="invoice-execute-correction-note"></textarea>
				</label>
				<label class="flex items-start gap-2 text-sm">
					<input
						type="checkbox"
						bind:checked={execConfirm}
						data-testid="invoice-execute-correction-confirm"
					/>
					<span>Je confirme l’enregistrement de la sortie d’espèces sur la session hôte.</span>
				</label>
				{#if execError}<p
						class="text-sm text-amber-900"
						data-testid="invoice-execute-correction-error"
						role="alert"
					>
						{execError}
					</p>{/if}
				<div class="flex justify-end gap-2">
					<button
						type="button"
						class="rounded-xl border px-4 py-2 font-bold"
						onclick={closeExecute}
						data-testid="invoice-execute-correction-cancel">Fermer</button
					>
					<button
						type="button"
						class="rounded-xl bg-teal-800 px-4 py-2 font-bold text-white disabled:opacity-40"
						onclick={submitExecute}
						disabled={isPaymentSubmitDisabled(execCmd) ||
							!canShowExecuteCorrection(execTarget, permissions, execElig)}
						data-testid="invoice-execute-correction-submit"
						>{isPaymentSubmitDisabled(execCmd) ? 'Exécution…' : CORRECTION_EXECUTE_LABEL}</button
					>
				</div>
			</div>
		</div>{/if}
	{#if creditOpen && invoice}<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 print:hidden"
			data-testid="invoice-credit-note-modal"
			role="dialog"
			aria-modal="true"
		>
			<div class="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 shadow-xl">
				<h2 class="text-lg font-black text-amber-950">{CREDIT_NOTE_ACTION_LABEL}</h2>
				<p class="text-sm text-slate-600">
					Document correctif comptable. Cela ne restitue pas de fonds au patient et n’annule pas un
					encaissement.
				</p>
				<dl class="grid grid-cols-2 gap-2 text-sm">
					<dt class="text-slate-500">Facture</dt>
					<dd class="font-bold">{invoice.number}</dd>
					<dt class="text-slate-500">Max corrigible</dt>
					<dd class="font-bold" data-testid="invoice-credit-note-modal-max">
						{formatXOF(creditNoteDefaultAmount(invoice))}
					</dd>
				</dl>
				<label class="block text-sm">
					<span class="font-bold">Montant de la réduction</span>
					<input
						class="mt-1 w-full rounded-xl border p-2"
						type="number"
						min="1"
						max={creditNoteDefaultAmount(invoice)}
						bind:value={creditAmount}
						data-testid="invoice-credit-note-amount-input"
					/>
				</label>
				<label class="block text-sm">
					<span class="font-bold">Motif</span>
					<textarea
						class="mt-1 w-full rounded-xl border p-2"
						rows="3"
						bind:value={creditReason}
						data-testid="invoice-credit-note-reason-input"></textarea>
				</label>
				<label class="flex items-start gap-2 text-sm">
					<input
						type="checkbox"
						bind:checked={creditConfirm}
						data-testid="invoice-credit-note-confirm"
					/>
					<span
						>Je confirme l’émission de cet avoir (correction de facture, sans restitution de fonds).</span
					>
				</label>
				{#if creditError}<p
						class="text-sm text-amber-900"
						data-testid="invoice-credit-note-error"
						role="alert"
					>
						{creditError.message}
					</p>{/if}
				<div class="flex justify-end gap-2">
					<button
						type="button"
						class="rounded-xl border px-4 py-2 font-bold"
						onclick={closeCredit}
						data-testid="invoice-credit-note-cancel">Fermer</button
					>
					<button
						type="button"
						class="rounded-xl bg-amber-800 px-4 py-2 font-bold text-white disabled:opacity-40"
						onclick={submitCredit}
						disabled={isPaymentSubmitDisabled(creditCmd)}
						data-testid="invoice-credit-note-submit"
						>{isPaymentSubmitDisabled(creditCmd) ? 'Émission…' : CREDIT_NOTE_ACTION_LABEL}</button
					>
				</div>
			</div>
		</div>{/if}
	{#if applyOpen && invoice}<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 print:hidden"
			data-testid="invoice-apply-credit-modal"
			role="dialog"
			aria-modal="true"
		>
			<div class="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 shadow-xl">
				<h2 class="text-lg font-black text-indigo-950">{CREDIT_APPLY_ACTION_LABEL}</h2>
				<p class="text-sm text-slate-600">
					{CREDIT_SETTLEMENT_LABEL} — allocation du crédit déjà disponible. Aucun nouvel argent n’entre
					en caisse.
				</p>
				<dl class="grid grid-cols-2 gap-2 text-sm">
					<dt class="text-slate-500">Facture</dt>
					<dd class="font-bold">{invoice.number}</dd>
					<dt class="text-slate-500">Reste dû</dt>
					<dd class="font-bold" data-testid="invoice-apply-credit-receivable">
						{formatXOF(invoice.balanceAmount)}
					</dd>
				</dl>
				{#if applyHolders.length > 1}
					<label class="block text-sm">
						<span class="font-bold">Titulaire du crédit</span>
						<select
							class="mt-1 w-full rounded-xl border p-2"
							bind:value={applyHolderId}
							onchange={onApplyHolderChange}
							data-testid="invoice-apply-credit-holder"
						>
							{#each applyHolders as bal (bal.holderPartyId)}
								<option value={bal.holderPartyId}>
									#{bal.holderPartyId} — {formatXOF(bal.availableCredit)}
								</option>
							{/each}
						</select>
					</label>
				{:else if selectedApplyHolder}
					<p class="text-sm" data-testid="invoice-apply-credit-holder-single">
						Titulaire #{selectedApplyHolder.holderPartyId} — {CREDIT_AVAILABLE_LABEL}
						{formatXOF(selectedApplyHolder.availableCredit)}
					</p>
				{/if}
				<label class="block text-sm">
					<span class="font-bold">Montant à appliquer</span>
					<input
						class="mt-1 w-full rounded-xl border p-2"
						type="number"
						min="1"
						max={selectedApplyHolder ? maxApplicableAmount(invoice, selectedApplyHolder) : 0}
						bind:value={applyAmount}
						data-testid="invoice-apply-credit-amount"
					/>
				</label>
				<label class="flex items-start gap-2 text-sm">
					<input
						type="checkbox"
						bind:checked={applyConfirm}
						data-testid="invoice-apply-credit-confirm"
					/>
					<span
						>Je confirme le {CREDIT_SETTLEMENT_LABEL.toLowerCase()} (pas un encaissement, pas un remboursement).</span
					>
				</label>
				{#if applyError}<p
						class="text-sm text-amber-900"
						data-testid="invoice-apply-credit-error"
						role="alert"
					>
						{applyError.message}
					</p>{/if}
				<div class="flex justify-end gap-2">
					<button
						type="button"
						class="rounded-xl border px-4 py-2 font-bold"
						onclick={closeApplyCredit}
						data-testid="invoice-apply-credit-cancel">Fermer</button
					>
					<button
						type="button"
						class="rounded-xl bg-indigo-800 px-4 py-2 font-bold text-white disabled:opacity-40"
						onclick={submitApplyCredit}
						disabled={isPaymentSubmitDisabled(applyCmd)}
						data-testid="invoice-apply-credit-submit"
						>{isPaymentSubmitDisabled(applyCmd)
							? 'Application…'
							: CREDIT_APPLY_ACTION_LABEL}</button
					>
				</div>
			</div>
		</div>{/if}
</div>
