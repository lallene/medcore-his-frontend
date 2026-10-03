<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { jwtDecode } from 'jwt-decode';
	import { cancelInvoice, getInvoice, issueInvoice, payInvoice } from '$lib/api/billing';
	import { listInsuranceReceivables } from '$lib/api/insurance-receivables';
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
		latestReceiptedPayment,
		mergePaymentHistory,
		paymentAmountErrorMessage,
		validatePaymentAmount,
		type PaymentUxError
	} from '$lib/components/billing/collection';
	import type { Invoice } from '$lib/types/billing';
	import type { InsuranceReceivable } from '$lib/types/insurance-receivables';

	let invoice = $state<Invoice | null>(null);
	let error = $state('');
	let paymentError = $state<PaymentUxError | null>(null);
	let successMessage = $state('');
	let permissions = $state<string[]>([]);
	let insuranceReceivables = $state<InsuranceReceivable[]>([]);
	let payment = $state({ amount: 0, paymentMethod: 'CASH', reference: '' });
	let paymentCmd = $state(createPaymentCommandState());
	let amountHint = $state('');

	const collectibleKind = $derived(invoice ? invoiceCollectibleKind(invoice) : null);
	const showCollection = $derived(invoice ? canShowEncaisser(invoice, permissions) : false);

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
		if (invoice) payment.amount = invoice.balanceAmount;
	}

	async function pay() {
		if (!invoice || isPaymentSubmitDisabled(paymentCmd)) return;
		const check = validatePaymentAmount(payment.amount, invoice.balanceAmount);
		if (!check.ok) {
			amountHint = paymentAmountErrorMessage(check.reason);
			return;
		}
		amountHint = '';
		paymentCmd = beginPaymentCommand(paymentCmd);
		const key = paymentCmd.idempotencyKey;
		paymentError = null;
		successMessage = '';
		error = '';
		try {
			const updated = await payInvoice(invoice.id, { ...payment, idempotencyKey: key });
			invoice = {
				...updated,
				payments: mergePaymentHistory(invoice.payments, updated.payments)
			};
			paymentCmd = completePaymentCommandSuccess();
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
				<p>{invoice.patientCode} — {invoice.patientName}</p>
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
					>{/if}{#if ['DRAFT', 'ISSUED'].includes(invoice.status) && can(permissions, 'billing.cancel')}<button
						class="rounded-xl border border-red-300 px-4 py-2 font-bold text-red-700"
						data-testid="invoice-cancel"
						onclick={cancel}>Annuler</button
					>{/if}<button class="rounded-xl border px-4 py-2" onclick={() => print()}>Imprimer</button
				>
			</div>
		</header>
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
			><span>Déjà payé</span><strong class="text-right" data-testid="invoice-paid"
				>{formatXOF(invoice.paidAmount)}</strong
			><span class="text-lg">Reste patient</span><strong
				class="text-right text-lg text-blue-700"
				data-testid="invoice-balance">{formatXOF(invoice.balanceAmount)}</strong
			>
		</div>
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
									>Reçu par</th
								><th>Reçu</th></tr
							></thead
						><tbody
							>{#each invoice.payments as p (p.id)}<tr
									class="border-t"
									data-testid={`invoice-payment-${p.id}`}
									><td class="p-2">{new Date(p.paidAt).toLocaleString('fr-FR')}</td><td
										>{p.paymentMethod}</td
									><td>{p.reference || '—'}</td><td class="font-bold">{formatXOF(p.amount)}</td><td
										>{p.receivedBy}</td
									><td
										>{#if canShowPaymentReceipt(p, permissions)}<a
												class="font-semibold text-teal-800 underline"
												href={resolve(`/cash/receipts/${p.receiptId}`)}
												data-testid={`invoice-receipt-${p.id}`}>Voir le reçu</a
											>{:else if p.receiptId}<span
												class="text-slate-400"
												data-testid={`invoice-receipt-denied-${p.id}`}>Reçu</span
											>{:else}<span class="text-slate-400">—</span>{/if}</td
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
</div>
