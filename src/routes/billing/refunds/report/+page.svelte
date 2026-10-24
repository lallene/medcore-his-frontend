<script lang="ts">
	import LinkButton from '$lib/components/ui/LinkButton.svelte';
	import TableState from '$lib/components/ui/TableState.svelte';
	import Table from '$lib/components/ui/Table.svelte';
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
				<h1 class="text-3xl font-bold">{REFUND_REPORT_LINK_LABEL}</h1>
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
				<input
					class="min-h-control mt-1 w-full rounded-lg border px-3 py-2"
					type="date"
					bind:value={dateFrom}
				/>
			</label>
			<label class="text-xs font-bold uppercase text-slate-500"
				>Au
				<input
					class="min-h-control mt-1 w-full rounded-lg border px-3 py-2"
					type="date"
					bind:value={dateTo}
				/>
			</label>
			<label class="text-xs font-bold uppercase text-slate-500"
				>Mode
				<select class="min-h-control mt-1 w-full rounded-lg border px-3 py-2" bind:value={method}>
					<option value="">Tous</option>
					<option value="CASH">Espèces</option>
					<option value="CARD">Carte</option>
					<option value="MOBILE_MONEY">Mobile Money</option>
					<option value="TRANSFER">Virement</option>
				</select>
			</label>
			<button
				type="submit"
				class="rounded-lg bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-hover transition-colors"
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

			<Table data-testid="refund-report-table">
				<thead>
					<tr>
						<th>N°</th>
						<th class="mc-num">Montant</th>
						<th>Mode</th>
						<th>Exécuté</th>
						<th>Bénéficiaire</th>
						<th class="print:hidden mc-actions">Bon</th>
					</tr>
				</thead>
				<tbody>
					{#each report.data as row (row.refundId)}
						<tr data-testid={`refund-report-row-${row.refundId}`}>
							<td class="mc-id">{row.refundNumber}</td>
							<td class="mc-amount">{formatXOF(row.amount)}</td>
							<td>{refundMethodLabel(row.method)}</td>
							<td>{new Date(row.executedAt).toLocaleString('fr-FR')}</td>
							<td>{row.beneficiaryDisplayName}</td>
							<td class="print:hidden mc-actions">
								<LinkButton
									size="sm"
									variant="ghost"
									href={resolve(`/billing/refunds/${row.refundId}/voucher`)}>Bon</LinkButton
								>
							</td>
						</tr>
					{:else}
						<TableState state="empty" colspan={6} title="Aucun remboursement exécuté." />
					{/each}
				</tbody>
			</Table>
		{/if}
	</div>
{/if}
