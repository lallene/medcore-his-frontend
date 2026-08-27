<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { jwtDecode } from 'jwt-decode';
	import { getAccessMatrix, toggleAccessMatrix } from '$lib/api/access';
	import { canManageMatrix } from '$lib/components/access/state';
	import type { AccessMatrix } from '$lib/types/access';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';

	let matrix = $state<AccessMatrix | null>(null);
	let permissions = $state<string[]>([]);
	let loading = $state(true);
	let error = $state('');
	let search = $state('');
	let reason = $state('LOT21 matrix edit');

	const filteredPerms = $derived(
		(matrix?.permissions ?? []).filter(
			(p) => !search || p.toLowerCase().includes(search.toLowerCase())
		)
	);

	function allowed(fn: string, perm: string) {
		return matrix?.cells.some((c) => c.functionCode === fn && c.permission === perm && c.allowed);
	}

	async function load() {
		loading = true;
		try {
			matrix = await getAccessMatrix();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Impossible de charger la matrice';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		try {
			const raw = localStorage.getItem('medcore_token');
			if (raw) permissions = jwtDecode<{ permissions?: string[] }>(raw).permissions ?? [];
		} catch {
			permissions = [];
		}
		void load();
	});
</script>

<div class="space-y-6" data-testid="access-matrix">
	<a class="text-sm text-primary hover:underline" href={resolve('/admin/access')}
		>← Centre d'accès</a
	>
	<PageHeader
		eyebrow="RBAC"
		title="Matrice fonctions × permissions"
		description="Lecture de la matrice effective (code + overlays). Édition réservée à rbac.matrix.manage."
	/>
	{#if error}
		<Alert tone="danger">{error}</Alert>
	{/if}
	<SearchInput bind:value={search} placeholder="Filtrer une permission…" />
	{#if loading || !matrix}
		<LoadingState label="Chargement matrice…" />
	{:else}
		<div class="overflow-auto rounded-xl border border-border">
			<table class="min-w-full border-collapse text-left text-xs">
				<thead class="sticky top-0 bg-muted/80">
					<tr>
						<th class="border-b border-border px-2 py-2">Permission</th>
						{#each matrix.functions as fn (fn)}
							<th class="border-b border-border px-2 py-2 font-semibold">{fn}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each filteredPerms as perm (perm)}
						<tr class="border-t border-border">
							<td class="px-2 py-1 font-mono">{perm}</td>
							{#each matrix.functions as fn (fn)}
								<td class="px-2 py-1 text-center">
									{#if canManageMatrix(permissions)}
										<button
											type="button"
											class="rounded px-1.5 py-0.5 hover:bg-muted"
											title="Basculer overlay"
											onclick={async () => {
												const on = allowed(fn, perm);
												matrix = await toggleAccessMatrix({
													functionCode: fn,
													permission: perm,
													effect: on ? 'DENY' : 'GRANT',
													reason
												});
											}}
										>
											{allowed(fn, perm) ? '✓' : '—'}
										</button>
									{:else}
										{allowed(fn, perm) ? '✓' : '—'}
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if canManageMatrix(permissions)}
			<p class="text-xs text-muted-foreground">
				Clic cellule = overlay GRANT/DENY (audit serveur). Motif : {reason}
			</p>
		{/if}
	{/if}
</div>
