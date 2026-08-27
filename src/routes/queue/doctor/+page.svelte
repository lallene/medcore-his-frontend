<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import {
		completeQueueTicket,
		getDoctorWorklist,
		getQueueTicket,
		takeDoctor
	} from '$lib/api/queue';
	import {
		ageSexLabel,
		careStateLabel,
		doctorWorklistColumns,
		emptyCell,
		emptyDoctorWorklistKPIs,
		filterDoctorWorklist,
		formatClock,
		formatVitalSummary,
		formatWaitMinutes,
		priorityLabels,
		stageLabels,
		vitalsHaveAbnormal,
		waitToneClass
	} from '$lib/components/queue/state';
	import type { ClinicalSnippet, DoctorWorklistKPIs, QueueTicketRow } from '$lib/types/queue';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import MetricCard from '$lib/components/ui/MetricCard.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import FilterBar from '$lib/components/ui/FilterBar.svelte';
	import { medcoreColors } from '$lib/design/theme';
	import { AlertTriangle, Clock3, Stethoscope, Users } from 'lucide-svelte';

	let tickets = $state<QueueTicketRow[]>([]);
	let kpis = $state<DoctorWorklistKPIs>(emptyDoctorWorklistKPIs());
	let loading = $state(true);
	let error = $state('');
	let actingId = $state<number | null>(null);
	let selectedId = $state<number | null>(null);
	let panelAllergies = $state<ClinicalSnippet[]>([]);
	let panelHistories = $state<ClinicalSnippet[]>([]);
	let panelLoading = $state(false);
	let search = $state('');
	let priorityFilter = $state('');
	let stageFilter = $state('');
	let lastRefresh = $state('');
	let staffName = $state('Médecin');
	let staffService = $state('Service clinique');

	const displayWaiting = $derived.by(() => {
		const base = filterDoctorWorklist(tickets, {
			search,
			priority: priorityFilter,
			stage: stageFilter || undefined
		});
		if (stageFilter === 'DOCTOR_IN_PROGRESS') {
			return base.filter((t) => t.stage === 'DOCTOR_IN_PROGRESS');
		}
		if (stageFilter === 'WAITING_DOCTOR') {
			return base.filter((t) => t.stage === 'WAITING_DOCTOR');
		}
		// Default table = ready to take (WAITING_DOCTOR), matching mockup
		return base.filter((t) => t.stage === 'WAITING_DOCTOR');
	});

	const inConsultation = $derived(
		filterDoctorWorklist(tickets, { search, priority: priorityFilter }).filter(
			(t) => t.stage === 'DOCTOR_IN_PROGRESS'
		)
	);

	const selected = $derived(
		selectedId == null ? null : (tickets.find((t) => t.id === selectedId) ?? null)
	);

	async function load() {
		loading = true;
		error = '';
		try {
			const page = await getDoctorWorklist({ limit: 100 });
			tickets = page.items.filter(
				(t) => t.stage === 'WAITING_DOCTOR' || t.stage === 'DOCTOR_IN_PROGRESS'
			);
			kpis = page.kpis ?? emptyDoctorWorklistKPIs();
			lastRefresh = new Intl.DateTimeFormat('fr-FR', {
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit'
			}).format(new Date());
			if (selectedId != null && !tickets.some((t) => t.id === selectedId)) {
				selectedId = null;
				panelAllergies = [];
				panelHistories = [];
			} else if (selectedId != null) {
				await loadPanel(selectedId);
			}
			if (tickets[0]?.serviceName) {
				staffService = tickets[0].serviceName;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Impossible de charger la file médecin';
		} finally {
			loading = false;
		}
	}

	async function loadPanel(id: number) {
		panelLoading = true;
		try {
			const detail = await getQueueTicket(id);
			panelAllergies = detail.allergies ?? [];
			panelHistories = detail.histories ?? [];
			const idx = tickets.findIndex((t) => t.id === id);
			if (idx >= 0) {
				tickets[idx] = detail.ticket;
			}
		} catch {
			panelAllergies = [];
			panelHistories = [];
		} finally {
			panelLoading = false;
		}
	}

	async function selectTicket(id: number) {
		selectedId = id;
		await loadPanel(id);
	}

	async function take(id: number) {
		actingId = id;
		error = '';
		try {
			await takeDoctor(id, { createConsultation: true });
			await load();
			selectedId = id;
			await loadPanel(id);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Prise en charge refusée';
		} finally {
			actingId = null;
		}
	}

	async function complete(id: number) {
		actingId = id;
		error = '';
		try {
			await completeQueueTicket(id);
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Clôture consultation refusée';
		} finally {
			actingId = null;
		}
	}

	onMount(() => {
		const stored = localStorage.getItem('medcore_user');
		if (stored) {
			try {
				const u = JSON.parse(stored) as {
					name?: string;
					functions?: string[];
					specialties?: string[];
				};
				staffName = u.name ?? staffName;
				staffService = u.functions?.[0] ?? u.specialties?.[0] ?? staffService;
			} catch {
				// ignore legacy sessions
			}
		}
		void load();
	});
</script>

<div class="space-y-5" data-testid="queue-doctor">
	<PageHeader
		eyebrow="File patients"
		title="Mes patients à prendre en charge"
		description={`Patients prêts à être vus (triage validé) — ${staffName} · ${staffService}`}
	>
		{#snippet actions()}
			<div class="flex items-center gap-3 text-sm text-slate-500">
				<span data-testid="queue-doctor-refresh-time">Mis à jour {lastRefresh || '—'}</span>
				<Button variant="secondary" size="sm" onclick={load} data-testid="queue-doctor-refresh"
					>Actualiser</Button
				>
			</div>
		{/snippet}
	</PageHeader>

	{#if error}
		<Alert tone="danger">{error}</Alert>
	{/if}

	<section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="queue-doctor-kpis">
		<MetricCard
			title="À traiter"
			value={kpis.toTreat}
			detail="Patients"
			icon={Users}
			accent={medcoreColors.primary}
		/>
		<MetricCard
			title="Urgents"
			value={kpis.urgent}
			detail="Priorité maximale"
			icon={AlertTriangle}
			accent={medcoreColors.semantic.danger}
			class={kpis.urgent > 0 ? 'border-red-200' : ''}
		/>
		<MetricCard
			title="En consultation"
			value={kpis.inConsultation}
			detail="En cours"
			icon={Stethoscope}
			accent={medcoreColors.primaryHover}
		/>
		<MetricCard
			title="Attente moyenne"
			value={`${Math.round(kpis.avgWaitMinutes)} min`}
			detail="Aujourd'hui"
			icon={Clock3}
			accent={medcoreColors.neutral.textSecondary}
		/>
	</section>

	<div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
		<section class="min-w-0 space-y-4">
			<section class="rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)]">
				<FilterBar class="rounded-none border-0 border-b border-border shadow-none">
					<SearchInput
						bind:value={search}
						placeholder="Rechercher un patient…"
						class="min-w-[12rem] flex-1"
						id="queue-doctor-search"
					/>
					<Select aria-label="Priorité" bind:value={priorityFilter} class="min-w-[9rem]">
						<option value="">Priorité</option>
						{#each Object.entries(priorityLabels) as [value, label] (value)}
							<option {value}>{label}</option>
						{/each}
					</Select>
					<Select aria-label="Statut" bind:value={stageFilter} class="min-w-[10rem]">
						<option value="">Statut (prêts)</option>
						<option value="WAITING_DOCTOR">À traiter</option>
						<option value="DOCTOR_IN_PROGRESS">En consultation</option>
					</Select>
				</FilterBar>

				{#if loading}
					<LoadingState label="Chargement de la file médecin…" />
				{:else if displayWaiting.length === 0 && stageFilter !== 'DOCTOR_IN_PROGRESS'}
					<div class="p-4">
						<EmptyState
							title="Aucun patient prêt"
							description="Les patients n’apparaissent ici qu’après validation complète du triage."
						/>
					</div>
				{:else if displayWaiting.length === 0}
					<div class="p-4"><EmptyState title="Aucun résultat pour ces filtres" /></div>
				{:else}
					<div class="overflow-x-auto">
						<table class="w-full text-left text-sm" data-testid="queue-doctor-table">
							<thead class="bg-surface-muted text-xs uppercase text-slate-500">
								<tr>
									{#each doctorWorklistColumns as column (column)}
										<th class="whitespace-nowrap px-3 py-2.5">{column}</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each displayWaiting as ticket (ticket.id)}
									<tr
										class="cursor-pointer border-t border-border hover:bg-surface-muted/60"
										class:bg-sky-50={selectedId === ticket.id}
										data-testid="queue-doctor-row"
										data-ticket-id={ticket.id}
										onclick={() => selectTicket(ticket.id)}
									>
										<td class="px-3 py-2.5">
											<StatusBadge
												status={ticket.priority}
												label={priorityLabels[ticket.priority]}
											/>
										</td>
										<td class="px-3 py-2.5">
											<div class="font-semibold text-slate-900">{ticket.patientName}</div>
											<div class="font-mono text-xs text-slate-500">{ticket.patientCode}</div>
											<div class="font-mono text-[10px] text-slate-400">{ticket.reference}</div>
										</td>
										<td class="px-3 py-2.5 text-slate-600">{ageSexLabel(ticket)}</td>
										<td class="px-3 py-2.5 tabular-nums">{formatClock(ticket.arrivedAt)}</td>
										<td
											class={`px-3 py-2.5 tabular-nums ${waitToneClass(ticket.waitMinutes, ticket.priority)}`}
										>
											{formatWaitMinutes(ticket.waitMinutes)}
										</td>
										<td
											class="max-w-[12rem] px-3 py-2.5 text-xs"
											class:text-danger={vitalsHaveAbnormal(ticket.vitalSigns)}
											class:font-semibold={vitalsHaveAbnormal(ticket.vitalSigns)}
										>
											{formatVitalSummary(ticket.vitalSigns)}
										</td>
										<td class="max-w-[14rem] truncate px-3 py-2.5 text-slate-600">
											{ticket.reason?.trim() || emptyCell}
										</td>
										<td class="px-3 py-2.5">
											<span class="text-xs font-medium text-slate-600"
												>{careStateLabel(ticket)}</span
											>
										</td>
										<td class="px-3 py-2.5">
											<Button
												size="sm"
												data-testid="queue-doctor-open"
												onclick={(e) => {
													e.stopPropagation();
													void selectTicket(ticket.id);
												}}>Ouvrir</Button
											>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
					<p class="border-t border-border px-4 py-2 text-xs text-slate-500">
						Affichage {displayWaiting.length} patient{displayWaiting.length > 1 ? 's' : ''} prêts
					</p>
				{/if}
			</section>

			<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
				<section
					class="rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-card)]"
					data-testid="queue-doctor-in-progress"
				>
					<h2 class="text-sm font-bold text-slate-800">
						Patients en consultation ({inConsultation.length})
					</h2>
					{#if inConsultation.length === 0}
						<p class="mt-3 text-sm text-slate-500">Aucune consultation en cours.</p>
					{:else}
						<ul class="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
							{#each inConsultation as ticket (ticket.id)}
								<li class="rounded-xl border border-border bg-surface-muted/40 p-3 text-sm">
									<p class="font-semibold text-slate-900">{ticket.patientName}</p>
									<p class="text-xs text-slate-500">
										Depuis {formatClock(ticket.doctorTakenAt ?? ticket.arrivedAt)}
									</p>
									<p class="mt-1 text-xs text-slate-600">
										{ticket.doctorTakenByName?.trim() || 'Médecin assigné'}
									</p>
									<div class="mt-2 flex flex-wrap gap-2">
										<Button size="sm" variant="secondary" onclick={() => selectTicket(ticket.id)}
											>Voir</Button
										>
										<a href={resolve(`/patients/${ticket.patientId}`)}>
											<Button size="sm" variant="ghost">Dossier</Button>
										</a>
										{#if ticket.consultationId}
											<a href={resolve(`/consultations/${ticket.consultationId}`)}>
												<Button size="sm" variant="ghost">Consultation</Button>
											</a>
										{/if}
										<Button
											size="sm"
											variant="success"
											loading={actingId === ticket.id}
											data-testid="queue-doctor-complete"
											onclick={() => complete(ticket.id)}>Clôturer</Button
										>
									</div>
								</li>
							{/each}
						</ul>
					{/if}
				</section>

				<section
					class="rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-card)]"
					data-testid="queue-doctor-day-stats"
				>
					<h2 class="text-sm font-bold text-slate-800">Statistiques du jour</h2>
					<ul class="mt-3 space-y-2 text-sm text-slate-600">
						<li class="flex justify-between gap-2">
							<span>Patients vus</span>
							<strong class="tabular-nums text-slate-900">{kpis.completedToday}</strong>
						</li>
						<li class="flex justify-between gap-2">
							<span>Temps moyen / consultation</span>
							<strong class="tabular-nums text-slate-900"
								>{Math.round(kpis.avgConsultationMinutes || 0)} min</strong
							>
						</li>
						<li class="flex justify-between gap-2">
							<span>Dernière consultation</span>
							<strong class="tabular-nums text-slate-900"
								>{formatClock(kpis.lastCompletedAt)}</strong
							>
						</li>
					</ul>
				</section>
			</div>
		</section>

		<aside
			class="rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-card)] xl:sticky xl:top-4 xl:self-start"
			data-testid="queue-doctor-panel"
		>
			{#if !selected}
				<EmptyState
					title="Patient sélectionné"
					description="Choisissez un patient dans la liste pour afficher le panneau clinique."
				/>
			{:else}
				<div class="space-y-4">
					<div>
						<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
							Patient sélectionné
						</p>
						<h2 class="mt-1 text-lg font-bold text-slate-900">{selected.patientName}</h2>
						<p class="font-mono text-xs text-slate-500">{selected.patientCode}</p>
						<p class="mt-1 text-sm text-slate-600">
							{ageSexLabel(selected)}
							{#if selected.patientDob}
								· né(e) {selected.patientDob}
							{/if}
						</p>
						{#if selected.patientPhone}
							<p class="text-sm text-slate-600">{selected.patientPhone}</p>
						{/if}
						<div class="mt-2">
							<StatusBadge status="ACTIVE" label="Dossier: OUVERT" />
						</div>
					</div>

					<div class="rounded-xl border border-border bg-surface-muted/50 p-3 text-sm">
						<p>
							Ticket <span class="font-mono font-semibold">{selected.reference}</span>
						</p>
						<div class="mt-2 flex flex-wrap items-center gap-2">
							<StatusBadge status={selected.priority} label={priorityLabels[selected.priority]} />
							<span class="text-slate-600">{selected.serviceName}</span>
						</div>
						<p class="mt-2 text-slate-600">
							Arrivée {formatClock(selected.arrivedAt)} · Attente
							<span class={waitToneClass(selected.waitMinutes, selected.priority)}>
								{formatWaitMinutes(selected.waitMinutes)}
							</span>
						</p>
						{#if selected.appointmentTime}
							<p class="text-slate-600">RDV {formatClock(selected.appointmentTime)}</p>
						{/if}
						<p class="mt-1 text-xs text-slate-500">{stageLabels[selected.stage]}</p>
						{#if selected.doctorTakenByName}
							<p class="mt-1 text-xs font-medium text-slate-700">
								Pris en charge par {selected.doctorTakenByName}
							</p>
						{/if}
					</div>

					{#if panelLoading}
						<LoadingState label="Contexte clinique…" />
					{:else}
						{#if selected.vitalSigns}
							<div>
								<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
									Constantes (triage validé{selected.vitalSigns.measuredAt
										? ` à ${formatClock(selected.vitalSigns.measuredAt)}`
										: ''})
								</p>
								<ul class="mt-2 grid grid-cols-2 gap-2 text-sm">
									<li
										class:text-danger={selected.vitalSigns.abnormalTemp}
										class:font-semibold={selected.vitalSigns.abnormalTemp}
									>
										Temp {selected.vitalSigns.temperatureC != null
											? `${selected.vitalSigns.temperatureC.toFixed(1)} °C`
											: emptyCell}
									</li>
									<li
										class:text-danger={selected.vitalSigns.abnormalBp}
										class:font-semibold={selected.vitalSigns.abnormalBp}
									>
										TA {selected.vitalSigns.systolicBp != null &&
										selected.vitalSigns.diastolicBp != null
											? `${selected.vitalSigns.systolicBp}/${selected.vitalSigns.diastolicBp}`
											: emptyCell}
									</li>
									<li
										class:text-danger={selected.vitalSigns.abnormalHr}
										class:font-semibold={selected.vitalSigns.abnormalHr}
									>
										Pouls {selected.vitalSigns.heartRate != null
											? `${selected.vitalSigns.heartRate} bpm`
											: emptyCell}
									</li>
									<li
										class:text-danger={selected.vitalSigns.abnormalSpo2}
										class:font-semibold={selected.vitalSigns.abnormalSpo2}
									>
										SpO2 {selected.vitalSigns.oxygenSaturation != null
											? `${selected.vitalSigns.oxygenSaturation} %`
											: emptyCell}
									</li>
									<li>
										Poids {selected.vitalSigns.weightKg != null
											? `${selected.vitalSigns.weightKg} kg`
											: emptyCell}
									</li>
									<li>
										Taille {selected.vitalSigns.heightCm != null
											? `${selected.vitalSigns.heightCm} cm`
											: emptyCell}
									</li>
								</ul>
							</div>
						{/if}

						<div>
							<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
								Motif / Accueil
							</p>
							<p class="mt-1 text-sm text-slate-700">{selected.reason?.trim() || emptyCell}</p>
						</div>

						{#if panelAllergies.length}
							<div>
								<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
									Allergies
								</p>
								<ul class="mt-1 list-disc pl-4 text-sm text-slate-700">
									{#each panelAllergies as a (a.label)}
										<li>
											{a.label}{#if a.severity}
												<span class="text-xs text-slate-500"> ({a.severity})</span>{/if}
										</li>
									{/each}
								</ul>
							</div>
						{/if}

						{#if panelHistories.length}
							<div>
								<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
									Antécédents principaux
								</p>
								<ul class="mt-1 list-disc pl-4 text-sm text-slate-700">
									{#each panelHistories as h (h.label)}
										<li>{h.label}</li>
									{/each}
								</ul>
							</div>
						{/if}
					{/if}

					<div class="space-y-2 pt-1">
						{#if selected.stage === 'WAITING_DOCTOR'}
							<Button
								fullWidth
								data-testid="queue-doctor-take"
								loading={actingId === selected.id}
								onclick={() => take(selected.id)}>Prendre en charge</Button
							>
						{:else if selected.stage === 'DOCTOR_IN_PROGRESS'}
							<Button
								fullWidth
								variant="success"
								data-testid="queue-doctor-complete-panel"
								loading={actingId === selected.id}
								onclick={() => complete(selected.id)}>Clôturer la prise en charge</Button
							>
						{/if}
						<a href={resolve(`/patients/${selected.patientId}`)} class="block">
							<Button fullWidth variant="secondary" data-testid="queue-doctor-open-dossier"
								>Ouvrir le dossier patient</Button
							>
						</a>
						{#if selected.consultationId}
							<a
								href={resolve(`/consultations/${selected.consultationId}`)}
								class="block text-center text-sm font-medium text-primary hover:underline"
								data-testid="queue-doctor-open-consult"
							>
								Ouvrir la consultation
							</a>
						{/if}
						<a
							href={resolve(`/queue/${selected.id}`)}
							class="block text-center text-sm text-slate-500 hover:underline"
						>
							Plus d'actions / historique
						</a>
					</div>
				</div>
			{/if}
		</aside>
	</div>
</div>
