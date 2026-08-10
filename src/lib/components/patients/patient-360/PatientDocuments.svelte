<script lang="ts">
	import {
		CalendarDays,
		FileDown,
		FileHeart,
		FileText,
		FlaskConical,
		Pill,
		Search,
		Stethoscope
	} from 'lucide-svelte';

	import type { PatientConsultation } from '$lib/api/patient-consultations';
	import type { PatientSummary } from '$lib/types/patient-summary';

	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';

	import {
		openConsultationDocument,
		type ConsultationDocumentType
	} from '$lib/api/consultation-documents';

	type DocumentType = 'prescription' | 'exam-request' | 'sick-leave';

	interface PatientDocumentItem {
		key: string;
		consultationId: number;
		type: DocumentType;
		title: string;
		description: string;
		date: string;
		service: string;
		doctorName: string;
	}

	interface Props {
		consultations: PatientConsultation[];
		summary: PatientSummary | null;
	}

	let { consultations, summary }: Props = $props();

	let search = $state('');
	let typeFilter = $state<'all' | DocumentType>('all');

	const documents = $derived.by<PatientDocumentItem[]>(() => {
		const items: PatientDocumentItem[] = [];

		for (const consultation of consultations) {
			const date = consultation.startedAt ?? consultation.completedAt ?? consultation.createdAt;

			if ((consultation.prescriptions?.length ?? 0) > 0) {
				items.push({
					key: `${consultation.id}-prescription`,
					consultationId: consultation.id,
					type: 'prescription',
					title: 'Ordonnance médicale',
					description: `${consultation.prescriptions.length} médicament(s) prescrit(s)`,
					date,
					service: consultation.service,
					doctorName: consultation.doctorName
				});
			}

			if ((consultation.exams?.length ?? 0) > 0) {
				items.push({
					key: `${consultation.id}-exam-request`,
					consultationId: consultation.id,
					type: 'exam-request',
					title: 'Demande d’examens',
					description: `${consultation.exams.length} examen(s) demandé(s)`,
					date,
					service: consultation.service,
					doctorName: consultation.doctorName
				});
			}

			if (consultation.sickLeaveRequired) {
				items.push({
					key: `${consultation.id}-sick-leave`,
					consultationId: consultation.id,
					type: 'sick-leave',
					title: 'Repos maladie',
					description:
						consultation.sickLeaveDays > 0
							? `${consultation.sickLeaveDays} jour(s) de repos`
							: 'Repos médical prescrit',
					date,
					service: consultation.service,
					doctorName: consultation.doctorName
				});
			}
		}

		return items.sort(
			(first, second) => new Date(second.date).getTime() - new Date(first.date).getTime()
		);
	});

	const filteredDocuments = $derived.by(() => {
		const query = search.trim().toLowerCase();

		return documents.filter((document) => {
			const matchesType = typeFilter === 'all' || document.type === typeFilter;

			const matchesSearch =
				!query ||
				document.title.toLowerCase().includes(query) ||
				document.description.toLowerCase().includes(query) ||
				document.service.toLowerCase().includes(query) ||
				document.doctorName.toLowerCase().includes(query);

			return matchesType && matchesSearch;
		});
	});

	const prescriptionDocumentCount = $derived(
		documents.filter((document) => document.type === 'prescription').length
	);

	const examDocumentCount = $derived(
		documents.filter((document) => document.type === 'exam-request').length
	);

	const sickLeaveDocumentCount = $derived(
		documents.filter((document) => document.type === 'sick-leave').length
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

	function documentTypeLabel(type: DocumentType): string {
		switch (type) {
			case 'prescription':
				return 'Ordonnance';

			case 'exam-request':
				return 'Examens';

			case 'sick-leave':
				return 'Repos maladie';
		}
	}

	function documentTypeClass(type: DocumentType): string {
		switch (type) {
			case 'prescription':
				return 'bg-orange-50 text-orange-700';

			case 'exam-request':
				return 'bg-violet-50 text-violet-700';

			case 'sick-leave':
				return 'bg-blue-50 text-blue-700';
		}
	}

	let openingDocumentKey = $state<string | null>(null);
	let documentError = $state('');

	async function openDocument(document: PatientDocumentItem): Promise<void> {
		openingDocumentKey = document.key;
		documentError = '';

		try {
			await openConsultationDocument(
				document.consultationId,
				document.type as ConsultationDocumentType
			);
		} catch (error: unknown) {
			documentError = error instanceof Error ? error.message : 'Impossible d’ouvrir le document.';
		} finally {
			openingDocumentKey = null;
		}
	}
</script>

<div class="space-y-6">
	<div>
		<p class="text-xs font-black uppercase tracking-[0.2em] text-[#0E4C92]">Archives médicales</p>

		<h2 class="mt-2 text-2xl font-black text-slate-900">Documents</h2>

		<p class="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
			Ordonnances, demandes d’examens, repos maladie et documents générés depuis le parcours
			clinique.
		</p>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<div class="rounded-2xl border border-slate-200 bg-white p-5">
			<p class="text-xs font-black uppercase text-slate-400">Documents générés</p>

			<p class="mt-2 text-3xl font-black text-slate-900">
				{documents.length}
			</p>
		</div>

		<div class="rounded-2xl border border-orange-200 bg-orange-50 p-5">
			<p class="text-xs font-black uppercase text-orange-500">Ordonnances</p>

			<p class="mt-2 text-3xl font-black text-orange-900">
				{prescriptionDocumentCount}
			</p>
		</div>

		<div class="rounded-2xl border border-violet-200 bg-violet-50 p-5">
			<p class="text-xs font-black uppercase text-violet-500">Demandes d’examens</p>

			<p class="mt-2 text-3xl font-black text-violet-900">
				{examDocumentCount}
			</p>
		</div>

		<div class="rounded-2xl border border-blue-200 bg-blue-50 p-5">
			<p class="text-xs font-black uppercase text-blue-500">Repos maladie</p>

			<p class="mt-2 text-3xl font-black text-blue-900">
				{sickLeaveDocumentCount}
			</p>
		</div>
	</div>

	<Card
		title="Bibliothèque documentaire"
		subtitle={`${filteredDocuments.length} document(s) affiché(s)`}
	>
		<div class="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
			<div class="relative w-full max-w-xl">
				<Search size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

				<input
					bind:value={search}
					placeholder="Rechercher un document, service, médecin..."
					class="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#0E4C92] focus:bg-white"
				/>
			</div>

			<select
				bind:value={typeFilter}
				aria-label="Filtrer les documents par type"
				class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600"
			>
				<option value="all">Tous les documents</option>
				<option value="prescription">Ordonnances</option>
				<option value="exam-request">Demandes d’examens</option>
				<option value="sick-leave">Repos maladie</option>
			</select>
		</div>

		{#if filteredDocuments.length === 0}
			<div
				class="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center"
			>
				<div
					class="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-[#0E4C92]"
				>
					<FileHeart size={28} />
				</div>

				<h3 class="mt-5 text-xl font-black text-slate-900">Aucun document trouvé</h3>

				<p class="mt-2 max-w-md text-sm leading-6 text-slate-500">
					Les documents générés pendant les consultations apparaîtront automatiquement ici.
				</p>
			</div>
		{:else}
			<div class="space-y-4">
				{#each filteredDocuments as document (document.key)}
					<article
						class="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm lg:flex-row lg:items-center lg:justify-between"
					>
						<div class="flex min-w-0 items-start gap-4">
							<div
								class={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${documentTypeClass(
									document.type
								)}`}
							>
								{#if document.type === 'prescription'}
									<Pill size={21} />
								{:else if document.type === 'exam-request'}
									<FlaskConical size={21} />
								{:else}
									<Stethoscope size={21} />
								{/if}
							</div>

							<div class="min-w-0">
								<div class="flex flex-wrap items-center gap-2">
									<h3 class="text-lg font-black text-slate-900">
										{document.title}
									</h3>

									<span
										class={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${documentTypeClass(
											document.type
										)}`}
									>
										{documentTypeLabel(document.type)}
									</span>
								</div>

								<p class="mt-1 text-sm text-slate-500">
									{document.description}
								</p>

								<div
									class="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500"
								>
									<span class="inline-flex items-center gap-1.5">
										<CalendarDays size={14} />
										{formatDate(document.date)}
									</span>

									<span>
										{document.service || 'Service non renseigné'}
									</span>

									<span>
										{document.doctorName || 'Médecin non renseigné'}
									</span>

									<span>
										Consultation #{document.consultationId}
									</span>
								</div>
							</div>
						</div>

						<Button
							variant="secondary"
							disabled={openingDocumentKey === document.key}
							onclick={() => void openDocument(document)}
						>
							<FileDown size={16} />

							{openingDocumentKey === document.key ? 'Ouverture...' : 'Ouvrir le PDF'}
						</Button>
					</article>
				{/each}
			</div>
		{/if}
	</Card>
	{#if documentError}
		<div
			class="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
		>
			{documentError}
		</div>
	{/if}
	<div class="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
		<FileText size={18} class="mt-0.5 shrink-0 text-blue-700" />

		<div>
			<p class="text-sm font-bold text-blue-900">Documents médicaux enregistrés</p>

			<p class="mt-1 text-sm leading-6 text-blue-700">
				Le résumé du patient indique actuellement
				{summary?.statistics.documents ?? 0} document(s) médical(aux) dans son dossier.
			</p>
		</div>
	</div>
</div>
