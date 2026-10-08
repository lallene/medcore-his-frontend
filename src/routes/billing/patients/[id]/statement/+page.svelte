<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { jwtDecode } from 'jwt-decode';
	import { getFinancialStatement, listFinancialHistory } from '$lib/api/billing';
	import { formatXOF } from '$lib/components/billing/state';
	import {
		canShowFinancialStatement,
		financialEventTypeFilterOptions,
		financialEventTypeLabel,
		holderFieldLabels,
		holderKindLabel,
		invoiceLineFieldLabels,
		invoiceStatusLabel,
		STATEMENT_CREDITS_SECTION,
		STATEMENT_HISTORY_SECTION,
		STATEMENT_INVOICES_SECTION,
		STATEMENT_PAGE_TITLE,
		STATEMENT_SUMMARY_SECTION,
		summaryFieldLabels,
		summaryFieldOrder
	} from '$lib/components/billing/financial-statement';
	import { canShowRefundLink, REFUND_LINK_LABEL } from '$lib/components/billing/refund';
	import type {
		FinancialHistoryEvent,
		FinancialStatement,
		FinancialStatementInvoiceLine
	} from '$lib/types/billing';
	import AccessDenied from '$lib/components/rbac/AccessDenied.svelte';
	import { isAccessDeniedError } from '$lib/rbac/permissions';

	let permissions = $state<string[]>([]);
	let statement = $state<FinancialStatement | null>(null);
	let history = $state<FinancialHistoryEvent[]>([]);
	let historyPage = $state(1);
	let historyLimit = $state(10);
	let historyTotalPages = $state(1);
	let historyTotal = $state(0);
	let loadingStatement = $state(true);
	let loadingHistory = $state(false);
	let error = $state('');
	let accessDenied = $state(false);

	let filterEventType = $state('');
	let filterDateFrom = $state('');
	let filterDateTo = $state('');
	let filterInvoiceId = $state('');
	let filterHolderPartyId = $state('');

	const patientId = $derived(Number(page.params.id));
	const canRead = $derived(canShowFinancialStatement(permissions));
	const showRefundLink = $derived(canShowRefundLink(permissions));

	function readPermissions() {
		const raw = localStorage.getItem('medcore_token');
		if (!raw) return [];
		try {
			return jwtDecode<{ permissions?: string[] }>(raw).permissions ?? [];
		} catch {
			return [];
		}
	}

	async function loadStatement() {
		if (!canRead || !patientId) return;
		loadingStatement = true;
		error = '';
		accessDenied = false;
		try {
			statement = await getFinancialStatement(patientId);
		} catch (e: unknown) {
			statement = null;
			if (isAccessDeniedError(e)) accessDenied = true;
			else error = e instanceof Error ? e.message : 'Relevé indisponible';
		} finally {
			loadingStatement = false;
		}
	}

	async function loadHistory(pageNum = historyPage) {
		if (!canRead || !patientId) return;
		loadingHistory = true;
		try {
			const params: Record<string, string | number> = { page: pageNum, limit: historyLimit };
			if (filterEventType) params.eventType = filterEventType;
			if (filterDateFrom) params.dateFrom = filterDateFrom;
			if (filterDateTo) params.dateTo = filterDateTo;
			const inv = Number(filterInvoiceId);
			if (inv > 0) params.invoiceId = inv;
			const holder = Number(filterHolderPartyId);
			if (holder > 0) params.holderPartyId = holder;
			const res = await listFinancialHistory(patientId, params);
			history = res.data;
			historyPage = res.page;
			historyTotalPages = res.totalPages;
			historyTotal = res.total;
		} catch (e: unknown) {
			history = [];
			if (isAccessDeniedError(e)) accessDenied = true;
			else if (!error) error = e instanceof Error ? e.message : 'Historique indisponible';
		} finally {
			loadingHistory = false;
		}
	}

	function applyHistoryFilters() {
		historyPage = 1;
		void loadHistory(1);
	}

	function invoiceDate(line: FinancialStatementInvoiceLine): string {
		const raw = line.issuedAt ?? line.createdAt;
		return new Date(raw).toLocaleDateString('fr-FR');
	}

	onMount(() => {
		permissions = readPermissions();
		if (!canShowFinancialStatement(permissions)) {
			loadingStatement = false;
			return;
		}
		void loadStatement().then(() => loadHistory(1));
	});
</script>

<svelte:head>
	<title>{STATEMENT_PAGE_TITLE} | MedCore HIS</title>
</svelte:head>

