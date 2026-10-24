<script lang="ts">
	import TableState from '$lib/components/ui/TableState.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { listAccessPermissions } from '$lib/api/access';
	import type { AccessPermission } from '$lib/types/access';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';

	let rows = $state<AccessPermission[]>([]);
	let search = $state('');
	let domain = $state('');
	let loading = $state(true);
	let error = $state('');

	const domains = $derived([...new Set(rows.map((r) => r.domain))].sort());
	const filtered = $derived(
		rows.filter((r) => {
			if (domain && r.domain !== domain) return false;
			if (!search) return true;
			const q = search.toLowerCase();
			return (
				r.key.toLowerCase().includes(q) ||
				r.label.toLowerCase().includes(q) ||
				r.domain.toLowerCase().includes(q)
			);
		})
	);

	onMount(async () => {
		try {
			rows = await listAccessPermissions();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Chargement impossible';
		} finally {
			loading = false;
		}
	});
</script>

<div class="space-y-6" data-testid="access-permissions">
	<a class="text-sm text-primary hover:underline" href={resolve('/admin/access')}
		>← Centre d'accès</a
	>
	<PageHeader
		eyebrow="RBAC"
		title="Catalogue des permissions"
		description="Clés techniques, domaines, sensibilité et fonctions associées."
	/>
	{#if error}
		<Alert tone="danger">{error}</Alert>
	{/if}
	<div class="flex flex-wrap gap-3">
		<SearchInput bind:value={search} placeholder="Rechercher…" />
		<select
			class="min-h-control rounded-lg border border-input bg-surface px-3 py-2 text-sm"
			aria-label="Domaine"
			bind:value={domain}
		>
			<option value="">Tous domaines</option>
			{#each domains as d (d)}
				<option value={d}>{d}</option>
			{/each}
		</select>
	</div>
	<Table>
		<thead>
			<tr>
				<th>Permission</th>
				<th>Domaine</th>
				<th>Scope</th>
				<th>Sensibilité</th>
				<th>Fonctions</th>
			</tr>
		</thead>
		<tbody>
			{#if loading}<TableState
					state="loading"
					colspan={5}
					title="Chargement…"
				/>{:else if filtered.length === 0}<TableState
					state="empty"
					colspan={5}
					title="Aucune permission trouvée"
					description="Modifiez votre recherche ou le domaine."
				/>{:else}
				{#each filtered as r (r.key)}
					<tr>
						<td>
							<div class="font-medium">{r.label}</div>
							<div class="font-mono text-xs text-muted-foreground">{r.key}</div>
						</td>
						<td>{r.domain}</td>
						<td>{r.scopeHint}</td>
						<td>
							{#if r.sensitive}
								<StatusBadge status="HIGH" label="Accès sensible" />
							{:else}
								Standard
							{/if}
						</td>
						<td>{r.functions.join(', ') || '—'}</td>
					</tr>
				{/each}{/if}
		</tbody>
	</Table>
</div>
