<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		appointmentDurationMinutes,
		appointmentActionVisibility,
		effectiveEndIso,
		formatAgendaDateTime,
		isFinanceBlockedMessage
	} from '$lib/components/agenda/state';
	import {
		formatSeriesRecurrenceSummary,
		isSeriesAppointment,
		seriesActionVisibility
	} from '$lib/components/agenda/series';
	import AppointmentStatusBadge from './AppointmentStatusBadge.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import type { Appointment, AppointmentSeries } from '$lib/types/scheduling';

	interface Props {
		open?: boolean;
		appointment: Appointment | null;
		series?: AppointmentSeries | null;
		loading?: boolean;
		error?: string;
		permissions?: string[];
		acting?: string | null;
		/** When false, hide the "Ouvrir patient" CTA (e.g. already on Patient 360). Default true. */
		showOpenPatient?: boolean;
		onclose?: () => void;
		onreschedule?: () => void;
		onrescheduleFuture?: () => void;
		oncancel?: () => void;
		oncancelFuture?: () => void;
		oncancelSeries?: () => void;
		onviewSeries?: () => void;
		onnoshow?: () => void;
		oncheckin?: () => void;
		onrefresh?: () => void;
	}

	let {
		open = $bindable(false),
		appointment,
		series = null,
		loading = false,
		error = '',
		permissions = [],
		acting = null,
		showOpenPatient = true,
		onclose,
		onreschedule,
		onrescheduleFuture,
		oncancel,
		oncancelFuture,
		oncancelSeries,
		onviewSeries,
		onnoshow,
		oncheckin,
		onrefresh
	}: Props = $props();

	const actions = $derived(
		appointment ? appointmentActionVisibility(appointment, permissions) : null
	);
	const seriesActions = $derived(
		appointment ? seriesActionVisibility(appointment, permissions, series?.status ?? null) : null
	);
	const financeBlocked = $derived(isFinanceBlockedMessage(error));
	const showPatientLink = $derived(Boolean(actions?.openPatient && showOpenPatient));
	const inSeries = $derived(isSeriesAppointment(appointment));
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
				{#if inSeries}
					<span
						class="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-800"
						data-testid="agenda-series-badge"
					>
						Récurrente #{appointment.seriesId}
						{#if appointment.seriesOccurrenceIndex}
							· occ. {appointment.seriesOccurrenceIndex}
						{/if}
					</span>
				{/if}
				{#if appointment.queueTicketId}
					<span class="text-xs text-slate-500">Ticket file #{appointment.queueTicketId}</span>
				{/if}
			</div>

			{#if inSeries && series}
				<p
					class="rounded-xl border border-border bg-slate-50 px-3 py-2 text-sm text-slate-700"
					data-testid="agenda-series-inline-summary"
				>
					{formatSeriesRecurrenceSummary(series)}
					· {series.status === 'ACTIVE' ? 'Active' : 'Annulée'}
				</p>
			{/if}

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
		{#if appointment && actions && seriesActions}
			<div class="flex w-full flex-wrap justify-between gap-2">
				<div class="flex flex-wrap gap-2">
					{#if showPatientLink}
						<a
							href={resolve(`/patients/${appointment.patientId}`)}
							data-testid="agenda-open-patient"
							class="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
							>Ouvrir patient</a
						>
					{/if}
					{#if seriesActions.viewSeries && onviewSeries}
						<Button variant="ghost" onclick={onviewSeries} data-testid="agenda-action-view-series"
							>Voir la série</Button
						>
					{/if}
					{#if onrefresh}
						<Button variant="ghost" onclick={onrefresh}>Actualiser</Button>
					{/if}
				</div>
				<div class="flex flex-wrap gap-2">
					{#if seriesActions.editThis && onreschedule}
						<Button
							variant="secondary"
							onclick={onreschedule}
							disabled={acting !== null}
							data-testid="agenda-action-reschedule">Reporter ce RDV</Button
						>
					{/if}
					{#if seriesActions.editThisAndFuture && onrescheduleFuture}
						<Button
							variant="secondary"
							onclick={onrescheduleFuture}
							disabled={acting !== null}
							data-testid="agenda-action-reschedule-future">Modifier ce RDV et suivants</Button
						>
					{/if}
					{#if seriesActions.cancelThis && oncancel}
						<Button
							variant="ghost"
							onclick={oncancel}
							disabled={acting !== null}
							data-testid="agenda-action-cancel">Annuler ce RDV</Button
						>
					{/if}
					{#if seriesActions.cancelThisAndFuture && oncancelFuture}
						<Button
							variant="ghost"
							onclick={oncancelFuture}
							disabled={acting !== null}
							data-testid="agenda-action-cancel-future">Annuler ce RDV et suivants</Button
						>
					{/if}
					{#if seriesActions.cancelEntireSeries && oncancelSeries}
						<Button
							variant="ghost"
							onclick={oncancelSeries}
							disabled={acting !== null}
							data-testid="agenda-action-cancel-series">Annuler toute la série</Button
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
