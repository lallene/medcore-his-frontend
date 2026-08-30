<script lang="ts">
	import AppointmentCard from './AppointmentCard.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import type { Appointment } from '$lib/types/scheduling';

	interface Props {
		appointments: Appointment[];
		selectedId?: number | null;
		onselect?: (appt: Appointment) => void;
	}

	let { appointments, selectedId = null, onselect }: Props = $props();

	const sorted = $derived(
		[...appointments].sort((a, b) => {
			const t = a.scheduledAt.localeCompare(b.scheduledAt);
			return t !== 0 ? t : a.id - b.id;
		})
	);
</script>

<div class="space-y-2" data-testid="agenda-day-view">
	{#if sorted.length === 0}
		<EmptyState
			title="Aucun rendez-vous"
			description="Aucun rendez-vous sur cette journée pour les filtres sélectionnés."
		/>
	{:else}
		{#each sorted as appt (appt.id)}
			<AppointmentCard
				appointment={appt}
				selected={selectedId === appt.id}
				onclick={() => onselect?.(appt)}
			/>
		{/each}
	{/if}
</div>
