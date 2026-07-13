<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';

	import { FileText, FlaskConical, Bed, ClipboardList, Eye } from 'lucide-svelte';

	import SoapForm from '$lib/components/consultations/SoapForm.svelte';
	import PrescriptionForm from '$lib/components/consultations/PrescriptionForm.svelte';
	import ConsultationSpecialtyPanel from '$lib/components/consultations/specialties/ConsultationSpecialtyPanel.svelte';
	import ExamEditor from '$lib/components/consultations/ExamEditor.svelte';
	import CommonMedicalRecordPanel from '$lib/components/medical-record/CommonMedicalRecordPanel.svelte';
	import PatientSummaryCard from '$lib/components/consultations/PatientSummaryCard.svelte';
	import ClinicalTimeline from '$lib/components/medical-record/ClinicalTimeline.svelte';

	import { getConsultation } from '$lib/api/consultations';
	import type { ConsultationDetail } from '$lib/types/consultation';
	import { PUBLIC_API_URL } from '$env/static/public';

	type WorkspaceTab =
		'clinical' | 'medical-record' | 'soap' | 'specialty' | 'prescriptions' | 'exams' | 'documents';

	type Props = {
		consultationId: number;
		userId?: number;
	};

	let { consultationId, userId = 1 }: Props = $props();

	let activeTab = $state<WorkspaceTab>('clinical');
	let consultation = $state<ConsultationDetail | null>(null);
	let medicalRecordId = $state<number | null>(null);

	let loading = $state(true);
	let error = $state('');

	const hasPrescriptions = $derived(Boolean(consultation && consultation.prescriptions.length > 0));

	const hasExams = $derived(Boolean(consultation && consultation.exams.length > 0));

	const hasSickLeave = $derived(
		Boolean(consultation && consultation.sickLeaveRequired && consultation.sickLeaveDays > 0)
	);

	const hasSOAP = $derived(
		Boolean(
			consultation?.soap &&
			(consultation.soap.chief_complaint ||
				consultation.soap.primary_diagnosis ||
				consultation.soap.clinical_impression ||
				consultation.soap.treatment_plan)
		)
	);

	async function openDocument(path: string) {
		const token = localStorage.getItem('medcore_token');

		if (!token) {
			error = 'Session utilisateur introuvable.';
			return;
		}

		try {
			const apiUrl = PUBLIC_API_URL;

			const response = await fetch(`${apiUrl}${path}`, {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			if (!response.ok) {
				const data = await response.json().catch(() => null);

				throw new Error(data?.error ?? 'Impossible de générer le document.');
			}

			const blob = await response.blob();
			const url = URL.createObjectURL(blob);

			window.open(url, '_blank');

			setTimeout(() => URL.revokeObjectURL(url), 60_000);
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Impossible de générer le document.';
		}
	}

	const tabs: Array<{
		id: WorkspaceTab;
		label: string;
		description: string;
	}> = [
		{
			id: 'clinical',
			label: 'Contexte clinique',
			description: 'Allergies, antécédents et constantes'
		},
		{
			id: 'medical-record',
			label: 'Dossier médical',
			description: 'Dossier longitudinal du patient'
		},
		{
			id: 'soap',
			label: 'Consultation SOAP',
			description: 'Subjectif, objectif, évaluation et plan'
		},
		{
			id: 'specialty',
			label: 'Spécialité',
			description: 'Volet clinique spécialisé'
		},
		{
			id: 'prescriptions',
			label: 'Prescriptions',
			description: 'Médicaments et traitements'
		},
		{
			id: 'exams',
			label: 'Examens',
			description: 'Laboratoire et imagerie'
		},
		{
			id: 'documents',
			label: 'Documents',
			description: 'Ordonnance et certificats'
		}
	];

	const patientName = $derived(
		consultation ? `${consultation.patient.nom} ${consultation.patient.prenoms}`.trim() : ''
	);

	const statusLabel = $derived.by(() => {
		switch (consultation?.status) {
			case 'draft':
				return 'Brouillon';
			case 'in_progress':
				return 'En cours';
			case 'completed':
				return 'Terminée';
			case 'cancelled':
				return 'Annulée';
			default:
				return '-';
		}
	});

	const statusClasses = $derived.by(() => {
		switch (consultation?.status) {
			case 'draft':
				return 'border-amber-200 bg-amber-50 text-amber-700';
			case 'in_progress':
				return 'border-blue-200 bg-blue-50 text-blue-700';
			case 'completed':
				return 'border-emerald-200 bg-emerald-50 text-emerald-700';
			case 'cancelled':
				return 'border-red-200 bg-red-50 text-red-700';
			default:
				return 'border-slate-200 bg-slate-50 text-slate-600';
		}
	});

	const hasVitals = $derived(
		Boolean(
			consultation &&
			(consultation.vitals.temperature !== null ||
				consultation.vitals.bloodPressureSystolic !== null ||
				consultation.vitals.bloodPressureDiastolic !== null ||
				consultation.vitals.heartRate !== null ||
				consultation.vitals.respiratoryRate !== null ||
				consultation.vitals.oxygenSaturation !== null ||
				consultation.vitals.weight !== null ||
				consultation.vitals.height !== null ||
				consultation.vitals.bloodGlucose !== null ||
				consultation.vitals.painScore !== null)
		)
	);

	const hasAntecedents = $derived(
		Boolean(
			consultation &&
			(consultation.antecedent.hasHta === true ||
				consultation.antecedent.hasDiabetes === true ||
				consultation.antecedent.otherMedical ||
				consultation.antecedent.surgicalHistory ||
				consultation.antecedent.gynecoObstetricHistory ||
				consultation.antecedent.previousMedication ||
				consultation.antecedent.tobacco === true ||
				consultation.antecedent.alcohol === true)
		)
	);

	async function refreshConsultation() {
		try {
			consultation = await getConsultation(consultationId);
		} catch {
			error = 'Impossible de recharger la consultation.';
		}
	}

	onMount(async () => {
		try {
			consultation = await getConsultation(consultationId);
		} catch {
			error = 'Impossible de charger la consultation.';
		} finally {
			loading = false;
		}
	});
</script>

<div class="space-y-5">
	<section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
		<div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
			{#if loading}
				<div>
					<p class="text-sm text-slate-500">Chargement de la consultation...</p>
				</div>
			{:else if error}
				<div>
					<p class="text-sm font-semibold text-red-600">
						{error}
					</p>
				</div>
			{:else if consultation}
				<div>
					<p class="text-xs font-black uppercase tracking-[0.18em] text-[#0E4C92]">
						Poste de consultation
					</p>

					<div class="mt-1 flex flex-wrap items-center gap-3">
						<h2 class="text-xl font-black text-slate-900">
							{patientName}
						</h2>

						<span class={`rounded-full border px-3 py-1 text-xs font-black ${statusClasses}`}>
							{statusLabel}
						</span>
					</div>

					<p class="mt-1 text-sm text-slate-500">
						Consultation #{consultation.id}
						· {consultation.service}
						· {consultation.doctorName}
					</p>

					<p class="mt-1 text-xs text-slate-400">
						Dossier : {consultation.patient.numeroDossier}
						· Patient : {consultation.patient.codePatient}
					</p>
				</div>

				<div class="flex flex-wrap gap-2">
					<button
						type="button"
						class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
					>
						Enregistrer le brouillon
					</button>

					<button
						type="button"
						disabled={consultation.status === 'completed' || consultation.status === 'cancelled'}
						class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Terminer la consultation
					</button>
				</div>
			{/if}
		</div>
	</section>
	{#if consultation}
		<PatientSummaryCard
			patientId={consultation.patientId}
			onRecordLoaded={(recordId) => {
				medicalRecordId = recordId;
			}}
		/>
	{/if}

	{#if medicalRecordId !== null}
		<ClinicalTimeline recordId={medicalRecordId} />
	{/if}

	<section class="flex gap-3 overflow-x-auto pb-2">
		{#each tabs as tab (tab.id)}
			<button
				type="button"
				onclick={() => (activeTab = tab.id)}
				class={`min-w-[190px] flex-none rounded-2xl border p-4 text-left transition ${
					activeTab === tab.id
						? 'border-[#0E4C92] bg-[#0E4C92] text-white shadow-sm'
						: 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/40'
				}`}
			>
				<p class="text-sm font-black">
					{tab.label}
				</p>

				<p
					class={`mt-1 text-xs leading-5 ${
						activeTab === tab.id ? 'text-blue-100' : 'text-slate-400'
					}`}
				>
					{tab.description}
				</p>
			</button>
		{/each}
	</section>

	{#if activeTab === 'clinical'}
		{#if loading}
			<section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<p class="text-sm text-slate-500">Chargement du contexte clinique...</p>
			</section>
		{:else if error}
			<section class="rounded-2xl border border-red-200 bg-red-50 p-6">
				<p class="text-sm font-semibold text-red-700">
					{error}
				</p>
			</section>
		{:else if consultation}
			<section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<div class="grid gap-5 lg:grid-cols-3">
					<div class="rounded-2xl border border-red-100 bg-red-50 p-5">
						<p class="text-xs font-black uppercase tracking-wide text-red-600">Allergies</p>

						<p class="mt-3 text-sm text-red-800">
							Consultez le dossier médical pour afficher les allergies actives du patient.
						</p>

						<a
							href={resolve(`/patients/${consultation.patientId}/medical-record`)}
							class="mt-4 inline-flex text-sm font-bold text-red-700 hover:underline"
						>
							Ouvrir le dossier médical
						</a>
					</div>

					<div class="rounded-2xl border border-amber-100 bg-amber-50 p-5">
						<p class="text-xs font-black uppercase tracking-wide text-amber-700">Antécédents</p>

						{#if hasAntecedents}
							<div class="mt-3 space-y-2 text-sm text-amber-950">
								{#if consultation.antecedent.hasHta === true}
									<p>
										<strong>HTA :</strong>
										Oui
									</p>
								{/if}

								{#if consultation.antecedent.hasDiabetes === true}
									<p>
										<strong>Diabète :</strong>
										Oui
									</p>
								{/if}

								{#if consultation.antecedent.otherMedical}
									<p>
										<strong>Médicaux :</strong>
										{consultation.antecedent.otherMedical}
									</p>
								{/if}

								{#if consultation.antecedent.surgicalHistory}
									<p>
										<strong>Chirurgicaux :</strong>
										{consultation.antecedent.surgicalHistory}
									</p>
								{/if}

								{#if consultation.antecedent.gynecoObstetricHistory}
									<p>
										<strong>Gynéco-obstétricaux :</strong>
										{consultation.antecedent.gynecoObstetricHistory}
									</p>
								{/if}

								{#if consultation.antecedent.previousMedication}
									<p>
										<strong>Traitement antérieur :</strong>
										{consultation.antecedent.previousMedication}
									</p>
								{/if}

								{#if consultation.antecedent.tobacco === true}
									<p>
										<strong>Tabac :</strong>
										Oui
									</p>
								{/if}

								{#if consultation.antecedent.alcohol === true}
									<p>
										<strong>Alcool :</strong>
										Oui
									</p>
								{/if}
							</div>
						{:else}
							<p class="mt-3 text-sm font-semibold text-amber-900">
								Aucun antécédent renseigné pour cette consultation.
							</p>
						{/if}
					</div>

					<div class="rounded-2xl border border-blue-100 bg-blue-50 p-5">
						<p class="text-xs font-black uppercase tracking-wide text-[#0E4C92]">
							Constantes de la consultation
						</p>

						{#if hasVitals}
							<div class="mt-4 grid grid-cols-2 gap-4 text-sm text-blue-950">
								{#if consultation.vitals.bloodPressureSystolic !== null && consultation.vitals.bloodPressureDiastolic !== null}
									<div>
										<p class="text-xs font-bold uppercase text-blue-500">Tension</p>

										<p class="font-black">
											{consultation.vitals.bloodPressureSystolic}/
											{consultation.vitals.bloodPressureDiastolic}
											mmHg
										</p>
									</div>
								{/if}

								{#if consultation.vitals.temperature !== null}
									<div>
										<p class="text-xs font-bold uppercase text-blue-500">Température</p>

										<p class="font-black">
											{consultation.vitals.temperature} °C
										</p>
									</div>
								{/if}

								{#if consultation.vitals.heartRate !== null}
									<div>
										<p class="text-xs font-bold uppercase text-blue-500">Fréquence cardiaque</p>

										<p class="font-black">
											{consultation.vitals.heartRate} bpm
										</p>
									</div>
								{/if}

								{#if consultation.vitals.respiratoryRate !== null}
									<div>
										<p class="text-xs font-bold uppercase text-blue-500">Fréquence respiratoire</p>

										<p class="font-black">
											{consultation.vitals.respiratoryRate} cycles/min
										</p>
									</div>
								{/if}

								{#if consultation.vitals.oxygenSaturation !== null}
									<div>
										<p class="text-xs font-bold uppercase text-blue-500">SpO₂</p>

										<p class="font-black">
											{consultation.vitals.oxygenSaturation} %
										</p>
									</div>
								{/if}

								{#if consultation.vitals.weight !== null}
									<div>
										<p class="text-xs font-bold uppercase text-blue-500">Poids</p>

										<p class="font-black">
											{consultation.vitals.weight} kg
										</p>
									</div>
								{/if}

								{#if consultation.vitals.height !== null}
									<div>
										<p class="text-xs font-bold uppercase text-blue-500">Taille</p>

										<p class="font-black">
											{consultation.vitals.height} cm
										</p>
									</div>
								{/if}

								{#if consultation.vitals.bloodGlucose !== null}
									<div>
										<p class="text-xs font-bold uppercase text-blue-500">Glycémie</p>

										<p class="font-black">
											{consultation.vitals.bloodGlucose}
										</p>
									</div>
								{/if}

								{#if consultation.vitals.painScore !== null}
									<div>
										<p class="text-xs font-bold uppercase text-blue-500">Douleur</p>

										<p class="font-black">
											{consultation.vitals.painScore}/10
										</p>
									</div>
								{/if}
							</div>
						{:else}
							<p class="mt-3 text-sm font-semibold text-blue-900">
								Aucune constante renseignée pour cette consultation.
							</p>
						{/if}
					</div>
				</div>
			</section>
		{/if}
	{/if}

	{#if activeTab === 'medical-record' && consultation}
		<CommonMedicalRecordPanel patientId={consultation.patientId} />
	{/if}
	{#if activeTab === 'soap'}
		<SoapForm {consultationId} {userId} />
	{/if}

	{#if activeTab === 'specialty' && consultation}
		<ConsultationSpecialtyPanel {consultationId} {userId} service={consultation.service} />
	{/if}

	{#if activeTab === 'prescriptions' && consultation}
		<PrescriptionForm {consultationId} {consultation} />
	{/if}

	{#if activeTab === 'exams'}
		{#if loading}
			<section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<p class="text-sm text-slate-500">Chargement des examens...</p>
			</section>
		{:else if consultation}
			<ExamEditor
				{consultationId}
				initialExams={consultation.exams}
				onSaved={refreshConsultation}
			/>
		{/if}
	{/if}

	{#if activeTab === 'documents'}
		<section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<p class="text-xs font-black uppercase tracking-[0.18em] text-[#0E4C92]">
				Documents médicaux
			</p>

			<h3 class="mt-1 text-xl font-black text-slate-900">Documents générés</h3>

			<p class="mt-2 text-sm text-slate-500">
				Documents disponibles selon les informations enregistrées pendant la consultation.
			</p>

			<div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<article
					class={`rounded-2xl border p-5 ${
						hasPrescriptions ? 'border-blue-100 bg-blue-50/60' : 'border-slate-200 bg-slate-50'
					}`}
				>
					<div class="flex items-start justify-between gap-4">
						<div
							class={`flex h-11 w-11 items-center justify-center rounded-xl ${
								hasPrescriptions ? 'bg-[#0E4C92] text-white' : 'bg-slate-200 text-slate-400'
							}`}
						>
							<FileText size={20} />
						</div>

						<span
							class={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${
								hasPrescriptions ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
							}`}
						>
							{hasPrescriptions ? 'Disponible' : 'Indisponible'}
						</span>
					</div>

					<h4 class="mt-5 text-base font-black text-slate-900">Ordonnance</h4>

					<p class="mt-1 text-sm leading-5 text-slate-500">
						Ordonnance contenant les médicaments prescrits au patient.
					</p>

					{#if hasPrescriptions}
						<button
							type="button"
							onclick={() => openDocument(`/api/consultations/${consultationId}/prescription/pdf`)}
							class="mt-5 flex items-center gap-2 text-sm font-black text-[#0E4C92] hover:underline"
						>
							<Eye size={16} />
							Visualiser
						</button>
					{:else}
						<p class="mt-5 text-xs font-bold text-slate-400">Aucune prescription enregistrée</p>
					{/if}
				</article>

				<article
					class={`rounded-2xl border p-5 ${
						hasExams ? 'border-violet-100 bg-violet-50/60' : 'border-slate-200 bg-slate-50'
					}`}
				>
					<div class="flex items-start justify-between gap-4">
						<div
							class={`flex h-11 w-11 items-center justify-center rounded-xl ${
								hasExams ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-400'
							}`}
						>
							<FlaskConical size={20} />
						</div>

						<span
							class={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${
								hasExams ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
							}`}
						>
							{hasExams ? 'Disponible' : 'Indisponible'}
						</span>
					</div>

					<h4 class="mt-5 text-base font-black text-slate-900">Demande d'examens</h4>

					<p class="mt-1 text-sm leading-5 text-slate-500">
						Demande officielle des examens complémentaires prescrits.
					</p>

					{#if hasExams}
						<button
							type="button"
							onclick={() => openDocument(`/api/consultations/${consultationId}/exam-request/pdf`)}
							class="mt-5 flex items-center gap-2 text-sm font-black text-violet-700 hover:underline"
						>
							<Eye size={16} />
							Visualiser
						</button>
					{:else}
						<p class="mt-5 text-xs font-bold text-slate-400">Aucun examen demandé</p>
					{/if}
				</article>

				<article
					class={`rounded-2xl border p-5 ${
						hasSickLeave ? 'border-amber-100 bg-amber-50/60' : 'border-slate-200 bg-slate-50'
					}`}
				>
					<div class="flex items-start justify-between gap-4">
						<div
							class={`flex h-11 w-11 items-center justify-center rounded-xl ${
								hasSickLeave ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-400'
							}`}
						>
							<Bed size={20} />
						</div>

						<span
							class={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${
								hasSickLeave ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
							}`}
						>
							{hasSickLeave ? 'Disponible' : 'Indisponible'}
						</span>
					</div>

					<h4 class="mt-5 text-base font-black text-slate-900">Repos maladie</h4>

					<p class="mt-1 text-sm leading-5 text-slate-500">
						Certificat de repos médical prescrit pendant la consultation.
					</p>

					{#if hasSickLeave}
						<button
							type="button"
							onclick={() => openDocument(`/api/consultations/${consultationId}/sick-leave/pdf`)}
							class="mt-5 flex items-center gap-2 text-sm font-black text-amber-700 hover:underline"
						>
							<Eye size={16} />
							Visualiser
						</button>
					{:else}
						<p class="mt-5 text-xs font-bold text-slate-400">Aucun repos maladie prescrit</p>
					{/if}
				</article>

				<article
					class={`rounded-2xl border p-5 ${
						hasSOAP ? 'border-emerald-100 bg-emerald-50/60' : 'border-slate-200 bg-slate-50'
					}`}
				>
					<div class="flex items-start justify-between gap-4">
						<div
							class={`flex h-11 w-11 items-center justify-center rounded-xl ${
								hasSOAP ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'
							}`}
						>
							<ClipboardList size={20} />
						</div>

						<span
							class={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${
								hasSOAP ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
							}`}
						>
							{hasSOAP ? 'Disponible' : 'Indisponible'}
						</span>
					</div>

					<h4 class="mt-5 text-base font-black text-slate-900">Compte rendu</h4>

					<p class="mt-1 text-sm leading-5 text-slate-500">
						Synthèse clinique structurée de la consultation médicale.
					</p>

					{#if hasSOAP}
						<button
							type="button"
							onclick={() => openDocument(`/api/consultations/${consultationId}/report/pdf`)}
							class="mt-5 flex items-center gap-2 text-sm font-black text-emerald-700 hover:underline"
						>
							<Eye size={16} />
							Visualiser
						</button>
					{:else}
						<p class="mt-5 text-xs font-bold text-slate-400">Note SOAP non renseignée</p>
					{/if}
				</article>
			</div>
		</section>
	{/if}
</div>
