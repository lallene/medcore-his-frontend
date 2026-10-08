<script lang="ts">
	import { onMount } from 'svelte';
	import { jwtDecode } from 'jwt-decode';
	import { getRefundReport } from '$lib/api/billing';
	import { formatXOF } from '$lib/components/billing/state';
	import {
		REFUND_REPORT_LINK_LABEL,
		canReadRefundReport,
		refundMethodLabel
	} from '$lib/components/billing/refund';
	import AccessDenied from '$lib/components/rbac/AccessDenied.svelte';
	import type { RefundReportPage } from '$lib/types/billing';
	import { resolve } from '$app/paths';

	let permissions = $state<string[]>([]);
	let dateFrom = $state(new Date().toISOString().slice(0, 10));
	let dateTo = $state(new Date().toISOString().slice(0, 10));
	let method = $state('');
	let loading = $state(true);
	let error = $state('');
	let report = $state<RefundReportPage | null>(null);

	const canReport = $derived(canReadRefundReport(permissions));

	function readClaims() {
		const raw = localStorage.getItem('medcore_token');
		if (!raw) return;
		try {
			const claims = jwtDecode<{ permissions?: string[] }>(raw);
			permissions = claims.permissions ?? [];
		} catch {
			permissions = [];
		}
	}

	async function load() {
		if (!canReadRefundReport(permissions)) {
			loading = false;
			return;
		}
		loading = true;
		error = '';
		try {
			report = await getRefundReport({
				dateFrom,
				dateTo,
				method: method || undefined,
				page: 1,
				limit: 50
			});
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Rapport indisponible';
			report = null;
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		readClaims();
		void load();
	});
</script>

<svelte:head>
	<title>{REFUND_REPORT_LINK_LABEL} | MedCore HIS</title>
</svelte:head>

{#if !canReport}
	<AccessDenied />
{:else}
	<div class="mx-auto max-w-6xl space-y-6 p-6" data-testid="refund-report-page">
		<div class="flex flex-wrap items-end justify-between gap-3">
			<div>
				<h1 class="text-3xl font-black">{REFUND_REPORT_LINK_LABEL}</h1>
				<p class="text-sm text-slate-600">Remboursements exécutés uniquement (autorité serveur).</p>
			</div>
			<button
				type="button"
				class="rounded-xl border px-4 py-2 font-bold print:hidden"
				onclick={() => print()}>Imprimer</button
			>
		</div>

		<form
			class="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-4 print:hidden"
			data-testid="refund-report-filters"
			onsubmit={(e) => {
				e.preventDefault();
				void load();
			}}
		>
			<label class="text-xs font-bold uppercase text-slate-500"
				>Du
				<input class="mt-1 w-full rounded-lg border p-2" type="date" bind:value={dateFrom} />
			</label>
			<label class="text-xs font-bold uppercase text-slate-500"
				>Au
				<input class="mt-1 w-full rounded-lg border p-2" type="date" bind:value={dateTo} />
			</label>
			<label class="text-xs font-bold uppercase text-slate-500"
				>Mode
				<select class="mt-1 w-full rounded-lg border p-2" bind:value={method}>
					<option value="">Tous</option>
					<option value="CASH">Espèces</option>
					<option value="CARD">Carte</option>
					<option value="MOBILE_MONEY">Mobile Money</option>
					<option value="TRANSFER">Virement</option>
				</select>
			</label>
			<button type="submit" class="rounded-xl bg-indigo-800 px-4 py-2 font-bold text-white"
				>Actualiser</button
			>
		</form>

		{#if loading}
			<p class="text-slate-500">Chargement…</p>
		{:else if error}
			<p class="font-bold text-amber-900" role="alert">{error}</p>
		{:else if report}
			<section
				class="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-3"
				data-testid="refund-report-summary"
			>
				<p>
					<span class="block text-xs text-slate-500">Total exécuté</span>
					<b data-testid="refund-report-total-amount"
						>{formatXOF(report.summary.executedRefundAmount)}</b
					>
					<span class="text-sm text-slate-500"> ({report.summary.executedRefundCount})</span>
				</p>
				<p>
					<span class="block text-xs text-slate-500">Espèces</span>
					<b data-testid="refund-report-cash-amount">{formatXOF(report.summary.cashRefundAmount)}</b
					>
					<span class="text-sm text-slate-500"> ({report.summary.cashRefundCount})</span>
				</p>
				<p>
					<span class="block text-xs text-slate-500">Externe</span>
					<b data-testid="refund-report-external-amount"
						>{formatXOF(report.summary.externalRefundAmount)}</b
					>
					<span class="text-sm text-slate-500"> ({report.summary.externalRefundCount})</span>
				</p>
			</section>

			<table
				class="w-full overflow-hidden rounded-2xl border bg-white text-sm"
				data-testid="refund-report-table"
			>
				<thead class="bg-slate-50 text-left text-xs uppercase text-slate-500">
					<tr>
						<th class="p-3">N°</th>
						<th class="p-3">Montant</th>
						<th class="p-3">Mode</th>
						<th class="p-3">Exécuté</th>
						<th class="p-3">Bénéficiaire</th>
						<th class="p-3 print:hidden">Bon</th>
					</tr>
				</thead>
				<tbody>
					{#each report.data as row (row.refundId)}
						<tr class="border-t" data-testid={`refund-report-row-${row.refundId}`}>
							<td class="p-3 font-bold">{row.refundNumber}</td>
							<td class="p-3">{formatXOF(row.amount)}</td>
							<td class="p-3">{refundMethodLabel(row.method)}</td>
							<td class="p-3">{new Date(row.executedAt).toLocaleString('fr-FR')}</td>
							<td class="p-3">{row.beneficiaryDisplayName}</td>
							<td class="p-3 print:hidden">
								<a
									class="font-bold text-sky-800 underline"
									href={resolve(`/billing/refunds/${row.refundId}/voucher`)}>Bon</a
								>
							</td>
						</tr>
					{:else}
						<tr><td class="p-4 text-slate-500" colspan="6">Aucun remboursement exécuté.</td></tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
{/if}
