<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { getCreditNote } from '$lib/api/billing';
	import { formatXOF } from '$lib/components/billing/state';
	import type { CreditNote } from '$lib/types/billing';

	let note = $state<CreditNote | null>(null);
	let error = $state('');

	onMount(async () => {
		try {
			note = await getCreditNote(Number(page.params.id));
		} catch (e) {
			error = e instanceof Error ? e.message : 'Avoir introuvable';
		}
	});
</script>

<svelte:head><title>{note?.number ?? 'Avoir'}</title></svelte:head>
<div class="mx-auto max-w-2xl p-8" data-testid="credit-note-document">
	{#if error}<p class="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>{/if}
	{#if note}
		<header class="text-center">
			<h1 class="text-2xl font-black">MEDCORE HIS</h1>
			<h2 class="text-xl font-black tracking-wide" data-testid="credit-note-doc-type">AVOIR</h2>
			<p class="mt-2 text-xl font-black" data-testid="credit-note-doc-number">{note.number}</p>
			<p class="mt-2 text-sm text-slate-600">
				Document correctif de facture — ne constitue pas un remboursement.
			</p>
		</header>
		<div class="mt-6 grid grid-cols-2 gap-2 text-sm">
			<span>Date d’émission</span><b data-testid="credit-note-doc-issued-at"
				>{new Date(note.issuedAt).toLocaleString('fr-FR')}</b
			>
			<span>Émetteur</span><b data-testid="credit-note-doc-issuer"
				>{note.issuerName || `Utilisateur #${note.issuedBy}`}</b
			>
			<span>Facture d’origine</span><b data-testid="credit-note-doc-invoice">{note.invoiceNumber}</b
			>
			<span>Patient</span><b data-testid="credit-note-doc-patient"
				>{note.patientCode} — {note.patientName}</b
			>
			<span>Montant facture (brut)</span><b>{formatXOF(note.invoiceGrossAmount ?? 0)}</b>
			<span>Part patient d’origine</span><b>{formatXOF(note.patientAmount ?? note.amount)}</b>
			<span>Montant de l’avoir</span><b data-testid="credit-note-doc-amount"
				>{formatXOF(note.amount)}</b
			>
			<span>Motif</span><b data-testid="credit-note-doc-reason">{note.reason}</b>
		</div>
		<p class="mt-6 text-sm text-slate-700">
			Cet avoir corrige la facture {note.invoiceNumber}. Il ne signifie pas que des fonds ont été
			restitués au patient.
		</p>
		<div class="mt-6 flex gap-2 print:hidden">
			<a class="rounded-xl border px-4 py-2 font-bold" href={resolve(`/billing/${note.invoiceId}`)}
				>Retour facture</a
			>
			<button class="rounded-xl border px-4 py-2 font-bold" onclick={() => print()}>Imprimer</button
			>
		</div>
	{/if}
</div>
