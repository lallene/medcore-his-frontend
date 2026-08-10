<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import { CalendarDays, Eye, FileDown, FlaskConical, Search, Stethoscope } from 'lucide-svelte';

	import type { PatientConsultation } from '$lib/api/patient-consultations';

	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';

	import { openConsultationDocument } from '$lib/api/consultation-documents';

	interface Props {
		patientId: number;
		consultations: PatientConsultation[];
	}

	interface PatientExamItem {
		key: string;
		id: number;
		consultationId: number;
		code: string;
		name: string;
		category: string;
		isActive: boolean;
		service: string;
		doctorName: string;
		date: string;
		consultationStatus: PatientConsultation['status'];
	}

	let { patientId, consultations }: Props = $props();

	let search = $state('');
	let categoryFilter = $state('all');

	const exams = $derived.by<PatientExamItem[]>(() =>
		consultations
			.flatMap((consultation) =>
				(consultation.exams ?? []).map((exam) => ({
					key: `${consultation.id}-${exam.id}`,
					id: exam.id,
					consultationId: consultation.id,
					code: exam.code,
					name: exam.name,
					category: exam.category,
					isActive: exam.isActive,
					service: consultation.service,
					doctorName: consultation.doctorName,
					date: consultation.startedAt ?? consultation.completedAt ?? consultation.createdAt,
					consultationStatus: consultation.status
				}))
			)
			.sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())
	);

	const categories = $derived.by(() => [
		...new Set(
			exams
				.map((exam) => exam.category?.trim())
				.filter((category): category is string => Boolean(category))
		)
	]);

	const filteredExams = $derived.by(() => {
		const query = search.trim().toLowerCase();

		return exams.filter((exam) => {
			const matchesSearch =
				query.length === 0 ||
				exam.name.toLowerCase().includes(query) ||
				exam.code.toLowerCase().includes(query) ||
				exam.service.toLowerCase().includes(query) ||
				exam.doctorName.toLowerCase().includes(query);

			const matchesCategory = categoryFilter === 'all' || exam.category === categoryFilter;

			return matchesSearch && matchesCategory;
		});
	});

	const laboratoryCount = $derived(
		exams.filter((exam) => exam.category?.toLowerCase().includes('laboratoire')).length
	);

	const imagingCount = $derived(
		exams.filter((exam) => {
			const category = exam.category?.toLowerCase() ?? '';

			return category.includes('imagerie') || category.includes('radiologie');
		}).length
	);

	function formatDate(value: string): string {
		const date = new Date(value);

		if (Number.isNaN(date.getTime())) {
			return 'Date non renseignée';
		}

		return new Intl.DateTimeFormat('fr-FR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	}

	function consultationStatusLabel(status: PatientConsultation['status']): string {
		switch (status) {
			case 'draft':
				return 'Brouillon';

			case 'in_progress':
				return 'En cours';

			case 'completed':
				return 'Terminée';

			case 'cancelled':
				return 'Annulée';
		}
	}

	function consultationStatusClass(status: PatientConsultation['status']): string {
		switch (status) {
			case 'draft':
				return 'bg-slate-100 text-slate-700';

			case 'in_progress':
				return 'bg-blue-50 text-blue-700';

			case 'completed':
				return 'bg-emerald-50 text-emerald-700';

			case 'cancelled':
				return 'bg-red-50 text-red-700';
		}
	}

	function openConsultation(consultationId: number): void {
		void goto(resolve(`/consultations/${consultationId}`));
	}

	function createConsultation(): void {
		void goto(resolve(`/patients/${patientId}/consultations/create`));
	}

	let openingPdfConsultationId = $state<number | null>(null);
	async function openExamRequestPdf(consultationId: number): Promise<void> {
		openingPdfConsultationId = consultationId;

		try {
			await openConsultationDocument(consultationId, 'exam-request');
		} catch (error) {
			console.error(error);
		} finally {
			openingPdfConsultationId = null;
		}
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.2em] text-violet-700">
				Explorations médicales
			</p>

			<h2 class="mt-2 text-2xl font-black text-slate-900">Examens demandés</h2>

			<p class="mt-1 text-sm leading-6 text-slate-500">
				Examens de laboratoire, d’imagerie et explorations prescrits pendant les consultations.
			</p>
		</div>

		<Button onclick={createConsultation}>
			<Stethoscope size={16} />
			Nouvelle consultation
		</Button>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<div class="rounded-2xl border border-violet-200 bg-violet-50 p-5">
			<p class="text-xs font-black uppercase text-violet-500">Total examens</p>

			<p class="mt-2 text-3xl font-black text-violet-900">
				{exams.length}
			</p>
		</div>

		<div class="rounded-2xl border border-blue-200 bg-blue-50 p-5">
			<p class="text-xs font-black uppercase text-blue-500">Laboratoire</p>

			<p class="mt-2 text-3xl font-black text-blue-900">
				{laboratoryCount}
			</p>
		</div>

		<div class="rounded-2xl border border-cyan-200 bg-cyan-50 p-5">
			<p class="text-xs font-black uppercase text-cyan-600">Imagerie</p>

			<p class="mt-2 text-3xl font-black text-cyan-900">
				{imagingCount}
			</p>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-white p-5">
			<p class="text-xs font-black uppercase text-slate-400">Consultations concernées</p>

			<p class="mt-2 text-3xl font-black text-slate-900">
				{new Set(exams.map((exam) => exam.consultationId)).size}
			</p>
		</div>
	</div>

	<Card title="Historique des examens" subtitle={`${filteredExams.length} résultat(s) affiché(s)`}>
		<div class="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
			<div class="relative w-full max-w-xl">
				<Search size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

				<input
					bind:value={search}
					placeholder="Rechercher un examen, code, médecin..."
					class="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-violet-500 focus:bg-white"
				/>
			</div>

			<select
				bind:value={categoryFilter}
				aria-label="Filtrer les examens par catégorie"
				class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600"
			>
				<option value="all">Toutes les catégories</option>

				{#each categories as category (category)}
					<option value={category}>{category}</option>
				{/each}
			</select>
		</div>

		{#if filteredExams.length === 0}
			<div
				class="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center"
			>
				<div
					class="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-700"
				>
					<FlaskConical size={28} />
				</div>

				<h3 class="mt-5 text-xl font-black text-slate-900">Aucun examen trouvé</h3>

				<p class="mt-2 text-sm text-slate-500">
					Modifiez vos filtres ou créez une nouvelle consultation.
				</p>
			</div>
		{:else}
			<div class="space-y-4">
				{#each filteredExams as exam (exam.key)}
					<article
						class="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-violet-300 hover:shadow-sm"
					>
						<div class="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
							<div class="flex min-w-0 flex-1 gap-4">
								<div
									class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700"
								>
									<FlaskConical size={21} />
								</div>

								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-center gap-2">
										<h3 class="text-lg font-black text-slate-900">
											{exam.name}
										</h3>

										<span
											class="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-violet-700"
										>
											{exam.category || 'Examen'}
										</span>

										<span
											class={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${consultationStatusClass(
												exam.consultationStatus
											)}`}
										>
											{consultationStatusLabel(exam.consultationStatus)}
										</span>
									</div>

									<p class="mt-2 text-sm font-semibold text-slate-500">
										Code {exam.code || '—'}
									</p>

									<div class="mt-4 grid gap-4 md:grid-cols-3">
										<div>
											<p class="text-[10px] font-black uppercase tracking-wide text-slate-400">
												Date
											</p>

											<p class="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-700">
												<CalendarDays size={14} />
												{formatDate(exam.date)}
											</p>
										</div>

										<div>
											<p class="text-[10px] font-black uppercase tracking-wide text-slate-400">
												Service
											</p>

											<p class="mt-1 text-sm font-bold text-slate-700">
												{exam.service || '—'}
											</p>
										</div>

										<div>
											<p class="text-[10px] font-black uppercase tracking-wide text-slate-400">
												Médecin
											</p>

											<p class="mt-1 text-sm font-bold text-slate-700">
												{exam.doctorName || '—'}
											</p>
										</div>
									</div>
								</div>
							</div>

							<div class="flex shrink-0 flex-wrap gap-2">
								<Button variant="secondary" onclick={() => openConsultation(exam.consultationId)}>
									<Eye size={16} />
									Voir
								</Button>

								<Button
									variant="secondary"
									disabled={openingPdfConsultationId === exam.consultationId}
									onclick={() => void openExamRequestPdf(exam.consultationId)}
								>
									<FileDown size={16} />

									{openingPdfConsultationId === exam.consultationId ? 'Ouverture...' : 'PDF'}
								</Button>
							</div>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</Card>
</div>
