<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import { listGrcAssets } from '$lib/api/grc';
	import type { GrcAsset, GrcPage } from '$lib/types/grc';
	import AssetFormModal from '$lib/components/grc/AssetFormModal.svelte';
	import {
		ASSET_PAGE_SIZE,
		assetCriticalityLabel,
		assetQuery,
		assetStatusLabel,
		assetTypeLabel,
		canManageAssets,
		canReadAssets,
		emptyAssetFilters,
		formatAssetDate,
		hasActiveAssetFilters,
		labelOf,
		ownerLabel,
		serviceLabel,
		type AssetFilters
	} from '$lib/components/grc/asset-state';
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

	let filters = $state<AssetFilters>(emptyAssetFilters());
	let result = $state<GrcPage<GrcAsset> | null>(null);
	let loading = $state(true);
	let error = $state('');
	let accessDenied = $state(false);
	let canManage = $state(false);
	let formOpen = $state(false);

	async function load(): Promise<void> {
		loading = true;
		error = '';
		try {
			result = await listGrcAssets(assetQuery(filters));
		} catch (e) {
			if (isAccessDeniedError(e)) accessDenied = true;
			else error = resolveUserErrorMessage(e, 'Impossible de charger le registre des actifs.');
		} finally {
			loading = false;
		}
	}

	function applyFilters() {
		filters.page = 1;
		void load();
	}

	function resetFilters() {
		filters = emptyAssetFilters();
		void load();
	}

	function goToPage(page: number) {
		filters.page = page;
		void load();
	}

	onMount(() => {
		const permissions = getStoredPermissions();
		if (!canReadAssets(permissions)) {
			accessDenied = true;
			loading = false;
			return;
		}
		canManage = canManageAssets(permissions);
		void load();
	});

	const rows = $derived(result?.items ?? []);
</script>

<svelte:head>
	<title>Registre des actifs | MedCore HIS</title>
</svelte:head>

{#if accessDenied}
	<AccessDenied
		title="Registre des actifs non disponible"
		description="Votre profil n'inclut pas la permission de lecture des actifs GRC."
	/>
{:else}
	<div class="min-w-0 space-y-6" data-testid="grc-assets">
		<PageHeader
			eyebrow="Sécurité & Conformité"
			title="Registre des actifs"
			description="Inventaire des actifs GRC : classification, criticité, propriétaire et service."
		>
			{#snippet actions()}
				{#if canManage}
					<Button onclick={() => (formOpen = true)} data-testid="grc-asset-create">
						Nouvel actif
					</Button>
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
						id="grc-asset-search"
						bind:value={filters.search}
						label="Rechercher un actif"
						placeholder="Code, nom ou description"
						class="min-w-[12rem] flex-1"
					/>
					<Select
						aria-label="Type"
						bind:value={filters.type}
						class="min-w-[10rem] sm:w-auto"
						data-testid="grc-asset-filter-type"
					>
						<option value="">Tous types</option>
						{#each Object.entries(assetTypeLabel) as [value, label] (value)}
							<option {value}>{label}</option>
						{/each}
					</Select>
					<Select
						aria-label="Criticité"
						bind:value={filters.criticality}
						class="min-w-[9rem] sm:w-auto"
						data-testid="grc-asset-filter-criticality"
					>
						<option value="">Toutes criticités</option>
						{#each Object.entries(assetCriticalityLabel) as [value, label] (value)}
							<option {value}>{label}</option>
						{/each}
					</Select>
					<Select
						aria-label="Statut"
						bind:value={filters.status}
						class="min-w-[9rem] sm:w-auto"
						data-testid="grc-asset-filter-status"
					>
						<option value="">Tous statuts</option>
						{#each Object.entries(assetStatusLabel) as [value, label] (value)}
							<option {value}>{label}</option>
						{/each}
					</Select>
					<Button type="submit" variant="secondary" data-testid="grc-asset-apply">Filtrer</Button>
					{#if hasActiveAssetFilters(filters)}
						<Button variant="ghost" onclick={resetFilters}>Réinitialiser</Button>
					{/if}
				</FilterBar>
			</form>

			<Table
				variant="plain"
				minWidth="960px"
				caption="Registre des actifs GRC"
				data-testid="grc-asset-table"
			>
				<thead>
					<tr>
						<th>Code</th>
						<th>Nom</th>
						<th>Type</th>
						<th>Criticité</th>
						<th>Statut</th>
						<th>Propriétaire</th>
						<th>Service</th>
						<th>Mis à jour</th>
					</tr>
				</thead>
				<tbody
					>{#if loading}<TableState
							state="loading"
							colspan={8}
							title="Chargement des actifs…"
						/>{:else if error && !result}<TableState
							state="error"
							colspan={8}
							description={error}
						/>{:else if rows.length === 0}<TableState
							state="empty"
							colspan={8}
							title={hasActiveAssetFilters(filters) ? 'Aucun actif ne correspond' : 'Aucun actif'}
							description={hasActiveAssetFilters(filters)
								? 'Modifiez ou réinitialisez les filtres.'
								: canManage
									? 'Utilisez « Nouvel actif » pour démarrer l’inventaire.'
									: 'Aucun actif n’est encore enregistré.'}
							data-testid="grc-asset-empty"
						/>{:else}
						{#each rows as asset (asset.id)}
							<tr data-testid={`grc-asset-row-${asset.id}`}>
								<td class="font-medium whitespace-nowrap">
									<a href={resolve('/grc/assets/[id]', { id: String(asset.id) })}>{asset.code}</a>
								</td>
								<td>{asset.name}</td>
								<td>{labelOf(assetTypeLabel, asset.type)}</td>
								<td>
									<StatusBadge
										status={asset.criticality}
										label={labelOf(assetCriticalityLabel, asset.criticality)}
									/>
								</td>
								<td>
									<StatusBadge
										status={asset.status}
										label={labelOf(assetStatusLabel, asset.status)}
									/>
								</td>
								<td>{ownerLabel(asset.ownerProfile)}</td>
								<td>{serviceLabel(asset.owningService)}</td>
								<td class="whitespace-nowrap">{formatAssetDate(asset.updatedAt)}</td>
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
						pageSize={ASSET_PAGE_SIZE}
						unit="actif(s)"
						disabled={loading}
						onpage={goToPage}
						data-testid="grc-asset-pagination"
					/>
				</div>
			{/if}
		</section>
	</div>

	{#if canManage}
		<AssetFormModal
			bind:open={formOpen}
			onsaved={(saved) => goto(resolve('/grc/assets/[id]', { id: String(saved.id) }))}
		/>
	{/if}
{/if}
