<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		appointmentDurationMinutes,
		appointmentActionVisibility,
		effectiveEndIso,
		formatAgendaDateTime,
		isFinanceBlockedMessage
	} from '$lib/components/agenda/state';
	import AppointmentStatusBadge from './AppointmentStatusBadge.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import type { Appointment } from '$lib/types/scheduling';

	interface Props {
		open?: boolean;
		appointment: Appointment | null;
		loading?: boolean;
		error?: string;
		permissions?: string[];
		acting?: string | null;
		onclose?: () => void;
		onreschedule?: () => void;
		oncancel?: () => void;
		onnoshow?: () => void;
		oncheckin?: () => void;
		onrefresh?: () => void;
	}

	let {
		open = $bindable(false),
		appointment,
		loading = false,
		error = '',
		permissions = [],
		acting = null,
		onclose,
		onreschedule,
		oncancel,
		onnoshow,
		oncheckin,
		onrefresh
	}: Props = $props();

	const actions = $derived(
		appointment ? appointmentActionVisibility(appointment, permissions) : null
	);
	const financeBlocked = $derived(isFinanceBlockedMessage(error));
</script>

<Modal
	bind:open
	title="Détail du rendez-vous"
	description={appointment ? formatAgendaDateTime(appointment.scheduledAt) : ''}
	size="lg"
	{onclose}
>
	{#if loading || !appointment}
		<LoadingState label="Chargement du rendez-vous…" />
	{:else}
		<div class="space-y-4" data-testid="agenda-appointment-details">
			{#if error}
				<Alert tone="danger" title="Action impossible">{error}</Alert>
				{#if financeBlocked}
					<p class="text-sm">
						<a
							class="font-semibold text-primary underline"
							href={resolve('/billing')}
							data-testid="agenda-finance-link">Ouvrir le contexte finance</a
						>
					</p>
				{/if}
			{/if}

			<div class="flex flex-wrap items-center gap-2">
				<AppointmentStatusBadge status={appointment.status} />
				{#if appointment.queueTicketId}
					<span class="text-xs text-slate-500">Ticket file #{appointment.queueTicketId}</span>
				{/if}
			</div>

			<dl class="grid gap-3 text-sm sm:grid-cols-2">
				<div>
					<dt class="text-xs font-semibold uppercase text-slate-500">Patient</dt>
					<dd class="font-medium text-slate-900">{appointment.patientName}</dd>
					<dd class="text-xs text-slate-500">{appointment.patientCode}</dd>
				</div>
				<div>
					<dt class="text-xs font-semibold uppercase text-slate-500">Créneau</dt>
					<dd class="font-medium text-slate-900">
						{formatAgendaDateTime(appointment.scheduledAt)} → {formatAgendaDateTime(
							effectiveEndIso(appointment)
						)}
					</dd>
					<dd class="text-xs text-slate-500">{appointmentDurationMinutes(appointment)} minutes</dd>
				</div>
				<div>
					<dt class="text-xs font-semibold uppercase text-slate-500">Service</dt>
					<dd>{appointment.serviceName}</dd>
				</div>
				<div>
					<dt class="text-xs font-semibold uppercase text-slate-500">Praticien</dt>
					<dd>{appointment.expectedDoctorName || '—'}</dd>
				</div>
				<div>
					<dt class="text-xs font-semibold uppercase text-slate-500">Type</dt>
					<dd>
						{appointment.appointmentTypeName || '—'}
						{#if appointment.appointmentTypeCode}
							<span class="text-slate-500">({appointment.appointmentTypeCode})</span>
						{/if}
					</dd>
				</div>
				<div>
					<dt class="text-xs font-semibold uppercase text-slate-500">Motif</dt>
					<dd>{appointment.reason || '—'}</dd>
				</div>
			</dl>
		</div>
	{/if}

	{#snippet footer()}
		{#if appointment && actions}
			<div class="flex w-full flex-wrap justify-between gap-2">
				<div class="flex flex-wrap gap-2">
					{#if actions.openPatient}
						<a
							href={resolve(`/patients/${appointment.patientId}`)}
							data-testid="agenda-open-patient"
							class="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
							>Ouvrir patient</a
						>
					{/if}
					{#if onrefresh}
						<Button variant="ghost" onclick={onrefresh}>Actualiser</Button>
					{/if}
				</div>
				<div class="flex flex-wrap gap-2">
					{#if actions.reschedule}
						<Button
							variant="secondary"
							onclick={onreschedule}
							disabled={acting !== null}
							data-testid="agenda-action-reschedule">Reporter</Button
						>
					{/if}
					{#if actions.cancel}
						<Button
							variant="ghost"
							onclick={oncancel}
							disabled={acting !== null}
							data-testid="agenda-action-cancel">Annuler</Button
						>
					{/if}
					{#if actions.noShow}
						<Button
							variant="ghost"
							onclick={onnoshow}
							disabled={acting !== null}
							data-testid="agenda-action-noshow">Absent</Button
						>
					{/if}
					{#if actions.checkIn}
						<Button
							onclick={oncheckin}
							loading={acting === 'checkin'}
							disabled={acting !== null}
							data-testid="agenda-action-checkin">Check-in</Button
						>
					{/if}
					<Button variant="ghost" onclick={() => (open = false)}>Fermer</Button>
				</div>
			</div>
		{/if}
	{/snippet}
</Modal>
