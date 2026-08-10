<script lang="ts">
	import { onMount } from 'svelte';
	import {
		assignBed,
		listBedAssignments,
		listBeds,
		releaseBed,
		transferBed
	} from '$lib/api/bed-management';
	import {
		activeAssignment,
		allowedBedActions,
		availableBeds,
		uniqueAssignments
	} from './bed-management-state';
	import type { BedAssignment, BedOverview } from '$lib/types/bed-management';
	let { hospitalizationId, status }: { hospitalizationId: number; status: string } = $props();
	let assignments = $state<BedAssignment[]>([]),
		beds = $state<BedOverview[]>([]),
		selected = $state(''),
		error = $state(''),
		busy = $state(false);
	const current = $derived(activeAssignment(assignments));
	const choices = $derived(availableBeds(beds));
	const actions = $derived(allowedBedActions(status, current));
	async function load() {
		[assignments, beds] = await Promise.all([
			listBedAssignments(hospitalizationId).then(uniqueAssignments),
			listBeds({ available: true, limit: 100 }).then((r) => r.data)
		]);
	}
	async function run(action: 'assign' | 'transfer' | 'release') {
		busy = true;
		error = '';
		try {
			if (action === 'release') await releaseBed(hospitalizationId);
			else if (action === 'transfer') await transferBed(hospitalizationId, Number(selected));
			else await assignBed(hospitalizationId, Number(selected));
			selected = '';
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Action impossible.';
		} finally {
			busy = false;
		}
	}
	onMount(() =>
		load().catch((e) => (error = e instanceof Error ? e.message : 'Chargement impossible.'))
	);
</script>

<section class="space-y-4 rounded-2xl border bg-white p-6">
	<h2 class="text-xl font-black">Chambre et lit</h2>
	{#if error}<p class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>{/if}
	{#if current}<div class="rounded-xl bg-blue-50 p-4">
			<p class="font-black">{current.bed.room.name} · {current.bed.label}</p>
			<p class="text-sm text-slate-600">
				{current.bed.room.department} · {current.assignmentType === 'RESERVED'
					? 'Réservé'
					: 'Occupé'}
			</p>
		</div>{:else}<p class="text-sm text-slate-500">
			Admission sans lit : autorisée. Aucun lit n’est actuellement affecté.
		</p>{/if}
	{#if actions.assign || actions.transfer}<div class="flex flex-wrap gap-3">
			<select bind:value={selected} class="min-w-64 rounded-xl border p-3"
				><option value="">Choisir un lit disponible</option
				>{#each choices as entry (entry.bed.id)}<option value={entry.bed.id}
						>{entry.bed.room.department} · {entry.bed.room.name} · {entry.bed.label}</option
					>{/each}</select
			><button
				disabled={!selected || busy}
				onclick={() => run(actions.transfer ? 'transfer' : 'assign')}
				class="rounded-xl bg-[#0E4C92] px-4 py-3 font-bold text-white disabled:opacity-40"
				>{actions.transfer ? 'Transférer' : 'Affecter / réserver'}</button
			>
		</div>{/if}
	{#if actions.release}<button
			disabled={busy}
			onclick={() => run('release')}
			class="rounded-xl border border-red-300 px-4 py-2 font-bold text-red-700"
			>Libérer le lit</button
		>{/if}
	{#if assignments.length}<div>
			<h3 class="font-black">Historique</h3>
			<ul class="mt-2 space-y-2 text-sm">
				{#each assignments as assignment (assignment.id)}<li>
						{assignment.bed.room.name} · {assignment.bed.label} — {new Date(
							assignment.assignedAt
						).toLocaleString('fr-FR')}{assignment.releasedAt
							? ` → ${new Date(assignment.releasedAt).toLocaleString('fr-FR')}`
							: ' (actif)'}
					</li>{/each}
			</ul>
		</div>{/if}
</section>
