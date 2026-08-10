<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { SvelteMap } from 'svelte/reactivity';
	import {
		Activity,
		CalendarDays,
		FileHeart,
		FileText,
		Filter,
		FlaskConical,
		History,
		Pill,
		Search,
		Stethoscope
	} from 'lucide-svelte';

	import type { ClinicalTimelineEvent } from '$lib/types/clinical-timeline';
	import Card from '$lib/components/ui/Card.svelte';
	import { normalizeMedicalTimeline } from './patient-360-data';

	interface Props {
		events: ClinicalTimelineEvent[];
	}

	interface TimelineGroup {
		key: string;
		label: string;
		events: ClinicalTimelineEvent[];
	}

	let { events }: Props = $props();
	let search = $state('');
	let categoryFilter = $state('all');

	const timelineEvents = $derived(normalizeMedicalTimeline(events));
	const categories = $derived([
		...new Set(timelineEvents.map((event) => event.category).filter(Boolean))
	]);

	const filteredEvents = $derived.by(() => {
		const query = search.trim().toLowerCase();
		return timelineEvents.filter((event) => {
			const matchesCategory = categoryFilter === 'all' || event.category === categoryFilter;
			const matchesSearch =
				!query ||
				[event.title, event.description, event.category, event.event_type]
					.join(' ')
					.toLowerCase()
					.includes(query);
			return matchesCategory && matchesSearch;
		});
	});

	const groupedEvents = $derived.by<TimelineGroup[]>(() => {
		const groups = new SvelteMap<string, ClinicalTimelineEvent[]>();
		for (const event of filteredEvents) {
			const date = new Date(event.event_date);
			const key = Number.isNaN(date.getTime()) ? 'unknown' : event.event_date.slice(0, 10);
			groups.set(key, [...(groups.get(key) ?? []), event]);
		}
		return [...groups.entries()].map(([key, grouped]) => ({
			key,
			label: key === 'unknown' ? 'Date non renseignée' : formatDate(grouped[0]?.event_date),
			events: grouped
		}));
	});

	const consultationCount = $derived(
		timelineEvents.filter((event) => event.category === 'consultation').length
	);
	const prescriptionCount = $derived(
		timelineEvents.filter((event) => event.category === 'prescription').length
	);
	const examCount = $derived(timelineEvents.filter((event) => event.category === 'exam').length);
	const recordCount = $derived(
		timelineEvents.filter((event) =>
			['medical_record', 'allergy', 'medical_history', 'vital_sign', 'document'].includes(
				event.category
			)
		).length
	);

	function formatDate(value?: string): string {
		if (!value) return 'Date non renseignée';
		const date = new Date(value);
		return Number.isNaN(date.getTime())
			? 'Date non renseignée'
			: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(date);
	}

	function formatTime(value: string): string {
		const date = new Date(value);
		return Number.isNaN(date.getTime())
			? '—'
			: new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date);
	}

	function categoryLabel(value: string): string {
		return (
			{
				consultation: 'Consultation',
				prescription: 'Prescription',
				exam: 'Examen',
				allergy: 'Allergie',
				medical_history: 'Antécédent',
				medical_record: 'Dossier médical',
				vital_sign: 'Constantes',
				document: 'Document'
			}[value] ?? value.replaceAll('_', ' ')
		);
	}

	function canOpenConsultation(event: ClinicalTimelineEvent): boolean {
		return event.reference_type === 'consultation' && (event.reference_id ?? 0) > 0;
	}

	function openReference(event: ClinicalTimelineEvent): void {
		if (canOpenConsultation(event)) void goto(resolve(`/consultations/${event.reference_id}`));
	}
</script>

