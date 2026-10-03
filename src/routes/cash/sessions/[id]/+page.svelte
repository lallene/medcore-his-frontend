<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { getSession, sessionJournal } from '$lib/api/cash';
	import { formatXOF } from '$lib/components/billing/state';
	import { presentClosedSnapshot, presentSessionSummary } from '$lib/components/cash/state';
	import type { CashReceipt, SessionSummary } from '$lib/types/cash';
	let session = $state<SessionSummary | null>(null),
		rows = $state<CashReceipt[]>([]),
		loading = $state(true),
		error = $state('');
	const kpis = $derived(presentSessionSummary(session));
	const closed = $derived(presentClosedSnapshot(session));
	onMount(async () => {
		loading = true;
		error = '';
		try {
			[session, rows] = await Promise.all([
				getSession(Number(page.params.id)),
				sessionJournal(Number(page.params.id))
			]);
		} catch (e) {
			session = null;
			rows = [];
			error = e instanceof Error ? e.message : 'Résumé de session indisponible';
		} finally {
			loading = false;
		}
	});
</script>

<div class="space-y-5 p-6">
	{#if loading}<p data-testid="cash-session-summary-loading">Chargement…</p>{/if}
	{#if error}<p class="text-red-700" data-testid="cash-session-summary-error" role="alert">
			{error}
		</p>{/if}
	{#if session && kpis}<h1 class="text-3xl font-black">Session #{session.session.id}</h1>
		<div class="grid gap-3 md:grid-cols-4" data-testid="cash-session-summary">
			<p data-testid="cash-session-opening">Fond <b>{formatXOF(kpis.opening)}</b></p>
			<p data-testid="cash-session-cash">Espèces <b>{formatXOF(kpis.cash)}</b></p>
			<p data-testid="cash-session-other">Autres <b>{formatXOF(kpis.other)}</b></p>
			<p data-testid="cash-session-total">Total <b>{formatXOF(kpis.total)}</b></p>
			<p data-testid="cash-session-count">Opérations <b>{kpis.count}</b></p>
			<p data-testid="cash-session-expected">
				Espèces théoriques <b>{formatXOF(kpis.expected)}</b>
			</p>
			{#if closed}<p data-testid="cash-session-counted">
					Compté <b>{formatXOF(closed.counted ?? 0)}</b>
				</p>
				<p data-testid="cash-session-difference">
					Écart <b>{formatXOF(closed.difference ?? 0)}</b>
				</p>{/if}
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
