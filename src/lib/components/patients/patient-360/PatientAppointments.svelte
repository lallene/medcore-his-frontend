<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import {
		cancelAppointment,
		checkInAppointment,
		getAppointment,
		listAppointments,
		markAppointmentNoShow
	} from '$lib/api/appointments';
	import {
		AGENDA_TIMEZONE,
		addCalendarDays,
		canBookAppointment,
		canReadAgenda,
		filterHistoryAppointments,
		filterUpcomingAppointments,
		formatAgendaDateTime,
		startOfZonedDay,
		toRfc3339
	} from '$lib/components/agenda/state';
	import AppointmentCard from '$lib/components/agenda/AppointmentCard.svelte';
	import AppointmentDetails from '$lib/components/agenda/AppointmentDetails.svelte';
	import AppointmentBookingModal from '$lib/components/agenda/AppointmentBookingModal.svelte';
	import AppointmentRescheduleModal from '$lib/components/agenda/AppointmentRescheduleModal.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import { getStoredPermissions, resolveUserErrorMessage } from '$lib/rbac/permissions';
	import type { Patient } from '$lib/types/patient';
	import type { Appointment } from '$lib/types/scheduling';

	interface Props {
		patient: Patient;
		onCountChange?: (count: number) => void;
	}

	let { patient, onCountChange }: Props = $props();

	const permissions = getStoredPermissions();
	const canRead = canReadAgenda(permissions);
	const canBook = canBookAppointment(permissions);

	let loading = $state(true);
	let error = $state('');
	let success = $state('');
	let upcoming = $state<Appointment[]>([]);
	let history = $state<Appointment[]>([]);

	let selected = $state<Appointment | null>(null);
	let detailsOpen = $state(false);
	let detailsLoading = $state(false);
	let detailsError = $state('');
	let acting = $state<string | null>(null);

	let bookingOpen = $state(false);
	let rescheduleOpen = $state(false);
	let confirmCancelOpen = $state(false);
	let confirmNoShowOpen = $state(false);
	let confirmCheckInOpen = $state(false);

	/** Matches buildAgendaPatientHref query contract with resolve()-safe path. */
	const agendaHref = $derived(resolve('/agenda') + `?patientId=${patient.id}`);

	/** Half-open windows matching GET /api/appointments [from, to). */
	function appointmentWindows() {
		const startToday = startOfZonedDay(new Date(), AGENDA_TIMEZONE);
		const historyFrom = addCalendarDays(startToday, -31, AGENDA_TIMEZONE);
		const upcomingTo = addCalendarDays(startToday, 31, AGENDA_TIMEZONE);
		return {
			startToday,
			past: { from: toRfc3339(historyFrom), to: toRfc3339(startToday) },
			forward: { from: toRfc3339(startToday), to: toRfc3339(upcomingTo) }
		};
	}

	async function loadAppointments() {
		if (!canRead) {
			loading = false;
			upcoming = [];
			history = [];
			onCountChange?.(0);
			return;
		}
		loading = true;
		error = '';
		try {
			const { startToday, past, forward } = appointmentWindows();
			const [pastRes, forwardRes] = await Promise.all([
				listAppointments({
					from: past.from,
					to: past.to,
					patientId: patient.id,
					page: 1,
					limit: 100
				}),
				listAppointments({
					from: forward.from,
					to: forward.to,
					patientId: patient.id,
					page: 1,
					limit: 100
				})
			]);
			const pastItems = pastRes.items ?? [];
			const forwardItems = forwardRes.items ?? [];
			upcoming = filterUpcomingAppointments(forwardItems);
			const merged = [...pastItems, ...forwardItems].filter(
				(a, i, arr) => arr.findIndex((x) => x.id === a.id) === i
			);
			history = filterHistoryAppointments(merged, startToday);
			onCountChange?.(upcoming.length);
		} catch (e) {
			error = resolveUserErrorMessage(e, 'Impossible de charger les rendez-vous.');
			upcoming = [];
			history = [];
			onCountChange?.(0);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void loadAppointments();
	});

	async function openDetails(appt: Appointment) {
		selected = appt;
		detailsOpen = true;
		detailsError = '';
		detailsLoading = true;
		try {
			selected = await getAppointment(appt.id);
		} catch (e) {
			detailsError = resolveUserErrorMessage(e, 'Détail indisponible.');
		} finally {
			detailsLoading = false;
		}
	}

	async function refreshSelected() {
		if (!selected) return;
		detailsLoading = true;
		detailsError = '';
		try {
			selected = await getAppointment(selected.id);
			await loadAppointments();
		} catch (e) {
			detailsError = resolveUserErrorMessage(e, 'Actualisation impossible.');
		} finally {
			detailsLoading = false;
		}
	}

	async function doCancel() {
		if (!selected) return;
		acting = 'cancel';
		detailsError = '';
		try {
			selected = await cancelAppointment(selected.id, {});
			success = 'Rendez-vous annulé.';
			await loadAppointments();
		} catch (e) {
			detailsError = resolveUserErrorMessage(e, 'Annulation impossible.');
		} finally {
			acting = null;
		}
	}

	async function doNoShow() {
		if (!selected) return;
		acting = 'noshow';
		detailsError = '';
		try {
			selected = await markAppointmentNoShow(selected.id, {});
			success = 'Absence enregistrée.';
			await loadAppointments();
		} catch (e) {
			detailsError = resolveUserErrorMessage(e, 'No-show impossible.');
		} finally {
			acting = null;
		}
	}

	async function doCheckIn() {
		if (!selected) return;
		acting = 'checkin';
		detailsError = '';
		try {
			await checkInAppointment(selected.id, { identityConfirmed: true });
			selected = await getAppointment(selected.id);
			success = 'Check-in effectué — patient en file d’attente.';
			await loadAppointments();
		} catch (e) {
			detailsError = resolveUserErrorMessage(e, 'Check-in impossible.');
		} finally {
			acting = null;
		}
	}
