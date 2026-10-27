<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	import { getGrcCoverage, getGrcFramework, listGrcRequirements } from '$lib/api/grc';
	import type {
		GrcComplianceCoverage,
		GrcFramework,
		GrcPage,
		GrcRequirement
	} from '$lib/types/grc';
	import {
		COMPLIANCE_PAGE_SIZE,
		canReadCoverage,
		canReadFrameworks,
		canReadRequirements,
		coverageNote,
		coverageOf,
		coveragePercent,
		coverageText,
		emptyRequirementFilters,
		frameworkStatusLabel,
		hasActiveRequirementFilters,
		labelOf,
		mappingLabel,
		requirementQuery,
		requirementStatusLabel,
		type RequirementFilters
	} from '$lib/components/grc/compliance-state';
	import { formatAssetDate } from '$lib/components/grc/asset-state';
	import { formatGrcNumber } from '$lib/components/grc/dashboard-state';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import FilterBar from '$lib/components/ui/FilterBar.svelte';
	import LinkButton from '$lib/components/ui/LinkButton.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
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

	let framework = $state<GrcFramework | null>(null);
	let coverage = $state<GrcComplianceCoverage | null>(null);
	let requirements = $state<GrcPage<GrcRequirement> | null>(null);
	let filters = $state<RequirementFilters>(emptyRequirementFilters());
	let loading = $state(true);
	let requirementsLoading = $state(false);
	let error = $state('');
	let requirementsError = $state('');
	let accessDenied = $state(false);
	let requirementsAllowed = $state(false);

	const frameworkId = $derived(Number(page.params.id));

	async function loadRequirements() {
		requirementsLoading = true;
		requirementsError = '';
		try {
			requirements = await listGrcRequirements(requirementQuery(frameworkId, filters));
		} catch (e) {
			requirementsError = resolveUserErrorMessage(e, 'Impossible de charger les exigences.');
		} finally {
			requirementsLoading = false;
		}
	}

	onMount(async () => {
		const permissions = getStoredPermissions();
		if (!canReadFrameworks(permissions)) {
			accessDenied = true;
			loading = false;
			return;
		}
		requirementsAllowed = canReadRequirements(permissions);
		if (!Number.isInteger(frameworkId) || frameworkId <= 0) {
			error = 'Identifiant de référentiel invalide.';
			loading = false;
			return;
		}
		try {
			framework = await getGrcFramework(frameworkId);
		} catch (e) {
			if (isAccessDeniedError(e)) accessDenied = true;
			else error = resolveUserErrorMessage(e, 'Impossible de charger le référentiel.');
			loading = false;
			return;
		}
		loading = false;
		if (canReadCoverage(permissions)) {
			try {
				coverage = coverageOf((await getGrcCoverage([frameworkId])).frameworks, frameworkId);
			} catch {
				coverage = null;
			}
		}
		if (requirementsAllowed) void loadRequirements();
	});

	const rows = $derived(requirements?.items ?? []);
</script>

<svelte:head>
	<title>{framework ? `${framework.code} · Conformité` : 'Référentiel'} | MedCore HIS</title>
</svelte:head>

