<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	import { listGrcActions } from '$lib/api/grc';
	import type { GrcAction, GrcPage } from '$lib/types/grc';
	import ActionFormModal from '$lib/components/grc/ActionFormModal.svelte';
	import { formatAssetDate, ownerLabel } from '$lib/components/grc/asset-state';
	import { formatRiskDate } from '$lib/components/grc/risk-state';
	import {
		ACTION_PAGE_SIZE,
		actionAccess,
		actionDueStateLabel,
		actionDueStateTone,
		actionPriorityLabel,
		actionQuery,
		actionStatusLabel,
		actionTargets,
		emptyActionFilters,
		hasActiveActionFilters,
		labelOf,
		type ActionFilters
	} from '$lib/components/grc/action-state';
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

	let filters = $state<ActionFilters>(emptyActionFilters());
	let result = $state<GrcPage<GrcAction> | null>(null);
	let loading = $state(true);
	let error = $state('');
	let accessDenied = $state(false);
	let canCreate = $state(false);
	let formOpen = $state(false);

	async function load(): Promise<void> {
		loading = true;
		error = '';
		try {
			result = await listGrcActions(actionQuery(filters));
		} catch (e) {
			if (isAccessDeniedError(e)) accessDenied = true;
			else error = resolveUserErrorMessage(e, 'Impossible de charger le plan d’actions.');
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		const access = actionAccess(getStoredPermissions());
		if (!access.read) {
			accessDenied = true;
			loading = false;
			return;
		}
		canCreate = access.create;
		// Liens depuis un risque ou un constat : ?riskId=4 ou ?findingId=7.
		for (const key of ['riskId', 'findingId'] as const) {
			const value = Number(page.url.searchParams.get(key));
			if (Number.isInteger(value) && value > 0) filters[key] = value;
		}
		void load();
	});

	const rows = $derived(result?.items ?? []);
</script>

<svelte:head>
	<title>Plans d’actions | MedCore HIS</title>
</svelte:head>

{#if accessDenied}
	<AccessDenied
		title="Plans d’actions non disponibles"
		description="Votre profil n'inclut pas la permission de lecture des actions de remédiation."
	/>
{:else}
	<div class="min-w-0 space-y-6" data-testid="grc-actions">
		<PageHeader
			eyebrow="Sécurité & Conformité"
			title="Plans d’actions"
			description="Actions de remédiation sur les constats, risques et contrôles, avec leur suivi d’échéance."
		>
			{#snippet actions()}
				{#if canCreate}
					<Button onclick={() => (formOpen = true)} data-testid="grc-action-create"
						>Nouvelle action</Button
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
						id="grc-action-search"
						bind:value={filters.search}
						label="Rechercher une action"
						placeholder="Référence ou titre"
						class="min-w-[12rem] flex-1"
					/>
					<Select
						aria-label="Échéance"
						bind:value={filters.dueState}
						class="min-w-[10rem] sm:w-auto"
						data-testid="grc-action-filter-due"
					>
						<option value="">Toute échéance</option>
						{#each Object.entries(actionDueStateLabel) as [value, label] (value)}
							<option {value}>{label}</option>
						{/each}
					</Select>
					<Select
						aria-label="Statut"
						bind:value={filters.status}
						class="min-w-[9rem] sm:w-auto"
						data-testid="grc-action-filter-status"
					>
						<option value="">Tous statuts</option>
						{#each Object.entries(actionStatusLabel) as [value, label] (value)}
							<option {value}>{label}</option>
						{/each}
					</Select>
					<Select
						aria-label="Priorité"
						bind:value={filters.priority}
						class="min-w-[9rem] sm:w-auto"
						data-testid="grc-action-filter-priority"
					>
						<option value="">Toutes priorités</option>
						{#each Object.entries(actionPriorityLabel) as [value, label] (value)}
							<option {value}>{label}</option>
						{/each}
					</Select>
					<Button type="submit" variant="secondary" data-testid="grc-action-apply">Filtrer</Button>
					{#if hasActiveActionFilters(filters)}
						<Button
							variant="ghost"
							onclick={() => {
								filters = emptyActionFilters();
								void load();
							}}>Réinitialiser</Button
						>
					{/if}
				</FilterBar>
			</form>
			{#if filters.riskId || filters.findingId}
				<p
					class="border-b border-border px-4 py-2 text-xs text-muted-foreground"
					data-testid="grc-action-target-filter"
				>
					Filtré sur {filters.riskId
						? `le risque n° ${filters.riskId}`
						: `le constat n° ${filters.findingId}`}.
				</p>
			{/if}

			<Table
				variant="plain"
				minWidth="1080px"
				caption="Plan d’actions GRC"
				data-testid="grc-action-table"
			>
				<thead>
					<tr>
						<th>Référence</th>
						<th>Titre</th>
						<th>Cibles</th>
						<th>Priorité</th>
						<th>Statut</th>
						<th>Échéance</th>
						<th>Responsable</th>
						<th>Mise à jour</th>
					</tr>
				</thead>
				<tbody
					>{#if loading}<TableState
							state="loading"
							colspan={8}
							title="Chargement des actions…"
						/>{:else if rows.length === 0}<TableState
							state="empty"
							colspan={8}
							title={hasActiveActionFilters(filters)
								? 'Aucune action ne correspond'
								: 'Aucune action'}
							description={hasActiveActionFilters(filters)
								? 'Modifiez ou réinitialisez les filtres.'
								: canCreate
									? 'Utilisez « Nouvelle action » pour démarrer un plan de remédiation.'
									: 'Aucune action n’est encore enregistrée.'}
							data-testid="grc-action-empty"
						/>{:else}
						{#each rows as action (action.id)}
							<tr data-testid={`grc-action-row-${action.id}`}>
								<td class="font-medium whitespace-nowrap">
									<a href={resolve('/grc/actions/[id]', { id: String(action.id) })}
										>{action.reference}</a
									>
								</td>
								<td>{action.title}</td>
								<td>{actionTargets(action).join(' · ')}</td>
								<td>{labelOf(actionPriorityLabel, action.priority)}</td>
								<td>
									<StatusBadge
										status={action.status}
										label={labelOf(actionStatusLabel, action.status)}
									/>
								</td>
								<td class="whitespace-nowrap">
									<StatusBadge
										status={actionDueStateTone[action.dueState] ?? action.dueState}
										label={labelOf(actionDueStateLabel, action.dueState)}
									/>
									<span class="block text-xs text-muted-foreground"
										>{action.dueAt ? formatRiskDate(action.dueAt) : '—'}</span
									>
								</td>
								<td>{ownerLabel(action.assigneeProfile)}</td>
								<td class="whitespace-nowrap">{formatAssetDate(action.updatedAt)}</td>
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
						pageSize={ACTION_PAGE_SIZE}
						unit="action(s)"
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

	{#if canCreate}
		<ActionFormModal
			bind:open={formOpen}
			preset={{ riskId: filters.riskId, findingId: filters.findingId }}
			onsaved={(saved) => goto(resolve('/grc/actions/[id]', { id: String(saved.id) }))}
		/>
	{/if}
{/if}
