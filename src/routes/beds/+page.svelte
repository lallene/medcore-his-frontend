<script lang="ts">
	import { onMount } from 'svelte';
	import { listBeds } from '$lib/api/bed-management';
	import { bedStatusLabel } from '$lib/components/hospitalizations/bed-management-state';
	import type { BedOverview, BedStatus } from '$lib/types/bed-management';
	let items = $state<BedOverview[]>([]),
		department = $state(''),
		status = $state<BedStatus | ''>(''),
		loading = $state(true),
		error = $state('');
	async function load() {
		loading = true;
		error = '';
		try {
			items = (
				await listBeds({
					department: department || undefined,
					status: status || undefined,
					limit: 100
				})
			).data;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Chargement impossible.';
		} finally {
			loading = false;
		}
	}
	onMount(load);
</script>

<svelte:head><title>Chambres & lits | MedCore HIS</title></svelte:head>
<div class="space-y-6">
	<header>
		<p class="text-xs font-black uppercase tracking-widest text-[#0E4C92]">Bed Management</p>
		<h1 class="text-3xl font-black">Chambres et lits</h1>
	</header>
	<div class="flex gap-3">
		<input bind:value={department} placeholder="Service" class="rounded-xl border p-3" /><select
			bind:value={status}
			class="rounded-xl border p-3"
			><option value="">Tous les statuts</option><option value="AVAILABLE">Disponible</option
			><option value="RESERVED">Réservé</option><option value="OCCUPIED">Occupé</option><option
				value="OUT_OF_SERVICE">Hors service</option
			></select
		><button onclick={load} class="rounded-xl bg-[#0E4C92] px-5 font-bold text-white"
			>Filtrer</button
		>
	</div>
	{#if loading}<p>Chargement...</p>{:else if error}<p class="rounded-xl bg-red-50 p-4 text-red-700">
			{error}
		</p>{:else if !items.length}<p
			class="rounded-2xl border bg-white p-10 text-center text-slate-500"
		>
			Aucun lit ne correspond aux filtres.
		</p>{:else}<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			{#each items as entry (entry.bed.id)}<article class="rounded-2xl border bg-white p-5">
					<div class="flex justify-between gap-3">
						<div>
							<p class="text-xs font-black uppercase text-slate-400">{entry.bed.room.department}</p>
							<h2 class="mt-1 text-xl font-black">{entry.bed.room.name} · {entry.bed.label}</h2>
							<p class="text-sm text-slate-500">
								{entry.bed.bedType} · {entry.bed.room.floor || 'Étage non renseigné'}
							</p>
						</div>
						<span class="h-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold"
							>{bedStatusLabel(entry.bed.status)}</span
						>
					</div>
					{#if entry.activeAssignment}<p class="mt-4 border-t pt-3 text-sm">
							<strong>Occupant :</strong>
							{entry.activeAssignment.patient?.nom}
							{entry.activeAssignment.patient?.prenoms}<br /><strong>Séjour :</strong>
							{entry.activeAssignment.hospitalization.admissionNumber}
						</p>{/if}
				</article>{/each}
		</div>{/if}
</div>
