<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import {
		cancelAppointment,
		checkInAppointment,
		getAppointment,
		listAppointments,
		markAppointmentNoShow
	} from '$lib/api/appointments';
	import { listOrganizationServices } from '$lib/api/organization';
	import { getPatient } from '$lib/api/patients';
	import { listStaff } from '$lib/api/staff';
	import AgendaDayView from '$lib/components/agenda/AgendaDayView.svelte';
	import AgendaWeekView from '$lib/components/agenda/AgendaWeekView.svelte';
	import AppointmentBookingModal from '$lib/components/agenda/AppointmentBookingModal.svelte';
	import AppointmentDetails from '$lib/components/agenda/AppointmentDetails.svelte';
	import AppointmentRescheduleModal from '$lib/components/agenda/AppointmentRescheduleModal.svelte';
	import {
		AGENDA_TIMEZONE,
		canBookAppointment,
		canListStaffForAgenda,
		canReadAgenda,
		fetchAllAppointmentPages,
		formatAgendaDayLabel,
		formatAgendaWeekLabel,
		navigateAnchor,
		parseAgendaPatientIdParam,
		rangeForMode,
		toRfc3339,
		type AgendaMode
	} from '$lib/components/agenda/state';
	import AccessDenied from '$lib/components/rbac/AccessDenied.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import FilterBar from '$lib/components/ui/FilterBar.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import { eligibleServices } from '$lib/components/organization/state';
	import {
		getStoredPermissions,
		isAccessDeniedError,
		resolveUserErrorMessage
	} from '$lib/rbac/permissions';
	import type { OrganizationService } from '$lib/types/organization';
	import type { Patient } from '$lib/types/patient';
	import type { Appointment, AppointmentStatus } from '$lib/types/scheduling';

	const tabs = [
		{ id: 'day', label: 'Jour' },
		{ id: 'week', label: 'Semaine' },
		{ id: 'mine', label: 'Mon planning' }
	];

	const statusOptions: Array<{ value: string; label: string }> = [
		{ value: '', label: 'Tous les statuts' },
		{ value: 'SCHEDULED', label: 'Planifié' },
		{ value: 'ARRIVED', label: 'Arrivé' },
		{ value: 'CHECKED_IN', label: 'Enregistré' },
		{ value: 'IN_PROGRESS', label: 'En consultation' },
		{ value: 'COMPLETED', label: 'Terminé' },
		{ value: 'CANCELLED', label: 'Annulé' },
		{ value: 'NO_SHOW', label: 'Absent' }
	];

	let permissions = $state<string[]>([]);
	let currentUserId = $state<number | null>(null);
	let accessDenied = $state(false);

	let mode = $state<AgendaMode>('day');
	let tabValue = $state('day');
	let anchor = $state(new Date());
	let appointments = $state<Appointment[]>([]);
	let loading = $state(true);
	let error = $state('');
	let success = $state('');

	let services = $state<OrganizationService[]>([]);
	let serviceId = $state('');
	let practitionerId = $state('');
	let statusFilter = $state('');
	let staffOptions = $state<Array<{ userId: number; label: string }>>([]);

	let selected = $state<Appointment | null>(null);
	let detailsOpen = $state(false);
	let detailsLoading = $state(false);
	let detailsError = $state('');
	let acting = $state<string | null>(null);

	let bookingOpen = $state(false);
	let rescheduleOpen = $state(false);
	let rescheduleId = $state<number | null>(null);

	let confirmCancelOpen = $state(false);
	let confirmNoShowOpen = $state(false);
	let confirmCheckInOpen = $state(false);

	/** LOT 23K — deep-link patient context (booking lock only when canBook). */
	let deepLinkPatient = $state<Patient | null>(null);
	let deepLinkNotice = $state('');
	let deepLinkSeq = 0;

	const canBook = $derived(canBookAppointment(permissions));
	const bookingInitialPatient = $derived(canBook ? deepLinkPatient : null);
	const rangeLabel = $derived.by(() => {
		const { from, to } = rangeForMode(mode === 'mine' ? 'day' : mode, anchor);
		if (mode === 'week') return formatAgendaWeekLabel(from, to);
		return formatAgendaDayLabel(from);
	});

	const consultationServices = $derived(eligibleServices(services, 'consultation'));

	$effect(() => {
		const raw = page.url.searchParams.get('patientId');
		const bookable = canBook;
		void resolveDeepLinkPatient(raw, bookable);
	});

	async function resolveDeepLinkPatient(raw: string | null, bookable: boolean) {
		const seq = ++deepLinkSeq;
		const id = parseAgendaPatientIdParam(raw);
		if (id == null) {
			if (raw != null && String(raw).trim() !== '') {
				deepLinkPatient = null;
				deepLinkNotice = 'Identifiant patient invalide — l’agenda reste utilisable.';
			} else {
				deepLinkPatient = null;
				deepLinkNotice = '';
			}
			return;
		}
		// Deep-link patient context is only for booking preselect/lock — never fetch when read-only.
		if (!bookable) {
			deepLinkPatient = null;
			deepLinkNotice = '';
			return;
		}
		try {
			const patient = await getPatient(id);
			if (seq !== deepLinkSeq) return;
			deepLinkPatient = patient;
			deepLinkNotice = '';
		} catch (e) {
			if (seq !== deepLinkSeq) return;
			deepLinkPatient = null;
			deepLinkNotice = resolveUserErrorMessage(
				e,
				'Patient introuvable ou inaccessible — l’agenda reste utilisable.'
			);
		}
	}

	onMount(() => {
		permissions = getStoredPermissions();
		if (!canReadAgenda(permissions)) {
			accessDenied = true;
			loading = false;
			return;
		}
		const stored = localStorage.getItem('medcore_user');
		if (stored) {
			try {
				const u = JSON.parse(stored) as { id?: number };
				currentUserId = u.id ?? null;
			} catch {
				/* ignore */
			}
		}
		void bootstrap();
	});

	async function bootstrap() {
		try {
			services = await listOrganizationServices(true);
			if (canListStaffForAgenda(permissions)) {
				const page = await listStaff({ active: 'true', limit: 100 });
				staffOptions = (page.items ?? []).map((s) => ({
					userId: s.userId,
					label: s.name || `#${s.userId}`
				}));
			}
		} catch {
			/* filters optional */
		}
		await loadAppointments();
	}

	async function loadAppointments() {
		loading = true;
		error = '';
		try {
			const effectiveMode: AgendaMode = mode === 'mine' ? 'day' : mode;
			const { from, to } = rangeForMode(effectiveMode, anchor);
			const pracFilter =
				mode === 'mine' && currentUserId
					? currentUserId
					: practitionerId
						? Number(practitionerId)
						: undefined;
			appointments = await fetchAllAppointmentPages((page, limit) =>
				listAppointments({
					from: toRfc3339(from),
					to: toRfc3339(to),
					page,
					limit,
					serviceId: serviceId ? Number(serviceId) : undefined,
					practitionerId: pracFilter,
					status: statusFilter ? (statusFilter as AppointmentStatus) : undefined
				})
			);
		} catch (e) {
			if (isAccessDeniedError(e)) accessDenied = true;
			else error = resolveUserErrorMessage(e, 'Impossible de charger l’agenda.');
			appointments = [];
		} finally {
			loading = false;
		}
	}

	function onTabChange(id: string) {
		tabValue = id;
		mode = id as AgendaMode;
		void loadAppointments();
	}

	function go(direction: -1 | 0 | 1) {
		anchor = navigateAnchor(mode === 'mine' ? 'day' : mode, anchor, direction);
		void loadAppointments();
	}

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

