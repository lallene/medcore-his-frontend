<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { ArrowLeft, Plus, Search, X } from 'lucide-svelte';

	import { getMedicationPresentations } from '$lib/api/pharmacy';
	import { getPatient } from '$lib/api/patients';
	import {
		createConsultation,
		getConsultationReasons,
		getMedicalExams
	} from '$lib/api/consultations';

	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';

	import type { MedicationPresentation } from '$lib/types/pharmacy';
	import type { Patient } from '$lib/types/patient';
	import type {
		ConsultationReason,
		MedicalExam,
		PrescriptionPayload
	} from '$lib/types/consultation';

	let patient = $state<Patient | null>(null);
	let reasons = $state<ConsultationReason[]>([]);
	let exams = $state<MedicalExam[]>([]);
	let presentations = $state<MedicationPresentation[]>([]);

	let loading = $state(true);
	let submitting = $state(false);
	let error = $state('');

	let doctorName = $state('Dr Kouassi');
	let service = $state('Consultation externe');

	let selectedReasonIds = $state<number[]>([]);

	let temperature = $state('');
	let bloodPressureSystolic = $state('');
	let bloodPressureDiastolic = $state('');
	let heartRate = $state('');
	let respiratoryRate = $state('');
	let oxygenSaturation = $state('');
	let weight = $state('');
	let height = $state('');
	let bloodGlucose = $state('');
	let painScore = $state('');

	let diagnosis = $state('');

	let examSearch = $state('');
	let selectedExamIds = $state<number[]>([]);

	let draftSearch = $state('');
	let draftPresentationId = $state(0);
	let draftQuantity = $state('');
	let draftDuration = $state('');
	let draftInstructions = $state('');

	let prescriptions = $state<PrescriptionPayload[]>([]);

	let sickLeaveRequired = $state(false);
	let sickLeaveDays = $state('');

	let hospitalizationRequired = $state(false);
	let hospitalizationReason = $state('');
	let hospitalizationType = $state('médicale');
	let hospitalizationDuration = $state('');
	let reasonSearch = $state('');

	onMount(async () => {
		try {
			const patientId = Number(page.params.id);

			const [patientData, reasonData, examData, presentationData] = await Promise.all([
				getPatient(patientId),
				getConsultationReasons(),
				getMedicalExams(),
				getMedicationPresentations()
			]);

			patient = patientData;
			reasons = reasonData.filter((item) => item.isActive);
			exams = examData.filter((item) => item.isActive);
			presentations = presentationData.filter((item) => item.isActive);
		} catch {
			error = 'Impossible de charger les données de consultation.';
		} finally {
			loading = false;
		}
	});

	function toNumber(value: string): number | null {
		if (value === '') return null;

		const parsed = Number(value);

		return Number.isNaN(parsed) ? null : parsed;
	}

	function getFilteredExams() {
		const search = examSearch.trim().toLowerCase();

		return exams
			.filter((exam) => !selectedExamIds.includes(exam.id))
			.filter((exam) => {
				if (search === '') return true;

				return `${exam.name} ${exam.category}`.toLowerCase().includes(search);
			})
			.slice(0, 8);
	}

	function addExam(exam: MedicalExam) {
		selectedExamIds = [...selectedExamIds, exam.id];
		examSearch = '';
	}

	function removeExam(id: number) {
		selectedExamIds = selectedExamIds.filter((item) => item !== id);
	}

	function getExamById(id: number) {
		return exams.find((exam) => exam.id === id);
	}

	function getFilteredPresentations() {
		const search = draftSearch.trim().toLowerCase();

		if (search === '') {
			return presentations.slice(0, 10);
		}

		return presentations
			.filter((presentation) => {
				const label = [
					presentation.medication.name,
					presentation.dosage,
					presentation.form,
					presentation.route
				]
					.join(' ')
					.toLowerCase();

				return label.includes(search);
			})
			.slice(0, 10);
	}

	function selectDraftPresentation(presentation: MedicationPresentation) {
		draftPresentationId = presentation.id;

		draftSearch =
			`${presentation.medication.name} — ` +
			`${presentation.dosage} — ` +
			`${presentation.form} — ` +
			`${presentation.route}`;
	}

	function resetDraft() {
		draftSearch = '';
		draftPresentationId = 0;
		draftQuantity = '';
		draftDuration = '';
		draftInstructions = '';
	}

	function addPrescriptionLine() {
		const quantity = Number(draftQuantity || 0);

		if (
			draftPresentationId === 0 ||
			quantity <= 0 ||
			draftDuration.trim() === '' ||
			draftInstructions.trim() === ''
		) {
			return;
		}

		prescriptions = [
			...prescriptions,
			{
				presentationId: draftPresentationId,
				quantity,
				duration: draftDuration.trim(),
				instructions: draftInstructions.trim()
			}
		];

		resetDraft();
	}

	function removePrescription(index: number) {
		prescriptions = prescriptions.filter((_, itemIndex) => itemIndex !== index);
	}

	function getPresentationById(id: number) {
		return presentations.find((presentation) => presentation.id === id);
	}

	function getFilteredReasons() {
		const search = reasonSearch.trim().toLowerCase();

		return reasons
			.filter((reason) => !selectedReasonIds.includes(reason.id))
			.filter((reason) => {
				if (search === '') return true;

				return `${reason.name} ${reason.category}`.toLowerCase().includes(search);
			})
			.slice(0, 8);
	}

	function addReason(reason: ConsultationReason) {
		selectedReasonIds = [...selectedReasonIds, reason.id];
		reasonSearch = '';
	}

	function removeReason(id: number) {
		selectedReasonIds = selectedReasonIds.filter((item) => item !== id);
	}

	function getReasonById(id: number) {
		return reasons.find((reason) => reason.id === id);
	}

	async function submit() {
		if (!patient) return;

		if (selectedReasonIds.length === 0) {
			error = 'Veuillez sélectionner au moins un motif.';
			return;
		}

		submitting = true;
		error = '';

		try {
			await createConsultation({
				patientId: patient.id,
				doctorName,
				service,
				reasonIds: selectedReasonIds,

				vitals: {
					temperature: toNumber(temperature),
					bloodPressureSystolic: toNumber(bloodPressureSystolic),
					bloodPressureDiastolic: toNumber(bloodPressureDiastolic),
					heartRate: toNumber(heartRate),
					respiratoryRate: toNumber(respiratoryRate),
					oxygenSaturation: toNumber(oxygenSaturation),
					weight: toNumber(weight),
					height: toNumber(height),
					bloodGlucose: toNumber(bloodGlucose),
					painScore: toNumber(painScore)
				},

				diagnosis,
				observations: '',
				treatment: '',

				sickLeaveRequired,
				sickLeaveDays: sickLeaveRequired ? Number(sickLeaveDays || 0) : 0,

				examIds: selectedExamIds,

				prescriptions: prescriptions.filter((item) => item.presentationId > 0 && item.quantity > 0),

				hospitalizationRequired,

				hospitalizationReason: hospitalizationRequired ? hospitalizationReason : '',

				hospitalizationType: hospitalizationRequired ? hospitalizationType : '',

				hospitalizationDuration: hospitalizationRequired ? Number(hospitalizationDuration || 0) : 0
			});

			await goto(resolve(`/patients/${patient.id}`));
		} catch {
			error = 'Impossible de créer la consultation.';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Nouvelle consultation | MedCore HIS</title>
</svelte:head>

{#if loading}
	<div class="flex min-h-64 items-center justify-center">
		<p class="text-sm text-slate-500">Chargement...</p>
	</div>
{:else if patient}
	{@const p = patient}

	<div class="space-y-3">
		<!-- En-tête compact -->
		<section
			class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between"
		>
			<div class="flex items-center gap-3">
				<button
					type="button"
					class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
					onclick={() => goto(resolve(`/patients/${p.id}`))}
					aria-label="Retour au patient"
				>
					<ArrowLeft size={17} />
				</button>

				<div>
					<div class="flex flex-wrap items-center gap-2">
						<h1 class="text-lg font-bold text-slate-900">Nouvelle consultation</h1>

						<span class="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
							Brouillon
						</span>
					</div>

					<p class="mt-0.5 text-xs text-slate-500">
						{p.nom}
						{p.prenoms}
					</p>
				</div>
			</div>

			<div class="flex flex-wrap items-center gap-2">
				<div class="rounded-lg bg-slate-50 px-3 py-1.5 text-xs">
					<span class="text-slate-400">Médecin :</span>
					<span class="ml-1 font-semibold text-slate-700">
						{doctorName}
					</span>
				</div>

				<div class="rounded-lg bg-slate-50 px-3 py-1.5 text-xs">
					<span class="text-slate-400">Service :</span>
					<span class="ml-1 font-semibold text-slate-700">
						{service}
					</span>
				</div>
			</div>
		</section>

		{#if error}
			<div class="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700">
				{error}
			</div>
		{/if}

		<!-- Informations patient -->
		<Card title="Informations patient" subtitle="Identité et dossier médical" size="compact">
			<div class="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
				<div class="rounded-lg bg-slate-50 px-3 py-2">
					<p class="text-slate-400">Patient</p>
					<p class="font-semibold text-slate-800">{p.nom} {p.prenoms}</p>
				</div>

				<div class="rounded-lg bg-slate-50 px-3 py-2">
					<p class="text-slate-400">Dossier</p>
					<p class="font-semibold text-slate-800">{p.numeroDossier || `PAT-${p.id}`}</p>
				</div>

				<div class="rounded-lg bg-slate-50 px-3 py-2">
					<p class="text-slate-400">Sexe</p>
					<p class="font-semibold text-slate-800">{p.sexe || '—'}</p>
				</div>

				<div class="rounded-lg bg-slate-50 px-3 py-2">
					<p class="text-slate-400">Âge</p>
					<p class="font-semibold text-slate-800">{p.age ? `${p.age} ans` : '—'}</p>
				</div>

				<div class="rounded-lg bg-slate-50 px-3 py-2">
					<p class="text-slate-400">Téléphone</p>
					<p class="font-semibold text-slate-800">{p.telephone || '—'}</p>
				</div>

				<div class="rounded-lg bg-slate-50 px-3 py-2">
					<p class="text-slate-400">Assurance</p>
					<p class="font-semibold text-slate-800">
						{p.isAssure ? `Oui · ${p.tauxCouverture}%` : 'Non'}
					</p>
				</div>
			</div>
		</Card>

		<!-- Constantes -->
		<Card title="Constantes vitales" subtitle="Saisie rapide" size="compact">
			<div class="-mx-1 overflow-x-auto pb-1">
				<div class="flex min-w-max gap-2 px-1">
					{#each [{ label: 'Temp.', unit: '°C', get: () => temperature, set: (v: string) => (temperature = v) }, { label: 'TA Sys.', unit: 'mmHg', get: () => bloodPressureSystolic, set: (v: string) => (bloodPressureSystolic = v) }, { label: 'TA Dia.', unit: 'mmHg', get: () => bloodPressureDiastolic, set: (v: string) => (bloodPressureDiastolic = v) }, { label: 'Pouls', unit: 'bpm', get: () => heartRate, set: (v: string) => (heartRate = v) }, { label: 'Resp.', unit: '/min', get: () => respiratoryRate, set: (v: string) => (respiratoryRate = v) }, { label: 'SpO₂', unit: '%', get: () => oxygenSaturation, set: (v: string) => (oxygenSaturation = v) }, { label: 'Glyc.', unit: 'g/L', get: () => bloodGlucose, set: (v: string) => (bloodGlucose = v) }, { label: 'Poids', unit: 'kg', get: () => weight, set: (v: string) => (weight = v) }, { label: 'Taille', unit: 'cm', get: () => height, set: (v: string) => (height = v) }, { label: 'Douleur', unit: '/10', get: () => painScore, set: (v: string) => (painScore = v) }] as field (field.label)}
						<div class="w-[92px] shrink-0">
							<label
								for={`vital-${field.label}`}
								class="mb-1 block truncate text-[10px] font-semibold text-slate-500"
							>
								{field.label}
								<span class="font-normal text-slate-400">
									{field.unit}
								</span>
							</label>

							<input
								id={`vital-${field.label}`}
								class="h-9 w-full rounded-lg border border-slate-200 px-2 text-sm outline-none transition focus:border-[#0E4C92]"
								type="number"
								value={field.get()}
								oninput={(e) => field.set(e.currentTarget.value)}
							/>
						</div>
					{/each}
				</div>
			</div>
		</Card>
		<div class="grid gap-3 xl:grid-cols-2">
			<!-- Motifs de consultation -->
			<Card title="Motifs de consultation" subtitle="Recherche et ajout rapide" size="compact">
				<div class="space-y-3">
					<div class="relative">
						<div class="relative">
							<Search
								size={15}
								class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
							/>

							<input
								id="reason-search"
								class="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none transition focus:border-[#0E4C92]"
								value={reasonSearch}
								placeholder="Rechercher un motif : fièvre, douleur, fatigue..."
								oninput={(e) => (reasonSearch = e.currentTarget.value)}
							/>
						</div>

						{#if reasonSearch}
							<div
								class="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
							>
								{#each getFilteredReasons() as reason (reason.id)}
									<button
										type="button"
										class="flex w-full items-center justify-between border-b border-slate-100 px-3 py-2 text-left transition last:border-0 hover:bg-blue-50"
										onclick={() => addReason(reason)}
									>
										<span class="text-sm font-medium text-slate-800">
											{reason.name}
										</span>

										<span class="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
											{reason.category}
										</span>
									</button>
								{:else}
									<p class="px-3 py-3 text-sm text-slate-400">Aucun motif trouvé.</p>
								{/each}
							</div>
						{/if}
					</div>

					{#if selectedReasonIds.length > 0}
						<div class="flex flex-wrap gap-1.5">
							{#each selectedReasonIds as reasonId (reasonId)}
								{@const reason = getReasonById(reasonId)}

								{#if reason}
									<span
										class="flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-800"
									>
										{reason.name}

										<button
											type="button"
											class="text-emerald-400 transition hover:text-red-600"
											onclick={() => removeReason(reasonId)}
											aria-label={`Retirer ${reason.name}`}
										>
											<X size={13} />
										</button>
									</span>
								{/if}
							{/each}
						</div>
					{:else}
						<p class="text-xs text-slate-400">Aucun motif ajouté.</p>
					{/if}
				</div>
			</Card>

			<!-- Examens -->
			<Card title="Examens demandés" subtitle="Recherche et ajout rapide" size="compact">
				<div class="space-y-3">
					<div class="relative">
						<div class="relative">
							<Search
								size={15}
								class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
							/>

							<input
								id="exam-search"
								class="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none transition focus:border-[#0E4C92]"
								value={examSearch}
								placeholder="Rechercher un examen..."
								oninput={(e) => (examSearch = e.currentTarget.value)}
							/>
						</div>

						{#if examSearch}
							<div
								class="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
							>
								{#each getFilteredExams() as exam (exam.id)}
									<button
										type="button"
										class="flex w-full items-center justify-between border-b border-slate-100 px-3 py-2 text-left transition last:border-0 hover:bg-blue-50"
										onclick={() => addExam(exam)}
									>
										<span class="text-sm font-medium text-slate-800">
											{exam.name}
										</span>

										<span class="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
											{exam.category}
										</span>
									</button>
								{:else}
									<p class="px-3 py-3 text-sm text-slate-400">Aucun examen trouvé.</p>
								{/each}
							</div>
						{/if}
					</div>

					{#if selectedExamIds.length > 0}
						<div class="flex flex-wrap gap-1.5">
							{#each selectedExamIds as examId (examId)}
								{@const exam = getExamById(examId)}

								{#if exam}
									<span
										class="flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-800"
									>
										{exam.name}

										<button
											type="button"
											class="text-blue-400 hover:text-red-600"
											onclick={() => removeExam(examId)}
											aria-label={`Retirer ${exam.name}`}
										>
											<X size={13} />
										</button>
									</span>
								{/if}
							{/each}
						</div>
					{:else}
						<p class="text-xs text-slate-400">Aucun examen ajouté.</p>
					{/if}
				</div>
			</Card>
		</div>

		<div class="grid gap-3 xl:grid-cols-2">
			<!-- Repos / hospitalisation -->
			<Card
				title="Repos maladie et hospitalisation"
				subtitle="Options complémentaires"
				size="compact"
			>
				<div class="space-y-3">
					<div class="flex flex-wrap gap-6">
						<label
							class="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700"
						>
							<input type="checkbox" bind:checked={sickLeaveRequired} />
							Repos maladie
						</label>

						<label
							class="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700"
						>
							<input type="checkbox" bind:checked={hospitalizationRequired} />
							Hospitalisation
						</label>
					</div>

					{#if sickLeaveRequired || hospitalizationRequired}
						<div class="grid gap-3 border-t border-slate-100 pt-3 md:grid-cols-3">
							{#if sickLeaveRequired}
								<Input bind:value={sickLeaveDays} placeholder="Repos en jours" type="number" />
							{/if}

							{#if hospitalizationRequired}
								<Input bind:value={hospitalizationType} placeholder="Type d'hospitalisation" />

								<Input
									bind:value={hospitalizationDuration}
									placeholder="Durée en jours"
									type="number"
								/>
							{/if}
						</div>

						{#if hospitalizationRequired}
							<Textarea
								bind:value={hospitalizationReason}
								placeholder="Motif d’hospitalisation..."
							/>
						{/if}
					{/if}
				</div>
			</Card>
			<!-- Ordonnance -->
			<Card
				title="Ordonnance"
				subtitle="Ajout rapide depuis le référentiel pharmacie"
				size="compact"
			>
				<div class="space-y-3">
					<div class="relative">
						<div class="relative">
							<Search
								size={15}
								class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
							/>

							<input
								id="medication-search"
								class="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none transition focus:border-[#0E4C92]"
								value={draftSearch}
								placeholder="Rechercher un médicament, dosage ou forme..."
								oninput={(e) => {
									draftSearch = e.currentTarget.value;
									draftPresentationId = 0;
								}}
							/>
						</div>

						{#if draftSearch && draftPresentationId === 0}
							<div
								class="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
							>
								{#each getFilteredPresentations() as presentation (presentation.id)}
									<button
										type="button"
										class="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left transition last:border-0 hover:bg-blue-50"
										onclick={() => selectDraftPresentation(presentation)}
									>
										<div>
											<p class="text-sm font-semibold text-slate-800">
												{presentation.medication.name}
											</p>

											<p class="text-xs text-slate-500">
												{presentation.dosage}
												· {presentation.form}
												· {presentation.route}
											</p>
										</div>

										<Plus size={16} class="shrink-0 text-[#0E4C92]" />
									</button>
								{:else}
									<p class="px-3 py-3 text-sm text-slate-400">Aucun médicament trouvé.</p>
								{/each}
							</div>
						{/if}
					</div>

					{#if draftPresentationId > 0}
						<div
							class="grid gap-2 rounded-lg border border-emerald-100 bg-emerald-50/50 p-2 md:grid-cols-[1fr_110px_140px_1.5fr_auto]"
						>
							<div class="flex min-h-9 items-center px-2 text-xs font-semibold text-emerald-800">
								{draftSearch}
							</div>

							<input
								class="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-[#0E4C92]"
								value={draftQuantity}
								placeholder="Quantité"
								type="number"
								oninput={(e) => (draftQuantity = e.currentTarget.value)}
							/>

							<input
								class="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-[#0E4C92]"
								value={draftDuration}
								placeholder="Durée"
								oninput={(e) => (draftDuration = e.currentTarget.value)}
							/>

							<input
								class="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-[#0E4C92]"
								value={draftInstructions}
								placeholder="Posologie : 1 cp matin et soir"
								oninput={(e) => (draftInstructions = e.currentTarget.value)}
							/>

							<div class="flex gap-1">
								<button
									type="button"
									class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-red-600"
									onclick={resetDraft}
									aria-label="Annuler"
								>
									<X size={15} />
								</button>

								<button
									type="button"
									class="flex h-9 items-center gap-1 rounded-lg bg-[#0E4C92] px-3 text-xs font-semibold text-white transition hover:bg-[#0b3e78] disabled:cursor-not-allowed disabled:opacity-40"
									disabled={draftPresentationId === 0 ||
										Number(draftQuantity || 0) <= 0 ||
										draftDuration.trim() === '' ||
										draftInstructions.trim() === ''}
									onclick={addPrescriptionLine}
								>
									<Plus size={14} />
									Ajouter
								</button>
							</div>
						</div>
					{/if}

					{#if prescriptions.length > 0}
						<div class="overflow-x-auto rounded-lg border border-slate-200">
							<table class="w-full min-w-[700px] text-left text-xs">
								<thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
									<tr>
										<th class="px-3 py-2 font-semibold"> Médicament </th>
										<th class="px-3 py-2 font-semibold"> Qté </th>
										<th class="px-3 py-2 font-semibold"> Durée </th>
										<th class="px-3 py-2 font-semibold"> Posologie </th>
										<th class="w-10 px-2 py-2"></th>
									</tr>
								</thead>

								<tbody class="divide-y divide-slate-100">
									{#each prescriptions as prescription, index (index)}
										{@const presentation = getPresentationById(prescription.presentationId)}

										<tr class="hover:bg-slate-50/70">
											<td class="px-3 py-2">
												{#if presentation}
													<p class="font-semibold text-slate-800">
														{presentation.medication.name}
													</p>

													<p class="text-[10px] text-slate-500">
														{presentation.dosage}
														· {presentation.form}
														· {presentation.route}
													</p>
												{:else}
													<span class="text-slate-400"> Introuvable </span>
												{/if}
											</td>

											<td class="px-3 py-2 text-slate-700">
												{prescription.quantity}
											</td>

											<td class="px-3 py-2 text-slate-700">
												{prescription.duration || '—'}
											</td>

											<td class="px-3 py-2 text-slate-700">
												{prescription.instructions || '—'}
											</td>

											<td class="px-2 py-2 text-right">
												<button
													type="button"
													class="rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
													onclick={() => removePrescription(index)}
													aria-label="Supprimer la prescription"
												>
													<X size={14} />
												</button>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{:else}
						<p class="text-xs text-slate-400">Aucun médicament ajouté.</p>
					{/if}
				</div>
			</Card>
		</div>

		<!-- Diagnostic et prise en charge -->
		<Card
			title="Diagnostic et prise en charge"
			subtitle="Synthèse médicale et conduite à tenir"
			size="compact"
		>
			<textarea
				class="min-h-24 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0E4C92]"
				bind:value={diagnosis}
				placeholder="Saisir le diagnostic, les observations et la conduite à tenir..."></textarea>
		</Card>

		<!-- Actions -->
		<div
			class="sticky bottom-3 z-10 flex justify-end gap-2 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur"
		>
			<Button variant="secondary" onclick={() => goto(resolve(`/patients/${p.id}`))}>
				Annuler
			</Button>

			<Button loading={submitting} onclick={submit}>Enregistrer la consultation</Button>
		</div>
	</div>
{/if}
