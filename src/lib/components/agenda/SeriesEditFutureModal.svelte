<script lang="ts">
	import axios from 'axios';
	import {
		getAppointmentSeries,
		getAvailability,
		updateAppointmentSeries
	} from '$lib/api/appointments';
	import {
		AGENDA_TIMEZONE,
		dayRange,
		newIdempotencyKey,
		slotKey,
		toRfc3339,
		zonedLocalToUtc
	} from '$lib/components/agenda/state';
	import AvailabilityPicker from './AvailabilityPicker.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import FormField from '$lib/components/ui/FormField.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { resolveUserErrorMessage } from '$lib/rbac/permissions';
	import type { Appointment, AppointmentSeries, AvailabilitySlot } from '$lib/types/scheduling';

	interface Props {
		open?: boolean;
		appointment: Appointment | null;
		onclose?: () => void;
		onsuccess?: (series: AppointmentSeries) => void;
		onconflict?: () => void;
	}

	let {
		open = $bindable(false),
		appointment,
		onclose,
		onsuccess,
		onconflict
	}: Props = $props();

	let loading = $state(false);
	let submitting = $state(false);
	let error = $state('');
	let conflict = $state(false);
	let series = $state<AppointmentSeries | null>(null);
	let dateLocal = $state('');
	let slots = $state<AvailabilitySlot[]>([]);
	let slotsLoading = $state(false);
	let selectedSlot = $state<AvailabilitySlot | null>(null);
	let idempotencyKey = $state('');
	let loadSeq = 0;

	$effect(() => {
		if (!open || !appointment?.seriesId) return;
		void bootstrap(appointment);
	});

	$effect(() => {
		if (!open || !appointment || !dateLocal || loading) return;
		void loadSlots(appointment, dateLocal);
	});

	async function bootstrap(appt: Appointment, opts?: { preserveConflict?: boolean }) {
		const seq = ++loadSeq;
		loading = true;
		if (!opts?.preserveConflict) {
			error = '';
			conflict = false;
		}
		selectedSlot = null;
		slots = [];
		idempotencyKey = newIdempotencyKey();
		try {
			const s = await getAppointmentSeries(appt.seriesId!);
			if (seq !== loadSeq) return;
			series = s;
			const parts = new Intl.DateTimeFormat('en-CA', {
				timeZone: AGENDA_TIMEZONE,
				year: 'numeric',
				month: '2-digit',
				day: '2-digit'
			}).format(new Date(appt.scheduledAt));
			dateLocal = parts;
		} catch (e) {
			if (seq !== loadSeq) return;
			error = resolveUserErrorMessage(e, 'Impossible de charger la série.');
		} finally {
			if (seq === loadSeq) loading = false;
		}
	}

	async function loadSlots(appt: Appointment, day: string) {
		slotsLoading = true;
		try {
			const [y, m, d] = day.split('-').map(Number);
			const dayStart = zonedLocalToUtc(y, m, d, 0, 0, 0, AGENDA_TIMEZONE);
			const { from, to } = dayRange(dayStart, AGENDA_TIMEZONE);
			const res = await getAvailability({
				serviceId: appt.serviceId,
				from: toRfc3339(from),
				to: toRfc3339(to),
				appointmentTypeId: appt.appointmentTypeId,
				practitionerId: appt.expectedDoctorId ?? undefined
			});
			slots = res.slots ?? [];
		} catch (e) {
			slots = [];
			error = resolveUserErrorMessage(e, 'Disponibilités indisponibles.');
		} finally {
			slotsLoading = false;
		}
	}

	async function submit() {
		if (!appointment?.seriesId || !series || !selectedSlot) return;
		submitting = true;
		error = '';
		conflict = false;
		try {
			const updated = await updateAppointmentSeries(
				appointment.seriesId,
				{
					expectedVersion: series.version,
					fromAppointmentId: appointment.id,
					anchorStartAt: selectedSlot.startAt,
					practitionerId: selectedSlot.practitionerId,
					reason: 'Modification cette occurrence et suivantes'
				},
				{ idempotencyKey }
			);
			onsuccess?.(updated);
			open = false;
			onclose?.();
		} catch (e) {
			const status = axios.isAxiosError(e) ? e.response?.status : undefined;
			if (status === 409) {
				conflict = true;
				error =
					resolveUserErrorMessage(
						e,
						'Conflit de version ou de créneau — données actualisées.'
					) || 'Conflit — veuillez réessayer.';
				idempotencyKey = newIdempotencyKey();
				onconflict?.();
				if (appointment) await bootstrap(appointment, { preserveConflict: true });
			} else {
				error = resolveUserErrorMessage(e, 'Modification de série impossible.');
			}
		} finally {
			submitting = false;
		}
	}
</script>

<Modal
	bind:open
	title="Modifier cette occurrence et les suivantes"
	description="Applique la 23O-C (expectedVersion). Les exceptions individuelles restent préservées."
	size="lg"
	{onclose}
>
	{#if loading || !series}
		<LoadingState label="Préparation de la modification…" />
	{:else}
		<div class="space-y-4" data-testid="agenda-series-edit-future">
			{#if error}
				<div data-testid={conflict ? 'agenda-series-edit-conflict' : 'agenda-series-edit-error'}>
					<Alert tone={conflict ? 'warning' : 'danger'} title={conflict ? 'Conflit' : 'Erreur'}
						>{error}</Alert
					>
				</div>
			{/if}
			<p class="text-sm text-slate-600">
				Série #{series.id} · version {series.version} · à partir de l’occurrence
				#{appointment?.seriesOccurrenceIndex ?? '—'}
			</p>
			<FormField label="Date du nouveau segment">
				<Input type="date" bind:value={dateLocal} data-testid="agenda-series-edit-date" />
			</FormField>
			<AvailabilityPicker
				{slots}
				loading={slotsLoading}
				selectedKey={selectedSlot ? slotKey(selectedSlot) : ''}
				onselect={(s) => (selectedSlot = s)}
				onretry={() => appointment && void loadSlots(appointment, dateLocal)}
			/>
		</div>
	{/if}

	{#snippet footer()}
		<Button variant="ghost" onclick={() => (open = false)} disabled={submitting}>Fermer</Button>
		<Button
			onclick={() => void submit()}
			loading={submitting}
			disabled={!selectedSlot || submitting || loading}
			data-testid="agenda-series-edit-submit">Appliquer aux suivantes</Button
		>
	{/snippet}
</Modal>
