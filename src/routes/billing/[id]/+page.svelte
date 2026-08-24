<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { jwtDecode } from 'jwt-decode';
	import { cancelInvoice, getInvoice, issueInvoice, payInvoice } from '$lib/api/billing';
	import { listInsuranceReceivables } from '$lib/api/insurance-receivables';
	import { can, formatXOF, paymentAllowed } from '$lib/components/billing/state';
	import type { Invoice } from '$lib/types/billing';
	import type { InsuranceReceivable } from '$lib/types/insurance-receivables';
	let invoice = $state<Invoice | null>(null);
	let error = $state('');
	let permissions = $state<string[]>([]);
	let insuranceReceivables = $state<InsuranceReceivable[]>([]);
	let payment = $state({ amount: 0, paymentMethod: 'CASH', reference: '' });
	async function refresh() {
		try {
			invoice = await getInvoice(Number(page.params.id));
			insuranceReceivables =
				invoice.insuranceAmount > 0
					? (await listInsuranceReceivables({ search: invoice.number, limit: 100 })).items.filter(
							(x) => x.invoiceId === invoice!.id
						)
					: [];
			if (invoice) payment.amount = invoice.balanceAmount;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Facture introuvable';
		}
	}
	async function issue() {
		if (!invoice) return;
		try {
			invoice = await issueInvoice(invoice.id);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Émission impossible';
		}
	}
	async function pay() {
		if (!invoice) return;
		try {
			invoice = await payInvoice(invoice.id, { ...payment, idempotencyKey: crypto.randomUUID() });
		} catch (e) {
			error = e instanceof Error ? e.message : 'Paiement impossible';
		}
	}
	async function cancel() {
		if (!invoice) return;
		const reason = prompt("Motif d'annulation");
		if (!reason) return;
		try {
			invoice = await cancelInvoice(invoice.id, reason);
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
		void refresh();
	});
</script>

<svelte:head><title>{invoice?.number ?? 'Facture'}</title></svelte:head>
<div class="mx-auto max-w-6xl space-y-6 p-6 print:p-0">
	{#if error}<p class="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>{/if}{#if invoice}<header
			class="flex flex-wrap justify-between gap-4"
		>
			<div>
				<p class="text-sm font-bold text-blue-700">FACTURE</p>
				<h1 class="text-3xl font-black">{invoice.number}</h1>
				<p>{invoice.patientCode} — {invoice.patientName}</p>
				<p class="text-sm text-slate-500">
					{new Date(invoice.createdAt).toLocaleString('fr-FR')} · {invoice.status}
				</p>
			</div>
			<div class="flex gap-2 print:hidden">
				{#if invoice.status === 'DRAFT' && can(permissions, 'billing.issue')}<button
						class="rounded-xl bg-blue-700 px-4 py-2 font-bold text-white"
						onclick={issue}
						disabled={invoice.coveragePending}>Émettre</button
					>{/if}{#if ['DRAFT', 'ISSUED'].includes(invoice.status) && can(permissions, 'billing.cancel')}<button
						class="rounded-xl border border-red-300 px-4 py-2 font-bold text-red-700"
						onclick={cancel}>Annuler</button
					>{/if}<button class="rounded-xl border px-4 py-2" onclick={() => print()}>Imprimer</button
				>
			</div>
		</header>
		{#if invoice.coveragePending}<p class="rounded-xl bg-amber-50 p-3 font-bold text-amber-800">
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
									>{line.actType}</small
								></td
							><td>{line.quantity}</td><td>{formatXOF(line.unitPrice)}</td><td
								>{formatXOF(line.grossAmount)}</td
							><td>{line.authorizationNumber || line.coverageResolution}</td><td
								>{formatXOF(line.insuranceAmount)}</td
							><td>{formatXOF(line.patientAmount)}</td></tr
						>{/each}</tbody
				>
			</table>
		</div>
		<div class="ml-auto grid max-w-lg grid-cols-2 gap-2 rounded-2xl border bg-white p-5">
			<span>Montant brut</span><strong class="text-right">{formatXOF(invoice.grossAmount)}</strong
			><span>Part assurance</span><strong class="text-right"
				>{formatXOF(invoice.insuranceAmount)}</strong
			><span>Part patient</span><strong class="text-right"
				>{formatXOF(invoice.patientAmount)}</strong
			><span>Déjà payé</span><strong class="text-right">{formatXOF(invoice.paidAmount)}</strong
			><span class="text-lg">Reste patient</span><strong class="text-right text-lg text-blue-700"
				>{formatXOF(invoice.balanceAmount)}</strong
			>
		</div>
		{#if paymentAllowed(invoice) && can(permissions, 'billing.payment.create')}<section
				class="grid gap-3 rounded-2xl border bg-white p-5 md:grid-cols-4 print:hidden"
			>
				<input
					class="rounded-xl border p-2"
					type="number"
					min="1"
					max={invoice.balanceAmount}
					bind:value={payment.amount}
				/><select class="rounded-xl border p-2" bind:value={payment.paymentMethod}
					>{#each ['CASH', 'CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'OTHER'] as m (m)}<option
							>{m}</option
						>{/each}</select
				><input
					class="rounded-xl border p-2"
					placeholder="Référence (facultatif)"
					bind:value={payment.reference}
				/><button class="rounded-xl bg-emerald-700 font-bold text-white" onclick={pay}
					>Encaisser</button
				>
			</section>{/if}
		{#if invoice.payments?.length}<section class="rounded-2xl border bg-white p-5">
				<h2 class="mb-3 font-black">Paiements</h2>
				{#each invoice.payments as p (p.id)}<p class="border-t py-2">
						{new Date(p.paidAt).toLocaleString('fr-FR')} — {p.paymentMethod} —
						<strong>{formatXOF(p.amount)}</strong>
					</p>{/each}
			</section>{/if}
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
