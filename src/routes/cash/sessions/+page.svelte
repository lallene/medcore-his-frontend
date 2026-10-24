<script lang="ts">
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import TableState from '$lib/components/ui/TableState.svelte';
	import Table from '$lib/components/ui/Table.svelte';
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
			<p class="text-xs font-semibold uppercase text-emerald-700">Finance</p>
			<h1 class="text-3xl font-bold">Historique des sessions</h1>
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
		<select
			class="min-h-control rounded-lg border px-3 py-2"
			bind:value={status}
			data-testid="cash-history-status"
		>
			<option value="CLOSED">Clôturées</option>
			<option value="OPEN">Ouvertes</option>
			<option value="">Toutes</option>
		</select>
		<select
			class="min-h-control rounded-lg border px-3 py-2"
			bind:value={cashRegisterId}
			data-testid="cash-history-register"
		>
			<option value={0}>Toutes les caisses</option>
			{#each registers as r (r.id)}<option value={r.id}>{r.code} — {r.name}</option>{/each}
		</select>
		<input
			class="min-h-control rounded-lg border px-3 py-2"
			type="date"
			bind:value={dateFrom}
			data-testid="cash-history-from"
		/>
		<input
			class="min-h-control rounded-lg border px-3 py-2"
			type="date"
			bind:value={dateTo}
			data-testid="cash-history-to"
		/>
		<button
			class="rounded-lg bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-hover transition-colors"
			type="submit"
			data-testid="cash-history-filter">Filtrer</button
		>
	</form>

	{#if error}<div data-testid="cash-history-error"><Alert tone="danger">{error}</Alert></div>{/if}

	<Table containerTestId="cash-history-table">
		<thead>
			<tr>
				<th>Session</th>
				<th>Caisse</th>
				<th>Ouverture</th>
				<th>Clôture</th>
				<th class="mc-num">Fond</th>
				<th class="mc-num">Attendu</th>
				<th class="mc-num">Compté</th>
				<th class="mc-num">Écart</th>
				<th>État</th>
			</tr>
		</thead>
		<tbody
			>{#if !pageData && loading}<TableState
					state="loading"
					colspan={9}
					title="Chargement…"
					data-testid="cash-history-loading"
				/>{:else if !pageData && error}<TableState state="error" colspan={9} />{:else if pageData}
				{#each pageData.items as s (s.id)}<tr>
						<td
							><a href={resolve(`/cash/sessions/${s.id}`)} data-testid={`cash-history-row-${s.id}`}
								>#{s.id}</a
							></td
						>
						<td>{s.register?.code ?? s.cashRegisterId}</td>
						<td
							>{new Date(s.openedAt).toLocaleString('fr-FR')}<br /><span
								class="text-xs text-slate-500">#{s.openedBy}</span
							></td
						>
						<td
							>{#if s.closedAt}{new Date(s.closedAt).toLocaleString('fr-FR')}<br /><span
									class="text-xs text-slate-500">#{s.closedBy}</span
								>{:else}—{/if}</td
						>
						<td class="mc-amount">{formatXOF(s.openingFloat)}</td>
						<td class="mc-amount"
							>{s.expectedCashAmount != null ? formatXOF(s.expectedCashAmount) : '—'}</td
						>
						<td class="mc-amount"
							>{s.countedCashAmount != null ? formatXOF(s.countedCashAmount) : '—'}</td
						>
						<td class="mc-num">{diffLabel(s)}</td>
						<td>{s.status}</td>
					</tr>{:else}<TableState state="empty" colspan={9} title="Aucune session." />{/each}
			{/if}</tbody
		>
	</Table>
	{#if pageData}
		<Pagination
			class="print:hidden"
			page={pageData.page}
			totalPages={Math.max(pageData.totalPages, 1)}
			disabled={loading}
			summaryTestId="cash-history-page"
			prevTestId="cash-history-prev"
			nextTestId="cash-history-next"
			onpage={(next) => {
				page = next;
				void load();
			}}
		>
			{#snippet summary()}Page {pageData?.page} / {Math.max(pageData?.totalPages ?? 1, 1)}{/snippet}
		</Pagination>{/if}
</div>
