<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';

	import { getGrcCoverage, listGrcFrameworks } from '$lib/api/grc';
	import type { GrcCoverageReport, GrcFramework, GrcPage } from '$lib/types/grc';
	import {
		COMPLIANCE_PAGE_SIZE,
		canReadCoverage,
		canReadFrameworks,
		coverageNote,
		coverageOf,
		coveragePercent,
		coverageText,
		emptyFrameworkFilters,
		frameworkQuery,
		frameworkStatusLabel,
		labelOf,
		type FrameworkFilters
	} from '$lib/components/grc/compliance-state';
	import { formatGrcNumber } from '$lib/components/grc/dashboard-state';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import FilterBar from '$lib/components/ui/FilterBar.svelte';
	import MetricCard from '$lib/components/ui/MetricCard.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import TableState from '$lib/components/ui/TableState.svelte';
	import AccessDenied from '$lib/components/rbac/AccessDenied.svelte';
	import {
		getStoredPermissions,
		isAccessDeniedError,
		resolveUserErrorMessage
	} from '$lib/rbac/permissions';

	let filters = $state<FrameworkFilters>(emptyFrameworkFilters());
	let frameworks = $state<GrcPage<GrcFramework> | null>(null);
	let coverage = $state<GrcCoverageReport | null>(null);
	let coverageAllowed = $state(false);
	let coverageError = $state('');
	let loading = $state(true);
	let error = $state('');
	let accessDenied = $state(false);

	async function load(): Promise<void> {
		loading = true;
		error = '';
		try {
			frameworks = await listGrcFrameworks(frameworkQuery(filters));
		} catch (e) {
			if (isAccessDeniedError(e)) accessDenied = true;
			else error = resolveUserErrorMessage(e, 'Impossible de charger les référentiels.');
			loading = false;
			return;
		}
		loading = false;
		if (!coverageAllowed) return;
		// Couverture globale + celle des référentiels de la page, en un appel.
		coverageError = '';
		try {
			coverage = await getGrcCoverage(frameworks.items.map((f) => f.id));
		} catch (e) {
			coverageError = resolveUserErrorMessage(e, 'Couverture momentanément indisponible.');
		}
	}

	function applyFilters() {
		filters.page = 1;
		void load();
	}

	onMount(() => {
		const permissions = getStoredPermissions();
		if (!canReadFrameworks(permissions)) {
			accessDenied = true;
			loading = false;
			return;
		}
		coverageAllowed = canReadCoverage(permissions);
		void load();
	});

	const rows = $derived(frameworks?.items ?? []);
	const overall = $derived(coverage?.overall ?? null);
	const hasFilters = $derived(!!(filters.search.trim() || filters.status));
</script>

<svelte:head>
	<title>Conformité | MedCore HIS</title>
</svelte:head>

