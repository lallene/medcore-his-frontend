<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { jwtDecode } from 'jwt-decode';
	import { getAccessKPIs, listAccessUsers } from '$lib/api/access';
	import { getStaffCatalog } from '$lib/api/staff';
	import { listOrganizationServices } from '$lib/api/organization';
	import { accessLevelLabel, canAccessCenter } from '$lib/components/access/state';
	import type { AccessKPIs, AccessUserSummary } from '$lib/types/access';
	import type { OrganizationService } from '$lib/types/organization';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import MetricCard from '$lib/components/ui/MetricCard.svelte';
	import FilterBar from '$lib/components/ui/FilterBar.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';

	let kpis = $state<AccessKPIs | null>(null);
	let rows = $state<AccessUserSummary[]>([]);
	let services = $state<OrganizationService[]>([]);
	let functionOptions = $state<{ value: string; label: string }[]>([]);
	let permissions = $state<string[]>([]);
	let denied = $state(false);
	let loading = $state(true);
	let error = $state('');
	let search = $state('');
	let functionFilter = $state('');
	let statusFilter = $state('');
	let privilegeFilter = $state('');
	let serviceFilter = $state('');
	let overridesOnly = $state(false);

	async function load() {
		loading = true;
		error = '';
		try {
			const [k, list, catalog, orgServices] = await Promise.all([
				getAccessKPIs(),
				listAccessUsers({
					search: search || undefined,
					function: functionFilter || undefined,
					status: statusFilter || undefined,
					privilege: privilegeFilter || undefined,
					serviceId: serviceFilter || undefined,
					hasOverrides: overridesOnly || undefined,
					limit: 50
				}),
				getStaffCatalog(),
				listOrganizationServices()
			]);
			kpis = k;
			rows = list.items;
			services = orgServices;
			functionOptions = Object.entries(catalog.functions).map(([value, label]) => ({
				value,
				label
			}));
		} catch (e) {
			error = e instanceof Error ? e.message : 'Chargement impossible';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		try {
			const raw = localStorage.getItem('medcore_token');
			if (raw) {
				const claims = jwtDecode<{ permissions?: string[] }>(raw);
				permissions = claims.permissions ?? [];
			}
		} catch {
			permissions = [];
		}
		if (!canAccessCenter(permissions)) {
			denied = true;
			loading = false;
			return;
		}
		void load();
	});
</script>

<div class="space-y-6" data-testid="access-center">
	<PageHeader
		eyebrow="Administration"
		title="Centre de contrôle des accès"
		description="Utilisateurs, fonctions, services, permissions effectives et exceptions."
	>
		{#snippet actions()}
			<a
				class="inline-flex items-center justify-center rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground"
				href={resolve('/admin/access/matrix')}>Matrice RBAC</a
			>
			<a
				class="inline-flex items-center justify-center rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground"
				href={resolve('/admin/access/permissions')}>Catalogue permissions</a
			>
		{/snippet}
	</PageHeader>

	{#if denied}
		<Alert tone="danger">Accès refusé — permission rbac.read ou staff.read requise.</Alert>
	{:else}
		{#if error}
			<Alert tone="danger">{error}</Alert>
		{/if}

		{#if kpis}
			<section
				class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
				data-testid="access-kpis"
			>
				<MetricCard title="Utilisateurs" value={kpis.users} />
				<MetricCard title="Actifs" value={kpis.active} />
				<MetricCard title="Désactivés" value={kpis.disabled} />
				<MetricCard title="Privilégiés" value={kpis.privileged} />
				<MetricCard title="Sans service" value={kpis.withoutService} />
				<MetricCard title="Avec exceptions" value={kpis.withOverrides} />
			</section>
		{/if}

		<FilterBar>
			<SearchInput bind:value={search} placeholder="Nom, email, code…" />
			<Select bind:value={functionFilter}>
				<option value="">Toutes fonctions</option>
				{#each functionOptions as opt (opt.value)}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</Select>
			<Select bind:value={serviceFilter}>
				<option value="">Tous services</option>
				{#each services as s (s.id)}
					<option value={String(s.id)}>{s.name}</option>
				{/each}
			</Select>
			<Select bind:value={statusFilter}>
				<option value="">Tous statuts</option>
				<option value="active">Actifs</option>
				<option value="disabled">Désactivés</option>
			</Select>
			<Select bind:value={privilegeFilter}>
				<option value="">Tous niveaux</option>
				<option value="privileged">Privilégiés</option>
				<option value="standard">Standard</option>
			</Select>
			<label class="flex items-center gap-2 text-sm">
				<input type="checkbox" bind:checked={overridesOnly} />
				Exceptions seulement
			</label>
			<Button onclick={() => void load()}>Filtrer</Button>
		</FilterBar>

		{#if loading}
			<LoadingState label="Chargement des accès…" />
		{:else if rows.length === 0}
			<EmptyState title="Aucun utilisateur" description="Aucun profil ne correspond aux filtres." />
		{:else}
			<div class="overflow-x-auto rounded-xl border border-border" data-testid="access-users-table">
				<table class="min-w-full text-left text-sm">
					<thead class="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
						<tr>
							<th class="px-3 py-2">Utilisateur</th>
							<th class="px-3 py-2">Fonction(s)</th>
							<th class="px-3 py-2">Services</th>
							<th class="px-3 py-2">Statut</th>
							<th class="px-3 py-2">Niveau</th>
							<th class="px-3 py-2">Exceptions</th>
							<th class="px-3 py-2">Modifié</th>
							<th class="px-3 py-2"></th>
						</tr>
					</thead>
					<tbody>
						{#each rows as row (row.profileId)}
							<tr class="border-t border-border" data-testid="access-user-row">
								<td class="px-3 py-2">
									<div class="font-medium">{row.name}</div>
									<div class="text-xs text-muted-foreground">{row.email}</div>
									<div class="text-xs text-muted-foreground">{row.employeeCode}</div>
								</td>
								<td class="px-3 py-2">{row.functions.join(', ') || '—'}</td>
								<td class="px-3 py-2">
									{#each row.services as s (s.id)}
										<div class="text-xs">
											{s.name}{#if s.isPrimary}
												<span class="text-muted-foreground"> (principal)</span>{/if}
										</div>
									{:else}
										—
									{/each}
								</td>
								<td class="px-3 py-2">
									<StatusBadge
										status={row.active ? 'ACTIVE' : 'INACTIVE'}
										label={row.active ? 'Actif' : 'Inactif'}
									/>
								</td>
								<td class="px-3 py-2">
									{#if row.privileged}
										<StatusBadge status="HIGH" label={accessLevelLabel(row.accessLevel)} />
									{:else}
										{accessLevelLabel(row.accessLevel)}
									{/if}
								</td>
								<td class="px-3 py-2">{row.overrideCount}</td>
								<td class="px-3 py-2 text-xs text-muted-foreground">{row.updatedAt}</td>
								<td class="px-3 py-2">
									<Button
										size="sm"
										variant="secondary"
										onclick={() => goto(resolve(`/admin/access/users/${row.profileId}`))}
										>Gérer</Button
									>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}
</div>
