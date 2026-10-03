<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { listRegisters, listSessions } from '$lib/api/cash';
	import { formatXOF } from '$lib/components/billing/state';
	import type { CashRegister, CashSession, SessionListPage } from '$lib/types/cash';

	let pageData = $state<SessionListPage | null>(null);
	let registers = $state<CashRegister[]>([]);
	let loading = $state(true);
	let error = $state('');
	let status = $state<'CLOSED' | 'OPEN' | ''>('CLOSED');
	let cashRegisterId = $state(0);
	let dateFrom = $state('');
	let dateTo = $state('');
	let page = $state(1);

	async function load() {
		loading = true;
		error = '';
		try {
			pageData = await listSessions({
				status: status || undefined,
				cashRegisterId: cashRegisterId || undefined,
				dateFrom: dateFrom || undefined,
				dateTo: dateTo || undefined,
				page,
				limit: 20
			});
		} catch (e) {
			pageData = null;
			error = e instanceof Error ? e.message : 'Historique indisponible';
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		try {
			registers = await listRegisters();
		} catch {
			registers = [];
		}
		await load();
	});

	function diffLabel(s: CashSession) {
		if (s.status !== 'CLOSED' || s.cashDifference == null) return '—';
		return formatXOF(s.cashDifference);
	}
</script>

<div class="space-y-5 p-6" data-testid="cash-history">
	<header class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<p class="text-xs font-black uppercase text-emerald-700">Finance</p>
			<h1 class="text-3xl font-black">Historique des sessions</h1>
		</div>
		<a
			class="text-sm font-bold text-blue-700 print:hidden"
			href={resolve('/cash')}
			data-testid="cash-history-back">← Caisse</a
		>
	</header>

	<form
		class="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-5 print:hidden"
		onsubmit={(e) => {
			e.preventDefault();
			page = 1;
			void load();
		}}
	>
		<select class="rounded-xl border p-2" bind:value={status} data-testid="cash-history-status">
			<option value="CLOSED">Clôturées</option>
			<option value="OPEN">Ouvertes</option>
			<option value="">Toutes</option>
		</select>
		<select
			class="rounded-xl border p-2"
			bind:value={cashRegisterId}
			data-testid="cash-history-register"
		>
			<option value={0}>Toutes les caisses</option>
			{#each registers as r (r.id)}<option value={r.id}>{r.code} — {r.name}</option>{/each}
		</select>
		<input
			class="rounded-xl border p-2"
			type="date"
			bind:value={dateFrom}
			data-testid="cash-history-from"
		/>
		<input
			class="rounded-xl border p-2"
			type="date"
			bind:value={dateTo}
			data-testid="cash-history-to"
		/>
		<button
			class="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white"
			type="submit"
			data-testid="cash-history-filter">Filtrer</button
		>
	</form>

	{#if loading}<p data-testid="cash-history-loading">Chargement…</p>{/if}
	{#if error}<p class="text-red-700" data-testid="cash-history-error" role="alert">{error}</p>{/if}

	{#if pageData}<div
			class="overflow-x-auto rounded-2xl border bg-white"
			data-testid="cash-history-table"
		>
			<table class="w-full text-left text-sm">
				<thead class="border-b bg-slate-50 text-xs uppercase text-slate-500">
					<tr>
						<th class="p-3">Session</th>
						<th class="p-3">Caisse</th>
						<th class="p-3">Ouverture</th>
						<th class="p-3">Clôture</th>
						<th class="p-3">Fond</th>
						<th class="p-3">Attendu</th>
						<th class="p-3">Compté</th>
						<th class="p-3">Écart</th>
						<th class="p-3">État</th>
					</tr>
				</thead>
				<tbody>
					{#each pageData.items as s (s.id)}<tr class="border-t">
							<td class="p-3"
								><a
									class="font-bold text-blue-700"
									href={resolve(`/cash/sessions/${s.id}`)}
									data-testid={`cash-history-row-${s.id}`}>#{s.id}</a
								></td
							>
							<td class="p-3">{s.register?.code ?? s.cashRegisterId}</td>
							<td class="p-3"
								>{new Date(s.openedAt).toLocaleString('fr-FR')}<br /><span
									class="text-xs text-slate-500">#{s.openedBy}</span
								></td
							>
							<td class="p-3"
								>{#if s.closedAt}{new Date(s.closedAt).toLocaleString('fr-FR')}<br /><span
										class="text-xs text-slate-500">#{s.closedBy}</span
									>{:else}—{/if}</td
							>
							<td class="p-3">{formatXOF(s.openingFloat)}</td>
							<td class="p-3"
								>{s.expectedCashAmount != null ? formatXOF(s.expectedCashAmount) : '—'}</td
							>
							<td class="p-3"
								>{s.countedCashAmount != null ? formatXOF(s.countedCashAmount) : '—'}</td
							>
							<td class="p-3">{diffLabel(s)}</td>
							<td class="p-3">{s.status}</td>
						</tr>{:else}<tr><td class="p-4 text-slate-500" colspan="9">Aucune session.</td></tr
						>{/each}
				</tbody>
			</table>
		</div>
		<div class="flex items-center gap-3 print:hidden">
			<button
				class="rounded-xl border px-3 py-1 disabled:opacity-40"
				disabled={page <= 1}
				data-testid="cash-history-prev"
				onclick={() => {
					page -= 1;
					void load();
				}}>Précédent</button
			>
			<span data-testid="cash-history-page"
				>Page {pageData.page} / {Math.max(pageData.totalPages, 1)}</span
			>
			<button
				class="rounded-xl border px-3 py-1 disabled:opacity-40"
				disabled={page >= pageData.totalPages}
				data-testid="cash-history-next"
				onclick={() => {
					page += 1;
					void load();
				}}>Suivant</button
			>
		</div>{/if}
</div>