<div class="space-y-6">
	<div>
		<p class="text-xs font-black uppercase tracking-[0.2em] text-[#0E4C92]">
			Parcours longitudinal
		</p>
		<h2 class="mt-2 text-2xl font-black text-slate-900">Timeline médicale réelle</h2>
		<p class="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
			Événements cliniques enregistrés par le dossier médical backend, dans l’ordre chronologique
			inverse.
		</p>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
		{#each [['Événements', timelineEvents.length, 'slate'], ['Consultations', consultationCount, 'emerald'], ['Prescriptions', prescriptionCount, 'orange'], ['Examens', examCount, 'violet'], ['Dossier médical', recordCount, 'blue']] as metric (metric[0])}
			<div class="rounded-2xl border border-slate-200 bg-white p-5">
				<p class="text-xs font-black uppercase text-slate-400">{metric[0]}</p>
				<p class="mt-2 text-3xl font-black text-slate-900">{metric[1]}</p>
			</div>
		{/each}
	</div>

	<Card
		title="Historique chronologique"
		subtitle={`${filteredEvents.length} événement(s) affiché(s)`}
	>
		<div class="mb-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
			<div class="relative w-full max-w-xl">
				<Search size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
				<input
					bind:value={search}
					placeholder="Rechercher un événement..."
					class="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#0E4C92]"
				/>
			</div>
			<div class="relative">
				<Filter
					size={16}
					class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
				/>
				<select
					bind:value={categoryFilter}
					aria-label="Filtrer la timeline par catégorie"
					class="rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-10 text-sm font-bold text-slate-600"
				>
					<option value="all">Tous les événements</option>
					{#each categories as category (category)}
						<option value={category}>{categoryLabel(category)}</option>
					{/each}
				</select>
			</div>
		</div>

		{#if groupedEvents.length === 0}
			<div
				class="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center"
			>
				<History size={28} class="text-[#0E4C92]" />
				<h3 class="mt-5 text-xl font-black text-slate-900">Aucun événement médical</h3>
				<p class="mt-2 text-sm text-slate-500">
					Aucun événement backend ne correspond à ce dossier ou aux filtres actifs.
				</p>
			</div>
		{:else}
			<div class="space-y-10">
				{#each groupedEvents as group (group.key)}
					<section>
						<div class="mb-5 flex items-center gap-3">
							<CalendarDays size={18} class="text-[#0E4C92]" />
							<h3 class="capitalize font-black text-slate-900">{group.label}</h3>
						</div>
						<div class="space-y-4 border-l border-slate-200 pl-6">
							{#each group.events as event (event.id)}
								<article class="rounded-2xl border border-slate-200 bg-white p-5">
									<div class="flex gap-4">
										<div
											class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0E4C92]"
										>
											{#if event.category === 'consultation'}<Stethoscope size={20} />
											{:else if event.category === 'prescription'}<Pill size={20} />
											{:else if event.category === 'exam'}<FlaskConical size={20} />
											{:else if event.category === 'document'}<FileText size={20} />
											{:else if event.category === 'medical_record'}<FileHeart size={20} />
											{:else}<Activity size={20} />{/if}
										</div>
										<div class="min-w-0 flex-1">
											<div class="flex flex-wrap items-center gap-2">
												<h4 class="font-black text-slate-900">{event.title}</h4>
												<span
													class="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600"
													>{categoryLabel(event.category)}</span
												>
												<span class="text-xs font-semibold text-slate-400"
													>{formatTime(event.event_date)}</span
												>
											</div>
											<p class="mt-2 text-sm leading-6 text-slate-600">
												{event.description || 'Aucun détail complémentaire.'}
											</p>
											<p class="mt-2 text-xs font-semibold text-slate-400">
												Type : {event.event_type} · Sévérité : {event.severity || 'info'}
											</p>
											{#if canOpenConsultation(event)}
												<button
													type="button"
													onclick={() => openReference(event)}
													class="mt-3 text-sm font-black text-[#0E4C92] hover:underline"
													>Ouvrir la consultation</button
												>
											{/if}
										</div>
									</div>
								</article>
							{/each}
						</div>
					</section>
				{/each}
			</div>
		{/if}
	</Card>
</div>