</script>

{#if !canRead}
	<!-- Section gated: no schedule.read.* → no scheduling API calls -->
{:else}
	<div class="space-y-6" data-testid="patient-360-appointments">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div>
				<h2 class="text-lg font-semibold text-slate-900">Rendez-vous</h2>
				<p class="text-sm text-slate-500">
					À venir et historique récent (31 jours) — source agenda autoritative.
				</p>
			</div>
			<div class="flex flex-wrap gap-2">
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- query after resolve('/agenda') --><a
					href={agendaHref}
					class="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
					data-testid="patient-360-open-agenda">Voir l’agenda</a
				>
				{#if canBook}
					<Button data-testid="patient-360-book-appointment" onclick={() => (bookingOpen = true)}
						>Nouveau rendez-vous</Button
					>
				{/if}
			</div>
		</div>

		{#if success}
			<Alert tone="success" title="Succès">{success}</Alert>
		{/if}
		{#if error}
			<Alert tone="danger" title="Erreur">{error}</Alert>
		{:else if loading}
			<LoadingState label="Chargement des rendez-vous…" class="min-h-[160px]" />
		{:else}
			<section class="space-y-3" data-testid="patient-360-appointments-upcoming">
				<div>
					<h3 class="text-base font-semibold text-slate-900">À venir</h3>
					<p class="text-sm text-slate-500">Planifiés et en cours (fenêtre 31 jours).</p>
				</div>
				{#if upcoming.length === 0}
					<EmptyState
						title="Aucun rendez-vous à venir"
						description="Aucun rendez-vous planifié ou en cours pour ce patient sur la fenêtre affichée."
					/>
				{:else}
					<ul class="space-y-2" data-testid="patient-360-appointment-list">
						{#each upcoming as appt (appt.id)}
							<li>
								<AppointmentCard
									appointment={appt}
									selected={selected?.id === appt.id}
									onclick={() => void openDetails(appt)}
								/>
								<p class="mt-1 px-1 text-xs text-slate-500">
									{formatAgendaDateTime(appt.scheduledAt)}
								</p>
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<section class="space-y-3" data-testid="patient-360-appointments-history">
				<div>
					<h3 class="text-base font-semibold text-slate-900">Historique</h3>
					<p class="text-sm text-slate-500">
						Terminés, annulés, absents ou passés — 31 derniers jours (plus récents en premier).
					</p>
				</div>
				{#if history.length === 0}
					<EmptyState
						title="Aucun historique récent"
						description="Aucun rendez-vous historique sur les 31 derniers jours pour ce patient."
					/>
				{:else}
					<ul class="space-y-2" data-testid="patient-360-appointment-history-list">
						{#each history as appt (appt.id)}
							<li data-testid="patient-360-history-item" data-appointment-id={appt.id}>
								<AppointmentCard
									appointment={appt}
									selected={selected?.id === appt.id}
									onclick={() => void openDetails(appt)}
								/>
								<p class="mt-1 px-1 text-xs text-slate-500">
									{formatAgendaDateTime(appt.scheduledAt)}
								</p>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}
	</div>

	<AppointmentDetails
		bind:open={detailsOpen}
		appointment={selected}
		loading={detailsLoading}
		error={detailsError}
		{permissions}
		{acting}
		showOpenPatient={false}
		onclose={() => {
			detailsOpen = false;
		}}
		onrefresh={() => void refreshSelected()}
		onreschedule={() => (rescheduleOpen = true)}
		oncancel={() => (confirmCancelOpen = true)}
		onnoshow={() => (confirmNoShowOpen = true)}
		oncheckin={() => (confirmCheckInOpen = true)}
	/>

	{#if canBook}
		<AppointmentBookingModal
			bind:open={bookingOpen}
			{permissions}
			initialPatient={patient}
			onsuccess={async () => {
				success = 'Rendez-vous créé.';
				await loadAppointments();
			}}
		/>
	{/if}

	<AppointmentRescheduleModal
		bind:open={rescheduleOpen}
		appointmentId={selected?.id ?? null}
		onsuccess={async (updated) => {
			selected = updated;
			success = 'Rendez-vous reporté.';
			await loadAppointments();
		}}
	/>

	<ConfirmDialog
		bind:open={confirmCancelOpen}
		title="Annuler le rendez-vous ?"
		confirmLabel="Annuler le RDV"
		danger={true}
		onconfirm={() => void doCancel()}
	/>
	<ConfirmDialog
		bind:open={confirmNoShowOpen}
		title="Marquer absent ?"
		confirmLabel="Confirmer l’absence"
		danger={true}
		onconfirm={() => void doNoShow()}
	/>
	<ConfirmDialog
		bind:open={confirmCheckInOpen}
		title="Check-in patient ?"
		confirmLabel="Enregistrer"
		danger={false}
		onconfirm={() => void doCheckIn()}
	/>
{/if}
