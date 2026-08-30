<script lang="ts">
	import {
		addCalendarDays,
		formatAgendaTime,
		groupAppointmentsByZonedDay,
		weekDayKeys
	} from '$lib/components/agenda/state';
	import AppointmentStatusBadge from './AppointmentStatusBadge.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import type { Appointment } from '$lib/types/scheduling';

	interface Props {
		weekFrom: Date;
		appointments: Appointment[];
		selectedId?: number | null;
		onselect?: (appt: Appointment) => void;
		ondayselect?: (day: Date) => void;
	}

	let { weekFrom, appointments, selectedId = null, onselect, ondayselect }: Props = $props();

	const byDay = $derived(groupAppointmentsByZonedDay(appointments));
	const keys = $derived(weekDayKeys(weekFrom));
</script>

<!-- Desktop week grid -->
<div class="hidden gap-2 md:grid md:grid-cols-7" data-testid="agenda-week-view">
	{#each keys as key, i (key)}
		{@const day = addCalendarDays(weekFrom, i)}
		{@const list = byDay.get(key) ?? []}
		<section class="min-h-40 rounded-xl border border-border bg-white p-2">
			<button
				type="button"
				class="mb-2 w-full rounded-lg px-1 py-1 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
				onclick={() => ondayselect?.(day)}
			>
				{new Intl.DateTimeFormat('fr-FR', {
					weekday: 'short',
					day: 'numeric',
					month: 'short',
					timeZone: 'Europe/Paris'
				}).format(day)}
			</button>
			<div class="space-y-1.5">
				{#each list as appt (appt.id)}
					<button
						type="button"
						class="w-full rounded-lg border px-1.5 py-1 text-left text-[11px] leading-snug transition {selectedId ===
						appt.id
							? 'border-primary bg-blue-50'
							: 'border-border bg-slate-50 hover:border-primary/40'}"
						data-testid="agenda-appointment-card"
						data-appointment-id={appt.id}
						onclick={() => onselect?.(appt)}
					>
						<p class="font-semibold text-slate-900">{formatAgendaTime(appt.scheduledAt)}</p>
						<p class="truncate text-slate-700">{appt.patientName}</p>
						<div class="mt-0.5 scale-90 origin-left">
							<AppointmentStatusBadge status={appt.status} />
						</div>
					</button>
				{/each}
				{#if list.length === 0}
					<p class="px-1 py-4 text-center text-[11px] text-slate-400">—</p>
				{/if}
			</div>
		</section>
	{/each}
</div>

<!-- Mobile: chronological cards for the week -->
<div class="space-y-3 md:hidden" data-testid="agenda-week-mobile">
	{#if appointments.length === 0}
		<EmptyState
			title="Aucun rendez-vous"
			description="Aucun rendez-vous sur cette semaine pour les filtres sélectionnés."
		/>
	{:else}
		{#each keys as key, i (key)}
			{@const day = addCalendarDays(weekFrom, i)}
			{@const list = byDay.get(key) ?? []}
			{#if list.length}
				<section>
					<h3 class="mb-1 text-sm font-semibold text-slate-800">
						{new Intl.DateTimeFormat('fr-FR', {
							weekday: 'long',
							day: 'numeric',
							month: 'long',
							timeZone: 'Europe/Paris'
						}).format(day)}
					</h3>
					<div class="space-y-2">
						{#each list as appt (appt.id)}
							<button
								type="button"
								class="w-full rounded-xl border border-border bg-white px-3 py-2 text-left"
								data-testid="agenda-appointment-card"
								data-appointment-id={appt.id}
								onclick={() => onselect?.(appt)}
							>
								<p class="text-sm font-semibold">
									{formatAgendaTime(appt.scheduledAt)} · {appt.patientName}
								</p>
								<p class="text-xs text-slate-500">{appt.serviceName}</p>
								<div class="mt-1"><AppointmentStatusBadge status={appt.status} /></div>
							</button>
						{/each}
					</div>
				</section>
			{/if}
		{/each}
	{/if}
</div>
