<script lang="ts">
	import { onMount } from 'svelte';
	import { Plus, Save, Trash2, CheckCircle2, FlaskConical } from 'lucide-svelte';

	import { getMedicalExams, updateConsultation } from '$lib/api/consultations';

	import type { ConsultationExam, MedicalExam } from '$lib/types/consultation';

	type Props = {
		consultationId: number;
		initialExams?: ConsultationExam[];
		onSaved?: () => void;
	};

	let { consultationId, initialExams = [], onSaved }: Props = $props();

	let exams = $state<MedicalExam[]>([]);
	let selectedExamIds = $state<number[]>([]);

	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');
	let success = $state('');

	const activeExams = $derived(exams.filter((exam) => exam.isActive));

	const selectedExams = $derived(
		selectedExamIds
			.map((id) => exams.find((exam) => exam.id === id))
			.filter((exam): exam is MedicalExam => Boolean(exam))
	);

	const availableExams = $derived(activeExams.filter((exam) => !selectedExamIds.includes(exam.id)));

	onMount(async () => {
		try {
			exams = await getMedicalExams();

			selectedExamIds = initialExams.map((exam) => exam.id);
		} catch {
			error = 'Impossible de charger le référentiel des examens.';
		} finally {
			loading = false;
		}
	});

	function addExam(examId: number) {
		if (!examId || selectedExamIds.includes(examId)) {
			return;
		}

		selectedExamIds = [...selectedExamIds, examId];
		error = '';
		success = '';
	}

	function removeExam(examId: number) {
		selectedExamIds = selectedExamIds.filter((id) => id !== examId);
		error = '';
		success = '';
	}

	async function saveExams() {
		error = '';
		success = '';
		saving = true;

		try {
			await updateConsultation(consultationId, {
				examIds: selectedExamIds
			});

			success = 'Examens enregistrés avec succès.';
			onSaved?.();
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Impossible d’enregistrer les examens.';
		} finally {
			saving = false;
		}
	}
</script>

<section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
	<div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.18em] text-[#0E4C92]">Investigations</p>

			<h3 class="mt-1 text-xl font-black text-slate-900">Examens complémentaires</h3>

			<p class="mt-2 text-sm text-slate-500">
				Sélectionnez les examens de laboratoire, d’imagerie ou fonctionnels.
			</p>
		</div>

		<button
			type="button"
			onclick={saveExams}
			disabled={saving || loading}
			class="inline-flex items-center gap-2 rounded-xl bg-[#0E4C92] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0b3d75] disabled:cursor-not-allowed disabled:opacity-60"
		>
			<Save size={18} />
			{saving ? 'Enregistrement...' : 'Enregistrer'}
		</button>
	</div>

	{#if error}
		<div
			class="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
		>
			{error}
		</div>
	{/if}

	{#if success}
		<div
			class="mt-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700"
		>
			<CheckCircle2 size={19} />
			{success}
		</div>
	{/if}

	{#if loading}
		<div class="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
			<p class="text-sm font-bold text-slate-500">Chargement du référentiel des examens...</p>
		</div>
	{:else}
		<div class="mt-6 space-y-5">
			<div class="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
				<label for="exam-selector" class="mb-2 block text-sm font-bold text-slate-700">
					Ajouter un examen
				</label>

				<div class="flex flex-col gap-3 md:flex-row">
					<select
						id="exam-selector"
						class="h-12 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
						onchange={(event) => {
							const target = event.currentTarget;
							const examId = Number(target.value);

							addExam(examId);
							target.value = '';
						}}
					>
						<option value=""> Sélectionner un examen </option>

						{#each availableExams as exam (exam.id)}
							<option value={exam.id}>
								{exam.name}
								{exam.category ? ` · ${exam.category}` : ''}
							</option>
						{/each}
					</select>

					<div
						class="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-[#0E4C92]"
					>
						<Plus size={17} />
						{availableExams.length} disponible(s)
					</div>
				</div>
			</div>

			{#if selectedExams.length === 0}
				<div class="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
					<div
						class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#0E4C92]"
					>
						<FlaskConical size={22} />
					</div>

					<p class="mt-4 text-sm font-black text-slate-800">Aucun examen sélectionné</p>

					<p class="mt-1 text-sm text-slate-500">
						Ajoutez les examens nécessaires à la prise en charge.
					</p>
				</div>
			{:else}
				<div class="overflow-hidden rounded-2xl border border-slate-200">
					<div
						class="hidden grid-cols-[1.3fr_1fr_140px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 md:grid"
					>
						<p class="text-sm font-black text-slate-700">Examen</p>
						<p class="text-sm font-black text-slate-700">Catégorie</p>
						<p class="text-center text-sm font-black text-slate-700">Action</p>
					</div>

					{#each selectedExams as exam (exam.id)}
						<div
							class="grid gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0 md:grid-cols-[1.3fr_1fr_140px] md:items-center"
						>
							<div>
								<p class="font-black text-slate-900">
									{exam.name}
								</p>

								{#if exam.code}
									<p class="mt-1 text-xs text-slate-500">
										Code : {exam.code}
									</p>
								{/if}
							</div>

							<div>
								<span
									class="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#0E4C92]"
								>
									{exam.category || 'Non catégorisé'}
								</span>
							</div>

							<div class="flex justify-end md:justify-center">
								<button
									type="button"
									onclick={() => removeExam(exam.id)}
									aria-label={`Supprimer l’examen ${exam.name}`}
									title="Supprimer"
									class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500 transition hover:border-red-200 hover:bg-red-100 hover:text-red-600"
								>
									<Trash2 size={17} />
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</section>
