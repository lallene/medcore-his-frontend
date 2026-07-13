<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteDate, SvelteMap } from 'svelte/reactivity';

	import {
		Activity,
		Bed,
		CalendarDays,
		ClipboardList,
		FileText,
		Filter,
		FlaskConical,
		HeartPulse,
		Image,
		Pill,
		RefreshCw,
		Stethoscope
	} from 'lucide-svelte';

	import { getClinicalTimeline } from '$lib/api/clinical-timeline';
	import type { ClinicalTimelineEvent } from '$lib/types/clinical-timeline';

	type TimelineFilter =
		'all' | 'consultation' | 'prescription' | 'exam' | 'hospitalization' | 'document';

	type Props = {
		recordId: number;
		limit?: number;
	};

	let { recordId, limit = 20 }: Props = $props();

	let events = $state<ClinicalTimelineEvent[]>([]);
	let loading = $state(true);
	let refreshing = $state(false);
	let error = $state('');
	let expanded = $state(false);
	let activeFilter = $state<TimelineFilter>('all');

	const filters: Array<{
		id: TimelineFilter;
		label: string;
	}> = [
		{ id: 'all', label: 'Tous' },
		{ id: 'consultation', label: 'Consultations' },
		{ id: 'prescription', label: 'Prescriptions' },
		{ id: 'exam', label: 'Examens' },
		{ id: 'hospitalization', label: 'Hospitalisations' },
		{ id: 'document', label: 'Documents' }
	];

	const filteredEvents = $derived.by(() => {
		if (activeFilter === 'all') {
			return events;
		}

		return events.filter((event) => eventCategory(event) === activeFilter);
	});

	const visibleEvents = $derived(
		expanded ? filteredEvents : filteredEvents.slice(0, Math.min(limit, 8))
	);

	const groupedEvents = $derived.by(() => {
		const groups = new SvelteMap<
			string,
			{
				label: string;
				events: ClinicalTimelineEvent[];
			}
		>();

		for (const event of visibleEvents) {
			const date = new SvelteDate(event.event_date);

			const key = Number.isNaN(date.getTime()) ? 'unknown' : date.toISOString().slice(0, 10);

			const label = Number.isNaN(date.getTime()) ? 'Date inconnue' : formatGroupDate(date);

			const existing = groups.get(key);

			if (existing) {
				existing.events.push(event);
			} else {
				groups.set(key, {
					label,
					events: [event]
				});
			}
		}

		return Array.from(groups.entries()).map(([key, value]) => ({
			key,
			...value
		}));
	});

	function normalize(value: string | null | undefined): string {
		return (value ?? '').trim().toLowerCase();
	}

	function eventSearchValue(event: ClinicalTimelineEvent): string {
		return [event.event_type, event.category, event.source_type, event.title, event.description]
			.join(' ')
			.toLowerCase();
	}

	function eventCategory(event: ClinicalTimelineEvent): TimelineFilter {
		const value = eventSearchValue(event);

		if (value.includes('hospital') || value.includes('admission') || value.includes('bed')) {
			return 'hospitalization';
		}

		if (
			value.includes('prescription') ||
			value.includes('medication') ||
			value.includes('treatment')
		) {
			return 'prescription';
		}

		if (
			value.includes('exam') ||
			value.includes('laboratory') ||
			value.includes('imaging') ||
			value.includes('radiology') ||
			value.includes('scan')
		) {
			return 'exam';
		}

		if (
			value.includes('document') ||
			value.includes('report') ||
			value.includes('certificate') ||
			value.includes('pdf')
		) {
			return 'document';
		}

		return 'consultation';
	}

	function formatGroupDate(date: SvelteDate): string {
		const today = new SvelteDate();
		const yesterday = new SvelteDate();

		yesterday.setDate(today.getDate() - 1);

		if (date.toDateString() === today.toDateString()) {
			return "Aujourd'hui";
		}

		if (date.toDateString() === yesterday.toDateString()) {
			return 'Hier';
		}

		return new Intl.DateTimeFormat('fr-FR', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		}).format(date);
	}

	function formatTime(value: string): string {
		const date = new SvelteDate(value);

		if (Number.isNaN(date.getTime())) {
			return '—';
		}

		return new Intl.DateTimeFormat('fr-FR', {
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	}

	function eventLabel(event: ClinicalTimelineEvent): string {
		switch (normalize(event.event_type)) {
			case 'consultation_created':
				return 'Consultation créée';
			case 'consultation_completed':
				return 'Consultation terminée';
			case 'consultation_cancelled':
				return 'Consultation annulée';
			case 'consultation_status_changed':
				return 'Statut de consultation';
			case 'medication_prescribed':
				return 'Prescription médicale';
			case 'exam_requested':
				return 'Examen demandé';
			case 'vital_sign_added':
				return 'Constantes enregistrées';
			case 'medical_history_added':
				return 'Antécédent médical';
			case 'allergy_added':
				return 'Allergie enregistrée';
			case 'soap_updated':
				return 'Note SOAP mise à jour';
			case 'specialty_data_updated':
				return 'Volet spécialisé mis à jour';
			case 'common_medical_record_updated':
				return 'Dossier médical mis à jour';
			default:
				return event.title || 'Événement clinique';
		}
	}

	function severityLabel(value: string): string {
		switch (normalize(value)) {
			case 'critical':
				return 'Critique';
			case 'high':
				return 'Élevé';
			case 'medium':
				return 'Surveillance';
			case 'low':
				return 'Faible';
			default:
				return 'Info';
		}
	}

	function eventBadgeClasses(event: ClinicalTimelineEvent): string {
		switch (normalize(event.severity)) {
			case 'critical':
				return 'border-red-200 bg-red-50 text-red-700';
			case 'high':
				return 'border-orange-200 bg-orange-50 text-orange-700';
			case 'medium':
				return 'border-amber-200 bg-amber-50 text-amber-700';
			case 'low':
				return 'border-emerald-200 bg-emerald-50 text-emerald-700';
			default:
				return 'border-blue-200 bg-blue-50 text-[#0E4C92]';
		}
	}

	function markerClasses(event: ClinicalTimelineEvent): string {
		switch (eventCategory(event)) {
			case 'prescription':
				return 'border-emerald-200 bg-emerald-100 text-emerald-700';
			case 'exam':
				return 'border-violet-200 bg-violet-100 text-violet-700';
			case 'hospitalization':
				return 'border-orange-200 bg-orange-100 text-orange-700';
			case 'document':
				return 'border-slate-300 bg-slate-100 text-slate-700';
			default:
				return 'border-blue-200 bg-blue-100 text-[#0E4C92]';
		}
	}

	function isImagingEvent(event: ClinicalTimelineEvent): boolean {
		const value = eventSearchValue(event);

		return (
			value.includes('imaging') ||
			value.includes('radiology') ||
			value.includes('scanner') ||
			value.includes('ultrasound')
		);
	}

	async function loadTimeline(refresh = false) {
		if (refresh) {
			refreshing = true;
		} else {
			loading = true;
		}

		error = '';

		try {
			events = await getClinicalTimeline(recordId);
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Impossible de charger la chronologie clinique.';
		} finally {
			loading = false;
			refreshing = false;
		}
	}

	function selectFilter(filter: TimelineFilter) {
		activeFilter = filter;
		expanded = false;
	}

	onMount(() => {
		void loadTimeline();
	});
</script>

<section class="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
	<header class="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.18em] text-[#0E4C92]">Parcours patient</p>

			<h2 class="mt-1 text-xl font-black text-slate-900">Timeline clinique</h2>

			<p class="mt-2 text-sm text-slate-500">
				Vue chronologique unifiée des consultations, prescriptions, examens, hospitalisations et
				documents.
			</p>
		</div>

		<button
			type="button"
			onclick={() => loadTimeline(true)}
			disabled={refreshing}
			class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
		>
			<RefreshCw size={17} class={refreshing ? 'animate-spin' : ''} />

			{refreshing ? 'Actualisation...' : 'Actualiser'}
		</button>
	</header>

	<div class="mt-6 flex items-center gap-3 overflow-x-auto pb-2">
		<div
			class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0E4C92]"
		>
			<Filter size={17} />
		</div>

		{#each filters as filter (filter.id)}
			<button
				type="button"
				onclick={() => selectFilter(filter.id)}
				class={`shrink-0 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
					activeFilter === filter.id
						? 'border-[#0E4C92] bg-[#0E4C92] text-white'
						: 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50'
				}`}
			>
				{filter.label}
			</button>
		{/each}
	</div>

	{#if loading}
		<div class="mt-6 space-y-4">
			{#each [0, 1, 2] as item (item)}
				<div class="animate-pulse rounded-2xl border border-slate-200 bg-slate-50 p-5">
					<div class="h-4 w-40 rounded bg-slate-200"></div>
					<div class="mt-3 h-3 w-full rounded bg-slate-200"></div>
					<div class="mt-2 h-3 w-2/3 rounded bg-slate-200"></div>
				</div>
			{/each}
		</div>
	{:else if error}
		<div
			class="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
		>
			{error}
		</div>
	{:else if filteredEvents.length === 0}
		<div
			class="mt-6 flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50"
		>
			<div class="max-w-md text-center">
				<div
					class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#0E4C92]"
				>
					<CalendarDays size={23} />
				</div>

				<h3 class="mt-4 font-black text-slate-900">Aucun événement pour ce filtre</h3>

				<p class="mt-2 text-sm leading-6 text-slate-500">
					La chronologie est alimentée automatiquement par les activités cliniques du patient.
				</p>
			</div>
		</div>
	{:else}
		<div class="mt-8 space-y-10">
			{#each groupedEvents as group (group.key)}
				<section>
					<div class="mb-5 flex items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#0E4C92]"
						>
							<CalendarDays size={18} />
						</div>

						<div>
							<h3 class="text-sm font-black capitalize text-slate-900">
								{group.label}
							</h3>

							<p class="text-xs text-slate-400">
								{group.events.length}
								{group.events.length > 1 ? ' événements' : ' événement'}
							</p>
						</div>
					</div>

					<div class="relative ml-5 border-l-2 border-slate-200 pl-9">
						<div class="space-y-5">
							{#each group.events as event (event.id)}
								<article class="relative">
									<div
										class={`absolute -left-[54px] top-5 flex h-9 w-9 items-center justify-center rounded-full border-2 shadow-sm ${markerClasses(event)}`}
									>
										{#if eventCategory(event) === 'prescription'}
											<Pill size={16} />
										{:else if eventCategory(event) === 'exam' && isImagingEvent(event)}
											<Image size={16} />
										{:else if eventCategory(event) === 'exam'}
											<FlaskConical size={16} />
										{:else if eventCategory(event) === 'hospitalization'}
											<Bed size={16} />
										{:else if eventCategory(event) === 'document'}
											<FileText size={16} />
										{:else if normalize(event.event_type).includes('vital')}
											<Activity size={16} />
										{:else if normalize(event.event_type).includes('soap')}
											<ClipboardList size={16} />
										{:else if normalize(event.event_type).includes('allergy') || normalize(event.event_type).includes('history') || normalize(event.event_type).includes('medical_record')}
											<HeartPulse size={16} />
										{:else}
											<Stethoscope size={16} />
										{/if}
									</div>

									<div
										class="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-blue-200 hover:bg-blue-50/30"
									>
										<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
											<div class="min-w-0">
												<div class="flex flex-wrap items-center gap-2">
													<h4 class="font-black text-slate-900">
														{eventLabel(event)}
													</h4>

													<span
														class={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${eventBadgeClasses(event)}`}
													>
														{severityLabel(event.severity)}
													</span>
												</div>

												{#if event.title && event.title !== eventLabel(event)}
													<p class="mt-2 text-sm font-bold text-slate-700">
														{event.title}
													</p>
												{/if}

												{#if event.description}
													<p
														class="mt-2 max-w-5xl whitespace-pre-line text-sm leading-6 text-slate-500"
													>
														{event.description}
													</p>
												{/if}

												<div class="mt-4 flex flex-wrap gap-2 text-xs">
													{#if event.category}
														<span
															class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-500"
														>
															{event.category}
														</span>
													{/if}

													{#if event.source_type}
														<span
															class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-500"
														>
															Source : {event.source_type}
														</span>
													{/if}
												</div>
											</div>

											<div
												class="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500"
											>
												<CalendarDays size={14} />
												<time datetime={event.event_date}>
													{formatTime(event.event_date)}
												</time>
											</div>
										</div>
									</div>
								</article>
							{/each}
						</div>
					</div>
				</section>
			{/each}
		</div>

		{#if filteredEvents.length > 8}
			<div class="mt-8 flex justify-center border-t border-slate-200 pt-6">
				<button
					type="button"
					onclick={() => (expanded = !expanded)}
					class="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-[#0E4C92] hover:bg-blue-50"
				>
					{expanded ? 'Réduire la chronologie' : `Afficher les ${filteredEvents.length} événements`}
				</button>
			</div>
		{/if}
	{/if}
</section>
