<script lang="ts">
	import { onMount } from 'svelte';
	import {
		cancelScheduleException,
		createSchedule,
		createScheduleException,
		disableSchedule,
		listScheduleExceptions,
		listSchedules,
		updateSchedule,
		updateScheduleException
	} from '$lib/api/schedules';
	import {
		createAppointmentType,
		disableAppointmentType,
		listAppointmentTypes,
		updateAppointmentType
	} from '$lib/api/appointments';
	import { listOrganizationServices } from '$lib/api/organization';
	import { formatAgendaDateTime, zonedDayKey } from '$lib/components/agenda/state';
	import { listStaff } from '$lib/api/staff';
	import {
		APPOINTMENT_TYPE_MAX_DURATION_MINUTES,
		APPOINTMENT_TYPE_MIN_DURATION_MINUTES,
		SCHEDULE_ADMIN_TIMEZONE,
		WEEKDAY_OPTIONS,
		EXCEPTION_TYPE_OPTIONS,
		canAccessAppointmentTypeCatalog,
		canAccessScheduleAdministration,
		canManageAppointmentTypes,
		canManageSchedule,
		canReadScheduleAdministration,
		dateInputToRfc3339Date,
		datetimeLocalToRfc3339,
		defaultScheduleAdminTab,
		exceptionTypeLabel,
		formatWallClockDisplay,
		isPositiveExceptionType,
		isScheduleExceptionType,
		normalizeWallClockTime,
		parseExplicitWeekday,
		rfc3339DateToInput,
		rfc3339ToDatetimeLocal,
		scheduleAdminVisibleTabs,
		validateAppointmentTypeDuration,
		validateExceptionRange,
		validateRecurringWallClockRange,
		weekdayLabel
	} from '$lib/components/scheduling/state';
	import AccessDenied from '$lib/components/rbac/AccessDenied.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import FilterBar from '$lib/components/ui/FilterBar.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import {
		getStoredPermissions,
		isAccessDeniedError,
		resolveUserErrorMessage
	} from '$lib/rbac/permissions';
	import type { OrganizationService } from '$lib/types/organization';
	import type {
		AppointmentType,
		ScheduleException,
		ScheduleExceptionType,
		StaffWorkingSchedule,
		UpdateAppointmentTypeRequest
	} from '$lib/types/scheduling';

	let permissions = $state<string[]>([]);
	let accessDenied = $state(false);
	let tabValue = $state('schedules');
	let loading = $state(true);
	let error = $state('');
	let success = $state('');

	const canManage = $derived(canManageSchedule(permissions));
	const canManageTypes = $derived(canManageAppointmentTypes(permissions));
	const canReadSchedules = $derived(canReadScheduleAdministration(permissions));
	const canLoadTypes = $derived(canAccessAppointmentTypeCatalog(permissions));
	const tabs = $derived(scheduleAdminVisibleTabs(permissions));

	let services = $state<OrganizationService[]>([]);
	let staffOptions = $state<Array<{ userId: number; label: string }>>([]);
	let formStaffOptions = $state<Array<{ userId: number; label: string }>>([]);

	let filterPractitioner = $state('');
	let filterService = $state('');
	let filterWeekday = $state('');
	let filterActive = $state('true');

	let schedules = $state<StaffWorkingSchedule[]>([]);
	let exceptions = $state<ScheduleException[]>([]);

	let exFilterPractitioner = $state('');
	let exFilterService = $state('');
	let exFilterType = $state('');
	let exFilterActive = $state('true');

	let appointmentTypes = $state<AppointmentType[]>([]);
	let typeFilterActive = $state('true');
	let typeFilterService = $state('');
	let typeModalOpen = $state(false);
	let editingType = $state<AppointmentType | null>(null);
	let typeCode = $state('');
	let typeName = $state('');
	let typeDuration = $state('30');
	let typeService = $state('');
	let typeClearService = $state(false);
	let typeFormError = $state('');
	let typeSaving = $state(false);
	let confirmDisableTypeOpen = $state(false);
	let pendingDisableTypeId = $state<number | null>(null);

	let scheduleModalOpen = $state(false);
	let editingSchedule = $state<StaffWorkingSchedule | null>(null);
	let schedPractitioner = $state('');
	let schedService = $state('');
	let schedWeekday = $state('1');
	let schedStart = $state('08:00');
	let schedEnd = $state('12:00');
	let schedValidFrom = $state('');
	let schedValidUntil = $state('');
	let schedFormError = $state('');
	let schedSaving = $state(false);

	let exceptionModalOpen = $state(false);
	let editingException = $state<ScheduleException | null>(null);
	let exPractitioner = $state('');
	let exService = $state('');
	let exType = $state<ScheduleExceptionType>('ABSENCE');
	let exStart = $state('');
	let exEnd = $state('');
	let exReason = $state('');
	let exFormError = $state('');
	let exSaving = $state(false);

	let confirmDisableScheduleOpen = $state(false);
	let confirmCancelExceptionOpen = $state(false);
	let pendingDisableScheduleId = $state<number | null>(null);
	let pendingCancelExceptionId = $state<number | null>(null);

	function mapErr(e: unknown, fallback: string): string {
		if (isAccessDeniedError(e)) return 'Action non autorisée (RBAC / périmètre service).';
		return resolveUserErrorMessage(e, fallback) || fallback;
	}

	function staffLabel(userId: number): string {
		return (
			staffOptions.find((s) => s.userId === userId)?.label ??
			formStaffOptions.find((s) => s.userId === userId)?.label ??
			`#${userId}`
		);
	}

	function serviceLabel(serviceId: number): string {
		return services.find((s) => s.id === serviceId)?.name ?? `#${serviceId}`;
	}

	onMount(() => {
		permissions = getStoredPermissions();
		if (!canAccessScheduleAdministration(permissions)) {
			accessDenied = true;
			loading = false;
			return;
		}
		tabValue = defaultScheduleAdminTab(permissions);
		void bootstrap();
	});

	$effect(() => {
		if (tabValue === 'types' && canLoadTypes && !accessDenied && !loading) {
			void loadAppointmentTypes();
		}
	});

	async function bootstrap() {
		loading = true;
		error = '';
		const readSched = canReadScheduleAdministration(permissions);
		const loadTypes = canAccessAppointmentTypeCatalog(permissions);
		try {
			try {
				services = await listOrganizationServices(true);
			} catch {
				services = [];
			}
			if (readSched) {
				try {
					const page = await listStaff({ active: 'true', limit: 100 });
					staffOptions = (page.items ?? []).map((s) => ({
						userId: s.userId,
						label: s.name || `#${s.userId}`
					}));
				} catch {
					staffOptions = [];
				}
				const today = zonedDayKey(new Date(), SCHEDULE_ADMIN_TIMEZONE);
				schedValidFrom = today;
				await Promise.all([loadSchedules(), loadExceptions()]);
			}
			if (loadTypes) {
				await loadAppointmentTypes();
			}
		} catch (e) {
			if (isAccessDeniedError(e)) accessDenied = true;
			else error = mapErr(e, 'Impossible de charger l’administration des plannings.');
		} finally {
			loading = false;
		}
	}

	async function loadFormStaffForService(serviceId: string) {
		if (!serviceId) {
			formStaffOptions = [];
			return;
		}
		try {
			const page = await listStaff({
				serviceId: Number(serviceId),
				active: 'true',
				limit: 100
			});
			formStaffOptions = (page.items ?? []).map((s) => ({
				userId: s.userId,
				label: s.name || `#${s.userId}`
			}));
		} catch {
			formStaffOptions = [];
		}
	}

	async function onScheduleServiceChange() {
		await loadFormStaffForService(schedService);
		if (!formStaffOptions.some((s) => String(s.userId) === schedPractitioner)) {
			schedPractitioner = '';
		}
	}

	async function onExceptionServiceChange() {
		await loadFormStaffForService(exService);
		if (!formStaffOptions.some((s) => String(s.userId) === exPractitioner)) {
			exPractitioner = '';
		}
	}

	async function loadSchedules() {
		const weekday =
			filterWeekday === '' ? undefined : (parseExplicitWeekday(filterWeekday) ?? undefined);
		const res = await listSchedules({
			practitionerId: filterPractitioner ? Number(filterPractitioner) : undefined,
			serviceId: filterService ? Number(filterService) : undefined,
			weekday,
			active: filterActive === '' ? undefined : filterActive === 'true',
			page: 1,
			limit: 100
		});
		schedules = res.items ?? [];
	}

	async function loadExceptions() {
		const now = Date.now();
		const from = new Date(now - 24 * 60 * 60_000);
		const to = new Date(now + 62 * 24 * 60 * 60_000);
		const res = await listScheduleExceptions({
			practitionerId: exFilterPractitioner ? Number(exFilterPractitioner) : undefined,
			serviceId: exFilterService ? Number(exFilterService) : undefined,
			type: exFilterType || undefined,
			active: exFilterActive === '' ? undefined : exFilterActive === 'true',
			from: from.toISOString(),
			to: to.toISOString(),
			page: 1,
			limit: 100
		});
		exceptions = res.items ?? [];
	}

	async function loadAppointmentTypes() {
		const res = await listAppointmentTypes({
			serviceId: typeFilterService ? Number(typeFilterService) : undefined,
			active: typeFilterActive === '' ? undefined : typeFilterActive === 'true'
		});
		appointmentTypes = res.items ?? [];
	}

	async function openCreateSchedule() {
		editingSchedule = null;
		schedService = services[0] ? String(services[0].id) : '';
		schedWeekday = '1';
		schedStart = '08:00';
		schedEnd = '12:00';
		schedValidFrom = zonedDayKey(new Date(), SCHEDULE_ADMIN_TIMEZONE);
		schedValidUntil = '';
		schedFormError = '';
		await loadFormStaffForService(schedService);
		schedPractitioner = formStaffOptions[0] ? String(formStaffOptions[0].userId) : '';
		scheduleModalOpen = true;
	}

	async function openEditSchedule(row: StaffWorkingSchedule) {
		editingSchedule = row;
		schedPractitioner = String(row.practitionerId);
		schedService = String(row.serviceId);
		schedWeekday = String(row.weekday);
		schedStart = normalizeWallClockTime(row.startTime) ?? row.startTime.slice(0, 5);
		schedEnd = normalizeWallClockTime(row.endTime) ?? row.endTime.slice(0, 5);
		schedValidFrom = rfc3339DateToInput(row.validFrom);
		schedValidUntil = rfc3339DateToInput(row.validUntil ?? undefined);
		schedFormError = '';
		await loadFormStaffForService(schedService);
		scheduleModalOpen = true;
	}

	async function saveSchedule() {
		schedFormError = '';
		const weekday = parseExplicitWeekday(schedWeekday);
		if (weekday === null) {
			schedFormError = 'Le jour de la semaine est obligatoire.';
			return;
		}
		const rangeErr = validateRecurringWallClockRange(schedStart, schedEnd);
		if (rangeErr) {
			schedFormError = rangeErr;
			return;
		}
		const startTime = normalizeWallClockTime(schedStart);
		const endTime = normalizeWallClockTime(schedEnd);
		const validFrom = dateInputToRfc3339Date(schedValidFrom);
		if (!startTime || !endTime || !validFrom) {
			schedFormError = 'Horaires ou date de début invalides.';
			return;
		}
		if (!schedPractitioner || !schedService) {
			schedFormError = 'Praticien et service sont obligatoires.';
			return;
		}
		schedSaving = true;
		try {
			if (editingSchedule) {
				const body: {
					serviceId: number;
					weekday: number;
					startTime: string;
					endTime: string;
					validFrom: string;
					validUntil?: string | null;
					clearUntil?: boolean;
				} = {
					serviceId: Number(schedService),
					weekday,
					startTime,
					endTime,
					validFrom
				};
				if (schedValidUntil) {
					const until = dateInputToRfc3339Date(schedValidUntil);
					if (!until) {
						schedFormError = 'Date de fin de validité invalide.';
						return;
					}
					body.validUntil = until;
				} else {
					body.clearUntil = true;
				}
				await updateSchedule(editingSchedule.id, body);
				success = 'Horaire mis à jour.';
			} else {
				await createSchedule({
					practitionerId: Number(schedPractitioner),
					serviceId: Number(schedService),
					weekday,
					startTime,
					endTime,
					validFrom,
					validUntil: schedValidUntil ? dateInputToRfc3339Date(schedValidUntil) : undefined
				});
				success = 'Horaire créé.';
			}
			scheduleModalOpen = false;
			await loadSchedules();
		} catch (e) {
			schedFormError = mapErr(e, 'Enregistrement impossible.');
		} finally {
			schedSaving = false;
		}
	}

	function askDisableSchedule(id: number) {
		pendingDisableScheduleId = id;
		confirmDisableScheduleOpen = true;
	}

	async function confirmDisableSchedule() {
		if (pendingDisableScheduleId == null) return;
		error = '';
		try {
			await disableSchedule(pendingDisableScheduleId);
			success = 'Horaire désactivé.';
			await loadSchedules();
		} catch (e) {
			error = mapErr(e, 'Désactivation impossible.');
		} finally {
			pendingDisableScheduleId = null;
		}
	}

	async function openCreateException() {
		editingException = null;
		exService = services[0] ? String(services[0].id) : '';
		exType = 'ABSENCE';
		const startMs = Math.floor((Date.now() + 60 * 60_000) / 60_000) * 60_000;
		const endMs = startMs + 2 * 60 * 60_000;
		exStart = rfc3339ToDatetimeLocal(new Date(startMs).toISOString());
		exEnd = rfc3339ToDatetimeLocal(new Date(endMs).toISOString());
		exReason = '';
		exFormError = '';
		await loadFormStaffForService(exService);
		exPractitioner = formStaffOptions[0] ? String(formStaffOptions[0].userId) : '';
		exceptionModalOpen = true;
	}

	async function openEditException(row: ScheduleException) {
		editingException = row;
		if (!isScheduleExceptionType(row.type)) {
			error = `Type d’exception non pris en charge : ${row.type}`;
			return;
		}

		exPractitioner = String(row.practitionerId);
		exService = String(row.serviceId);
		exType = row.type;
		exStart = rfc3339ToDatetimeLocal(row.startAt);
		exEnd = rfc3339ToDatetimeLocal(row.endAt);
		exReason = row.reason ?? '';
		exFormError = '';
		await loadFormStaffForService(exService);
		exceptionModalOpen = true;
	}

	async function saveException() {
		exFormError = '';
		const startAt = datetimeLocalToRfc3339(exStart);
		const endAt = datetimeLocalToRfc3339(exEnd);
		if (!startAt || !endAt) {
			exFormError = 'Dates/heures invalides.';
			return;
		}
		const rangeErr = validateExceptionRange(startAt, endAt);
		if (rangeErr) {
			exFormError = rangeErr;
			return;
		}
		if (!exPractitioner || !exService || !exType) {
			exFormError = 'Praticien, service et type sont obligatoires.';
			return;
		}
		exSaving = true;
		try {
			if (editingException) {
				await updateScheduleException(editingException.id, {
					serviceId: Number(exService),
					type: exType,
					startAt,
					endAt,
					reason: exReason
				});
				success = 'Exception mise à jour.';
			} else {
				await createScheduleException({
					practitionerId: Number(exPractitioner),
					serviceId: Number(exService),
					type: exType,
					startAt,
					endAt,
					reason: exReason || undefined
				});
				success = isPositiveExceptionType(exType)
					? 'Disponibilité supplémentaire créée.'
					: 'Indisponibilité créée.';
			}
			exceptionModalOpen = false;
			await loadExceptions();
		} catch (e) {
			exFormError = mapErr(e, 'Enregistrement impossible.');
		} finally {
			exSaving = false;
		}
	}

	function askCancelException(id: number) {
		pendingCancelExceptionId = id;
		confirmCancelExceptionOpen = true;
	}

	async function confirmCancelException() {
		if (pendingCancelExceptionId == null) return;
		error = '';
		try {
			await cancelScheduleException(pendingCancelExceptionId);
			success = 'Exception annulée.';
			await loadExceptions();
		} catch (e) {
			error = mapErr(e, 'Annulation impossible.');
		} finally {
			pendingCancelExceptionId = null;
		}
	}

	function openCreateType() {
		editingType = null;
		typeCode = '';
		typeName = '';
		typeDuration = '30';
		typeService = '';
		typeClearService = false;
		typeFormError = '';
		typeModalOpen = true;
	}

	function openEditType(row: AppointmentType) {
		editingType = row;
		typeCode = row.code;
		typeName = row.name;
		typeDuration = String(row.defaultDurationMinutes);
		typeService = row.serviceId != null ? String(row.serviceId) : '';
		typeClearService = false;
		typeFormError = '';
		typeModalOpen = true;
	}

	async function saveType() {
		typeFormError = '';
		const name = typeName.trim();
		if (!name) {
			typeFormError = 'Le nom est obligatoire.';
			return;
		}
		const duration = Number(typeDuration);
		const durationErr = validateAppointmentTypeDuration(duration);
		if (durationErr) {
			typeFormError = durationErr;
			return;
		}
		typeSaving = true;
		try {
			if (editingType) {
				const body: UpdateAppointmentTypeRequest = {
					name,
					defaultDurationMinutes: duration
				};
				if (typeClearService) {
					body.clearServiceId = true;
				} else if (typeService) {
					body.serviceId = Number(typeService);
				}
				await updateAppointmentType(editingType.id, body);
				success = 'Type de rendez-vous mis à jour.';
			} else {
				const code = typeCode.trim();
				if (!code) {
					typeFormError = 'Le code est obligatoire.';
					return;
				}
				await createAppointmentType({
					code,
					name,
					defaultDurationMinutes: duration,
					serviceId: typeService ? Number(typeService) : null
				});
				success = 'Type de rendez-vous créé.';
			}
			typeModalOpen = false;
			await loadAppointmentTypes();
		} catch (e) {
			typeFormError = mapErr(e, 'Enregistrement impossible.');
		} finally {
			typeSaving = false;
		}
	}

	function askDisableType(id: number) {
		pendingDisableTypeId = id;
		confirmDisableTypeOpen = true;
	}

	async function confirmDisableType() {
		if (pendingDisableTypeId == null) return;
		error = '';
		try {
			await disableAppointmentType(pendingDisableTypeId);
			success = 'Type de rendez-vous désactivé.';
			await loadAppointmentTypes();
		} catch (e) {
			error = mapErr(e, 'Désactivation impossible.');
		} finally {
			pendingDisableTypeId = null;
		}
	}

	async function reactivateType(row: AppointmentType) {
		error = '';
		try {
			await updateAppointmentType(row.id, { active: true });
			success = 'Type de rendez-vous réactivé.';
			await loadAppointmentTypes();
		} catch (e) {
			error = mapErr(e, 'Réactivation impossible.');
		}
	}
