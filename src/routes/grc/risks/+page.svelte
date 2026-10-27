<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	import { listGrcRisks } from '$lib/api/grc';
	import type { GrcPage, GrcRisk } from '$lib/types/grc';
	import RiskFormModal from '$lib/components/grc/RiskFormModal.svelte';
	import { formatAssetDate, ownerLabel, serviceLabel } from '$lib/components/grc/asset-state';
	import {
		RISK_PAGE_SIZE,
		canCreateRisks,
		canReadRisks,
		emptyRiskFilters,
		hasActiveRiskFilters,
		labelOf,
		riskLevelName,
		riskQuery,
		riskStatusLabel,
		riskTreatmentLabel,
		scoreText,
		type RiskFilters
	} from '$lib/components/grc/risk-state';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import FilterBar from '$lib/components/ui/FilterBar.svelte';
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

	let filters = $state<RiskFilters>(emptyRiskFilters());
	let result = $state<GrcPage<GrcRisk> | null>(null);
	let loading = $state(true);
	let error = $state('');
	let accessDenied = $state(false);
	let canCreate = $state(false);
	let formOpen = $state(false);

	async function load(): Promise<void> {
		loading = true;
		error = '';
		try {
			result = await listGrcRisks(riskQuery(filters));
		} catch (e) {
			if (isAccessDeniedError(e)) accessDenied = true;
			else error = resolveUserErrorMessage(e, 'Impossible de charger le registre des risques.');
		} finally {
			loading = false;
		}
	}

	function applyFilters() {
		filters.page = 1;
		void load();
	}

	function resetFilters() {
		filters = emptyRiskFilters();
		void load();
	}

	function goToPage(n: number) {
		filters.page = n;
		void load();
	}

	onMount(() => {
		const permissions = getStoredPermissions();
		if (!canReadRisks(permissions)) {
			accessDenied = true;
			loading = false;
			return;
		}
		canCreate = canCreateRisks(permissions);
		// Lien depuis le détail d'un actif : /grc/risks?assetId=12.
		const assetId = Number(page.url.searchParams.get('assetId'));
		if (Number.isInteger(assetId) && assetId > 0) filters.assetId = assetId;
		void load();
	});

	const rows = $derived(result?.items ?? []);
	const levelOptions = Object.entries(riskLevelName);
</script>

<svelte:head>
	<title>Registre des risques | MedCore HIS</title>
</svelte:head>

