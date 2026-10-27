<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	import { listGrcEvidence } from '$lib/api/grc';
	import type { GrcEvidence, GrcPage } from '$lib/types/grc';
	import EvidenceFormModal from '$lib/components/grc/EvidenceFormModal.svelte';
	import { formatAssetDate } from '$lib/components/grc/asset-state';
	import { formatRiskDate } from '$lib/components/grc/risk-state';
	import {
		EVIDENCE_PAGE_SIZE,
		emptyEvidenceFilters,
		evidenceAccess,
		evidenceQuery,
		evidenceStatusLabel,
		evidenceTypeLabel,
		evidenceValidityLabel,
		evidenceValidityTone,
		hasActiveEvidenceFilters,
		implementationLabel,
		labelOf,
		type EvidenceFilters
	} from '$lib/components/grc/evidence-state';
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

	let filters = $state<EvidenceFilters>(emptyEvidenceFilters());
	let result = $state<GrcPage<GrcEvidence> | null>(null);
	let loading = $state(true);
	let error = $state('');
	let accessDenied = $state(false);
	let canManage = $state(false);
	let formOpen = $state(false);

	async function load(): Promise<void> {
		loading = true;
		error = '';
		try {
			result = await listGrcEvidence(evidenceQuery(filters));
		} catch (e) {
			if (isAccessDeniedError(e)) accessDenied = true;
			else error = resolveUserErrorMessage(e, 'Impossible de charger le registre des preuves.');
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		const access = evidenceAccess(getStoredPermissions());
		if (!access.read) {
			accessDenied = true;
			loading = false;
			return;
		}
		canManage = access.manage;
		// Lien depuis une implémentation : /grc/evidence?controlImplementationId=9.
		const implementationId = Number(page.url.searchParams.get('controlImplementationId'));
		if (Number.isInteger(implementationId) && implementationId > 0)
			filters.controlImplementationId = implementationId;
		void load();
	});

	const rows = $derived(result?.items ?? []);
</script>

<svelte:head>
	<title>Preuves & documents | MedCore HIS</title>
</svelte:head>

{#if accessDenied}
	<AccessDenied
		title="Registre des preuves non disponible"
		description="Votre profil n'inclut pas la permission de lecture des preuves GRC."
	/>
{:else}
	<div class="min-w-0 space-y-6" data-testid="grc-evidence">
		<PageHeader
			eyebrow="Sécurité & Conformité"
			title="Preuves & documents"
			description="Preuves des mises en œuvre de contrôles : métadonnées, référence documentaire et validité."
		>
			{#snippet actions()}
				{#if canManage}
					<Button onclick={() => (formOpen = true)} data-testid="grc-evidence-create"
						>Nouvelle preuve</Button
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
						id="grc-evidence-search"
						bind:value={filters.search}
						label="Rechercher une preuve"
						placeholder="Référence ou titre"
						class="min-w-[12rem] flex-1"
					/>
					<Select
						aria-label="Validité"
						bind:value={filters.validity}
						class="min-w-[10rem] sm:w-auto"
						data-testid="grc-evidence-filter-validity"
					>
						<option value="">Toute validité</option>
						{#each Object.entries(evidenceValidityLabel) as [value, label] (value)}
							<option {value}>{label}</option>
						{/each}
					</Select>
					<Select
						aria-label="Type"
						bind:value={filters.type}
						class="min-w-[9rem] sm:w-auto"
						data-testid="grc-evidence-filter-type"
					>
						<option value="">Tous types</option>
						{#each Object.entries(evidenceTypeLabel) as [value, label] (value)}
							<option {value}>{label}</option>
						{/each}
					</Select>
					<Select
						aria-label="Statut"
						bind:value={filters.status}
						class="min-w-[9rem] sm:w-auto"
						data-testid="grc-evidence-filter-status"
					>
						<option value="">Tous statuts</option>
						{#each Object.entries(evidenceStatusLabel) as [value, label] (value)}
							<option {value}>{label}</option>
						{/each}
					</Select>
					<Button type="submit" variant="secondary" data-testid="grc-evidence-apply">Filtrer</Button
					>
					{#if hasActiveEvidenceFilters(filters)}
						<Button
							variant="ghost"
							onclick={() => {
								filters = emptyEvidenceFilters();
								void load();
							}}>Réinitialiser</Button
						>
					{/if}
				</FilterBar>
			</form>
			{#if filters.controlImplementationId}
				<p
					class="border-b border-border px-4 py-2 text-xs text-muted-foreground"
					data-testid="grc-evidence-implementation-filter"
				>
					Filtré sur l’implémentation n° {filters.controlImplementationId}.
				</p>
			{/if}

			<Table
				variant="plain"
				minWidth="1000px"
				caption="Registre des preuves GRC"
				data-testid="grc-evidence-table"
			>
				<thead>
					<tr>
						<th>Référence</th>
						<th>Titre</th>
						<th>Type</th>
						<th>Contrôle mis en œuvre</th>
						<th>Validité</th>
						<th>Expire le</th>
						<th>Mise à jour</th>
					</tr>
				</thead>
				<tbody
					>{#if loading}<TableState
							state="loading"
							colspan={7}
							title="Chargement des preuves…"
						/>{:else if rows.length === 0}<TableState
							state="empty"
							colspan={7}
							title={hasActiveEvidenceFilters(filters)
								? 'Aucune preuve ne correspond'
								: 'Aucune preuve'}
							description={hasActiveEvidenceFilters(filters)
								? 'Modifiez ou réinitialisez les filtres.'
								: canManage
									? 'Utilisez « Nouvelle preuve » pour référencer un document.'
									: 'Aucune preuve n’est encore enregistrée.'}
							data-testid="grc-evidence-empty"
						/>{:else}
						{#each rows as evidence (evidence.id)}
							<tr data-testid={`grc-evidence-row-${evidence.id}`}>
								<td class="font-medium whitespace-nowrap">
									<a href={resolve('/grc/evidence/[id]', { id: String(evidence.id) })}
										>{evidence.reference}</a
									>
								</td>
								<td>{evidence.title}</td>
								<td>{labelOf(evidenceTypeLabel, evidence.type)}</td>
								<td>{implementationLabel(evidence)}</td>
								<td class="whitespace-nowrap">
									<StatusBadge
										status={evidenceValidityTone[evidence.validity] ?? evidence.validity}
										label={labelOf(evidenceValidityLabel, evidence.validity)}
									/>
								</td>
								<td class="whitespace-nowrap"
									>{evidence.expiresAt ? formatRiskDate(evidence.expiresAt) : 'Sans expiration'}</td
								>
								<td class="whitespace-nowrap">{formatAssetDate(evidence.updatedAt)}</td>
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
						pageSize={EVIDENCE_PAGE_SIZE}
						unit="preuve(s)"
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
		<EvidenceFormModal
			bind:open={formOpen}
			presetImplementationId={filters.controlImplementationId}
			onsaved={(saved) => goto(resolve('/grc/evidence/[id]', { id: String(saved.id) }))}
		/>
	{/if}
{/if}