{#if accessDenied}
	<AccessDenied
		title="Conformité non disponible"
		description="Votre profil n'inclut pas la permission de lecture des référentiels de conformité."
	/>
{:else}
	<div class="min-w-0 space-y-6" data-testid="grc-compliance">
		<PageHeader
			eyebrow="Sécurité & Conformité"
			title="Conformité"
			description="Référentiels, exigences et couverture du mapping exigences → contrôles."
		/>

		{#if error}
			<Alert tone="danger">{error}</Alert>
		{/if}

		{#if coverageAllowed}
			<section
				class="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]"
				aria-label="Couverture globale"
			>
				<div data-testid="grc-compliance-coverage">
					<MetricCard
						title="Couverture du mapping"
						value={coveragePercent(overall)}
						progress={overall?.controlMappingCoverage.percent ?? 0}
						detail={coverageText(overall)}
					/>
				</div>
				<Card title="Exigences" subtitle="Tous référentiels confondus" class="min-w-0">
					{#if coverageError}
						<Alert tone="danger">{coverageError}</Alert>
					{:else}
						<dl class="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="grc-compliance-counts">
							{#each [['Enregistrées', overall?.requirements], ['Applicables', overall?.applicableRequirements], ['Couvertes', overall?.mappedRequirements], ['Non couvertes', overall?.unmappedRequirements]] as [label, value] (label)}
								<div class="rounded-lg border border-border bg-surface-muted px-3 py-2">
									<dt class="text-xs text-muted-foreground">{label}</dt>
									<dd class="mt-1 text-xl font-semibold tabular-nums text-foreground">
										{value === undefined ? '—' : formatGrcNumber(Number(value))}
									</dd>
								</div>
							{/each}
						</dl>
						<p class="mt-3 text-xs text-muted-foreground">
							Applicable : exigence active d’un référentiel actif. Mesure la couverture par des
							contrôles, pas un niveau de conformité.
						</p>
					{/if}
				</Card>
			</section>
		{:else}
			<Alert tone="info" role="status">
				La couverture nécessite aussi la lecture des exigences GRC.
			</Alert>
		{/if}

		<section class="min-w-0 rounded-2xl border border-border bg-surface shadow-xs">
			<form
				onsubmit={(e) => {
					e.preventDefault();
					applyFilters();
				}}
			>
				<FilterBar class="rounded-none border-0 border-b border-border shadow-none">
					<SearchInput
						id="grc-framework-search"
						bind:value={filters.search}
						label="Rechercher un référentiel"
						placeholder="Code, nom ou version"
						class="min-w-[12rem] flex-1"
					/>
					<Select
						aria-label="Statut"
						bind:value={filters.status}
						class="min-w-[9rem] sm:w-auto"
						data-testid="grc-framework-filter-status"
					>
						<option value="">Tous statuts</option>
						{#each Object.entries(frameworkStatusLabel) as [value, label] (value)}
							<option {value}>{label}</option>
						{/each}
					</Select>
					<Button type="submit" variant="secondary" data-testid="grc-framework-apply"
						>Filtrer</Button
					>
				</FilterBar>
			</form>

			<Table
				variant="plain"
				minWidth="900px"
				caption="Référentiels de conformité"
				data-testid="grc-framework-table"
			>
				<thead>
					<tr>
						<th>Code</th>
						<th>Référentiel</th>
						<th>Version</th>
						<th>Statut</th>
						<th>Exigences applicables</th>
						<th>Couvertes</th>
						<th>Couverture</th>
					</tr>
				</thead>
				<tbody
					>{#if loading}<TableState
							state="loading"
							colspan={7}
							title="Chargement des référentiels…"
						/>{:else if rows.length === 0}<TableState
							state="empty"
							colspan={7}
							title={hasFilters ? 'Aucun référentiel ne correspond' : 'Aucun référentiel'}
							description={hasFilters
								? 'Modifiez les filtres.'
								: 'Aucun référentiel de conformité n’est enregistré.'}
							data-testid="grc-framework-empty"
						/>{:else}
						{#each rows as framework (framework.id)}
							{@const c = coverage ? coverageOf(coverage.frameworks, framework.id) : null}
							<tr data-testid={`grc-framework-row-${framework.id}`}>
								<td class="font-medium whitespace-nowrap">
									<a href={resolve('/grc/compliance/frameworks/[id]', { id: String(framework.id) })}
										>{framework.code}</a
									>
								</td>
								<td>{framework.name}</td>
								<td>{framework.version}</td>
								<td>
									<StatusBadge
										status={framework.status}
										label={labelOf(frameworkStatusLabel, framework.status)}
									/>
								</td>
								<td class="tabular-nums">{c ? formatGrcNumber(c.applicableRequirements) : '—'}</td>
								<td class="tabular-nums">{c ? formatGrcNumber(c.mappedRequirements) : '—'}</td>
								<td>
									<span class="font-medium tabular-nums">{coveragePercent(c)}</span>
									{#if coverageNote(framework.status, c)}
										<span class="block text-xs text-muted-foreground"
											>{coverageNote(framework.status, c)}</span
										>
									{/if}
								</td>
							</tr>
						{/each}
					{/if}</tbody
				>
			</Table>

			{#if frameworks && frameworks.total > 0}
				<div class="border-t border-border px-4 py-3">
					<Pagination
						page={frameworks.page}
						totalPages={frameworks.totalPages}
						total={frameworks.total}
						pageSize={COMPLIANCE_PAGE_SIZE}
						unit="référentiel(s)"
						disabled={loading}
						onpage={(n) => {
							filters.page = n;
							void load();
						}}
					/>
				</div>
			{/if}
		</section>
	</div>
{/if}
