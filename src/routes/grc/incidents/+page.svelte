<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';

	import { listGrcIncidents } from '$lib/api/grc';
	import type { GrcPage, GrcSecurityIncident } from '$lib/types/grc';
	import IncidentFormModal from '$lib/components/grc/IncidentFormModal.svelte';
	import { formatAssetDate, ownerLabel, serviceLabel } from '$lib/components/grc/asset-state';
	import {
		INCIDENT_PAGE_SIZE,
		emptyIncidentFilters,
		hasActiveIncidentFilters,
		incidentAccess,
		incidentQuery,
		incidentSeverityLabel,
		incidentStatusLabel,
		labelOf,
		type IncidentFilters
	} from '$lib/components/grc/incident-state';
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

	let filters = $state<IncidentFilters>(emptyIncidentFilters());
	let result = $state<GrcPage<GrcSecurityIncident> | null>(null);
	let loading = $state(true);
	let error = $state('');
	let accessDenied = $state(false);
	let canCreate = $state(false);
	let formOpen = $state(false);

	const access = incidentAccess(getStoredPermissions());

	async function load(): Promise<void> {
		loading = true;
		error = '';
		try {
			result = await listGrcIncidents(incidentQuery(filters));
		} catch (e) {
			if (isAccessDeniedError(e)) accessDenied = true;
			else error = resolveUserErrorMessage(e, 'Impossible de charger les incidents.');
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		if (!access.read) {
			accessDenied = true;
			loading = false;
			return;
		}
		canCreate = access.create;
		void load();
	});

	const rows = $derived(result?.items ?? []);
	const relation = (label: string | undefined, id: number | null) => label || (id ? `#${id}` : '—');
</script>

<svelte:head>
	<title>Incidents de sécurité | MedCore HIS</title>
</svelte:head>

{#if accessDenied}
	<AccessDenied
		title="Incidents non disponibles"
		description="Votre profil n'inclut pas la permission de lecture des incidents de sécurité."
	/>
{:else}
	<div class="min-w-0 space-y-6" data-testid="grc-incidents">
		<PageHeader
			eyebrow="Sécurité & Conformité"
			title="Incidents de sécurité"
			description="Événements de sécurité de l’information suivis par le GRC, distincts des tickets de support."
		>
			{#snippet actions()}
				{#if canCreate}
					<Button onclick={() => (formOpen = true)} data-testid="grc-incident-create"
						>Nouvel incident</Button
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
						id="grc-incident-search"
						bind:value={filters.search}
						label="Rechercher un incident"
						placeholder="Référence ou titre"
						class="min-w-[12rem] flex-1"
					/>
					<Select
						aria-label="Statut"
						bind:value={filters.status}
						class="min-w-[9rem] sm:w-auto"
						data-testid="grc-incident-filter-status"
					>
						<option value="">Tous statuts</option>
						{#each Object.entries(incidentStatusLabel) as [value, label] (value)}
							<option {value}>{label}</option>
						{/each}
					</Select>
					<Select
						aria-label="Sévérité"
						bind:value={filters.severity}
						class="min-w-[9rem] sm:w-auto"
						data-testid="grc-incident-filter-severity"
					>
						<option value="">Toutes sévérités</option>
						{#each Object.entries(incidentSeverityLabel) as [value, label] (value)}
							<option {value}>{label}</option>
						{/each}
					</Select>
					<label class="grid gap-1 text-xs text-muted-foreground">
						Risque
						<Input
							id="grc-incident-filter-risk"
							bind:value={filters.riskId}
							placeholder="Identifiant"
							class="w-28"
						/>
					</label>
					<label class="grid gap-1 text-xs text-muted-foreground">
						Actif
						<Input
							id="grc-incident-filter-asset"
							bind:value={filters.assetId}
							placeholder="Identifiant"
							class="w-28"
						/>
					</label>
					<Button type="submit" variant="secondary" data-testid="grc-incident-apply">Filtrer</Button
					>
					{#if hasActiveIncidentFilters(filters)}
						<Button
							variant="ghost"
							onclick={() => {
								filters = emptyIncidentFilters();
								void load();
							}}>Réinitialiser</Button
						>
					{/if}
				</FilterBar>
			</form>

			<Table
				variant="plain"
				minWidth="1100px"
				caption="Incidents de sécurité"
				data-testid="grc-incident-table"
			>
				<thead>
					<tr>
						<th>Référence</th>
						<th>Titre</th>
						<th>Sévérité</th>
						<th>Statut</th>
						<th>Détection</th>
						<th>Risque</th>
						<th>Actif</th>
						<th>Responsable</th>
					</tr>
				</thead>
				<tbody>
					{#if loading}
						<TableState state="loading" colspan={8} title="Chargement des incidents…" />
					{:else if rows.length === 0}
						<TableState
							state="empty"
							colspan={8}
							title={hasActiveIncidentFilters(filters)
								? 'Aucun incident ne correspond'
								: 'Aucun incident'}
							description={hasActiveIncidentFilters(filters)
								? 'Modifiez ou réinitialisez les filtres.'
								: canCreate
									? 'Utilisez « Nouvel incident » pour enregistrer un événement.'
									: 'Aucun incident n’est encore enregistré.'}
							data-testid="grc-incident-empty"
						/>
					{:else}
						{#each rows as incident (incident.id)}
							<tr data-testid={`grc-incident-row-${incident.id}`}>
								<td class="font-medium whitespace-nowrap">
									<a href={resolve('/grc/incidents/[id]', { id: String(incident.id) })}
										>{incident.reference}</a
									>
								</td>
								<td class="max-w-[16rem] truncate">{incident.title}</td>
								<td>
									<StatusBadge
										status={incident.severity}
										label={labelOf(incidentSeverityLabel, incident.severity)}
									/>
								</td>
								<td>
									<StatusBadge
										status={incident.status}
										label={labelOf(incidentStatusLabel, incident.status)}
									/>
								</td>
								<td class="whitespace-nowrap">{formatAssetDate(incident.detectedAt)}</td>
								<td>{relation(incident.risk?.reference, incident.riskId)}</td>
								<td>{relation(incident.asset?.code, incident.assetId)}</td>
								<td>
									{ownerLabel(incident.ownerProfile)}
									<span class="block text-xs text-muted-foreground"
										>{serviceLabel(incident.owningService)}</span
									>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</Table>

			{#if result && result.total > 0}
				<div class="border-t border-border px-4 py-3">
					<Pagination
						page={result.page}
						totalPages={result.totalPages}
						total={result.total}
						pageSize={INCIDENT_PAGE_SIZE}
						unit="incident(s)"
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
	<IncidentFormModal bind:open={formOpen} onsaved={() => void load()} />
{/if}
