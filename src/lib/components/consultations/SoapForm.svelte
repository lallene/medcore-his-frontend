<script lang="ts">
	import { onMount } from 'svelte';
	import { getConsultationSOAP, saveConsultationSOAP } from '$lib/api/soap';

	type Props = {
		consultationId: number;
		userId?: number;
	};

	let { consultationId, userId = 1 }: Props = $props();

	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');
	let success = $state('');

	let activeSection = $state<'subjective' | 'objective' | 'assessment' | 'plan'>('subjective');

	let form = $state({
		chiefComplaint: '',
		historyOfPresentIllness: '',
		associatedSymptoms: '',
		patientReportedNotes: '',

		generalAppearance: '',
		consciousness: '',
		hydrationStatus: '',
		physicalExamSummary: '',

		primaryDiagnosis: '',
		associatedDiagnoses: '',
		clinicalImpression: '',

		treatmentPlan: '',
		investigationPlan: '',
		followUpPlan: '',
		patientAdvice: '',
		disposition: ''
	});

	const sections = [
		{
			id: 'subjective',
			letter: 'S',
			title: 'Subjectif',
			description: 'Ce que le patient rapporte'
		},
		{
			id: 'objective',
			letter: 'O',
			title: 'Objectif',
			description: 'Ce que le praticien observe'
		},
		{
			id: 'assessment',
			letter: 'A',
			title: 'Évaluation',
			description: 'Analyse et diagnostic clinique'
		},
		{
			id: 'plan',
			letter: 'P',
			title: 'Plan',
			description: 'Prise en charge et suivi'
		}
	] as const;

	onMount(async () => {
		try {
			const soap = await getConsultationSOAP(consultationId);

			if (soap) {
				form.chiefComplaint = soap.chief_complaint;
				form.historyOfPresentIllness = soap.history_of_present_illness;
				form.associatedSymptoms = soap.associated_symptoms;
				form.patientReportedNotes = soap.patient_reported_notes;

				form.generalAppearance = soap.general_appearance;
				form.consciousness = soap.consciousness;
				form.hydrationStatus = soap.hydration_status;
				form.physicalExamSummary = soap.physical_exam_summary;

				form.primaryDiagnosis = soap.primary_diagnosis;
				form.associatedDiagnoses = soap.associated_diagnoses;
				form.clinicalImpression = soap.clinical_impression;

				form.treatmentPlan = soap.treatment_plan;
				form.investigationPlan = soap.investigation_plan;
				form.followUpPlan = soap.follow_up_plan;
				form.patientAdvice = soap.patient_advice;
				form.disposition = soap.disposition;
			}
		} catch {
			error = 'Impossible de charger la note clinique SOAP.';
		} finally {
			loading = false;
		}
	});

	async function submit() {
		saving = true;
		error = '';
		success = '';

		try {
			await saveConsultationSOAP(consultationId, {
				...form,
				userId
			});

			success = 'Note clinique SOAP enregistrée avec succès.';
		} catch {
			error = 'Impossible d’enregistrer la note clinique SOAP.';
		} finally {
			saving = false;
		}
	}
</script>