<div class="mx-auto max-w-6xl space-y-6 p-6 print:p-4" data-testid="financial-statement-page">
	<p class="print:hidden">
		<a
			class="text-sm font-bold text-blue-700"
			href={resolve('/billing')}
			data-testid="financial-statement-back">← Facturation</a
		>
		{#if statement}
			·
			<a
				class="text-sm font-bold text-blue-700"
				href={resolve(`/billing?patientId=${statement.patientId}`)}
				data-testid="financial-statement-patient-billing">Factures patient</a
			>
			{#if showRefundLink}
				·
				<a
					class="text-sm font-bold text-blue-700"
					href={resolve(`/billing/refunds?patientId=${statement.patientId}`)}
					data-testid="financial-statement-refund-link">{REFUND_LINK_LABEL}</a
				>
			{/if}
		{/if}
	</p>

	{#if !canRead}
		<AccessDenied
			title="Relevé financier non autorisé"
			description="La permission billing.statement.read est requise (facturation / comptabilité)."
		/>
	{:else if accessDenied}
		<section data-testid="financial-statement-denied">
			<AccessDenied
				title="Accès refusé"
				description="Vous n'avez pas l'autorisation de consulter le relevé financier de ce patient."
			/>
		</section>
	{:else if loadingStatement && !statement}
		<p data-testid="financial-statement-loading">Chargement du relevé…</p>
	{:else if error && !statement}
		<p
			class="rounded-xl bg-red-50 p-3 text-red-700"
			data-testid="financial-statement-error"
			role="alert"
		>
			{error}
		</p>
	{:else if statement}
		<header class="flex flex-wrap items-end justify-between gap-4 print:block">
			<div>
				<p class="text-sm font-bold text-blue-700">RELEVÉ FINANCIER</p>
				<h1 class="text-3xl font-black" data-testid="financial-statement-title">
					{STATEMENT_PAGE_TITLE}
				</h1>
				<p class="text-lg font-bold" data-testid="financial-statement-patient">
					{statement.patientCode} — {statement.patientName}
				</p>
				<p class="text-sm text-slate-500" data-testid="financial-statement-as-of">
					État au {new Date(statement.asOf).toLocaleString('fr-FR')}
				</p>
			</div>
			<button
				type="button"
				class="rounded-xl border px-4 py-2 font-bold print:hidden"
				data-testid="financial-statement-print"
				onclick={() => print()}>Imprimer</button
			>
		</header>

		<section class="rounded-2xl border bg-white p-5" data-testid="financial-statement-summary">
			<h2 class="text-lg font-black">{STATEMENT_SUMMARY_SECTION}</h2>
			<div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each summaryFieldOrder as key (key)}
					<div class="rounded-xl bg-slate-50 p-3">
						<p class="text-xs font-bold uppercase text-slate-500">{summaryFieldLabels[key]}</p>
						<p class="mt-1 text-xl font-black" data-testid={`financial-statement-summary-${key}`}>
							{formatXOF(statement.summary[key])}
						</p>
					</div>
				{/each}
			</div>
			<p class="mt-3 text-sm text-slate-600" data-testid="financial-statement-credit-total">
				Total crédit utilisable (information) :
				<b>{formatXOF(statement.patientCreditTotalAvailable)}</b>
			</p>
		</section>

		<section
			class="overflow-x-auto rounded-2xl border bg-white p-5"
			data-testid="financial-statement-invoices"
		>
			<h2 class="text-lg font-black">{STATEMENT_INVOICES_SECTION}</h2>
			<table class="mt-4 w-full min-w-[960px] text-left text-sm">
				<thead class="bg-slate-50 text-xs uppercase text-slate-500">
					<tr>
						<th class="p-2">Facture</th>
						<th>Date</th>
						<th>Statut</th>
						<th>{invoiceLineFieldLabels.grossPatientObligation}</th>
						<th>{invoiceLineFieldLabels.creditNoteReduction}</th>
						<th>{invoiceLineFieldLabels.correctedObligation}</th>
						<th>{invoiceLineFieldLabels.effectiveMoneyPaid}</th>
						<th>{invoiceLineFieldLabels.creditApplied}</th>
						<th>{invoiceLineFieldLabels.totalSettled}</th>
						<th>{invoiceLineFieldLabels.remainingReceivable}</th>
					</tr>
				</thead>
				<tbody>
					{#each statement.invoices as inv (inv.invoiceId)}
						<tr class="border-t" data-testid={`financial-statement-invoice-${inv.invoiceId}`}>
							<td class="p-2 font-bold">
								<a
									class="text-blue-700 print:text-black"
									href={resolve(`/billing/${inv.invoiceId}`)}>{inv.number}</a
								>
								{#if inv.creditNoteNumber}
									<span class="block text-xs text-amber-800">Avoir {inv.creditNoteNumber}</span>
								{/if}
							</td>
							<td>{invoiceDate(inv)}</td>
							<td>{invoiceStatusLabel(inv.status)}</td>
							<td data-testid={`financial-statement-inv-gross-${inv.invoiceId}`}
								>{formatXOF(inv.grossPatientObligation)}</td
							>
							<td>{formatXOF(inv.creditNoteReduction)}</td>
							<td>{formatXOF(inv.correctedObligation)}</td>
							<td>{formatXOF(inv.effectiveMoneyPaid)}</td>
							<td>{formatXOF(inv.creditApplied)}</td>
							<td>{formatXOF(inv.totalSettled)}</td>
							<td data-testid={`financial-statement-inv-receivable-${inv.invoiceId}`}
								>{formatXOF(inv.remainingReceivable)}</td
							>
						</tr>
					{:else}
						<tr
							><td colspan="10" class="p-8 text-center text-slate-500">Aucune facture émise.</td
							></tr
						>
					{/each}
				</tbody>
			</table>
		</section>

		<section
			class="rounded-2xl border bg-indigo-50/60 p-5"
			data-testid="financial-statement-holders"
		>
			<h2 class="text-lg font-black text-indigo-950">{STATEMENT_CREDITS_SECTION}</h2>
			{#if statement.holders.length === 0}
				<p class="mt-3 text-sm text-slate-600">Aucun titulaire de crédit.</p>
			{:else}
				<div class="mt-4 grid gap-4 md:grid-cols-2">
					{#each statement.holders as h (h.holderPartyId)}
						<article
							class="rounded-xl border border-indigo-100 bg-white p-4"
							data-testid={`financial-statement-holder-${h.holderPartyId}`}
						>
							<p class="font-black">{h.displayName}</p>
							<p class="text-xs text-slate-500">
								{holderKindLabel(h.kind)} · #{h.holderPartyId}
								{#if h.phone}
									· {h.phone}
								{/if}
							</p>
							<dl class="mt-3 grid grid-cols-2 gap-2 text-sm">
								<div>
									<dt class="text-slate-500">{holderFieldLabels.creditEarned}</dt>
									<dd
										class="font-bold"
										data-testid={`financial-statement-holder-${h.holderPartyId}-creditEarned`}
									>
										{formatXOF(h.creditEarned)}
									</dd>
								</div>
								<div>
									<dt class="text-slate-500">{holderFieldLabels.creditRestored}</dt>
									<dd
										class="font-bold"
										data-testid={`financial-statement-holder-${h.holderPartyId}-creditRestored`}
									>
										{formatXOF(h.creditRestored)}
									</dd>
								</div>
								<div>
									<dt class="text-slate-500">{holderFieldLabels.creditUsed}</dt>
									<dd
										class="font-bold"
										data-testid={`financial-statement-holder-${h.holderPartyId}-creditUsed`}
									>
										{formatXOF(h.creditUsed)}
									</dd>
								</div>
								<div>
									<dt class="text-slate-500">{holderFieldLabels.creditRefunded}</dt>
									<dd
										class="font-bold"
										data-testid={`financial-statement-holder-${h.holderPartyId}-creditRefunded`}
									>
										{formatXOF(h.creditRefunded)}
									</dd>
								</div>
								<div>
									<dt class="text-slate-500">{holderFieldLabels.ledgerAvailable}</dt>
									<dd
										class="font-bold"
										data-testid={`financial-statement-holder-${h.holderPartyId}-ledgerAvailable`}
									>
										{formatXOF(h.ledgerAvailable)}
									</dd>
								</div>
								<div>
									<dt class="text-slate-500">{holderFieldLabels.reservedForRefund}</dt>
									<dd
										class="font-bold"
										data-testid={`financial-statement-holder-${h.holderPartyId}-reservedForRefund`}
									>
										{formatXOF(h.reservedForRefund)}
									</dd>
								</div>
								<div>
									<dt class="text-slate-500">{holderFieldLabels.spendableCredit}</dt>
									<dd
										class="font-bold"
										data-testid={`financial-statement-holder-${h.holderPartyId}-availableCredit`}
									>
										{formatXOF(h.availableCredit)}
									</dd>
								</div>
							</dl>
						</article>
					{/each}
				</div>
			{/if}
		</section>

		<section
			class="rounded-2xl border bg-white p-5 print:break-before-page"
			data-testid="financial-statement-history"
		>
			<h2 class="text-lg font-black">{STATEMENT_HISTORY_SECTION}</h2>
			<form
				class="mt-4 grid gap-3 print:hidden md:grid-cols-6"
				data-testid="financial-statement-history-filters"
				onsubmit={(e) => {
					e.preventDefault();
					applyHistoryFilters();
				}}
			>
				<label class="text-xs font-bold uppercase text-slate-500 md:col-span-2">
					Type
					<select
						class="mt-1 w-full rounded-lg border p-2 text-sm font-normal"
						data-testid="financial-statement-filter-event-type"
						bind:value={filterEventType}
					>
						{#each financialEventTypeFilterOptions as opt (opt.value)}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
				</label>
				<label class="text-xs font-bold uppercase text-slate-500">
					Du
					<input
						type="date"
						class="mt-1 w-full rounded-lg border p-2 text-sm font-normal"
						data-testid="financial-statement-filter-date-from"
						bind:value={filterDateFrom}
					/>
				</label>
				<label class="text-xs font-bold uppercase text-slate-500">
					Au
					<input
						type="date"
						class="mt-1 w-full rounded-lg border p-2 text-sm font-normal"
						data-testid="financial-statement-filter-date-to"
						bind:value={filterDateTo}
					/>
				</label>
				<label class="text-xs font-bold uppercase text-slate-500">
					Facture (id)
					<input
						type="number"
						min="0"
						class="mt-1 w-full rounded-lg border p-2 text-sm font-normal"
						data-testid="financial-statement-filter-invoice-id"
						bind:value={filterInvoiceId}
					/>
				</label>
				<label class="text-xs font-bold uppercase text-slate-500">
					Titulaire (id)
					<input
						type="number"
						min="0"
						class="mt-1 w-full rounded-lg border p-2 text-sm font-normal"
						data-testid="financial-statement-filter-holder-id"
						bind:value={filterHolderPartyId}
					/>
				</label>
				<div class="flex items-end md:col-span-6">
					<button
						type="submit"
						class="rounded-xl bg-blue-700 px-4 py-2 font-bold text-white"
						data-testid="financial-statement-filter-submit">Filtrer</button
					>
				</div>
			</form>

			{#if loadingHistory && history.length === 0}
				<p class="mt-4 text-sm text-slate-500">Chargement de l'historique…</p>
			{/if}
			<table class="mt-4 w-full text-left text-sm">
				<thead class="bg-slate-50 text-xs uppercase text-slate-500">
					<tr>
						<th class="p-2">Date</th>
						<th>Événement</th>
						<th>Libellé</th>
						<th>Document</th>
						<th>Facture</th>
						<th>Montant</th>
					</tr>
				</thead>
				<tbody>
					{#each history as ev, i (ev.sortKey || `${ev.sourceType}-${ev.sourceId}-${i}`)}
						<tr class="border-t" data-testid={`financial-statement-history-row-${i}`}>
							<td class="p-2">{new Date(ev.occurredAt).toLocaleString('fr-FR')}</td>
							<td>{financialEventTypeLabel(ev.eventType)}</td>
							<td data-testid={`financial-statement-history-label-${i}`}>{ev.label}</td>
							<td data-testid={`financial-statement-history-doc-${i}`}>
								{#if ev.documentNumber}
									<span class="font-bold">{ev.documentNumber}</span>
									{#if ev.eventType === 'REFUND_EXECUTED' && showRefundLink && ev.sourceId}
										·
										<a
											class="text-blue-700 print:hidden"
											href={resolve(`/billing/refunds/${ev.sourceId}/voucher`)}
											data-testid={`financial-statement-history-voucher-${i}`}>Bon</a
										>
									{/if}
								{:else}—{/if}
							</td>
							<td>
								{#if ev.invoiceId}
									<a class="text-blue-700" href={resolve(`/billing/${ev.invoiceId}`)}
										>{ev.invoiceNumber ?? ev.invoiceId}</a
									>
								{:else}—{/if}
							</td>
							<td>{formatXOF(ev.amount)}</td>
						</tr>
					{:else}
						<tr><td colspan="6" class="p-8 text-center text-slate-500">Aucun événement.</td></tr>
					{/each}
				</tbody>
			</table>
			<div class="mt-4 flex flex-wrap items-center gap-3 print:hidden">
				<p class="text-sm text-slate-600" data-testid="financial-statement-history-meta">
					Page {historyPage} / {historyTotalPages} · {historyTotal} événement(s)
				</p>
				<button
					type="button"
					class="rounded-lg border px-3 py-1 text-sm font-bold disabled:opacity-40"
					data-testid="financial-statement-history-prev"
					disabled={historyPage <= 1 || loadingHistory}
					onclick={() => loadHistory(historyPage - 1)}>Précédent</button
				>
				<button
					type="button"
					class="rounded-lg border px-3 py-1 text-sm font-bold disabled:opacity-40"
					data-testid="financial-statement-history-next"
					disabled={historyPage >= historyTotalPages || loadingHistory}
					onclick={() => loadHistory(historyPage + 1)}>Suivant</button
				>
			</div>
		</section>
	{/if}
</div>

<style>
	@media print {
		:global(body) {
			background: white;
		}
	}
</style>
