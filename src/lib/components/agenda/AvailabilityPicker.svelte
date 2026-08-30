<script lang="ts">
	import { formatAgendaTime, groupSlotsByPeriod, slotKey } from '$lib/components/agenda/state';
	import type { AvailabilitySlot } from '$lib/types/scheduling';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	interface Props {
		slots: AvailabilitySlot[];
		loading?: boolean;
		selectedKey?: string;
		practitionerNames?: Record<number, string>;
		onselect?: (slot: AvailabilitySlot) => void;
		onretry?: () => void;
	}

	let {
		slots,
		loading = false,
		selectedKey = '',
		practitionerNames = {},
		onselect,
		onretry
	}: Props = $props();

	const grouped = $derived(groupSlotsByPeriod(slots));
</script>

{#if loading}
	<LoadingState label="Chargement des disponibilités…" />
{:else if slots.length === 0}
	<EmptyState
		title="Aucune disponibilité"
		description="Aucun créneau retourné pour ces critères. Essayez un autre jour ou praticien."
	>
		{#snippet cta()}
			{#if onretry}
				<Button variant="secondary" onclick={onretry}>Actualiser</Button>
			{/if}
		{/snippet}
	</EmptyState>
{:else}
	<div class="space-y-4" data-testid="agenda-availability-picker">
		{#each [{ label: 'Matin', list: grouped.morning }, { label: 'Après-midi', list: grouped.afternoon }] as period (period.label)}
			{#if period.list.length}
				<section>
					<h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
						{period.label}
					</h4>
					<div class="flex flex-wrap gap-2">
						{#each period.list as slot (slotKey(slot))}
							{@const key = slotKey(slot)}
							{@const name = practitionerNames[slot.practitionerId]}
							<button
								type="button"
								class="rounded-xl border px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 {selectedKey ===
								key
									? 'border-primary bg-blue-50 text-primary'
									: 'border-border bg-white text-slate-800 hover:border-primary/40'}"
								aria-pressed={selectedKey === key}
								data-testid="agenda-slot"
								data-slot-start={slot.startAt}
								data-practitioner-id={slot.practitionerId}
								onclick={() => onselect?.(slot)}
							>
								<span class="font-semibold"
									>{formatAgendaTime(slot.startAt)} – {formatAgendaTime(slot.endAt)}</span
								>
								<span class="mt-0.5 block text-xs text-slate-500">
									{name || `Praticien #${slot.practitionerId}`}
								</span>
							</button>
						{/each}
					</div>
				</section>
			{/if}
		{/each}
	</div>
{/if}