{#if loading}
	<LoadingState label="Chargement du référentiel…" />
{:else if accessDenied}
	<AccessDenied
		title="Référentiel non disponible"
		description="Votre profil n'inclut pas la permission de lecture des référentiels de conformité."
	/>
{:else if !framework}
	<div class="space-y-4">
		<Alert tone="danger">{error || 'Référentiel introuvable.'}</Alert>
		<LinkButton href={resolve('/grc/compliance')} variant="secondary"
			>Retour à la conformité</LinkButton
		>
	</div>
{:else}
	<div class="min-w-0 space-y-6" data-testid="grc-framework-detail">
		<PageHeader
			eyebrow="Conformité"
			title={framework.name}
			description={`${framework.code} · version ${framework.version}`}
		>
			{#snippet meta()}
				<StatusBadge
					status={framework?.status ?? ''}
					label={`Statut : ${labelOf(frameworkStatusLabel, framework?.status ?? '')}`}
					data-testid="grc-framework-status"
				/>
			{/snippet}
			{#snippet actions()}
				<LinkButton href={resolve('/grc/compliance')} variant="secondary">Conformité</LinkButton>
			{/snippet}
		</PageHeader>

		<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
			<div data-testid="grc-framework-coverage">
				{#if coverage}
					<MetricCard
						title="Couverture du mapping"
						value={coveragePercent(coverage)}
						progress={coverage.controlMappingCoverage.percent}
						detail={coverageText(coverage)}
					/>
					{#if coverageNote(framework.status, coverage)}
						<p class="mt-2 text-xs text-muted-foreground">
							{coverageNote(framework.status, coverage)}
						</p>
					{/if}
					<dl class="mt-4 grid grid-cols-2 gap-3">
						{#each [['Exigences', coverage.requirements], ['Applicables', coverage.applicableRequirements], ['Couvertes', coverage.mappedRequirements], ['Non couvertes', coverage.unmappedRequirements]] as [label, value] (label)}
							<div class="rounded-lg border border-border bg-surface-muted px-3 py-2">
								<dt class="text-xs text-muted-foreground">{label}</dt>
								<dd class="mt-1 text-lg font-semibold tabular-nums">
									{formatGrcNumber(Number(value))}
								</dd>
							</div>
						{/each}
					</dl>
				{:else}
					<Card title="Couverture du mapping" class="min-w-0">
						<p class="text-sm text-muted-foreground">
							Couverture indisponible : elle nécessite la lecture des référentiels et des exigences.
						</p>
					</Card>
				{/if}
			</div>
			<Card title="Référentiel" class="min-w-0">
				<dl class="grid gap-4 sm:grid-cols-2">
					{#each [['Code', framework.code], ['Version', framework.version], ['Source', framework.source || 'Non renseignée'], ['Publié le', framework.publishedAt ? formatAssetDate(framework.publishedAt) : 'Non renseigné'], ['Créé le', formatAssetDate(framework.createdAt)], ['Mis à jour le', formatAssetDate(framework.updatedAt)]] as [label, value] (label)}
						<div class="min-w-0">
							<dt class="text-xs font-medium text-muted-foreground">{label}</dt>
							<dd class="mt-1 break-words text-sm text-foreground">{value}</dd>
						</div>
					{/each}
					<div class="min-w-0 sm:col-span-2">
						<dt class="text-xs font-medium text-muted-foreground">Description</dt>
						<dd class="mt-1 text-sm whitespace-pre-line text-foreground">
							{framework.description || 'Aucune description'}
						</dd>
					</div>
				</dl>
			</Card>
		</div>

		<section
			class="min-w-0 rounded-2xl border border-border bg-surface shadow-xs"
			data-testid="grc-framework-requirements"
		>
			<div class="border-b border-border px-4 py-3">
				<h2 class="text-base font-semibold text-foreground">Exigences</h2>
			</div>
			{#if !requirementsAllowed}
				<p
					class="p-4 text-sm text-muted-foreground"
					data-testid="grc-framework-requirements-denied"
				>
					La consultation des exigences nécessite la permission de lecture des exigences GRC.
				</p>
			{:else}
				<form
					onsubmit={(e) => {
						e.preventDefault();
						filters.page = 1;
						void loadRequirements();
					}}
				>
					<FilterBar class="rounded-none border-0 border-b border-border shadow-none">
						<SearchInput
							id="grc-requirement-search"
							bind:value={filters.search}
							label="Rechercher une exigence"
							placeholder="Code ou titre"
							class="min-w-[12rem] flex-1"
						/>
						<Select
							aria-label="Statut"
							bind:value={filters.status}
							class="min-w-[9rem] sm:w-auto"
							data-testid="grc-requirement-filter-status"
						>
							<option value="">Tous statuts</option>
							{#each Object.entries(requirementStatusLabel) as [value, label] (value)}
								<option {value}>{label}</option>
							{/each}
						</Select>
						<Select
							aria-label="Mapping"
							bind:value={filters.mapped}
							class="min-w-[10rem] sm:w-auto"
							data-testid="grc-requirement-filter-mapped"
						>
							<option value="">Toutes</option>
							<option value="true">Couvertes par un contrôle</option>
							<option value="false">Non couvertes</option>
						</Select>
						<Button type="submit" variant="secondary" data-testid="grc-requirement-apply"
							>Filtrer</Button
						>
					</FilterBar>
				</form>
				{#if requirementsError}<Alert tone="danger" class="m-4">{requirementsError}</Alert>{/if}
				<Table
					variant="plain"
					minWidth="760px"
					caption="Exigences du référentiel"
					data-testid="grc-requirement-table"
				>
					<thead>
						<tr>
							<th>Code</th>
							<th>Titre</th>
							<th>Statut</th>
							<th>Mapping</th>
						</tr>
					</thead>
					<tbody
						>{#if requirementsLoading}<TableState
								state="loading"
								colspan={4}
							/>{:else if rows.length === 0}<TableState
								state="empty"
								colspan={4}
								title={hasActiveRequirementFilters(filters)
									? 'Aucune exigence ne correspond'
									: 'Aucune exigence'}
								data-testid="grc-requirement-empty"
							/>{:else}
							{#each rows as requirement (requirement.id)}
								<tr data-testid={`grc-requirement-row-${requirement.id}`}>
									<td class="font-medium whitespace-nowrap">
										<a
											href={resolve('/grc/compliance/requirements/[id]', {
												id: String(requirement.id)
											})}>{requirement.code}</a
										>
									</td>
									<td>{requirement.title}</td>
									<td>
										<StatusBadge
											status={requirement.status}
											label={labelOf(requirementStatusLabel, requirement.status)}
										/>
									</td>
									<td>
										<StatusBadge
											status={requirement.mappedControls > 0 ? 'COMPLETED' : 'PENDING'}
											label={mappingLabel(requirement.mappedControls)}
										/>
									</td>
								</tr>
							{/each}
						{/if}</tbody
					>
				</Table>
				{#if requirements && requirements.total > 0}
					<div class="border-t border-border px-4 py-3">
						<Pagination
							page={requirements.page}
							totalPages={requirements.totalPages}
							total={requirements.total}
							pageSize={COMPLIANCE_PAGE_SIZE}
							unit="exigence(s)"
							disabled={requirementsLoading}
							onpage={(n) => {
								filters.page = n;
								void loadRequirements();
							}}
						/>
					</div>
				{/if}
			{/if}
		</section>
	</div>
{/if}
