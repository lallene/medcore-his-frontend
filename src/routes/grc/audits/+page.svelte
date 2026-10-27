<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import { listGrcAudits } from '$lib/api/grc';
	import type { GrcAudit, GrcPage } from '$lib/types/grc';
	import AuditFormModal from '$lib/components/grc/AuditFormModal.svelte';
	import { formatAssetDate, ownerLabel } from '$lib/components/grc/asset-state';
	import { formatRiskDate } from '$lib/components/grc/risk-state';
	import {
		AUDIT_PAGE_SIZE,
		auditAccess,
		auditQuery,
		auditStatusLabel,
		auditTypeLabel,
		emptyAuditFilters,
		findingCountText,
		hasActiveAuditFilters,
		labelOf,
		type AuditFilters
	} from '$lib/components/grc/audit-state';
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

	let filters = $state<AuditFilters>(emptyAuditFilters());
	let result = $state<GrcPage<GrcAudit> | null>(null);
	let loading = $state(true);
	let error = $state('');
	let accessDenied = $state(false);
	let canCreate = $state(false);
	let formOpen = $state(false);

	async function load(): Promise<void> {
		loading = true;
		error = '';
		try {
			result = await listGrcAudits(auditQuery(filters));
		} catch (e) {
			if (isAccessDeniedError(e)) accessDenied = true;
			else error = resolveUserErrorMessage(e, 'Impossible de charger les audits.');
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		const access = auditAccess(getStoredPermissions());
		if (!access.read) {
			accessDenied = true;
			loading = false;
			return;
		}
		canCreate = access.create;
		void load();
	});

	const rows = $derived(result?.items ?? []);
	const period = (a: GrcAudit) =>
		a.plannedStartAt || a.plannedEndAt
			? `${a.plannedStartAt ? formatRiskDate(a.plannedStartAt) : '…'} → ${a.plannedEndAt ? formatRiskDate(a.plannedEndAt) : '…'}`
			: 'Non planifié';
</script>

<svelte:head>
	<title>Audits | MedCore HIS</title>
</svelte:head>

{#if accessDenied}
	<AccessDenied
		title="Audits non disponibles"
		description="Votre profil n'inclut pas la permission de lecture des audits GRC."
	/>
{:else}
	<div class="min-w-0 space-y-6" data-testid="grc-audits">
		<PageHeader
			eyebrow="Sécurité & Conformité"
			title="Audits"
			description="Missions d’audit, leur planification, leur cycle de vie et leurs constats."
		>
			{#snippet actions()}
				{#if canCreate}
					<Button onclick={() => (formOpen = true)} data-testid="grc-audit-create"
						>Nouvel audit</Button
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
						id="grc-audit-search"
						bind:value={filters.search}
						label="Rechercher un audit"
						placeholder="Référence ou titre"
						class="min-w-[12rem] flex-1"
					/>
					<Select
						aria-label="Statut"
						bind:value={filters.status}
						class="min-w-[9rem] sm:w-auto"
						data-testid="grc-audit-filter-status"
					>
						<option value="">Tous statuts</option>
						{#each Object.entries(auditStatusLabel) as [value, label] (value)}
							<option {value}>{label}</option>
						{/each}
					</Select>
					<Select
						aria-label="Type"
						bind:value={filters.type}
						class="min-w-[9rem] sm:w-auto"
						data-testid="grc-audit-filter-type"
					>
						<option value="">Tous types</option>
						{#each Object.entries(auditTypeLabel) as [value, label] (value)}
							<option {value}>{label}</option>
						{/each}
					</Select>
					<Button type="submit" variant="secondary" data-testid="grc-audit-apply">Filtrer</Button>
					{#if hasActiveAuditFilters(filters)}
						<Button
							variant="ghost"
							onclick={() => {
								filters = emptyAuditFilters();
								void load();
							}}>Réinitialiser</Button
						>
					{/if}
				</FilterBar>
			</form>

			<Table variant="plain" minWidth="1040px" caption="Audits GRC" data-testid="grc-audit-table">
				<thead>
					<tr>
						<th>Référence</th>
						<th>Titre</th>
						<th>Type</th>
						<th>Statut</th>
						<th>Période prévue</th>
						<th>Responsable</th>
						<th>Constats</th>
						<th>Mise à jour</th>
					</tr>
				</thead>
				<tbody
					>{#if loading}<TableState
							state="loading"
							colspan={8}
							title="Chargement des audits…"
						/>{:else if rows.length === 0}<TableState
							state="empty"
							colspan={8}
							title={hasActiveAuditFilters(filters) ? 'Aucun audit ne correspond' : 'Aucun audit'}
							description={hasActiveAuditFilters(filters)
								? 'Modifiez ou réinitialisez les filtres.'
								: canCreate
									? 'Utilisez « Nouvel audit » pour planifier une mission.'
									: 'Aucun audit n’est encore enregistré.'}
							data-testid="grc-audit-empty"
						/>{:else}
						{#each rows as audit (audit.id)}
							<tr data-testid={`grc-audit-row-${audit.id}`}>
								<td class="font-medium whitespace-nowrap">
									<a href={resolve('/grc/audits/[id]', { id: String(audit.id) })}
										>{audit.reference}</a
									>
								</td>
								<td>{audit.title}</td>
								<td>{labelOf(auditTypeLabel, audit.type)}</td>
								<td
									><StatusBadge
										status={audit.status}
										label={labelOf(auditStatusLabel, audit.status)}
									/></td
								>
								<td class="whitespace-nowrap">{period(audit)}</td>
								<td>{ownerLabel(audit.leadAuditorProfile)}</td>
								<td class={audit.overdueFindingCount ? 'text-danger' : ''}
									>{findingCountText(audit)}</td
								>
								<td class="whitespace-nowrap">{formatAssetDate(audit.updatedAt)}</td>
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
						pageSize={AUDIT_PAGE_SIZE}
						unit="audit(s)"
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
		<AuditFormModal
			bind:open={formOpen}
			onsaved={(saved) => goto(resolve('/grc/audits/[id]', { id: String(saved.id) }))}
		/>
	{/if}
{/if}