{#if accessDenied}
	<AccessDenied />
{:else}
	<div class="space-y-6" data-testid="agenda-page">
		<PageHeader
			title="Agenda médical"
			description="Planification basée sur les rendez-vous et disponibilités autoritatifs du backend."
		>
			{#snippet actions()}
				{#if canBook}
					<Button data-testid="agenda-new-appointment" onclick={() => (bookingOpen = true)}>
						Nouveau rendez-vous
					</Button>
				{/if}
			{/snippet}
		</PageHeader>

		{#if error}
			<Alert tone="danger" title="Erreur">{error}</Alert>
		{/if}
		{#if deepLinkNotice}
			<div data-testid="agenda-deeplink-notice">
				<Alert tone="warning" title="Contexte patient">{deepLinkNotice}</Alert>
			</div>
		{/if}
		{#if deepLinkPatient && canBook}
			<div data-testid="agenda-deeplink-patient">
				<Alert tone="info" title="Patient préselectionné">
					{deepLinkPatient.prenoms}
					{deepLinkPatient.nom} — préselectionné pour la réservation (modal non ouvert automatiquement).
				</Alert>
			</div>
		{/if}
		{#if success}
			<Alert tone="success" title="Succès">{success}</Alert>
		{/if}

		<Tabs {tabs} bind:value={tabValue} onchange={onTabChange} />

		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex flex-wrap items-center gap-2">
				<Button
					variant="secondary"
					data-testid="agenda-prev"
					onclick={() => go(-1)}
					aria-label="Période précédente">Précédent</Button
				>
				<Button variant="ghost" data-testid="agenda-today" onclick={() => go(0)}>Aujourd’hui</Button
				>
				<Button
					variant="secondary"
					data-testid="agenda-next"
					onclick={() => go(1)}
					aria-label="Période suivante">Suivant</Button
				>
			</div>
			<p class="text-sm font-semibold capitalize text-slate-800" data-testid="agenda-range-label">
				{rangeLabel}
			</p>
		</div>

		{#if mode !== 'mine'}
			<FilterBar>
				<Select
					bind:value={serviceId}
					aria-label="Filtrer par service"
					data-testid="agenda-filter-service"
					onchange={() => void loadAppointments()}
				>
					<option value="">Tous les services</option>
					{#each consultationServices as s (s.id)}
						<option value={String(s.id)}>{s.name}</option>
					{/each}
				</Select>
				{#if canListStaffForAgenda(permissions)}
					<Select
						bind:value={practitionerId}
						aria-label="Filtrer par praticien"
						data-testid="agenda-filter-practitioner"
						onchange={() => void loadAppointments()}
					>
						<option value="">Tous les praticiens</option>
						{#each staffOptions as s (s.userId)}
							<option value={String(s.userId)}>{s.label}</option>
						{/each}
					</Select>
				{:else}
					<input
						class="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm"
						placeholder="ID praticien (filtre)"
						bind:value={practitionerId}
						data-testid="agenda-filter-practitioner"
						onchange={() => void loadAppointments()}
					/>
				{/if}
				<Select
					bind:value={statusFilter}
					aria-label="Filtrer par statut"
					data-testid="agenda-filter-status"
					onchange={() => void loadAppointments()}
				>
					{#each statusOptions as o (o.value)}
						<option value={o.value}>{o.label}</option>
					{/each}
				</Select>
			</FilterBar>
		{:else}
			<p class="text-sm text-slate-500">
				Mon planning — rendez-vous où vous êtes le praticien prévu (schedule.read.own).
			</p>
		{/if}

		{#if loading}
			<LoadingState label="Chargement de l’agenda…" />
		{:else if mode === 'week'}
			{@const { from } = rangeForMode('week', anchor, AGENDA_TIMEZONE)}
			<AgendaWeekView
				weekFrom={from}
				{appointments}
				selectedId={selected?.id}
				onselect={(a) => void openDetails(a)}
				ondayselect={(d) => {
					anchor = d;
					mode = 'day';
					tabValue = 'day';
					void loadAppointments();
				}}
			/>
		{:else if appointments.length === 0 && mode === 'mine'}
			<EmptyState
				title="Aucun rendez-vous pour vous"
				description="Aucun rendez-vous planifié sur cette journée avec vous comme praticien."
			/>
		{:else}
			<AgendaDayView
				{appointments}
				selectedId={selected?.id}
				onselect={(a) => void openDetails(a)}
			/>
		{/if}
	</div>

	<AppointmentDetails
		bind:open={detailsOpen}
		appointment={selected}
		loading={detailsLoading}
		error={detailsError}
		{permissions}
		{acting}
		onreschedule={() => {
			if (!selected) return;
			rescheduleId = selected.id;
			rescheduleOpen = true;
		}}
		oncancel={() => (confirmCancelOpen = true)}
		onnoshow={() => (confirmNoShowOpen = true)}
		oncheckin={() => (confirmCheckInOpen = true)}
		onrefresh={() => void refreshSelected()}
	/>

	{#if canBook}
		<AppointmentBookingModal
			bind:open={bookingOpen}
			{permissions}
			initialPatient={bookingInitialPatient}
			onsuccess={async (appt) => {
				success = `Rendez-vous #${appt.id} créé.`;
				await loadAppointments();
				void openDetails(appt);
			}}
		/>
	{/if}

	<AppointmentRescheduleModal
		bind:open={rescheduleOpen}
		appointmentId={rescheduleId}
		onsuccess={async (appt) => {
			success = 'Rendez-vous reporté.';
			selected = appt;
			await loadAppointments();
		}}
	/>

	<ConfirmDialog
		bind:open={confirmCancelOpen}
		title="Annuler le rendez-vous ?"
		description={selected
			? `${selected.patientName} — ${selected.scheduledAt}`
			: 'Cette action conserve le rendez-vous en statut Annulé.'}
		confirmLabel="Annuler le RDV"
		onconfirm={() => void doCancel()}
	/>

	<ConfirmDialog
		bind:open={confirmNoShowOpen}
		title="Marquer absent ?"
		description="Le backend refuse un no-show futur. Confirmez uniquement si l’horaire le permet."
		confirmLabel="Confirmer l’absence"
		onconfirm={() => void doNoShow()}
	/>

	<ConfirmDialog
		bind:open={confirmCheckInOpen}
		title="Check-in du rendez-vous ?"
		description="Enregistrement réception → finance → file d’attente (LOT 23F). Identité confirmée."
		confirmLabel="Check-in"
		danger={false}
		onconfirm={() => void doCheckIn()}
	/>
{/if}