</script>

{#if accessDenied}
	<AccessDenied />
{:else}
	<div class="space-y-6" data-testid="schedule-admin-page">
		<PageHeader
			eyebrow="Administration"
			title="Plannings médicaux"
			description="Horaires récurrents, exceptions (absences / disponibilités supplémentaires) et types de rendez-vous. Fuseau Scheduling : {SCHEDULE_ADMIN_TIMEZONE}."
		>
			{#snippet meta()}
				<p class="text-xs text-slate-500" data-testid="schedule-admin-timezone">
					Fuseau : {SCHEDULE_ADMIN_TIMEZONE} — horaires wall-clock locaux ; exceptions en instants absolus.
				</p>
			{/snippet}
			{#snippet actions()}
				{#if canManage && !loading && tabValue === 'schedules'}
					<Button data-testid="schedule-admin-create" onclick={() => void openCreateSchedule()}
						>Nouvel horaire</Button
					>
				{/if}
				{#if canManage && !loading && tabValue === 'exceptions'}
					<Button
						data-testid="schedule-admin-exception-create"
						onclick={() => void openCreateException()}>Nouvelle exception</Button
					>
				{/if}
				{#if canManageTypes && !loading && tabValue === 'types'}
					<Button data-testid="schedule-admin-type-create" onclick={openCreateType}
						>Nouveau type</Button
					>
				{/if}
			{/snippet}
		</PageHeader>

		{#if error}
			<Alert tone="danger" title="Erreur">{error}</Alert>
		{/if}
		{#if success}
			<Alert tone="success" title="Succès">{success}</Alert>
		{/if}
		{#if (tabValue === 'schedules' || tabValue === 'exceptions') && !canManage && canReadSchedules}
			<Alert tone="info" title="Lecture seule"
				>Vous pouvez consulter les plannings. La modification nécessite schedule.manage.service ou
				schedule.manage.all.</Alert
			>
		{/if}
		{#if tabValue === 'types' && !canManageTypes}
			<div data-testid="schedule-admin-types-readonly">
				<Alert tone="info" title="Lecture seule"
					>Vous pouvez consulter les types de rendez-vous. La modification nécessite
					appointment_type.manage.</Alert
				>
			</div>
		{/if}

		<Tabs {tabs} bind:value={tabValue} />

		{#if loading}
			<LoadingState label="Chargement des plannings…" />
		{:else if tabValue === 'schedules'}
			<section class="space-y-4" data-testid="schedule-admin-schedules">
				<FilterBar>
					<Select
						bind:value={filterPractitioner}
						aria-label="Filtrer praticien"
						data-testid="schedule-filter-practitioner"
						onchange={() => void loadSchedules()}
					>
						<option value="">Tous les praticiens</option>
						{#each staffOptions as s (s.userId)}
							<option value={String(s.userId)}>{s.label}</option>
						{/each}
					</Select>
					<Select
						bind:value={filterService}
						aria-label="Filtrer service"
						data-testid="schedule-filter-service"
						onchange={() => void loadSchedules()}
					>
						<option value="">Tous les services</option>
						{#each services as s (s.id)}
							<option value={String(s.id)}>{s.name}</option>
						{/each}
					</Select>
					<Select
						bind:value={filterWeekday}
						aria-label="Filtrer jour"
						data-testid="schedule-filter-weekday"
						onchange={() => void loadSchedules()}
					>
						<option value="">Tous les jours</option>
						{#each WEEKDAY_OPTIONS as w (w.value)}
							<option value={String(w.value)}>{w.label}</option>
						{/each}
					</Select>
					<Select
						bind:value={filterActive}
						aria-label="Filtrer actif"
						data-testid="schedule-filter-active"
						onchange={() => void loadSchedules()}
					>
						<option value="">Tous</option>
						<option value="true">Actifs</option>
						<option value="false">Inactifs</option>
					</Select>
				</FilterBar>

				{#if schedules.length === 0}
					<EmptyState
						title="Aucun horaire"
						description="Aucun créneau récurrent pour ces filtres."
					/>
				{:else}
					<div class="overflow-x-auto rounded-2xl border border-border bg-white">
						<table class="min-w-full text-left text-sm" data-testid="schedule-admin-table">
							<thead class="border-b bg-slate-50 text-xs uppercase text-slate-500">
								<tr>
									<th class="px-4 py-3">Praticien</th>
									<th class="px-4 py-3">Service</th>
									<th class="px-4 py-3">Jour</th>
									<th class="px-4 py-3">Horaires</th>
									<th class="px-4 py-3">Validité</th>
									<th class="px-4 py-3">Statut</th>
									{#if canManage}<th class="px-4 py-3">Actions</th>{/if}
								</tr>
							</thead>
							<tbody>
								{#each schedules as row (row.id)}
									<tr
										class="border-b last:border-0"
										data-testid="schedule-row"
										data-schedule-id={row.id}
									>
										<td class="px-4 py-3">{staffLabel(row.practitionerId)}</td>
										<td class="px-4 py-3">{serviceLabel(row.serviceId)}</td>
										<td class="px-4 py-3">{weekdayLabel(row.weekday)}</td>
										<td class="px-4 py-3 font-medium">
											{formatWallClockDisplay(row.startTime)}–{formatWallClockDisplay(row.endTime)}
										</td>
										<td class="px-4 py-3 text-slate-600">
											{rfc3339DateToInput(row.validFrom)}
											{#if row.validUntil}
												→ {rfc3339DateToInput(row.validUntil)}
											{:else}
												→ ∞
											{/if}
										</td>
										<td class="px-4 py-3">{row.active ? 'Actif' : 'Inactif'}</td>
										{#if canManage}
											<td class="px-4 py-3">
												<div class="flex flex-wrap gap-2">
													<Button
														variant="secondary"
														data-testid="schedule-row-edit"
														onclick={() => void openEditSchedule(row)}>Modifier</Button
													>
													{#if row.active}
														<Button
															variant="ghost"
															data-testid="schedule-row-disable"
															onclick={() => askDisableSchedule(row.id)}>Désactiver</Button
														>
													{/if}
												</div>
											</td>
										{/if}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</section>
		{:else if tabValue === 'exceptions'}
			<section class="space-y-4" data-testid="schedule-admin-exceptions">
				<FilterBar>
					<Select
						bind:value={exFilterPractitioner}
						aria-label="Filtrer praticien exception"
						data-testid="exception-filter-practitioner"
						onchange={() => void loadExceptions()}
					>
						<option value="">Tous les praticiens</option>
						{#each staffOptions as s (s.userId)}
							<option value={String(s.userId)}>{s.label}</option>
						{/each}
					</Select>
					<Select
						bind:value={exFilterService}
						aria-label="Filtrer service exception"
						data-testid="exception-filter-service"
						onchange={() => void loadExceptions()}
					>
						<option value="">Tous les services</option>
						{#each services as s (s.id)}
							<option value={String(s.id)}>{s.name}</option>
						{/each}
					</Select>
					<Select
						bind:value={exFilterType}
						aria-label="Filtrer type"
						data-testid="exception-filter-type"
						onchange={() => void loadExceptions()}
					>
						<option value="">Tous les types</option>
						{#each EXCEPTION_TYPE_OPTIONS as t (t.value)}
							<option value={t.value}>{t.label}</option>
						{/each}
					</Select>
					<Select
						bind:value={exFilterActive}
						aria-label="Filtrer actif exception"
						data-testid="exception-filter-active"
						onchange={() => void loadExceptions()}
					>
						<option value="">Tous</option>
						<option value="true">Actives</option>
						<option value="false">Annulées</option>
					</Select>
				</FilterBar>

				{#if exceptions.length === 0}
					<EmptyState
						title="Aucune exception"
						description="Aucune exception sur la fenêtre à venir (~60 jours)."
					/>
				{:else}
					<ul class="space-y-2" data-testid="schedule-exception-list">
						{#each exceptions as row (row.id)}
							<li
								class="rounded-2xl border px-4 py-3 {isPositiveExceptionType(row.type)
									? 'border-emerald-200 bg-emerald-50/40'
									: 'border-amber-200 bg-amber-50/40'}"
								data-testid="exception-row"
								data-exception-id={row.id}
								data-exception-polarity={isPositiveExceptionType(row.type)
									? 'positive'
									: 'negative'}
							>
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div>
										<p class="font-semibold text-slate-900">
											{exceptionTypeLabel(row.type)}
											<span class="ml-2 text-xs font-normal text-slate-500"
												>{isPositiveExceptionType(row.type)
													? 'Disponibilité +'
													: 'Indisponibilité'}</span
											>
										</p>
										<p class="mt-1 text-sm text-slate-600">
											{staffLabel(row.practitionerId)} · {serviceLabel(row.serviceId)}
										</p>
										<p class="mt-1 text-xs text-slate-500">
											{formatAgendaDateTime(row.startAt, SCHEDULE_ADMIN_TIMEZONE)} →
											{formatAgendaDateTime(row.endAt, SCHEDULE_ADMIN_TIMEZONE)}
										</p>
										{#if row.reason}
											<p class="mt-1 text-sm text-slate-700">{row.reason}</p>
										{/if}
										<p class="mt-1 text-xs text-slate-500">
											{row.active ? 'Active' : 'Annulée'}
										</p>
									</div>
									{#if canManage && row.active}
										<div class="flex flex-wrap gap-2">
											<Button
												variant="secondary"
												data-testid="exception-row-edit"
												onclick={() => void openEditException(row)}>Modifier</Button
											>
											<Button
												variant="ghost"
												data-testid="exception-row-cancel"
												onclick={() => askCancelException(row.id)}>Annuler</Button
											>
										</div>
									{/if}
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{:else if tabValue === 'types'}
			<section class="space-y-4" data-testid="schedule-admin-types">
				<FilterBar>
					<Select
						bind:value={typeFilterActive}
						aria-label="Filtrer actif type"
						data-testid="type-filter-active"
						onchange={() => void loadAppointmentTypes()}
					>
						<option value="">Tous</option>
						<option value="true">Actifs</option>
						<option value="false">Inactifs</option>
					</Select>
					<Select
						bind:value={typeFilterService}
						aria-label="Filtrer service type"
						data-testid="type-filter-service"
						onchange={() => void loadAppointmentTypes()}
					>
						<option value="">Tous les services</option>
						{#each services as s (s.id)}
							<option value={String(s.id)}>{s.name}</option>
						{/each}
					</Select>
				</FilterBar>

				{#if appointmentTypes.length === 0}
					<EmptyState
						title="Aucun type de rendez-vous"
						description="Aucun type pour ces filtres."
					/>
				{:else}
					<div class="overflow-x-auto rounded-2xl border border-border bg-white">
						<table class="min-w-full text-left text-sm" data-testid="schedule-admin-type-table">
							<thead class="border-b bg-slate-50 text-xs uppercase text-slate-500">
								<tr>
									<th class="px-4 py-3">Code</th>
									<th class="px-4 py-3">Nom</th>
									<th class="px-4 py-3">Durée</th>
									<th class="px-4 py-3">Service</th>
									<th class="px-4 py-3">Actif</th>
									{#if canManageTypes}<th class="px-4 py-3">Actions</th>{/if}
								</tr>
							</thead>
							<tbody>
								{#each appointmentTypes as row (row.id)}
									<tr class="border-b last:border-0" data-testid="type-row" data-type-id={row.id}>
										<td class="px-4 py-3 font-medium">{row.code}</td>
										<td class="px-4 py-3">{row.name}</td>
										<td class="px-4 py-3">{row.defaultDurationMinutes} min</td>
										<td class="px-4 py-3">
											{row.serviceId != null ? serviceLabel(row.serviceId) : 'Global'}
										</td>
										<td class="px-4 py-3">{row.active ? 'Actif' : 'Inactif'}</td>
										{#if canManageTypes}
											<td class="px-4 py-3">
												<div class="flex flex-wrap gap-2">
													<Button
														variant="secondary"
														data-testid="type-row-edit"
														onclick={() => openEditType(row)}>Modifier</Button
													>
													{#if row.active}
														<Button
															variant="ghost"
															data-testid="type-row-disable"
															onclick={() => askDisableType(row.id)}>Désactiver</Button
														>
													{:else}
														<Button
															variant="ghost"
															data-testid="type-row-reactivate"
															onclick={() => void reactivateType(row)}>Réactiver</Button
														>
													{/if}
												</div>
											</td>
										{/if}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</section>
		{/if}
	</div>

	<Modal
		bind:open={scheduleModalOpen}
		title={editingSchedule ? 'Modifier l’horaire' : 'Nouvel horaire récurrent'}
	>
		<div class="space-y-3" data-testid="schedule-form">
			{#if schedFormError}
				<Alert tone="danger" title="Erreur">{schedFormError}</Alert>
			{/if}
			<label class="block text-sm">
				<span class="font-medium">Praticien</span>
				{#if formStaffOptions.length > 0}
					<select
						class="mt-1 w-full rounded-xl border px-3 py-2"
						bind:value={schedPractitioner}
						disabled={Boolean(editingSchedule)}
						data-testid="schedule-form-practitioner"
					>
						<option value="">—</option>
						{#each formStaffOptions as s (s.userId)}
							<option value={String(s.userId)}>{s.label}</option>
						{/each}
					</select>
				{:else}
					<input
						type="number"
						min="1"
						class="mt-1 w-full rounded-xl border px-3 py-2"
						bind:value={schedPractitioner}
						disabled={Boolean(editingSchedule)}
						data-testid="schedule-form-practitioner"
						placeholder="ID utilisateur praticien"
					/>
				{/if}
			</label>
			<label class="block text-sm">
				<span class="font-medium">Service</span>
				<select
					class="mt-1 w-full rounded-xl border px-3 py-2"
					bind:value={schedService}
					data-testid="schedule-form-service"
					onchange={() => void onScheduleServiceChange()}
				>
					<option value="">—</option>
					{#each services as s (s.id)}
						<option value={String(s.id)}>{s.name}</option>
					{/each}
				</select>
			</label>
			<label class="block text-sm">
				<span class="font-medium">Jour (obligatoire)</span>
				<select
					class="mt-1 w-full rounded-xl border px-3 py-2"
					bind:value={schedWeekday}
					data-testid="schedule-form-weekday"
				>
					{#each WEEKDAY_OPTIONS as w (w.value)}
						<option value={String(w.value)}>{w.label}</option>
					{/each}
				</select>
			</label>
			<div class="grid grid-cols-2 gap-3">
				<label class="block text-sm">
					<span class="font-medium">Début (wall-clock)</span>
					<input
						type="time"
						class="mt-1 w-full rounded-xl border px-3 py-2"
						bind:value={schedStart}
						data-testid="schedule-form-start"
					/>
				</label>
				<label class="block text-sm">
					<span class="font-medium">Fin (exclusive)</span>
					<input
						type="time"
						class="mt-1 w-full rounded-xl border px-3 py-2"
						bind:value={schedEnd}
						data-testid="schedule-form-end"
					/>
				</label>
			</div>
			<div class="grid grid-cols-2 gap-3">
				<label class="block text-sm">
					<span class="font-medium">Valide depuis</span>
					<input
						type="date"
						class="mt-1 w-full rounded-xl border px-3 py-2"
						bind:value={schedValidFrom}
						data-testid="schedule-form-valid-from"
					/>
				</label>
				<label class="block text-sm">
					<span class="font-medium">Valide jusqu’au (optionnel)</span>
					<input
						type="date"
						class="mt-1 w-full rounded-xl border px-3 py-2"
						bind:value={schedValidUntil}
						data-testid="schedule-form-valid-until"
					/>
				</label>
			</div>
			<div class="flex justify-end gap-2 pt-2">
				<Button variant="secondary" onclick={() => (scheduleModalOpen = false)}>Fermer</Button>
				<Button
					data-testid="schedule-form-submit"
					disabled={schedSaving}
					onclick={() => void saveSchedule()}
					>{schedSaving ? 'Enregistrement…' : 'Enregistrer'}</Button
				>
			</div>
		</div>
	</Modal>

	<Modal
		bind:open={exceptionModalOpen}
		title={editingException ? 'Modifier l’exception' : 'Nouvelle exception'}
	>
		<div class="space-y-3" data-testid="exception-form">
			{#if exFormError}
				<Alert tone="danger" title="Erreur">{exFormError}</Alert>
			{/if}
			<label class="block text-sm">
				<span class="font-medium">Praticien</span>
				{#if formStaffOptions.length > 0}
					<select
						class="mt-1 w-full rounded-xl border px-3 py-2"
						bind:value={exPractitioner}
						disabled={Boolean(editingException)}
						data-testid="exception-form-practitioner"
					>
						<option value="">—</option>
						{#each formStaffOptions as s (s.userId)}
							<option value={String(s.userId)}>{s.label}</option>
						{/each}
					</select>
				{:else}
					<input
						type="number"
						min="1"
						class="mt-1 w-full rounded-xl border px-3 py-2"
						bind:value={exPractitioner}
						disabled={Boolean(editingException)}
						data-testid="exception-form-practitioner"
						placeholder="ID utilisateur praticien"
					/>
				{/if}
			</label>
			<label class="block text-sm">
				<span class="font-medium">Service</span>
				<select
					class="mt-1 w-full rounded-xl border px-3 py-2"
					bind:value={exService}
					data-testid="exception-form-service"
					onchange={() => void onExceptionServiceChange()}
				>
					<option value="">—</option>
					{#each services as s (s.id)}
						<option value={String(s.id)}>{s.name}</option>
					{/each}
				</select>
			</label>
			<label class="block text-sm">
				<span class="font-medium">Type</span>
				<select
					class="mt-1 w-full rounded-xl border px-3 py-2"
					bind:value={exType}
					data-testid="exception-form-type"
				>
					{#each EXCEPTION_TYPE_OPTIONS as t (t.value)}
						<option value={t.value}>{t.label}</option>
					{/each}
				</select>
			</label>
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<label class="block text-sm">
					<span class="font-medium">Début (absolu)</span>
					<input
						type="datetime-local"
						class="mt-1 w-full rounded-xl border px-3 py-2"
						bind:value={exStart}
						data-testid="exception-form-start"
					/>
				</label>
				<label class="block text-sm">
					<span class="font-medium">Fin (exclusive)</span>
					<input
						type="datetime-local"
						class="mt-1 w-full rounded-xl border px-3 py-2"
						bind:value={exEnd}
						data-testid="exception-form-end"
					/>
				</label>
			</div>
			<label class="block text-sm">
				<span class="font-medium">Motif</span>
				<textarea
					class="mt-1 w-full rounded-xl border px-3 py-2"
					rows="2"
					bind:value={exReason}
					data-testid="exception-form-reason"></textarea>
			</label>
			<div class="flex justify-end gap-2 pt-2">
				<Button variant="secondary" onclick={() => (exceptionModalOpen = false)}>Fermer</Button>
				<Button
					data-testid="exception-form-submit"
					disabled={exSaving}
					onclick={() => void saveException()}
					>{exSaving ? 'Enregistrement…' : 'Enregistrer'}</Button
				>
			</div>
		</div>
	</Modal>

	<Modal
		bind:open={typeModalOpen}
		title={editingType ? 'Modifier le type de rendez-vous' : 'Nouveau type de rendez-vous'}
	>
		<div class="space-y-3" data-testid="type-form">
			{#if typeFormError}
				<Alert tone="danger" title="Erreur">{typeFormError}</Alert>
			{/if}
			<label class="block text-sm">
				<span class="font-medium">Code</span>
				<input
					type="text"
					class="mt-1 w-full rounded-xl border px-3 py-2 {editingType
						? 'bg-slate-50 text-slate-700'
						: ''}"
					bind:value={typeCode}
					readonly={Boolean(editingType)}
					data-testid="type-form-code"
				/>
			</label>
			<label class="block text-sm">
				<span class="font-medium">Nom</span>
				<input
					type="text"
					class="mt-1 w-full rounded-xl border px-3 py-2"
					bind:value={typeName}
					data-testid="type-form-name"
				/>
			</label>
			<label class="block text-sm">
				<span class="font-medium">Durée (minutes)</span>
				<input
					type="number"
					min={APPOINTMENT_TYPE_MIN_DURATION_MINUTES}
					max={APPOINTMENT_TYPE_MAX_DURATION_MINUTES}
					class="mt-1 w-full rounded-xl border px-3 py-2"
					bind:value={typeDuration}
					data-testid="type-form-duration"
				/>
			</label>
			<label class="block text-sm">
				<span class="font-medium">Service</span>
				<select
					class="mt-1 w-full rounded-xl border px-3 py-2"
					bind:value={typeService}
					disabled={typeClearService}
					data-testid="type-form-service"
				>
					<option value="">Global</option>
					{#each services as s (s.id)}
						<option value={String(s.id)}>{s.name}</option>
					{/each}
				</select>
			</label>
			{#if editingType}
				<label class="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						bind:checked={typeClearService}
						data-testid="type-form-clear-service"
					/>
					<span>Retirer le service (rendre global)</span>
				</label>
			{/if}
			<div class="flex justify-end gap-2 pt-2">
				<Button variant="secondary" onclick={() => (typeModalOpen = false)}>Fermer</Button>
				<Button data-testid="type-form-submit" disabled={typeSaving} onclick={() => void saveType()}
					>{typeSaving ? 'Enregistrement…' : 'Enregistrer'}</Button
				>
			</div>
		</div>
	</Modal>

	<ConfirmDialog
		bind:open={confirmDisableScheduleOpen}
		title="Désactiver cet horaire ?"
		description="Le créneau récurrent sera désactivé (soft-disable). Les rendez-vous existants ne sont pas modifiés."
		confirmLabel="Désactiver"
		danger={true}
		onconfirm={() => void confirmDisableSchedule()}
	/>
	<ConfirmDialog
		bind:open={confirmCancelExceptionOpen}
		title="Annuler cette exception ?"
		description="L’exception sera annulée (active=false). La disponibilité dérivée suivra le moteur backend."
		confirmLabel="Annuler l’exception"
		danger={true}
		onconfirm={() => void confirmCancelException()}
	/>
	<ConfirmDialog
		bind:open={confirmDisableTypeOpen}
		title="Désactiver ce type de rendez-vous ?"
		description="Le type sera désactivé (soft-disable). Les rendez-vous existants ne sont pas modifiés."
		confirmLabel="Désactiver"
		danger={true}
		onconfirm={() => void confirmDisableType()}
	/>
{/if}
