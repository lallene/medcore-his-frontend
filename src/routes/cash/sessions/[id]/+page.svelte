<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { getSession, sessionJournal } from '$lib/api/cash';
	import { formatXOF } from '$lib/components/billing/state';
	import type { CashReceipt, SessionSummary } from '$lib/types/cash';
	let session = $state<SessionSummary | null>(null),
		rows = $state<CashReceipt[]>([]);
	onMount(async () => {
		[session, rows] = await Promise.all([
			getSession(Number(page.params.id)),
			sessionJournal(Number(page.params.id))
		]);
	});
</script>

<div class="space-y-5 p-6">
	{#if session}<h1 class="text-3xl font-black">Session #{session.session.id}</h1>
		<div class="grid gap-3 md:grid-cols-4">
			<p>Fond <b>{formatXOF(session.session.openingFloat)}</b></p>
			<p>Total <b>{formatXOF(session.totalPayments)}</b></p>
			<p>Espèces théoriques <b>{formatXOF(session.expectedCash)}</b></p>
			<p>Écart <b>{formatXOF(session.session.cashDifference ?? 0)}</b></p>
		</div>
		<button class="print:hidden" onclick={() => print()}>Imprimer le rapport</button>
		<div class="rounded-2xl border bg-white">
			{#each rows as r (r.id)}<a
					class="grid gap-2 border-b p-3 md:grid-cols-5"
					href={resolve(`/cash/receipts/${r.id}`)}
					><b>{r.receiptNumber}</b><span>{r.invoiceNumber}</span><span>{r.patientName}</span><span
						>{r.paymentMethod}</span
					><b>{formatXOF(r.amount)}</b></a
				>{/each}
		</div>{/if}
</div>
