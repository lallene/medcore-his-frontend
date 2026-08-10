<script lang="ts">
	import { onMount } from 'svelte';
	import { listBedAssignments } from '$lib/api/bed-management';
	import { activeAssignment, uniqueAssignments } from './bed-management-state';
	import type { BedAssignment } from '$lib/types/bed-management';
	let {
		hospitalizationId,
		showHistory = false
	}: { hospitalizationId: number; showHistory?: boolean } = $props();
	let assignments = $state<BedAssignment[]>([]);
	let failed = $state(false);
	const current = $derived(activeAssignment(assignments));
	onMount(async () => {
		try {
			assignments = uniqueAssignments(await listBedAssignments(hospitalizationId));
		} catch {
			failed = true;
		}
	});
</script>

{#if failed}<p class="mt-2 text-xs text-red-600">Affectation de lit indisponible.</p>
{:else if current}<p class="mt-2 text-sm font-bold text-[#0E4C92]">
		{current.assignmentType === 'RESERVED' ? 'Réservation' : 'Lit actuel'} : {current.bed.room.name} ·
		{current.bed.label}
	</p>
{:else}<p class="mt-2 text-xs text-slate-400">Aucun lit actif</p>{/if}
{#if showHistory && assignments.length}<ul class="mt-3 space-y-2 text-xs text-slate-500">
		{#each assignments as assignment (assignment.id)}<li>
				{assignment.bed.room.name} · {assignment.bed.label} — {new Date(
					assignment.assignedAt
				).toLocaleString('fr-FR')}{assignment.releasedAt
					? ` → ${new Date(assignment.releasedAt).toLocaleString('fr-FR')}`
					: ' (actif)'}
			</li>{/each}
	</ul>{/if}
