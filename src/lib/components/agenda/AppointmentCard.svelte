<script lang="ts">
	import {
		appointmentDurationMinutes,
		effectiveEndIso,
		formatAgendaTime
	} from '$lib/components/agenda/state';
	import AppointmentStatusBadge from './AppointmentStatusBadge.svelte';
	import type { Appointment } from '$lib/types/scheduling';

	interface Props {
		appointment: Appointment;
		selected?: boolean;
		onclick?: () => void;
	}

	let { appointment, selected = false, onclick }: Props = $props();
</script>

<button
	type="button"
	class="w-full rounded-xl border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 {selected
		? 'border-primary bg-blue-50 shadow-sm'
		: 'border-border bg-white hover:border-primary/30'}"
	data-testid="agenda-appointment-card"
	data-appointment-id={appointment.id}
	{onclick}
>
	<div class="flex flex-wrap items-start justify-between gap-2">
		<div>
			<p class="text-sm font-semibold text-slate-900">
				{formatAgendaTime(appointment.scheduledAt)} – {formatAgendaTime(
					effectiveEndIso(appointment)
				)}
				<span class="ml-1 font-normal text-slate-500"
					>({appointmentDurationMinutes(appointment)} min)</span
				>
			</p>
			<p class="mt-0.5 text-sm text-slate-800">{appointment.patientName}</p>
			<p class="text-xs text-slate-500">
				{appointment.serviceName}
				{#if appointment.expectedDoctorName}
					· {appointment.expectedDoctorName}
				{/if}
				{#if appointment.appointmentTypeName}
					· {appointment.appointmentTypeName}
				{/if}
			</p>
			{#if appointment.reason}
				<p class="mt-1 line-clamp-1 text-xs text-slate-500">{appointment.reason}</p>
			{/if}
		</div>
		<AppointmentStatusBadge status={appointment.status} />
	</div>
</button>