<div class="space-y-5">
	<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
		<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
			<div>
				<p class="text-xs font-black uppercase tracking-[0.18em] text-[#0E4C92]">
					Note clinique structurée
				</p>
				<h2 class="mt-1 text-xl font-black text-slate-900">Format SOAP</h2>
				<p class="mt-1 text-sm text-slate-500">Subjectif, Objectif, Évaluation et Plan de soins.</p>
			</div>

			<button
				type="button"
				onclick={submit}
				disabled={saving || loading}
				class="rounded-xl bg-[#0E4C92] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0b3d75] disabled:cursor-wait disabled:opacity-60"
			>
				{saving ? 'Enregistrement...' : 'Enregistrer le SOAP'}
			</button>
		</div>
	</div>

	{#if error}
		<div
			class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
		>
			{error}
		</div>
	{/if}

	{#if success}
		<div
			class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"
		>
			{success}
		</div>
	{/if}

	<div class="grid gap-3 md:grid-cols-4">
		{#each sections as section (section.id)}
			<button
				type="button"
				onclick={() => (activeSection = section.id)}
				class={`rounded-2xl border p-4 text-left transition ${
					activeSection === section.id
						? 'border-[#0E4C92] bg-[#0E4C92] text-white shadow-sm'
						: 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
				}`}
			>
				<div class="flex items-center gap-3">
					<div
						class={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-black ${
							activeSection === section.id ? 'bg-white/15 text-white' : 'bg-blue-50 text-[#0E4C92]'
						}`}
					>
						{section.letter}
					</div>

					<div>
						<p class="font-black">{section.title}</p>
						<p
							class={`mt-0.5 text-xs ${
								activeSection === section.id ? 'text-blue-100' : 'text-slate-400'
							}`}
						>
							{section.description}
						</p>
					</div>
				</div>
			</button>
		{/each}
	</div>

	{#if loading}
		<div class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
			Chargement du SOAP...
		</div>
	{:else}
		<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			{#if activeSection === 'subjective'}
				<div class="space-y-5">
					<div>
						<label for="chiefComplaint" class="mb-2 block text-sm font-bold text-slate-700">
							Motif principal
						</label>
						<textarea
							id="chiefComplaint"
							bind:value={form.chiefComplaint}
							rows="3"
							class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
							placeholder="Ex. Fièvre persistante depuis 48 heures"></textarea>
					</div>

					<div>
						<label for="history" class="mb-2 block text-sm font-bold text-slate-700">
							Histoire de la maladie
						</label>
						<textarea
							id="history"
							bind:value={form.historyOfPresentIllness}
							rows="5"
							class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
						></textarea>
					</div>

					<div class="grid gap-5 md:grid-cols-2">
						<div>
							<label for="symptoms" class="mb-2 block text-sm font-bold text-slate-700">
								Symptômes associés
							</label>
							<textarea
								id="symptoms"
								bind:value={form.associatedSymptoms}
								rows="4"
								class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
							></textarea>
						</div>

						<div>
							<label for="patientNotes" class="mb-2 block text-sm font-bold text-slate-700">
								Autres informations rapportées
							</label>
							<textarea
								id="patientNotes"
								bind:value={form.patientReportedNotes}
								rows="4"
								class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
							></textarea>
						</div>
					</div>
				</div>
			{/if}

			{#if activeSection === 'objective'}
				<div class="grid gap-5 md:grid-cols-2">
					<div>
						<label for="appearance" class="mb-2 block text-sm font-bold text-slate-700">
							État général
						</label>
						<textarea
							id="appearance"
							bind:value={form.generalAppearance}
							rows="4"
							class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
						></textarea>
					</div>

					<div>
						<label for="consciousness" class="mb-2 block text-sm font-bold text-slate-700">
							État de conscience
						</label>
						<textarea
							id="consciousness"
							bind:value={form.consciousness}
							rows="4"
							class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
						></textarea>
					</div>

					<div>
						<label for="hydration" class="mb-2 block text-sm font-bold text-slate-700">
							État d’hydratation
						</label>
						<textarea
							id="hydration"
							bind:value={form.hydrationStatus}
							rows="4"
							class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
						></textarea>
					</div>

					<div>
						<label for="physicalExam" class="mb-2 block text-sm font-bold text-slate-700">
							Résumé de l’examen clinique
						</label>
						<textarea
							id="physicalExam"
							bind:value={form.physicalExamSummary}
							rows="4"
							class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
						></textarea>
					</div>
				</div>
			{/if}

			{#if activeSection === 'assessment'}
				<div class="space-y-5">
					<div>
						<label for="primaryDiagnosis" class="mb-2 block text-sm font-bold text-slate-700">
							Diagnostic principal
						</label>
						<textarea
							id="primaryDiagnosis"
							bind:value={form.primaryDiagnosis}
							rows="3"
							class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
						></textarea>
					</div>

					<div class="grid gap-5 md:grid-cols-2">
						<div>
							<label for="associatedDiagnoses" class="mb-2 block text-sm font-bold text-slate-700">
								Diagnostics associés
							</label>
							<textarea
								id="associatedDiagnoses"
								bind:value={form.associatedDiagnoses}
								rows="4"
								class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
							></textarea>
						</div>

						<div>
							<label for="clinicalImpression" class="mb-2 block text-sm font-bold text-slate-700">
								Impression clinique
							</label>
							<textarea
								id="clinicalImpression"
								bind:value={form.clinicalImpression}
								rows="4"
								class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
							></textarea>
						</div>
					</div>
				</div>
			{/if}

			{#if activeSection === 'plan'}
				<div class="space-y-5">
					<div class="grid gap-5 md:grid-cols-2">
						<div>
							<label for="treatmentPlan" class="mb-2 block text-sm font-bold text-slate-700">
								Plan thérapeutique
							</label>
							<textarea
								id="treatmentPlan"
								bind:value={form.treatmentPlan}
								rows="4"
								class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
							></textarea>
						</div>

						<div>
							<label for="investigationPlan" class="mb-2 block text-sm font-bold text-slate-700">
								Examens complémentaires
							</label>
							<textarea
								id="investigationPlan"
								bind:value={form.investigationPlan}
								rows="4"
								class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
							></textarea>
						</div>

						<div>
							<label for="followUpPlan" class="mb-2 block text-sm font-bold text-slate-700">
								Plan de suivi
							</label>
							<textarea
								id="followUpPlan"
								bind:value={form.followUpPlan}
								rows="4"
								class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
							></textarea>
						</div>

						<div>
							<label for="patientAdvice" class="mb-2 block text-sm font-bold text-slate-700">
								Conseils au patient
							</label>
							<textarea
								id="patientAdvice"
								bind:value={form.patientAdvice}
								rows="4"
								class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
							></textarea>
						</div>
					</div>

					<div>
						<label for="disposition" class="mb-2 block text-sm font-bold text-slate-700">
							Orientation / décision
						</label>

						<select
							id="disposition"
							bind:value={form.disposition}
							class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0E4C92]"
						>
							<option value="">Sélectionner une décision</option>
							<option value="home">Retour à domicile</option>
							<option value="observation">Mise en observation</option>
							<option value="hospitalization">Hospitalisation</option>
							<option value="referral">Orientation / Référence</option>
							<option value="emergency_transfer">Transfert en urgence</option>
						</select>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
