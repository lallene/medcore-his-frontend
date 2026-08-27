<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { listAccessPermissions } from '$lib/api/access';
	import type { AccessPermission } from '$lib/types/access';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
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
		<select class="rounded-lg border border-border px-3 py-2 text-sm" bind:value={domain}>
			<option value="">Tous domaines</option>
			{#each domains as d (d)}
				<option value={d}>{d}</option>
			{/each}
		</select>
	</div>
	{#if loading}
		<LoadingState label="Chargement…" />
	{:else}
		<div class="overflow-x-auto rounded-xl border border-border">
			<table class="min-w-full text-left text-sm">
				<thead class="bg-muted/40 text-xs uppercase text-muted-foreground">
					<tr>
						<th class="px-3 py-2">Permission</th>
						<th class="px-3 py-2">Domaine</th>
						<th class="px-3 py-2">Scope</th>
						<th class="px-3 py-2">Sensibilité</th>
						<th class="px-3 py-2">Fonctions</th>
					</tr>
				</thead>
				<tbody>
					{#each filtered as r (r.key)}
						<tr class="border-t border-border">
							<td class="px-3 py-2">
								<div class="font-medium">{r.label}</div>
								<div class="font-mono text-xs text-muted-foreground">{r.key}</div>
							</td>
							<td class="px-3 py-2">{r.domain}</td>
							<td class="px-3 py-2">{r.scopeHint}</td>
							<td class="px-3 py-2">
								{#if r.sensitive}
									<StatusBadge status="HIGH" label="Accès sensible" />
								{:else}
									Standard
								{/if}
							</td>
							<td class="px-3 py-2 text-xs">{r.functions.join(', ') || '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
