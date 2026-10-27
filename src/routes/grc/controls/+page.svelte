<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import { listGrcControls } from '$lib/api/grc';
	import type { GrcControl, GrcPage } from '$lib/types/grc';
	import ControlFormModal from '$lib/components/grc/ControlFormModal.svelte';
	import { formatAssetDate } from '$lib/components/grc/asset-state';
	import {
		CONTROL_PAGE_SIZE,
		controlAccess,
		controlQuery,
		controlStatusLabel,
		emptyControlFilters,
		hasActiveControlFilters,
		labelOf,
		type ControlFilters
	} from '$lib/components/grc/control-state';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import FilterBar from '$lib/components/ui/FilterBar.svelte';
	import Input from '$lib/components/ui/Input.svelte';
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

	let filters = $state<ControlFilters>(emptyControlFilters());
	let result = $state<GrcPage<GrcControl> | null>(null);
	let loading = $state(true);
	let error = $state('');
	let accessDenied = $state(false);
	let canManage = $state(false);
	let formOpen = $state(false);

	async function load(): Promise<void> {
		loading = true;
		error = '';
		try {
			result = await listGrcControls(controlQuery(filters));
		} catch (e) {
			if (isAccessDeniedError(e)) accessDenied = true;
			else error = resolveUserErrorMessage(e, 'Impossible de charger le registre des contrôles.');
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		const access = controlAccess(getStoredPermissions());
		if (!access.read) {
			accessDenied = true;
			loading = false;
			return;
		}
		canManage = access.manage;
		void load();
	});

	const rows = $derived(result?.items ?? []);
</script>

<svelte:head>
	<title>Contrôles | MedCore HIS</title>
</svelte:head>

{#if accessDenied}
	<AccessDenied
		title="Registre des contrôles non disponible"
		description="Votre profil n'inclut pas la permission de lecture des contrôles GRC."
	/>
{:else}
	<div class="min-w-0 space-y-6" data-testid="grc-controls">
		<PageHeader
			eyebrow="Sécurité & Conformité"
			title="Contrôles"
			description="Catalogue des contrôles, leurs exigences, risques et mises en œuvre sur les actifs."
		>
			{#snippet actions()}
				{#if canManage}
					<Button onclick={() => (formOpen = true)} data-testid="grc-control-create"
						>Nouveau contrôle</Button
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
					filters.page = 1;
					void load();
				}}
			>
				<FilterBar class="rounded-none border-0 border-b border-border shadow-none">
					<SearchInput
						id="grc-control-search"
						bind:value={filters.search}
						label="Rechercher un contrôle"
						placeholder="Code, nom ou catégorie"
						class="min-w-[12rem] flex-1"
					/>
					<Select
						aria-label="Statut"
						bind:value={filters.status}
						class="min-w-[9rem] sm:w-auto"
						data-testid="grc-control-filter-status"
					>
						<option value="">Tous statuts</option>
						{#each Object.entries(controlStatusLabel) as [value, label] (value)}
							<option {value}>{label}</option>
						{/each}
					</Select>
					<div class="min-w-[10rem] sm:w-48">
						<label for="grc-control-category" class="sr-only">Catégorie exacte</label>
						<Input
							id="grc-control-category"
							bind:value={filters.category}
							placeholder="Catégorie exacte"
							data-testid="grc-control-filter-category"
						/>
					</div>
					<Button type="submit" variant="secondary" data-testid="grc-control-apply">Filtrer</Button>
					{#if hasActiveControlFilters(filters)}
						<Button
							variant="ghost"
							onclick={() => {
								filters = emptyControlFilters();
								void load();
							}}>Réinitialiser</Button
						>
					{/if}
				</FilterBar>
			</form>

			<Table
				variant="plain"
				minWidth="980px"
				caption="Registre des contrôles GRC"
				data-testid="grc-control-table"
			>
				<thead>
					<tr>
						<th>Code</th>
						<th>Nom</th>
						<th>Catégorie</th>
						<th>Statut</th>
						<th>Exigences</th>
						<th>Risques</th>
						<th>Implémentations</th>
						<th>Mis à jour</th>
					</tr>
				</thead>
				<tbody
					>{#if loading}<TableState
							state="loading"
							colspan={8}
							title="Chargement des contrôles…"
						/>{:else if rows.length === 0}<TableState
							state="empty"
							colspan={8}
							title={hasActiveControlFilters(filters)
								? 'Aucun contrôle ne correspond'
								: 'Aucun contrôle'}
							description={hasActiveControlFilters(filters)
								? 'Modifiez ou réinitialisez les filtres.'
								: canManage
									? 'Utilisez « Nouveau contrôle » pour alimenter le catalogue.'
									: 'Aucun contrôle n’est encore enregistré.'}
							data-testid="grc-control-empty"
						/>{:else}
						{#each rows as control (control.id)}
							<tr data-testid={`grc-control-row-${control.id}`}>
								<td class="font-medium whitespace-nowrap">
									<a href={resolve('/grc/controls/[id]', { id: String(control.id) })}
										>{control.code}</a
									>
								</td>
								<td>{control.name}</td>
								<td>{control.category || '—'}</td>
								<td>
									<StatusBadge
										status={control.status}
										label={labelOf(controlStatusLabel, control.status)}
									/>
								</td>
								<td class="tabular-nums">{control.requirementCount}</td>
								<td class="tabular-nums">{control.riskCount}</td>
								<td class="tabular-nums">{control.implementationCount}</td>
								<td class="whitespace-nowrap">{formatAssetDate(control.updatedAt)}</td>
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
						pageSize={CONTROL_PAGE_SIZE}
						unit="contrôle(s)"
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

	{#if canManage}
		<ControlFormModal
			bind:open={formOpen}
			onsaved={(saved) => goto(resolve('/grc/controls/[id]', { id: String(saved.id) }))}
		/>
	{/if}
{/if}
