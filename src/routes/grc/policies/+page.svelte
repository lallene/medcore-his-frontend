<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';

	import { listGrcPolicies } from '$lib/api/grc';
	import type { GrcGovernancePolicy, GrcPage } from '$lib/types/grc';
	import PolicyFormModal from '$lib/components/grc/PolicyFormModal.svelte';
	import { ownerLabel, serviceLabel } from '$lib/components/grc/asset-state';
	import {
		POLICY_PAGE_SIZE,
		emptyPolicyFilters,
		hasActivePolicyFilters,
		labelOf,
		policyAccess,
		policyQuery,
		policyStatusLabel,
		type PolicyFilters
	} from '$lib/components/grc/policy-state';
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

	let filters = $state<PolicyFilters>(emptyPolicyFilters());
	let result = $state<GrcPage<GrcGovernancePolicy> | null>(null);
	let loading = $state(true);
	let error = $state('');
	let accessDenied = $state(false);
	let canCreate = $state(false);
	let formOpen = $state(false);

	const access = policyAccess(getStoredPermissions());

	async function load(): Promise<void> {
		loading = true;
		error = '';
		try {
			result = await listGrcPolicies(policyQuery(filters));
		} catch (cause) {
			if (isAccessDeniedError(cause)) accessDenied = true;
			else error = resolveUserErrorMessage(cause, 'Impossible de charger les politiques.');
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
	const dates = (policy: GrcGovernancePolicy) => {
		const from = policy.effectiveFrom?.slice(0, 10) ?? '';
		const to = policy.effectiveTo?.slice(0, 10) ?? '';
		if (!from && !to) return '—';
		return to ? `${from} → ${to}` : from;
	};
</script>

<svelte:head>
	<title>Politiques | MedCore HIS</title>
</svelte:head>

{#if accessDenied}
	<AccessDenied
		title="Politiques non disponibles"
		description="Votre profil n'inclut pas la permission de lecture des politiques de gouvernance."
	/>
{:else}
	<div class="min-w-0 space-y-6" data-testid="grc-policies">
		<PageHeader
			eyebrow="Sécurité & Conformité"
			title="Politiques"
			description="Politiques internes de gouvernance, de sécurité ou de conformité."
		>
			{#snippet actions()}
				{#if canCreate}
					<Button onclick={() => (formOpen = true)} data-testid="grc-policy-create"
						>Nouvelle politique</Button
					>
				{/if}
			{/snippet}
		</PageHeader>

		{#if error}
			<Alert tone="danger">{error}</Alert>
		{/if}

		<section class="min-w-0 rounded-2xl border border-border bg-surface shadow-xs">
			<form
				onsubmit={(event) => {
					event.preventDefault();
					filters.page = 1;
					void load();
				}}
			>
				<FilterBar class="rounded-none border-0 border-b border-border shadow-none">
					<SearchInput
						id="grc-policy-search"
						bind:value={filters.search}
						label="Rechercher une politique"
						placeholder="Référence, titre ou version"
						class="min-w-[12rem] flex-1"
					/>
					<Select id="grc-policy-status" bind:value={filters.status} class="w-44">
						<option value="">Tous les statuts</option>
						{#each Object.entries(policyStatusLabel) as [value, label] (value)}
							<option {value}>{label}</option>
						{/each}
					</Select>
					<label class="grid gap-1 text-xs font-medium text-muted-foreground">
						Référentiel
						<Input id="grc-policy-framework" bind:value={filters.frameworkId} />
					</label>
					<label class="grid gap-1 text-xs font-medium text-muted-foreground">
						Contrôle
						<Input id="grc-policy-control" bind:value={filters.controlId} />
					</label>
					<label class="grid gap-1 text-xs font-medium text-muted-foreground">
						Service
						<Input id="grc-policy-service" bind:value={filters.owningServiceId} />
					</label>
					<label class="grid gap-1 text-xs font-medium text-muted-foreground">
						Propriétaire
						<Input id="grc-policy-owner" bind:value={filters.ownerProfileId} />
					</label>
					<Button type="submit" variant="secondary">Filtrer</Button>
					{#if hasActivePolicyFilters(filters)}
						<Button
							type="button"
							variant="ghost"
							onclick={() => {
								filters = emptyPolicyFilters();
								void load();
							}}>Réinitialiser</Button
						>
					{/if}
				</FilterBar>
			</form>

			<Table minWidth="960px" variant="plain" caption="Registre des politiques">
				<thead>
					<tr>
						<th>Référence</th>
						<th>Titre</th>
						<th>Version</th>
						<th>Statut</th>
						<th>Effet</th>
						<th>Référentiels</th>
						<th>Contrôles</th>
						<th>Responsable</th>
					</tr>
				</thead>
				<tbody>
					{#if loading}
						<TableState state="loading" colspan={8} title="Chargement des politiques…" />
					{:else if rows.length === 0}
						<TableState
							state="empty"
							colspan={8}
							title={hasActivePolicyFilters(filters)
								? 'Aucune politique ne correspond'
								: 'Aucune politique'}
							description={hasActivePolicyFilters(filters)
								? 'Modifiez ou réinitialisez les filtres.'
								: canCreate
									? 'Utilisez « Nouvelle politique » pour ouvrir un brouillon.'
									: 'Aucune politique n’est encore enregistrée.'}
							data-testid="grc-policy-empty"
						/>
					{:else}
						{#each rows as policy (policy.id)}
							<tr>
								<td class="whitespace-nowrap font-medium">
									<a href={resolve('/grc/policies/[id]', { id: String(policy.id) })}
										>{policy.reference}</a
									>
								</td>
								<td class="max-w-[16rem] truncate">{policy.title}</td>
								<td>{policy.version}</td>
								<td>
									<StatusBadge
										status={policy.status}
										label={labelOf(policyStatusLabel, policy.status)}
									/>
								</td>
								<td class="whitespace-nowrap">{dates(policy)}</td>
								<td>{policy.frameworkCount}</td>
								<td>{policy.controlCount}</td>
								<td>
									{ownerLabel(policy.ownerProfile)}
									<span class="block text-xs text-muted-foreground"
										>{serviceLabel(policy.owningService)}</span
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
						pageSize={POLICY_PAGE_SIZE}
						unit="politique(s)"
						disabled={loading}
						onpage={(page) => {
							filters.page = page;
							void load();
						}}
					/>
				</div>
			{/if}
		</section>
	</div>
	<PolicyFormModal bind:open={formOpen} onsaved={() => void load()} />
{/if}
