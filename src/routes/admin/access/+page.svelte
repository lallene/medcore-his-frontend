<script lang="ts">
	import TableState from '$lib/components/ui/TableState.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import HelpHint from '$lib/components/help/HelpHint.svelte';
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
			<span class="flex items-center gap-1">
				<label class="flex items-center gap-2 text-sm">
					<input type="checkbox" bind:checked={overridesOnly} />
					Exceptions seulement
				</label>
				<HelpHint helpKey="administration.access.exceptions_only" />
			</span>
			<Button onclick={() => void load()}>Filtrer</Button>
		</FilterBar>

		<Table containerTestId="access-users-table">
			<thead>
				<tr>
					<th>Utilisateur</th>
					<th>Fonction(s)</th>
					<th>Services</th>
					<th>Statut</th>
					<th>Niveau</th>
					<th class="mc-num">Exceptions</th>
					<th>Modifié</th>
					<th class="mc-actions"></th>
				</tr>
			</thead>
			<tbody
				>{#if loading}<TableState
						state="loading"
						colspan={8}
						title="Chargement des accès…"
					/>{:else if rows.length === 0}<TableState
						state="empty"
						colspan={8}
						title="Aucun utilisateur"
						description="Aucun profil ne correspond aux filtres."
					/>{:else}
					{#each rows as row (row.profileId)}
						<tr data-testid="access-user-row">
							<td>
								<div class="font-medium">{row.name}</div>
								<div class="text-xs text-muted-foreground">{row.email}</div>
								<div class="text-xs text-muted-foreground">{row.employeeCode}</div>
							</td>
							<td>{row.functions.join(', ') || '—'}</td>
							<td>
								{#each row.services as s (s.id)}
									<div class="text-xs">
										{s.name}{#if s.isPrimary}
											<span class="text-muted-foreground"> (principal)</span>{/if}
									</div>
								{:else}
									—
								{/each}
							</td>
							<td>
								<StatusBadge
									status={row.active ? 'ACTIVE' : 'INACTIVE'}
									label={row.active ? 'Actif' : 'Inactif'}
								/>
							</td>
							<td>
								{#if row.privileged}
									<StatusBadge status="HIGH" label={accessLevelLabel(row.accessLevel)} />
								{:else}
									{accessLevelLabel(row.accessLevel)}
								{/if}
							</td>
							<td class="mc-num">{row.overrideCount}</td>
							<td>{row.updatedAt}</td>
							<td class="mc-actions">
								<Button
									size="sm"
									variant="secondary"
									onclick={() => goto(resolve(`/admin/access/users/${row.profileId}`))}
									>Gérer</Button
								>
							</td>
						</tr>
					{/each}
				{/if}</tbody
			>
		</Table>
	{/if}
</div>
