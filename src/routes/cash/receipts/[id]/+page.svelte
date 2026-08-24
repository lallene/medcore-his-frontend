<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { getReceipt } from '$lib/api/cash';
	import { formatXOF } from '$lib/components/billing/state';
	import type { CashReceipt } from '$lib/types/cash';
	let receipt = $state<CashReceipt | null>(null),
		duplicate = $state(false);
	onMount(async () => (receipt = await getReceipt(Number(page.params.id))));
	function reprint() {
		duplicate = true;
		setTimeout(() => print());
	}
</script>

<div class="mx-auto max-w-2xl p-8">
	{#if receipt}<header class="text-center">
			<h1 class="text-2xl font-black">MEDCORE HIS</h1>
			<h2>REÇU DE PAIEMENT</h2>
			{#if duplicate}<p class="font-black text-red-700">DUPLICATA</p>{/if}
			<p class="text-xl font-black">{receipt.receiptNumber}</p>
		</header>
		<div class="mt-6 grid grid-cols-2 gap-2">
			<span>Date</span><b>{new Date(receipt.issuedAt).toLocaleString('fr-FR')}</b><span
				>Caissier</span
			><b>{receipt.cashierName}</b><span>Caisse</span><b
				>{receipt.registerCode} — {receipt.registerName}</b
			><span>Patient</span><b>{receipt.patientCode} — {receipt.patientName}</b><span>Facture</span
			><b>{receipt.invoiceNumber}</b><span>Montant facture</span><b
				>{formatXOF(receipt.invoiceGrossAmount)}</b
			><span>Part assurance</span><b>{formatXOF(receipt.insuranceAmount)}</b><span
				>Part patient</span
			><b>{formatXOF(receipt.patientAmount)}</b><span>Déjà payé</span><b
				>{formatXOF(receipt.paidBefore)}</b
			><span>Paiement</span><b>{formatXOF(receipt.amount)}</b><span>Reste</span><b
				>{formatXOF(receipt.balanceAfter)}</b
			><span>Mode</span><b>{receipt.paymentMethod}</b><span>Référence</span><b
				>{receipt.externalReference || '—'}</b
			>
		</div>
		<button class="mt-6 rounded-xl border px-4 py-2 print:hidden" onclick={reprint}
			>Réimprimer</button
		>{/if}
</div>