{#if accessDenied}
	<AccessDenied
		title="Registre des risques non disponible"
		description="Votre profil n'inclut pas la permission de lecture des risques GRC."
	/>
{:else}
	<div class="min-w-0 space-y-6" data-testid="grc-risks">
		<PageHeader
			eyebrow="Sécurité & Conformité"
			title="Registre des risques"
			description="Risques GRC avec leurs scores inhérent et résiduel (probabilité × impact, 1–25), calculés par le serveur."
		>
			{#snippet actions()}
				{#if canCreate}
					<Button onclick={() => (formOpen = true)} data-testid="grc-risk-create"
						>Nouveau risque</Button
					>
				{/if}
			{/snippet}
		</PageHeader>

		{#if error}
			<Alert tone="danger">{error}</Alert>
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
						id="grc-risk-search"
						bind:value={filters.search}
						label="Rechercher un risque"
						placeholder="Référence, titre, description, menace…"
						class="min-w-[12rem] flex-1"
					/>
					<Select
						aria-label="Statut"
						bind:value={filters.status}
						class="min-w-[9rem] sm:w-auto"
						data-testid="grc-risk-filter-status"
					>
						<option value="">Tous statuts</option>
						{#each Object.entries(riskStatusLabel) as [value, label] (value)}
							<option {value}>{label}</option>
						{/each}
					</Select>
					<Select
						aria-label="Traitement"
						bind:value={filters.treatment}
						class="min-w-[9rem] sm:w-auto"
						data-testid="grc-risk-filter-treatment"
					>
						<option value="">Tous traitements</option>
						{#each Object.entries(riskTreatmentLabel) as [value, label] (value)}
							<option {value}>{label}</option>
						{/each}
					</Select>
					<Select
						aria-label="Niveau résiduel"
						bind:value={filters.residualLevel}
						class="min-w-[10rem] sm:w-auto"
						data-testid="grc-risk-filter-residual"
					>
						<option value="">Tout niveau résiduel</option>
						{#each levelOptions as [value, label] (value)}
							<option {value}>Résiduel : {label}</option>
						{/each}
					</Select>
					<Select
						aria-label="Niveau inhérent"
						bind:value={filters.inherentLevel}
						class="min-w-[10rem] sm:w-auto"
						data-testid="grc-risk-filter-inherent"
					>
						<option value="">Tout niveau inhérent</option>
						{#each levelOptions as [value, label] (value)}
							<option {value}>Inhérent : {label}</option>
						{/each}
					</Select>
					<Button type="submit" variant="secondary" data-testid="grc-risk-apply">Filtrer</Button>
					{#if hasActiveRiskFilters(filters)}
						<Button variant="ghost" onclick={resetFilters}>Réinitialiser</Button>
					{/if}
				</FilterBar>
			</form>
			{#if filters.assetId}
				<p
					class="border-b border-border px-4 py-2 text-xs text-muted-foreground"
					data-testid="grc-risk-asset-filter"
				>
					Filtré sur l’actif n° {filters.assetId}.
				</p>
			{/if}

			<Table
				variant="plain"
				minWidth="1080px"
				caption="Registre des risques GRC"
				data-testid="grc-risk-table"
			>
				<thead>
					<tr>
						<th>Référence</th>
						<th>Titre</th>
						<th>Actif</th>
						<th>Inhérent</th>
						<th>Résiduel</th>
						<th>Statut</th>
						<th>Propriétaire</th>
						<th>Service</th>
						<th>Mis à jour</th>
					</tr>
				</thead>
				<tbody
					>{#if loading}<TableState
							state="loading"
							colspan={9}
							title="Chargement des risques…"
						/>{:else if error && !result}<TableState
							state="error"
							colspan={9}
							description={error}
						/>{:else if rows.length === 0}<TableState
							state="empty"
							colspan={9}
							title={hasActiveRiskFilters(filters) ? 'Aucun risque ne correspond' : 'Aucun risque'}
							description={hasActiveRiskFilters(filters)
								? 'Modifiez ou réinitialisez les filtres.'
								: canCreate
									? 'Utilisez « Nouveau risque » pour alimenter le registre.'
									: 'Aucun risque n’est encore enregistré.'}
							data-testid="grc-risk-empty"
						/>{:else}
						{#each rows as risk (risk.id)}
							<tr data-testid={`grc-risk-row-${risk.id}`}>
								<td class="font-medium whitespace-nowrap">
									<a href={resolve('/grc/risks/[id]', { id: String(risk.id) })}>{risk.reference}</a>
								</td>
								<td>{risk.title}</td>
								<td>{risk.asset ? risk.asset.code : 'Aucun'}</td>
								<td class="whitespace-nowrap">
									<StatusBadge
										status={risk.inherentLevel}
										label={scoreText(risk.inherentScore, risk.inherentLevel)}
									/>
								</td>
								<td class="whitespace-nowrap">
									<StatusBadge
										status={risk.residualLevel}
										label={scoreText(risk.residualScore, risk.residualLevel)}
									/>
								</td>
								<td>
									<StatusBadge status={risk.status} label={labelOf(riskStatusLabel, risk.status)} />
								</td>
								<td>{ownerLabel(risk.ownerProfile)}</td>
								<td>{serviceLabel(risk.owningService)}</td>
								<td class="whitespace-nowrap">{formatAssetDate(risk.updatedAt)}</td>
							</tr>
						{/each}
					{/if}</tbody
				>
			</Table>

			{#if result && result.total > 0}
				<div class="border-t border-border px-4 py-3">
					<Pagination
						page={result.page}
						totalPages={result.totalPages}
						total={result.total}
						pageSize={RISK_PAGE_SIZE}
						unit="risque(s)"
						disabled={loading}
						onpage={goToPage}
						data-testid="grc-risk-pagination"
					/>
				</div>
			{/if}
		</section>
	</div>

	{#if canCreate}
		<RiskFormModal
			bind:open={formOpen}
			onsaved={(saved) => goto(resolve('/grc/risks/[id]', { id: String(saved.id) }))}
		/>
	{/if}
{/if}
