<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import {
		Activity,
		BadgeCheck,
		CreditCard,
		FileText,
		HeartPulse,
		Hospital,
		ListOrdered,
		Pill,
		Shield,
		Users
	} from 'lucide-svelte';

	import { getDashboard } from '$lib/api/dashboard';
	import { getTicketDailyFlow, getTicketKPIs } from '$lib/api/ticketing';
	import {
		getAppointmentDaily,
		getAppointmentStats,
		getPlannedHoursByStaff,
		getQueueDailyFlow,
		getQueueKPIs
	} from '$lib/api/queue';
	import type { DashboardFilters } from '$lib/api/dashboard';
	import type { DailyTicketFlow, TicketKPIs } from '$lib/types/ticketing';
	import type {
		AppointmentStats,
		DailyAppointments,
		DailyQueueFlow,
		QueueKPIs,
		StaffPlannedHours
	} from '$lib/types/queue';
	import {
		periodLabel as formatPeriodLabel,
		toApiRange,
		todayCivilDate,
		validatePeriod
	} from '$lib/components/dashboard/period';
	import { canReadAgenda } from '$lib/components/agenda/state';
	import ActivityTimeline from '$lib/components/dashboard/ActivityTimeline.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import DonutChart from '$lib/components/ui/DonutChart.svelte';
	import LineChart from '$lib/components/ui/LineChart.svelte';
	import RankedBarList from '$lib/components/ui/RankedBarList.svelte';
	import SegmentedBar from '$lib/components/ui/SegmentedBar.svelte';
	import StackedBarChart from '$lib/components/ui/StackedBarChart.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import LinkButton from '$lib/components/ui/LinkButton.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import AccessDenied from '$lib/components/rbac/AccessDenied.svelte';
	import type { DashboardResponse } from '$lib/types/dashboard';
	import ProcessItem from '$lib/components/dashboard/ProcessItem.svelte';
	import WorkflowStats from '$lib/components/dashboard/WorkflowStats.svelte';
	import ServiceSelect from '$lib/components/organization/ServiceSelect.svelte';
	import {
		can,
		getStoredPermissions,
		isAccessDeniedError,
		resolveUserErrorMessage
	} from '$lib/rbac/permissions';

	let dashboard = $state<DashboardResponse | null>(null);
	let loading = $state(true);
	let error = $state('');
	let accessDenied = $state(false);

	let selectedServiceId = $state<number | null>(null);
	// Période civile choisie : « Du » et « Au » inclus (défaut : aujourd'hui).
	let selectedFrom = $state(todayCivilDate());
	let selectedTo = $state(todayCivilDate());
	let periodError = $state('');
	let dashboardFilterLoading = $state(false);

	let ticketKpis = $state<TicketKPIs | null>(null);
	let ticketKpisLoading = $state(false);
	let ticketKpisError = $state(false);
	let canReadTicketing = $state(false);

	let queueKpis = $state<QueueKPIs | null>(null);
	let queueKpisLoading = $state(false);
	let queueKpisError = $state(false);
	let canReadQueue = $state(false);

	let appointmentStats = $state<AppointmentStats | null>(null);
	let appointmentsLoading = $state(false);
	let appointmentsError = $state(false);
	let canReadAppointments = $state(false);

	// Séries journalières : un échec n'empêche pas l'affichage des indicateurs.
	let queueFlow = $state<DailyQueueFlow[] | null>(null);
	let appointmentDaily = $state<DailyAppointments[] | null>(null);
	let queueFlowError = $state(false);
	let appointmentDailyError = $state(false);

	let ticketFlow = $state<DailyTicketFlow[]>([]);
	let ticketFlowLoading = $state(false);
	let ticketFlowError = $state(false);

	let plannedStaff = $state<StaffPlannedHours[]>([]);
	let plannedHoursLoading = $state(false);
	let plannedHoursError = $state(false);
	let canReadPlanning = $state(false);

	function currentFilters(): DashboardFilters {
		return {
			serviceId: selectedServiceId ?? undefined,
			...toApiRange(selectedFrom, selectedTo)
		};
	}

	// Recharge chaque bloc avec le même filtre, selon les permissions de l'utilisateur.
	async function loadPeriodData(): Promise<void> {
		const filters = currentFilters();

		if (canReadTicketing) {
			ticketKpisLoading = true;
			ticketKpisError = false;
			void getTicketKPIs(filters)
				.then((data) => (ticketKpis = data))
				.catch(() => (ticketKpisError = true))
				.finally(() => (ticketKpisLoading = false));

			ticketFlowLoading = true;
			ticketFlowError = false;
			void getTicketDailyFlow(filters)
				.then((data) => (ticketFlow = data))
				.catch(() => (ticketFlowError = true))
				.finally(() => (ticketFlowLoading = false));
		}

		if (canReadPlanning) {
			plannedHoursLoading = true;
			plannedHoursError = false;
			void getPlannedHoursByStaff(filters)
				.then((data) => (plannedStaff = data))
				.catch(() => (plannedHoursError = true))
				.finally(() => (plannedHoursLoading = false));
		}

		if (canReadAppointments) {
			appointmentsLoading = true;
			appointmentsError = false;
			void getAppointmentStats(filters)
				.then((data) => (appointmentStats = data))
				.catch(() => (appointmentsError = true))
				.finally(() => (appointmentsLoading = false));

			appointmentDaily = null;
			appointmentDailyError = false;
			void getAppointmentDaily(filters)
				.then((data) => (appointmentDaily = data))
				.catch(() => (appointmentDailyError = true));
		}

		if (canReadQueue) {
			queueKpisLoading = true;
			queueKpisError = false;
			void getQueueKPIs(filters)
				.then((data) => (queueKpis = data))
				.catch(() => (queueKpisError = true))
				.finally(() => (queueKpisLoading = false));

			queueFlow = null;
			queueFlowError = false;
			void getQueueDailyFlow(filters)
				.then((data) => (queueFlow = data))
				.catch(() => (queueFlowError = true));
		}

		dashboard = await getDashboard(filters);
	}

	async function refreshDashboardFilters() {
		if (!dashboard) return;

		const validation = validatePeriod(selectedFrom, selectedTo);
		if (!validation.ok) {
			periodError = validation.message;
			return;
		}
		periodError = '';
		dashboardFilterLoading = true;

		try {
			await loadPeriodData();
			error = '';
		} catch (e) {
			error = resolveUserErrorMessage(e, 'Impossible d’appliquer les filtres du dashboard.');
		} finally {
			dashboardFilterLoading = false;
		}
	}

	const periodLabel = $derived(formatPeriodLabel(selectedFrom, selectedTo));

	const ticketFlowSeries = $derived([
		{ label: 'Créés', tone: 'primary' as const, values: ticketFlow.map((d) => d.created) },
		{
			label: 'Résolus',
			tone: 'success' as const,
			dashed: true,
			values: ticketFlow.map((d) => d.resolved)
		}
	]);
	const queueFlowSeries = $derived([
		{ label: 'Arrivés', tone: 'primary' as const, values: (queueFlow ?? []).map((d) => d.arrived) },
		{
			label: 'Terminés',
			tone: 'success' as const,
			dashed: true,
			values: (queueFlow ?? []).map((d) => d.completed)
		}
	]);

	// Statuts empilés du bas vers le haut ; « En cours » = arrivés/check-in + en consultation.
	const appointmentSeries = $derived(
		(() => {
			const days = appointmentDaily ?? [];
			return [
				{ label: 'Terminés', tone: 'success' as const, values: days.map((d) => d.completed) },
				{
					label: 'En cours',
					tone: 'warning' as const,
					values: days.map((d) => d.arrived + d.inProgress)
				},
				{ label: 'Programmés', tone: 'primary' as const, values: days.map((d) => d.scheduled) },
				{ label: 'Absents', tone: 'danger' as const, values: days.map((d) => d.noShow) },
				{ label: 'Annulés', tone: 'neutral' as const, values: days.map((d) => d.cancelled) }
			];
		})()
	);

	const percentOf = (part: number, total: number) =>
		total > 0 ? `${Math.round((part / total) * 100)} %` : '—';

	const ticketFlowEmpty = $derived(ticketFlow.every((d) => d.created === 0 && d.resolved === 0));
	const plannedHoursTotal = $derived(plannedStaff.reduce((sum, p) => sum + p.hours, 0));

	// Bandeau : chiffres réels de la période et du service sélectionnés.
	const heroChips = $derived(
		dashboard
			? [
					`${dashboard.patientsSeen.toLocaleString('fr-FR')} patients vus`,
					`${dashboard.consultations.toLocaleString('fr-FR')} consultations`,
					`${dashboard.vouchers.toLocaleString('fr-FR')} bons PEC`,
					`${dashboard.billedAmount.toLocaleString('fr-FR')} FCFA facturés`
				]
			: []
	);

	interface StatCard {
		label: string;
		value: number | null;
		hint: string;
		icon: typeof Users;
		tone: 'primary' | 'success' | 'info' | 'warning' | 'danger';
	}

	// Activité réelle de la période/service sélectionnés (API /api/dashboard).
	const activityCards: StatCard[] = $derived(
		dashboard
			? [
					{
						label: 'Consultations',
						value: dashboard.consultations,
						hint: 'Consultations',
						icon: HeartPulse,
						tone: 'primary'
					},
					{
						label: 'Patients vus',
						value: dashboard.patientsSeen,
						hint: 'Patients distincts consultés',
						icon: Users,
						tone: 'success'
					},
					{
						label: 'Hospitalisations',
						value: dashboard.hospitalizations,
						hint: 'Admissions',
						icon: Hospital,
						tone: 'info'
					},
					{
						label: 'Achats pharmacie',
						value: dashboard.pharmacyPurchases,
						hint: 'Ordonnances délivrées',
						icon: Pill,
						tone: 'warning'
					},
					{
						label: 'Tickets file d’attente',
						value: dashboard.queueTickets,
						hint: 'Hors annulés',
						icon: ListOrdered,
						tone: 'danger'
					}
				]
			: []
	);

	// Créances et remboursements de la période/service.
	const financeDonutRows = $derived(
		dashboard
			? [
					{
						label: 'Patients',
						value: dashboard.patientReceivables,
						tone: 'primary' as const,
						hint: 'Factures à solde patient dû'
					},
					{
						label: 'Assurances',
						value: dashboard.insuranceReceivables,
						tone: 'info' as const,
						hint: 'Factures à part assurance due'
					},
					{
						label: 'Remboursements',
						value: dashboard.refunds,
						tone: 'success' as const,
						hint: 'Remboursements exécutés',
						nullLabel: 'Non ventilés par service'
					}
				]
			: []
	);

	// Actes réalisés (plateau technique) de la période/service.
	const examDonutRows = $derived(
		dashboard
			? [
					{
						label: 'Laboratoire',
						value: dashboard.labExams,
						tone: 'primary' as const,
						hint: 'Examens de biologie'
					},
					{
						label: 'Imageries',
						value: dashboard.imagingExams,
						tone: 'info' as const,
						hint: 'Radio, écho, scanner'
					},
					{
						label: 'Autres actes',
						value: dashboard.otherActs,
						tone: 'warning' as const,
						hint: 'Procédures et autres actes'
					}
				]
			: []
	);

	onMount(async () => {
		const perms = getStoredPermissions();
		canReadTicketing = can(perms, 'ticket.read.service') || can(perms, 'ticket.read.all');

		canReadQueue =
			can(perms, 'queue.reception.read') ||
			can(perms, 'queue.triage.read') ||
			can(perms, 'queue.doctor.read') ||
			can(perms, 'queue.read.service') ||
			can(perms, 'queue.read.all');

		canReadAppointments = can(perms, 'queue.reception.read');

		canReadPlanning =
			can(perms, 'schedule.read.service') ||
			can(perms, 'schedule.read.all') ||
			can(perms, 'schedule.manage.service') ||
			can(perms, 'schedule.manage.all');

		if (!can(perms, 'dashboard.read')) {
			accessDenied = true;
			loading = false;
			return;
		}
		try {
			await loadPeriodData();
		} catch (e) {
			if (isAccessDeniedError(e)) accessDenied = true;
			else error = resolveUserErrorMessage(e, 'Impossible de charger le dashboard.');
		} finally {
			loading = false;
		}
	});
