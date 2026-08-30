<script lang="ts">
	import { getAppointment, getAvailability, rescheduleAppointment } from '$lib/api/appointments';
	import {
		AGENDA_TIMEZONE,
		buildReschedulePayload,
		dayRange,
		effectiveEndIso,
		newIdempotencyKey,
		slotKey,
		toRfc3339,
		zonedLocalToUtc
	} from '$lib/components/agenda/state';
	import AvailabilityPicker from './AvailabilityPicker.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import FormField from '$lib/components/ui/FormField.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import type { Appointment, AvailabilitySlot } from '$lib/types/scheduling';
	import { resolveUserErrorMessage } from '$lib/rbac/permissions';
	import axios from 'axios';

	interface Props {
		open?: boolean;
		appointmentId: number | null;
		onclose?: () => void;
		onsuccess?: (appt: Appointment) => void;
	}

	let { open = $bindable(false), appointmentId, onclose, onsuccess }: Props = $props();

	let fresh = $state<Appointment | null>(null);
	let loading = $state(false);
	let slotsLoading = $state(false);
	let submitting = $state(false);
	let error = $state('');
	let staleConflict = $state(false);
	let dateLocal = $state('');
	let slots = $state<AvailabilitySlot[]>([]);
	let selectedSlot = $state<AvailabilitySlot | null>(null);
	let idempotencyKey = $state('');
	let availSeq = 0;

	$effect(() => {
		if (open && appointmentId) void loadFresh(appointmentId);
	});

	async function loadFresh(id: number) {
		loading = true;
		error = '';
		staleConflict = false;
		selectedSlot = null;
		slots = [];
		idempotencyKey = newIdempotencyKey();
		try {
			fresh = await getAppointment(id);
			dateLocal = new Intl.DateTimeFormat('en-CA', {
				timeZone: AGENDA_TIMEZONE,
				year: 'numeric',
				month: '2-digit',
				day: '2-digit'
			}).format(new Date(fresh.scheduledAt));
			await loadAvailability();
		} catch (e) {
			error = resolveUserErrorMessage(e, 'Impossible de charger le rendez-vous.');
			fresh = null;
		} finally {
			loading = false;
		}
	}

	async function loadAvailability() {
		if (!fresh || !dateLocal) return;
		const seq = ++availSeq;
		slotsLoading = true;
		try {
			const [y, m, d] = dateLocal.split('-').map(Number);
			const dayStart = zonedLocalToUtc(y, m, d, 0, 0, 0, AGENDA_TIMEZONE);
			const { from, to } = dayRange(dayStart, AGENDA_TIMEZONE);
			const res = await getAvailability({
				serviceId: fresh.serviceId,
				from: toRfc3339(from),
				to: toRfc3339(to),
				appointmentTypeId: fresh.appointmentTypeId,
				practitionerId: fresh.expectedDoctorId ?? undefined
			});
			if (seq !== availSeq) return;
			slots = res.slots ?? [];
		} catch (e) {
			if (seq !== availSeq) return;
			slots = [];
			error = resolveUserErrorMessage(e, 'Disponibilités indisponibles.');
		} finally {
			if (seq === availSeq) slotsLoading = false;
		}
	}

	async function submit() {
		if (!fresh || !selectedSlot || !appointmentId) return;
		submitting = true;
		error = '';
		staleConflict = false;
		try {
			const end = effectiveEndIso(fresh);
			const payload = buildReschedulePayload({
				startAt: selectedSlot.startAt,
				expectedScheduledAt: fresh.scheduledAt,
				expectedScheduledEndAt: end,
				practitionerId: selectedSlot.practitionerId,
				idempotencyKey
			});
			const updated = await rescheduleAppointment(appointmentId, payload, { idempotencyKey });
			onsuccess?.(updated);
			open = false;
			onclose?.();
		} catch (e) {
			const status = axios.isAxiosError(e) ? e.response?.status : undefined;
			if (status === 409) {
				staleConflict = true;
				error =
					resolveUserErrorMessage(e, 'Conflit') || 'État obsolète ou créneau pris — rechargement…';
				idempotencyKey = newIdempotencyKey();
				selectedSlot = null;
				await loadFresh(appointmentId);
			} else {
				error = resolveUserErrorMessage(e, 'Report impossible.');
			}
		} finally {
			submitting = false;
		}
	}
</script>

<Modal
	bind:open
	title="Reporter le rendez-vous"
	description="Préconditions d’état (expectedScheduledAt/End) requises."
	size="lg"
	{onclose}
>
	<div class="space-y-4" data-testid="agenda-reschedule-modal">
		{#if error}
			<Alert tone={staleConflict ? 'warning' : 'danger'} title="Report">{error}</Alert>
		{/if}
		{#if loading || !fresh}
			<LoadingState label="Chargement du rendez-vous…" />
		{:else}
			<p class="text-sm text-slate-600">
				Patient <strong>{fresh.patientName}</strong> · {fresh.serviceName}
			</p>
			<FormField label="Nouvelle date">
				<Input
					type="date"
					bind:value={dateLocal}
					data-testid="agenda-reschedule-date"
					oninput={() => {
						selectedSlot = null;
						void loadAvailability();
					}}
				/>
			</FormField>
			<AvailabilityPicker
				{slots}
				loading={slotsLoading}
				selectedKey={selectedSlot ? slotKey(selectedSlot) : ''}
				practitionerNames={fresh.expectedDoctorId
					? { [fresh.expectedDoctorId]: fresh.expectedDoctorName }
					: {}}
				onselect={(s) => (selectedSlot = s)}
				onretry={() => void loadAvailability()}
			/>
		{/if}
	</div>

	{#snippet footer()}
		<Button
			variant="ghost"
			onclick={() => {
				open = false;
				onclose?.();
			}}>Fermer</Button
		>
		<Button
			onclick={() => void submit()}
			loading={submitting}
			disabled={!selectedSlot || submitting || !fresh}
			data-testid="agenda-reschedule-submit">Confirmer le report</Button
		>
	{/snippet}
</Modal>