</script>

{#snippet statCard(card: StatCard)}
	{@const Icon = card.icon}
	{@const toneClasses =
		card.tone === 'success'
			? 'border-success-border bg-success-soft/55'
			: card.tone === 'info'
				? 'border-info-border bg-info-soft/55'
				: card.tone === 'warning'
					? 'border-warning-border bg-warning-soft/55'
					: card.tone === 'danger'
						? 'border-danger-border bg-danger-soft/55'
						: 'border-primary-border bg-primary-soft/55'}
	{@const iconClasses =
		card.tone === 'success'
			? 'bg-success-soft text-success-strong'
			: card.tone === 'info'
				? 'bg-info-soft text-info-strong'
				: card.tone === 'warning'
					? 'bg-warning-soft text-warning-strong'
					: card.tone === 'danger'
						? 'bg-danger-soft text-danger-strong'
						: 'bg-primary-soft text-primary'}
	<div class={`rounded-xl border p-5 shadow-xs transition-shadow hover:shadow-sm ${toneClasses}`}>
		<div class="flex items-center justify-between gap-4">
			<div class="min-w-0">
				<p class="text-sm font-medium text-muted-foreground">{card.label}</p>
				<p class="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
					{card.value?.toLocaleString('fr-FR')}
				</p>
			</div>

			<div class={`flex size-10 shrink-0 items-center justify-center rounded-lg ${iconClasses}`}>
				<Icon class="size-5" aria-hidden="true" />
			</div>
		</div>

		<p class="mt-3 text-xs text-muted-foreground">{card.hint} · {periodLabel}</p>
	</div>
{/snippet}

<svelte:head>
	<title>Command Center | MedCore HIS</title>
</svelte:head>

{#if loading}
	<LoadingState label="Chargement du Command Center…" />
{:else if accessDenied}
	<AccessDenied
		title="Tableau de bord non disponible"
		description="Votre profil n'inclut pas l'accès au tableau de bord exécutif. Utilisez le menu pour accéder à vos modules autorisés."
	/>
{:else if error}
	<Alert tone="danger">{error}</Alert>
{:else if dashboard}
	<div class="space-y-6">
		<section class="rounded-xl border border-border bg-surface p-5 shadow-xs sm:p-6">
			<div class="flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
				<div>
					<p class="text-xs font-semibold uppercase tracking-eyebrow text-primary">
						MedCore Command Center
					</p>

					<h1 class="mt-1.5 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
						Clinique Médicale Saint Raphaël
					</h1>

					<p class="mt-1.5 max-w-3xl text-sm text-muted-foreground">
						Vue exécutive des patients, consultations, assurances et opérations médicales ·
						{periodLabel}.
					</p>

					<div class="mt-4 flex flex-wrap gap-2">
						{#each heroChips as chip (chip)}
							<span
								class="inline-flex items-center rounded-md border border-border bg-surface-muted px-2.5 py-1 text-small text-foreground-secondary tabular-nums"
								>{chip}</span
							>
						{/each}
					</div>
				</div>
			</div>
		</section>

		<section class="rounded-xl border border-border bg-surface p-4 shadow-xs sm:p-5">
			<div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
				<div>
					<p class="text-sm font-semibold text-foreground">Filtres du tableau de bord</p>
					<p class="mt-1 text-xs text-muted-foreground">
						Toutes les cartes suivent le service et la période choisis.
					</p>
					{#if periodError}
						<p class="mt-2 text-xs font-medium text-danger-strong" role="alert">{periodError}</p>
					{/if}
				</div>

				<div class="grid gap-3 sm:grid-cols-3 lg:w-[720px]">
					<div>
						<label
							class="mb-1.5 block text-xs font-medium text-foreground-secondary"
							for="dashboard-service"
						>
							Service
						</label>
						<div id="dashboard-service">
							<ServiceSelect
								bind:value={selectedServiceId}
								capability="consultation"
								placeholder="Tous les services"
								disabled={dashboardFilterLoading}
								onchange={() => void refreshDashboardFilters()}
							/>
						</div>
					</div>

					<div>
						<label
							class="mb-1.5 block text-xs font-medium text-foreground-secondary"
							for="dashboard-from"
						>
							Du
						</label>
						<input
							id="dashboard-from"
							type="date"
							bind:value={selectedFrom}
							max={selectedTo}
							disabled={dashboardFilterLoading}
							onchange={() => void refreshDashboardFilters()}
							class="min-h-control w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground disabled:cursor-wait disabled:opacity-60"
						/>
					</div>
					<div>
						<label
							class="mb-1.5 block text-xs font-medium text-foreground-secondary"
							for="dashboard-to"
						>
							Au (inclus)
						</label>
						<input
							id="dashboard-to"
							type="date"
							bind:value={selectedTo}
							min={selectedFrom}
							disabled={dashboardFilterLoading}
							onchange={() => void refreshDashboardFilters()}
							class="min-h-control w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground disabled:cursor-wait disabled:opacity-60"
						/>
					</div>
				</div>
			</div>
		</section>

		<section
			class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
			aria-label="Activité de la période"
		>
			{#each activityCards as card (card.label)}
				{@render statCard(card)}
			{/each}
		</section>

		<div class="grid gap-6 lg:grid-cols-2">
			<Card title="Créances et remboursements" subtitle={periodLabel} class="min-w-0">
				<DonutChart
					rows={financeDonutRows}
					centerLabel="Total"
					unit="dossiers"
					ariaLabel="Répartition des créances et remboursements"
				/>
			</Card>

			<Card title="Examens réalisés" subtitle={periodLabel} class="min-w-0">
				<DonutChart
					rows={examDonutRows}
					centerLabel="Total"
					unit="examens"
					ariaLabel="Répartition des examens réalisés"
				/>
			</Card>
		</div>

		<div class="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
			{#if canReadQueue}
				<Card
					title="File d’attente patients"
					subtitle={`Flux de la période · ${periodLabel}`}
					class="min-w-0"
				>
					{#if queueKpisLoading}
						<div class="flex min-h-[220px] items-center justify-center">
							<p class="text-sm text-muted-foreground">Chargement de la file patients…</p>
						</div>
					{:else if queueKpisError}
						<div class="flex min-h-[220px] items-center justify-center text-center">
							<p class="max-w-md text-sm text-muted-foreground">
								Les indicateurs de la file patients sont momentanément indisponibles.
							</p>
						</div>
					{:else if queueKpis}
						<div class="space-y-5">
							<div class="grid grid-cols-3 gap-2">
								<div class="rounded-lg border border-primary-border bg-primary-soft px-3 py-3">
									<p class="text-xs font-medium text-primary">Arrivés</p>
									<p class="mt-1 text-2xl font-semibold tabular-nums text-primary">
										{queueKpis.arrivedToday.toLocaleString('fr-FR')}
									</p>
								</div>
								<div class="rounded-lg border border-success-border bg-success-soft px-3 py-3">
									<p class="text-xs font-medium text-success-strong">Terminés</p>
									<p class="mt-1 text-2xl font-semibold tabular-nums text-success-strong">
										{queueKpis.completedToday.toLocaleString('fr-FR')}
									</p>
									<p class="mt-0.5 text-2xs text-muted-foreground">
										{percentOf(queueKpis.completedToday, queueKpis.arrivedToday)} des arrivés
									</p>
								</div>
								<div class="rounded-lg border border-warning-border bg-warning-soft px-3 py-3">
									<p class="text-xs font-medium text-warning-strong">Attente moy.</p>
									<p class="mt-1 text-2xl font-semibold tabular-nums text-warning-strong">
										{Math.round(queueKpis.avgWaitMinutes).toLocaleString('fr-FR')}
										<span class="text-sm font-medium text-muted-foreground">min</span>
									</p>
								</div>
							</div>

							<div data-testid="dashboard-queue-flow">
								<h3 class="flex items-center gap-2 text-sm font-semibold text-foreground">
									<span class="h-3.5 w-1 rounded-full bg-primary" aria-hidden="true"></span>Arrivées
									et sorties par jour
								</h3>
								<div class="mt-3">
									{#if queueFlowError}
										<p class="text-sm text-muted-foreground">
											La courbe de la file est momentanément indisponible.
										</p>
									{:else if queueFlow === null}
										<LoadingState label="Chargement de la courbe…" />
									{:else if queueFlow.every((d) => d.arrived === 0 && d.completed === 0)}
										<p class="text-sm text-muted-foreground">
											Aucun passage en file sur la période.
										</p>
									{:else}
										<LineChart
											dates={queueFlow.map((d) => d.date)}
											series={queueFlowSeries}
											label={`Patients arrivés et terminés par jour · ${periodLabel}`}
											unit="patient(s)"
											height={180}
										/>
									{/if}
								</div>
							</div>

							<div class="border-t border-border pt-4">
								<h3 class="flex items-center gap-2 text-sm font-semibold text-foreground">
									<span class="h-3.5 w-1 rounded-full bg-warning" aria-hidden="true"></span>Parcours
									en ce moment
								</h3>
								<p class="mt-0.5 text-xs text-muted-foreground">
									{(
										queueKpis.waitingReception +
										queueKpis.waitingTriage +
										queueKpis.waitingDoctor +
										queueKpis.inProgress
									).toLocaleString('fr-FR')} patient(s) dans la file · service sélectionné
								</p>
								<div class="mt-3">
									<SegmentedBar
										rows={[
											{ label: 'Attente accueil', value: queueKpis.waitingReception },
											{ label: 'Attente triage', value: queueKpis.waitingTriage },
											{ label: 'Attente médecin', value: queueKpis.waitingDoctor },
											{ label: 'En consultation', value: queueKpis.inProgress }
										]}
										label="Patients actuellement dans la file, par étape"
										unit="patient(s)"
									/>
								</div>
							</div>

							<div class="flex items-center justify-between gap-4 border-t border-border pt-4">
								<p class="text-xs text-muted-foreground">
									Rendez-vous en retard
									<span class="ml-1 font-semibold tabular-nums text-foreground">
										{queueKpis.lateAppointments.toLocaleString('fr-FR')}
									</span>
								</p>
								<a
									href={resolve('/queue')}
									class="text-sm font-semibold text-primary hover:underline"
								>
									Voir la file patients
								</a>
							</div>
						</div>
					{/if}
				</Card>
			{/if}

			{#if canReadAppointments}
				<Card
					title="Rendez-vous"
					subtitle={`Planifiés sur la période · ${periodLabel}`}
					class="min-w-0"
				>
					{#if appointmentsLoading}
						<div class="flex min-h-[220px] items-center justify-center">
							<p class="text-sm text-muted-foreground">Chargement des rendez-vous…</p>
						</div>
					{:else if appointmentsError}
						<div class="flex min-h-[220px] items-center justify-center text-center">
							<p class="max-w-xs text-sm text-muted-foreground">
								Les rendez-vous sont momentanément indisponibles.
							</p>
						</div>
					{:else if appointmentStats}
						<div class="flex h-full flex-col gap-5">
							<div class="grid grid-cols-3 gap-2">
								<div class="rounded-lg border border-primary-border bg-primary-soft px-3 py-3">
									<p class="text-xs font-medium text-primary">Total</p>
									<p class="mt-1 text-2xl font-semibold tabular-nums text-primary">
										{appointmentStats.total.toLocaleString('fr-FR')}
									</p>
								</div>
								<div class="rounded-lg border border-success-border bg-success-soft px-3 py-3">
									<p class="text-xs font-medium text-success-strong">Honorés</p>
									<p class="mt-1 text-2xl font-semibold tabular-nums text-success-strong">
										{percentOf(appointmentStats.completed, appointmentStats.total)}
									</p>
									<p class="mt-0.5 text-2xs text-muted-foreground">rendez-vous terminés</p>
								</div>
								<div class="rounded-lg border border-danger-border bg-danger-soft px-3 py-3">
									<p class="text-xs font-medium text-danger-strong">Absences</p>
									<p class="mt-1 text-2xl font-semibold tabular-nums text-danger-strong">
										{percentOf(appointmentStats.noShow, appointmentStats.total)}
									</p>
									<p class="mt-0.5 text-2xs text-muted-foreground">no-show</p>
								</div>
							</div>

							<div data-testid="dashboard-appointments-daily">
								<h3 class="flex items-center gap-2 text-sm font-semibold text-foreground">
									<span class="h-3.5 w-1 rounded-full bg-success" aria-hidden="true"
									></span>Rendez-vous par jour et par statut
								</h3>
								<div class="mt-3">
									{#if appointmentDailyError}
										<p class="text-sm text-muted-foreground">
											Le graphique des rendez-vous est momentanément indisponible.
										</p>
									{:else if appointmentDaily === null}
										<LoadingState label="Chargement du graphique…" />
									{:else if appointmentStats.total === 0}
										<p class="text-sm text-muted-foreground">Aucun rendez-vous sur la période.</p>
									{:else}
										<StackedBarChart
											dates={appointmentDaily.map((d) => d.date)}
											series={appointmentSeries}
											label={`Rendez-vous par jour et par statut · ${periodLabel}`}
											unit="rendez-vous"
										/>
									{/if}
								</div>
							</div>

							<a
								href={resolve('/agenda')}
								class="mt-auto border-t border-border pt-4 text-sm font-semibold text-primary hover:underline"
							>
								Voir l’agenda
							</a>
						</div>
					{/if}
				</Card>
			{/if}

			<div class="min-w-0 lg:col-span-2 xl:col-span-1">
				<WorkflowStats
					workflow={dashboard.workflow}
					total={dashboard.vouchers}
					period={periodLabel}
				/>
			</div>
		</div>

		<!-- Service Desk, planning du personnel et activité récente sur une même ligne. -->
		<div class="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
			{#if canReadTicketing}
				<Card title="Service Desk" subtitle={`Support · ${periodLabel}`} class="min-w-0">
					{#if ticketKpisLoading}
						<div class="flex min-h-[280px] items-center justify-center">
							<p class="text-sm text-muted-foreground">Chargement du ticketing…</p>
						</div>
					{:else if ticketKpisError}
						<div class="flex min-h-[280px] items-center justify-center text-center">
							<p class="max-w-xs text-sm text-muted-foreground">
								Les indicateurs du Service Desk sont momentanément indisponibles.
							</p>
						</div>
					{:else if ticketKpis}
						<div class="grid gap-6">
							<div class="min-w-0" data-testid="dashboard-ticket-flow">
								<h3 class="flex items-center gap-2 text-sm font-semibold text-foreground">
									<span class="h-3.5 w-1 rounded-full bg-primary" aria-hidden="true"></span>Tickets
									créés vs résolus par jour
								</h3>
								<div class="mt-3">
									{#if ticketFlowLoading}
										<LoadingState label="Chargement de la courbe…" />
									{:else if ticketFlowError}
										<p class="text-sm text-muted-foreground">
											La courbe du Service Desk est momentanément indisponible.
										</p>
									{:else if ticketFlowEmpty}
										<EmptyState
											title="Aucun ticket créé ni résolu sur la période"
											description="La courbe apparaîtra dès qu’un ticket sera créé ou résolu."
										/>
									{:else}
										<LineChart
											dates={ticketFlow.map((d) => d.date)}
											series={ticketFlowSeries}
											label={`Tickets créés et résolus par jour · ${periodLabel}`}
											unit="ticket(s)"
										/>
									{/if}
								</div>
							</div>

							<div class="flex min-w-0 flex-col">
								<div class="grid grid-cols-2 gap-3">
									<div class="rounded-lg border border-primary-border bg-primary-soft p-3">
										<p class="text-xs font-medium text-primary">Ouverts (actuel)</p>
										<p class="mt-1 text-2xl font-semibold tabular-nums text-primary">
											{ticketKpis.open.toLocaleString('fr-FR')}
										</p>
									</div>

									<div class="rounded-lg border border-warning-border bg-warning-soft p-3">
										<p class="text-xs font-medium text-warning-strong">Priorités P1/P2 (actuel)</p>
										<p class="mt-1 text-2xl font-semibold tabular-nums text-warning-strong">
											{ticketKpis.p1p2.toLocaleString('fr-FR')}
										</p>
									</div>

									<div class="rounded-lg border border-danger-border bg-danger-soft p-3">
										<p class="text-xs font-medium text-danger-strong">SLA dépassés (actuel)</p>
										<p class="mt-1 text-2xl font-semibold tabular-nums text-danger-strong">
											{ticketKpis.slaBreached.toLocaleString('fr-FR')}
										</p>
									</div>

									<div class="rounded-lg border border-info-border bg-info-soft p-3">
										<p class="text-xs font-medium text-info-strong">Rouverts</p>
										<p class="mt-1 text-2xl font-semibold tabular-nums text-info-strong">
											{ticketKpis.reopened.toLocaleString('fr-FR')}
										</p>
									</div>
								</div>

								<div class="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
									<div>
										<p class="text-xs text-muted-foreground">Réponse moyenne</p>
										<p class="mt-1 font-semibold tabular-nums text-foreground">
											{Math.round(ticketKpis.averageFirstResponseMinutes).toLocaleString('fr-FR')} min
										</p>
									</div>

									<div>
										<p class="text-xs text-muted-foreground">MTTR</p>
										<p class="mt-1 font-semibold tabular-nums text-foreground">
											{Math.round(ticketKpis.mttrMinutes).toLocaleString('fr-FR')} min
										</p>
									</div>
								</div>

								<a
									href={resolve('/support/tickets')}
									class="mt-4 text-sm font-semibold text-primary hover:underline"
								>
									Voir la file support
								</a>
							</div>
						</div>
					{/if}
				</Card>
			{/if}

			{#if canReadPlanning}
				<Card
					title="Planning du personnel"
					subtitle={`Heures programmées par membre · ${periodLabel}`}
					class="min-w-0"
				>
					<div data-testid="dashboard-planned-hours">
						{#if plannedHoursLoading}
							<LoadingState label="Chargement du planning…" />
						{:else if plannedHoursError}
							<p class="text-sm text-muted-foreground">
								Le planning du personnel est momentanément indisponible.
							</p>
						{:else if plannedStaff.length === 0}
							<EmptyState
								title="Aucune heure planifiée sur la période"
								description="Les plannings actifs du personnel apparaîtront ici."
							/>
						{:else}
							<p class="text-xs text-muted-foreground">
								{plannedStaff.length.toLocaleString('fr-FR')} membre(s) du personnel · total
								<span class="ml-1 text-sm font-semibold tabular-nums text-foreground">
									{plannedHoursTotal.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} h
								</span>
							</p>
							<div class="mt-4 max-h-[440px] overflow-y-auto pr-1">
								<RankedBarList
									rows={plannedStaff.map((p) => ({
										id: p.practitionerId,
										label: p.name || `Personnel n° ${p.practitionerId}`,
										value: p.hours
									}))}
									label={`Heures programmées par membre du personnel · ${periodLabel}`}
									unit="h"
									tone="info"
								/>
							</div>
						{/if}
						{#if canReadAgenda(getStoredPermissions())}
							<LinkButton
								href={resolve('/agenda')}
								class="mt-4"
								data-testid="dashboard-open-agenda"
							>
								Voir l’agenda
							</LinkButton>
						{/if}
					</div>
				</Card>
			{:else}
				<Card title="Planning clinique" subtitle="Agenda médical">
					{#if canReadAgenda(getStoredPermissions())}
						<div class="space-y-3" data-testid="dashboard-agenda-cta">
							<p class="text-sm text-slate-600">
								Consultez les rendez-vous du jour et de la semaine, réservez un créneau et suivez le
								parcours check-in → file.
							</p>
							<LinkButton href={resolve('/agenda')} data-testid="dashboard-open-agenda">
								Voir l’agenda
							</LinkButton>
						</div>
					{:else}
						<p class="text-sm text-slate-500">
							L’agenda médical n’est pas disponible pour votre profil.
						</p>
					{/if}
				</Card>
			{/if}

			<div class="min-w-0">
				<ActivityTimeline activities={dashboard.recentActivities} />
			</div>
		</div>

		<Card title="Flux opérationnel" subtitle="Chaîne de soins et de prise en charge">
			<div class="grid gap-3 md:grid-cols-7">
				<ProcessItem icon={Users} title="Accueil" value="Admission patient" tone="primary" />
				<ProcessItem icon={HeartPulse} title="Consultation" value="Diagnostic" tone="success" />
				<ProcessItem icon={FileText} title="Prescription" value="Ordonnance" tone="info" />
				<ProcessItem icon={Activity} title="Laboratoire" value="Analyses" tone="warning" />
				<ProcessItem icon={BadgeCheck} title="Imagerie" value="Examens" tone="primary" />
				<ProcessItem icon={Shield} title="Assurance" value="PEC" tone="success" />
				<ProcessItem icon={CreditCard} title="Facturation" value="Paiement" tone="danger" />
			</div>
		</Card>
	</div>
{:else}
	<EmptyState
		title="Aucun indicateur disponible"
		description="Le tableau de bord n'a pas pu être chargé pour votre profil."
	/>
{/if}
