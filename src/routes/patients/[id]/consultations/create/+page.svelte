<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { slide, fade } from 'svelte/transition';
	import {
		Activity,
		ArrowLeft,
		ClipboardCheck,
		Droplet,
		FileText,
		FlaskConical,
		Frown,
		Gauge,
		HeartPulse,
		History,
		Pill,
		Plus,
		Ruler,
		Scale,
		Search,
		Stethoscope,
		Thermometer,
		UserRound,
		Wind,
		BookOpen,
		Syringe,
		X
	} from 'lucide-svelte';

	import { getMedicationPresentations } from '$lib/api/pharmacy';
	import { getPatient } from '$lib/api/patients';
	import {
		createConsultation,
		getConsultationReasons,
		getMedicalExams,
		getPhysicalExamAreas
	} from '$lib/api/consultations';
	import type {
		AdministeredTreatmentPayload,
		AntecedentPayload,
		ConsultationReason,
		GynecoObstetricHistoryPayload,
		MedicalExam,
		PhysicalExamArea,
		PhysicalExamPayload,
		PrescriptionPayload,
		PreviousMedicationPayload,
		SurgicalHistoryPayload
	} from '$lib/types/consultation';

	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';

	import type { MedicationPresentation } from '$lib/types/pharmacy';
	import type { Patient } from '$lib/types/patient';

	let patient = $state<Patient | null>(null);
	let reasons = $state<ConsultationReason[]>([]);
	let exams = $state<MedicalExam[]>([]);
	let presentations = $state<MedicationPresentation[]>([]);
	let physicalExamAreas = $state<PhysicalExamArea[]>([]);
	let antecedent = $state<AntecedentPayload>({
		previousMedication: '',
		hasHta: null,
		hasDiabetes: null,
		otherMedical: '',
		surgicalHistory: '',
		gynecoObstetricHistory: '',
		ddr: '',
		pregnancyOngoing: null,
		tobacco: null,
		alcohol: null,
		visitType: 'CONSULTATION'
	});

	let physicalExamSearch = $state('');
	let physicalExamAreaId = $state(0);
	let physicalExamObservation = $state('');
	let physicalExams = $state<PhysicalExamPayload[]>([]);

	let administeredTreatmentSearch = $state('');
	let administeredPresentationId = $state(0);
	let administeredQuantity = $state('');
	let administeredInstructions = $state('');
	let administeredTreatments = $state<AdministeredTreatmentPayload[]>([]);

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

	let reasonSearch = $state('');

	let sickLeaveRequired = $state(false);
	let sickLeaveDays = $state('');

	let hospitalizationRequired = $state(false);
	let hospitalizationReason = $state('');
	let hospitalizationType = $state('');
	let hospitalizationDuration = $state('');

	let previousMedicationSearch = $state('');
	let previousMedicationPresentationId = $state(0);
	let previousMedicationInstructions = $state('');
	let previousMedicationStatus = $state<'ONGOING' | 'STOPPED'>('ONGOING');
	let previousMedications = $state<PreviousMedicationPayload[]>([]);

	let surgicalProcedureName = $state('');
	let surgicalProcedureDate = $state('');
	let surgicalIndication = $state('');
	let surgicalComplications = $state('');
	let surgicalNotes = $state('');
	let surgicalHistories = $state<SurgicalHistoryPayload[]>([]);

	let gynecoEventType = $state('');
	let gynecoEventDate = $state('');
	let gynecoOutcome = $state('');
	let gynecoNotes = $state('');
	let gynecoObstetricHistories = $state<GynecoObstetricHistoryPayload[]>([]);

	const vitalFields = [
		{
			key: 'temperature',
			label: 'Temp.',
			unit: '°C',
			icon: Thermometer,
			get: () => temperature,
			set: (v: string) => (temperature = v)
		},
		{
			key: 'bpSys',
			label: 'TA Sys.',
			unit: 'mmHg',
			icon: HeartPulse,
			get: () => bloodPressureSystolic,
			set: (v: string) => (bloodPressureSystolic = v)
		},
		{
			key: 'bpDia',
			label: 'TA Dia.',
			unit: 'mmHg',
			icon: HeartPulse,
			get: () => bloodPressureDiastolic,
			set: (v: string) => (bloodPressureDiastolic = v)
		},
		{
			key: 'hr',
			label: 'Pouls',
			unit: 'bpm',
			icon: Activity,
			get: () => heartRate,
			set: (v: string) => (heartRate = v)
		},
		{
			key: 'rr',
			label: 'Resp.',
			unit: '/min',
			icon: Wind,
			get: () => respiratoryRate,
			set: (v: string) => (respiratoryRate = v)
		},
		{
			key: 'spo2',
			label: 'SpO₂',
			unit: '%',
			icon: Droplet,
			get: () => oxygenSaturation,
			set: (v: string) => (oxygenSaturation = v)
		},
		{
			key: 'glucose',
			label: 'Glyc.',
			unit: 'g/L',
			icon: Gauge,
			get: () => bloodGlucose,
			set: (v: string) => (bloodGlucose = v)
		},
		{
			key: 'weight',
			label: 'Poids',
			unit: 'kg',
			icon: Scale,
			get: () => weight,
			set: (v: string) => (weight = v)
		},
		{
			key: 'height',
			label: 'Taille',
			unit: 'cm',
			icon: Ruler,
			get: () => height,
			set: (v: string) => (height = v)
		},
		{
			key: 'pain',
			label: 'Douleur',
			unit: '/10',
			icon: Frown,
			get: () => painScore,
			set: (v: string) => (painScore = v)
		}
	];

	onMount(async () => {
		try {
			const patientId = Number(page.params.id);

			const [patientData, reasonData, examData, presentationData, physicalExamAreaData] =
				await Promise.all([
					getPatient(patientId),
					getConsultationReasons(),
					getMedicalExams(),
					getMedicationPresentations(),
					getPhysicalExamAreas()
				]);

			patient = patientData;
			reasons = reasonData.filter((item) => item.isActive);
			exams = examData.filter((item) => item.isActive);
			presentations = presentationData.filter((item) => item.isActive);
			physicalExamAreas = physicalExamAreaData.filter((item) => item.isActive);
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

	function getInitials(p: Patient) {
		const a = (p.nom || '').trim().charAt(0);
		const b = (p.prenoms || '').trim().charAt(0);

		return `${a}${b}`.toUpperCase() || '?';
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

	function getFilteredPhysicalExamAreas() {
		const search = physicalExamSearch.trim().toLowerCase();

		return physicalExamAreas
			.filter((area) => !physicalExams.some((item) => item.areaId === area.id))
			.filter((area) => {
				if (search === '') return true;

				return `${area.name} ${area.category} ${area.code}`.toLowerCase().includes(search);
			})
			.slice(0, 10);
	}

	function selectPhysicalExamArea(area: PhysicalExamArea) {
		physicalExamAreaId = area.id;
		physicalExamSearch = `${area.name} — ${area.category}`;
	}

	function addPhysicalExam() {
		if (physicalExamAreaId === 0 || physicalExamObservation.trim() === '') {
			return;
		}

		physicalExams = [
			...physicalExams,
			{
				areaId: physicalExamAreaId,
				observation: physicalExamObservation.trim()
			}
		];

		physicalExamSearch = '';
		physicalExamAreaId = 0;
		physicalExamObservation = '';
	}

	function removePhysicalExam(index: number) {
		physicalExams = physicalExams.filter((_, itemIndex) => itemIndex !== index);
	}

	function getPhysicalExamAreaById(id: number) {
		return physicalExamAreas.find((area) => area.id === id);
	}

	function getFilteredAdministeredPresentations() {
		const search = administeredTreatmentSearch.trim().toLowerCase();

		return presentations
			.filter((presentation) => {
				if (search === '') return true;

				return [
					presentation.medication.name,
					presentation.dosage,
					presentation.form,
					presentation.route
				]
					.join(' ')
					.toLowerCase()
					.includes(search);
			})
			.slice(0, 10);
	}

	function selectAdministeredPresentation(presentation: MedicationPresentation) {
		administeredPresentationId = presentation.id;

		administeredTreatmentSearch =
			`${presentation.medication.name} — ` +
			`${presentation.dosage} — ` +
			`${presentation.form} — ` +
			`${presentation.route}`;
	}

	function addAdministeredTreatment() {
		const quantity = Number(administeredQuantity || 0);

		if (administeredPresentationId === 0 || quantity <= 0) {
			return;
		}

		administeredTreatments = [
			...administeredTreatments,
			{
				presentationId: administeredPresentationId,
				quantity,
				instructions: administeredInstructions.trim()
			}
		];

		administeredTreatmentSearch = '';
		administeredPresentationId = 0;
		administeredQuantity = '';
		administeredInstructions = '';
	}

	function removeAdministeredTreatment(index: number) {
		administeredTreatments = administeredTreatments.filter((_, itemIndex) => itemIndex !== index);
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

				examIds: selectedExamIds,

				prescriptions: prescriptions.filter((item) => item.presentationId > 0 && item.quantity > 0),

				antecedent,

				previousMedications,
				surgicalHistories,
				gynecoObstetricHistories,

				physicalExams,

				administeredTreatments: administeredTreatments.filter(
					(item) => item.presentationId > 0 && item.quantity > 0
				),

				sickLeaveRequired,
				sickLeaveDays: sickLeaveRequired ? Number(sickLeaveDays || 0) : 0,

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
		<div class="flex flex-col items-center gap-3">
			<div
				class="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#0E4C92]"
			></div>
			<p class="text-sm text-slate-500">Chargement du dossier patient...</p>
		</div>
	</div>
{:else if patient}
	{@const p = patient}
	<div class="space-y-4 pb-2">
		<!-- En-tête -->
		<section
			class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm md:flex-row md:items-center md:justify-between"
		>
			<div class="flex items-center gap-3">
				<button
					type="button"
					class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E4C92]/40"
					onclick={() => goto(resolve(`/patients/${p.id}`))}
					aria-label="Retour au patient"
				>
					<ArrowLeft size={17} />
				</button>

				<div
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0E4C92] to-[#1B6FC9] text-sm font-bold tracking-wide text-white shadow-sm"
					aria-hidden="true"
				>
					{getInitials(p)}
				</div>

				<div class="min-w-0">
					<div class="flex flex-wrap items-center gap-2">
						<h1 class="text-lg font-bold leading-tight text-slate-900">Nouvelle consultation</h1>

						<span
							class="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700"
						>
							<span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
							Brouillon
						</span>
					</div>

					<p class="mt-0.5 truncate text-xs text-slate-500">
						{p.nom}
						{p.prenoms} · Dossier {p.numeroDossier}
					</p>
				</div>
			</div>

			<div class="flex flex-wrap items-center gap-2">
				<a
					href={resolve(`/patients/${patient.id}/tracker`)}
					class="group flex h-9 items-center gap-2 rounded-xl border border-[#D8E6F5] bg-[#F4F8FD] px-3 text-xs font-semibold text-[#0E4C92] transition-all hover:-translate-y-0.5 hover:border-[#0E4C92]/30 hover:bg-[#EAF3FC] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E4C92]/40"
				>
					<div
						class="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-[#0E4C92] shadow-sm transition-transform group-hover:rotate-[-12deg]"
					>
						<History size={14} />
					</div>

					<span>Tracker patient</span>
				</a>

				<div class="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs">
					<span class="text-slate-400">Médecin</span>
					<span class="h-3 w-px bg-slate-200"></span>
					<span class="font-semibold text-slate-700">{doctorName}</span>
				</div>

				<div class="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs">
					<span class="text-slate-400">Service</span>
					<span class="h-3 w-px bg-slate-200"></span>
					<span class="font-semibold text-slate-700">{service}</span>
				</div>
			</div>
		</section>

		{#if error}
			<div
				class="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700"
				transition:slide={{ duration: 150 }}
			>
				<span class="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500"></span>
				{error}
			</div>
		{/if}

		<!-- Informations patient -->
		<Card
			title="Informations patient"
			subtitle="Identité et dossier médical"
			size="compact"
			accent="medical"
			icon={UserRound}
		>
			<div class="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
				<div
					class="group rounded-xl border border-transparent bg-[#F7F9FC] px-3 py-2.5 transition-all hover:border-blue-100 hover:bg-blue-50/50"
				>
					<p class="text-[11px] font-medium tracking-wide text-blue-400 uppercase">Patient</p>

					<p class="mt-1 truncate text-sm font-semibold text-[#172033]">
						{p.nom}
						{p.prenoms}
					</p>
				</div>

				<div
					class="group rounded-xl border border-transparent bg-[#F7F9FC] px-3 py-2.5 transition-all hover:border-blue-100 hover:bg-blue-50/50"
				>
					<p class="text-[11px] font-medium tracking-wide text-blue-400 uppercase">Dossier</p>

					<p class="mt-1 text-sm font-bold text-[#0E4C92]">
						{p.numeroDossier}
					</p>
				</div>

				<div
					class="group rounded-xl border border-transparent bg-[#F7F9FC] px-3 py-2.5 transition-all hover:border-blue-100 hover:bg-blue-50/50"
				>
					<p class="text-[11px] font-medium tracking-wide text-blue-400 uppercase">Sexe</p>
					<p class="mt-1 font-semibold text-slate-800">{p.sexe || '—'}</p>
				</div>

				<div
					class="group rounded-xl border border-transparent bg-[#F7F9FC] px-3 py-2.5 transition-all hover:border-blue-100 hover:bg-blue-50/50"
				>
					<p class="text-[11px] font-medium tracking-wide text-blue-400 uppercase">Âge</p>
					<p class="mt-1 font-semibold text-slate-800">{p.age ? `${p.age} ans` : '—'}</p>
				</div>

				<div
					class="group rounded-xl border border-transparent bg-[#F7F9FC] px-3 py-2.5 transition-all hover:border-blue-100 hover:bg-blue-50/50"
				>
					<p class="text-[11px] font-medium tracking-wide text-blue-400 uppercase">Téléphone</p>
					<p class="mt-1 font-semibold text-slate-800">{p.telephone || '—'}</p>
				</div>

				<div
					class="group rounded-xl border border-transparent bg-[#F7F9FC] px-3 py-2.5 transition-all hover:border-blue-100 hover:bg-blue-50/50"
				>
					<p class="text-[11px] font-medium tracking-wide text-blue-400 uppercase">Assurance</p>
					<p class="mt-1 font-semibold text-slate-800">
						{p.isAssure ? `Oui · ${p.tauxCouverture}%` : 'Non'}
					</p>
				</div>
			</div>
		</Card>

		<!-- Antécédents -->
		<Card
			title="Antécédents"
			subtitle="Traitements, chirurgies, gynéco-obstétrique et habitudes"
			size="compact"
			accent="purple"
			icon={BookOpen}
		>
			<div class="grid gap-4 xl:grid-cols-3">
				<!-- Traitements antérieurs -->
				<div class="space-y-3">
					<p class="text-xs font-semibold uppercase tracking-wide text-slate-400">
						Traitements antérieurs / en cours
					</p>

					<div class="relative">
						<Search
							size={15}
							class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
						/>

						<input
							class="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-[#0E4C92]"
							value={previousMedicationSearch}
							placeholder="Rechercher un médicament..."
							oninput={(e) => {
								previousMedicationSearch = e.currentTarget.value;
								previousMedicationPresentationId = 0;
							}}
						/>

						{#if previousMedicationSearch && previousMedicationPresentationId === 0}
							<div
								class="absolute z-20 mt-1.5 max-h-52 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
							>
								{#each getFilteredPresentations() as presentation (presentation.id)}
									<button
										type="button"
										class="flex w-full items-center justify-between border-b border-slate-100 px-3 py-2 text-left last:border-0 hover:bg-blue-50"
										onclick={() => {
											previousMedicationPresentationId = presentation.id;
											previousMedicationSearch = `${presentation.medication.name} — ${presentation.dosage} — ${presentation.form} — ${presentation.route}`;
										}}
									>
										<div>
											<p class="text-sm font-semibold text-slate-800">
												{presentation.medication.name}
											</p>
											<p class="text-xs text-slate-500">
												{presentation.dosage} · {presentation.form} · {presentation.route}
											</p>
										</div>
										<Plus size={15} class="text-[#0E4C92]" />
									</button>
								{/each}
							</div>
						{/if}
					</div>

					{#if previousMedicationPresentationId > 0}
						<div class="space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-2">
							<input
								class="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-[#0E4C92]"
								bind:value={previousMedicationInstructions}
								placeholder="Posologie / remarque"
							/>

							<select
								class="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-[#0E4C92]"
								bind:value={previousMedicationStatus}
							>
								<option value="ONGOING">En cours</option>
								<option value="STOPPED">Arrêté</option>
							</select>

							<button
								type="button"
								class="h-9 w-full rounded-lg bg-[#0E4C92] text-xs font-semibold text-white"
								onclick={() => {
									previousMedications = [
										...previousMedications,
										{
											presentationId: previousMedicationPresentationId,
											instructions: previousMedicationInstructions.trim(),
											status: previousMedicationStatus
										}
									];

									previousMedicationSearch = '';
									previousMedicationPresentationId = 0;
									previousMedicationInstructions = '';
									previousMedicationStatus = 'ONGOING';
								}}
							>
								Ajouter le traitement
							</button>
						</div>
					{/if}

					{#each previousMedications as item, index (index)}
						{@const presentation = getPresentationById(item.presentationId)}
						<div class="rounded-lg border border-slate-200 bg-white p-2">
							<div class="flex justify-between gap-2">
								<div>
									<p class="text-sm font-semibold text-slate-800">
										{presentation?.medication.name || 'Médicament'}
									</p>
									<p class="text-[11px] text-slate-400">
										{presentation?.dosage} · {presentation?.form} · {presentation?.route}
									</p>
								</div>

								<button
									type="button"
									class="text-slate-400 hover:text-red-600"
									onclick={() =>
										(previousMedications = previousMedications.filter((_, i) => i !== index))}
								>
									<X size={14} />
								</button>
							</div>

							<p class="mt-1 text-xs text-slate-600">
								{item.status === 'ONGOING' ? 'En cours' : 'Arrêté'}
								{item.instructions ? ` · ${item.instructions}` : ''}
							</p>
						</div>
					{/each}
				</div>

				<!-- Antécédents chirurgicaux -->
				<div class="space-y-3">
					<p class="text-xs font-semibold uppercase tracking-wide text-slate-400">
						Antécédents chirurgicaux
					</p>

					<input
						class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#0E4C92]"
						bind:value={surgicalProcedureName}
						placeholder="Intervention"
					/>
					<input
						class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#0E4C92]"
						bind:value={surgicalProcedureDate}
						placeholder="Date / année"
					/>
					<input
						class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#0E4C92]"
						bind:value={surgicalIndication}
						placeholder="Motif / indication"
					/>
					<input
						class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#0E4C92]"
						bind:value={surgicalComplications}
						placeholder="Complications"
					/>

					<button
						type="button"
						class="h-9 w-full rounded-lg bg-[#0E4C92] text-xs font-semibold text-white disabled:bg-slate-200 disabled:text-slate-400"
						disabled={surgicalProcedureName.trim() === ''}
						onclick={() => {
							surgicalHistories = [
								...surgicalHistories,
								{
									procedureName: surgicalProcedureName.trim(),
									procedureDate: surgicalProcedureDate.trim(),
									indication: surgicalIndication.trim(),
									complications: surgicalComplications.trim(),
									notes: surgicalNotes.trim()
								}
							];

							surgicalProcedureName = '';
							surgicalProcedureDate = '';
							surgicalIndication = '';
							surgicalComplications = '';
							surgicalNotes = '';
						}}
					>
						Ajouter l’intervention
					</button>

					{#each surgicalHistories as item, index (index)}
						<div class="rounded-lg border border-slate-200 bg-white p-2">
							<div class="flex justify-between gap-2">
								<div>
									<p class="text-sm font-semibold text-slate-800">{item.procedureName}</p>
									<p class="text-xs text-slate-500">
										{item.procedureDate || 'Date non renseignée'}
									</p>
								</div>

								<button
									type="button"
									class="text-slate-400 hover:text-red-600"
									onclick={() =>
										(surgicalHistories = surgicalHistories.filter((_, i) => i !== index))}
								>
									<X size={14} />
								</button>
							</div>

							<p class="mt-1 text-xs text-slate-600">
								{item.indication || '—'}
								{item.complications ? ` · ${item.complications}` : ''}
							</p>
						</div>
					{/each}
				</div>

				<!-- Gynéco-obstétrique -->
				<div class="space-y-3">
					<p class="text-xs font-semibold uppercase tracking-wide text-slate-400">
						Gynéco-obstétrique
					</p>

					<input
						class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#0E4C92]"
						bind:value={gynecoEventType}
						placeholder="Événement : grossesse, accouchement..."
					/>
					<input
						class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#0E4C92]"
						bind:value={gynecoEventDate}
						placeholder="Date / année"
					/>
					<input
						class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#0E4C92]"
						bind:value={gynecoOutcome}
						placeholder="Issue / résultat"
					/>
					<input
						class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#0E4C92]"
						bind:value={antecedent.ddr}
						placeholder="DDR"
						type="date"
					/>

					<button
						type="button"
						class="h-9 w-full rounded-lg bg-[#0E4C92] text-xs font-semibold text-white disabled:bg-slate-200 disabled:text-slate-400"
						disabled={gynecoEventType.trim() === ''}
						onclick={() => {
							gynecoObstetricHistories = [
								...gynecoObstetricHistories,
								{
									eventType: gynecoEventType.trim(),
									eventDate: gynecoEventDate.trim(),
									outcome: gynecoOutcome.trim(),
									notes: gynecoNotes.trim()
								}
							];

							gynecoEventType = '';
							gynecoEventDate = '';
							gynecoOutcome = '';
							gynecoNotes = '';
						}}
					>
						Ajouter l’événement
					</button>

					{#each gynecoObstetricHistories as item, index (index)}
						<div class="rounded-lg border border-slate-200 bg-white p-2">
							<div class="flex justify-between gap-2">
								<div>
									<p class="text-sm font-semibold text-slate-800">{item.eventType}</p>
									<p class="text-xs text-slate-500">{item.eventDate || 'Date non renseignée'}</p>
								</div>

								<button
									type="button"
									class="text-slate-400 hover:text-red-600"
									onclick={() =>
										(gynecoObstetricHistories = gynecoObstetricHistories.filter(
											(_, i) => i !== index
										))}
								>
									<X size={14} />
								</button>
							</div>

							<p class="mt-1 text-xs text-slate-600">{item.outcome || '—'}</p>
						</div>
					{/each}
				</div>
			</div>

			<div class="mt-4 flex flex-wrap gap-2">
				<label
					class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
				>
					<input type="checkbox" bind:checked={antecedent.hasHta} />
					HTA
				</label>

				<label
					class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
				>
					<input type="checkbox" bind:checked={antecedent.hasDiabetes} />
					Diabète
				</label>

				<label
					class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
				>
					<input type="checkbox" bind:checked={antecedent.pregnancyOngoing} />
					Grossesse en cours
				</label>

				<label
					class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
				>
					<input type="checkbox" bind:checked={antecedent.tobacco} />
					Tabac
				</label>

				<label
					class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
				>
					<input type="checkbox" bind:checked={antecedent.alcohol} />
					Alcool
				</label>
			</div>
		</Card>

		<!-- Constantes -->
		<Card
			title="Constantes vitales"
			subtitle="Saisie rapide"
			size="compact"
			accent="danger"
			icon={Activity}
		>
			<div class="-mx-1 overflow-x-auto pb-1">
				<div class="flex min-w-max gap-2 px-1">
					{#each vitalFields as field (field.key)}
						<div
							class="w-[96px] shrink-0 rounded-xl border border-slate-200 bg-white px-2.5 py-2 transition-colors focus-within:border-[#0E4C92] focus-within:bg-blue-50/30"
						>
							<div class="mb-1.5 flex items-center gap-1 text-slate-400">
								<field.icon size={12} />
								<label
									for={`vital-${field.key}`}
									class="truncate text-[10px] font-semibold text-slate-500"
								>
									{field.label}
								</label>
							</div>

							<div class="flex items-baseline gap-1">
								<input
									id={`vital-${field.key}`}
									class="h-6 w-full min-w-0 border-0 bg-transparent p-0 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-300"
									type="number"
									placeholder="—"
									value={field.get()}
									oninput={(e) => field.set(e.currentTarget.value)}
								/>
								<span class="shrink-0 text-[9px] font-medium text-slate-400">{field.unit}</span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</Card>

		<!-- Examen physique + Traitement administré -->
		<Card
			title="Examen physique et traitement administré"
			subtitle="Constat clinique par zone et soins réalisés sur place"
			size="compact"
			accent="medical"
			icon={Syringe}
		>
			<div class="grid gap-4 xl:grid-cols-2">
				<!-- Examen physique -->
				<div class="space-y-3">
					<p class="text-xs font-semibold uppercase tracking-wide text-slate-400">
						Examen physique par zone
					</p>

					<div class="relative">
						<Search
							size={15}
							class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
						/>

						<input
							class="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none transition focus:border-[#0E4C92]"
							value={physicalExamSearch}
							placeholder="Rechercher une zone : abdomen, cœur, poumons..."
							oninput={(e) => {
								physicalExamSearch = e.currentTarget.value;
								physicalExamAreaId = 0;
							}}
						/>

						{#if physicalExamSearch && physicalExamAreaId === 0}
							<div
								class="absolute z-20 mt-1.5 max-h-52 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
							>
								{#each getFilteredPhysicalExamAreas() as area (area.id)}
									<button
										type="button"
										class="flex w-full items-center justify-between border-b border-slate-100 px-3 py-2 text-left last:border-0 hover:bg-blue-50"
										onclick={() => selectPhysicalExamArea(area)}
									>
										<span class="text-sm font-semibold text-slate-800">{area.name}</span>
										<span class="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
											{area.category}
										</span>
									</button>
								{:else}
									<p class="px-3 py-3 text-sm text-slate-400">Aucune zone trouvée.</p>
								{/each}
							</div>
						{/if}
					</div>

					{#if physicalExamAreaId > 0}
						<div class="rounded-xl border border-blue-100 bg-blue-50/50 p-2">
							<textarea
								class="min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0E4C92]"
								bind:value={physicalExamObservation}
								placeholder="Observation clinique..."></textarea>

							<div class="mt-2 flex justify-end gap-2">
								<button
									type="button"
									class="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-500 hover:text-red-600"
									onclick={() => {
										physicalExamSearch = '';
										physicalExamAreaId = 0;
										physicalExamObservation = '';
									}}
								>
									Annuler
								</button>

								<button
									type="button"
									class="h-9 rounded-lg bg-[#0E4C92] px-3 text-xs font-semibold text-white disabled:bg-slate-200 disabled:text-slate-400"
									disabled={physicalExamObservation.trim() === ''}
									onclick={addPhysicalExam}
								>
									Ajouter
								</button>
							</div>
						</div>
					{/if}

					{#if physicalExams.length > 0}
						<div class="space-y-2">
							{#each physicalExams as item, index (index)}
								{@const area = getPhysicalExamAreaById(item.areaId)}

								<div class="rounded-lg border border-slate-200 bg-white p-2">
									<div class="flex items-start justify-between gap-2">
										<div>
											<p class="text-sm font-semibold text-slate-800">
												{area?.name || 'Zone inconnue'}
											</p>
											<p class="text-[11px] text-slate-400">{area?.category || ''}</p>
										</div>

										<button
											type="button"
											class="text-slate-400 hover:text-red-600"
											onclick={() => removePhysicalExam(index)}
										>
											<X size={14} />
										</button>
									</div>

									<p class="mt-1 text-xs text-slate-600">{item.observation}</p>
								</div>
							{/each}
						</div>
					{:else}
						<p
							class="rounded-lg border border-dashed border-slate-200 px-3 py-2.5 text-center text-xs text-slate-400"
						>
							Aucun examen physique ajouté.
						</p>
					{/if}
				</div>

				<!-- Traitement administré -->
				<div class="space-y-3">
					<p class="text-xs font-semibold uppercase tracking-wide text-slate-400">
						Traitement administré sur place
					</p>

					<div class="relative">
						<Search
							size={15}
							class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
						/>

						<input
							class="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none transition focus:border-[#0E4C92]"
							value={administeredTreatmentSearch}
							placeholder="Rechercher un produit administré..."
							oninput={(e) => {
								administeredTreatmentSearch = e.currentTarget.value;
								administeredPresentationId = 0;
							}}
						/>

						{#if administeredTreatmentSearch && administeredPresentationId === 0}
							<div
								class="absolute z-20 mt-1.5 max-h-52 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
							>
								{#each getFilteredAdministeredPresentations() as presentation (presentation.id)}
									<button
										type="button"
										class="flex w-full items-center justify-between border-b border-slate-100 px-3 py-2 text-left last:border-0 hover:bg-blue-50"
										onclick={() => selectAdministeredPresentation(presentation)}
									>
										<div class="min-w-0">
											<p class="truncate text-sm font-semibold text-slate-800">
												{presentation.medication.name}
											</p>
											<p class="truncate text-xs text-slate-500">
												{presentation.dosage} · {presentation.form} · {presentation.route}
											</p>
										</div>

										<Plus size={15} class="text-[#0E4C92]" />
									</button>
								{:else}
									<p class="px-3 py-3 text-sm text-slate-400">Aucun produit trouvé.</p>
								{/each}
							</div>
						{/if}
					</div>

					{#if administeredPresentationId > 0}
						<div
							class="grid gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-2 md:grid-cols-[1fr_90px_1fr_auto]"
						>
							<div class="min-w-0 px-1 text-xs font-semibold text-emerald-800">
								{administeredTreatmentSearch}
							</div>

							<input
								class="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-[#0E4C92]"
								bind:value={administeredQuantity}
								placeholder="Qté"
								type="number"
							/>

							<input
								class="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-[#0E4C92]"
								bind:value={administeredInstructions}
								placeholder="Observation / consigne"
							/>

							<button
								type="button"
								class="h-9 rounded-lg bg-[#0E4C92] px-3 text-xs font-semibold text-white disabled:bg-slate-200 disabled:text-slate-400"
								disabled={Number(administeredQuantity || 0) <= 0}
								onclick={addAdministeredTreatment}
							>
								Ajouter
							</button>
						</div>
					{/if}

					{#if administeredTreatments.length > 0}
						<div class="space-y-2">
							{#each administeredTreatments as item, index (index)}
								{@const presentation = getPresentationById(item.presentationId)}

								<div class="rounded-lg border border-slate-200 bg-white p-2">
									<div class="flex items-start justify-between gap-2">
										<div>
											<p class="text-sm font-semibold text-slate-800">
												{presentation?.medication.name || 'Produit inconnu'}
											</p>
											<p class="text-[11px] text-slate-400">
												{presentation?.dosage} · {presentation?.form} · {presentation?.route}
											</p>
										</div>

										<button
											type="button"
											class="text-slate-400 hover:text-red-600"
											onclick={() => removeAdministeredTreatment(index)}
										>
											<X size={14} />
										</button>
									</div>

									<p class="mt-1 text-xs text-slate-600">
										Qté : {item.quantity}
										{item.instructions ? ` · ${item.instructions}` : ''}
									</p>
								</div>
							{/each}
						</div>
					{:else}
						<p
							class="rounded-lg border border-dashed border-slate-200 px-3 py-2.5 text-center text-xs text-slate-400"
						>
							Aucun traitement administré.
						</p>
					{/if}
				</div>
			</div>
		</Card>

		<div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
			<!-- Motifs de consultation -->
			<Card
				title="Motifs de consultation"
				subtitle="Recherche et ajout rapide"
				size="compact"
				accent="success"
				icon={Stethoscope}
			>
				<div class="space-y-3">
					<div class="relative">
						<div class="relative">
							<Search
								size={15}
								class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
							/>

							<input
								id="reason-search"
								class="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none transition focus:border-[#0E4C92] focus:ring-2 focus:ring-[#0E4C92]/10"
								value={reasonSearch}
								placeholder="Rechercher un motif : fièvre, douleur, fatigue..."
								oninput={(e) => (reasonSearch = e.currentTarget.value)}
							/>
						</div>

						{#if reasonSearch}
							<div
								class="absolute z-20 mt-1.5 max-h-52 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
								transition:slide={{ duration: 120 }}
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
										transition:fade={{ duration: 120 }}
									>
										{reason.name}

										<button
											type="button"
											class="rounded-full text-emerald-400 transition hover:bg-emerald-100 hover:text-red-600"
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
						<p
							class="rounded-lg border border-dashed border-slate-200 px-3 py-2.5 text-center text-xs text-slate-400"
						>
							Aucun motif ajouté.
						</p>
					{/if}
				</div>
			</Card>
			<!-- Ordonnance -->
			<Card
				title="Ordonnance"
				subtitle="Ajout rapide depuis le référentiel pharmacie"
				size="compact"
				accent="medical"
				icon={Pill}
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
								class="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none transition focus:border-[#0E4C92] focus:ring-2 focus:ring-[#0E4C92]/10"
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
								class="absolute z-20 mt-1.5 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
								transition:slide={{ duration: 120 }}
							>
								{#each getFilteredPresentations() as presentation (presentation.id)}
									<button
										type="button"
										class="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left transition last:border-0 hover:bg-blue-50"
										onclick={() => selectDraftPresentation(presentation)}
									>
										<div class="min-w-0">
											<p class="truncate text-sm font-semibold text-slate-800">
												{presentation.medication.name}
											</p>

											<p class="truncate text-xs text-slate-500">
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
							class="grid items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2 xl:grid-cols-[minmax(190px,1.3fr)_90px_100px_minmax(170px,1.2fr)_132px]"
							transition:slide={{ duration: 140 }}
						>
							<div class="min-w-0 px-1">
								<p class="truncate text-sm font-semibold text-emerald-800">
									{draftSearch}
								</p>
							</div>

							<input
								class="h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-[#0E4C92]"
								value={draftQuantity}
								placeholder="Qté"
								type="number"
								oninput={(e) => (draftQuantity = e.currentTarget.value)}
							/>

							<input
								class="h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-[#0E4C92]"
								value={draftDuration}
								placeholder="Durée"
								oninput={(e) => (draftDuration = e.currentTarget.value)}
							/>

							<input
								class="h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-[#0E4C92]"
								value={draftInstructions}
								placeholder="Posologie"
								oninput={(e) => (draftInstructions = e.currentTarget.value)}
							/>

							<div class="flex justify-end gap-1">
								<button
									type="button"
									class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-red-200 hover:text-red-600"
									onclick={resetDraft}
									aria-label="Annuler"
								>
									<X size={15} />
								</button>

								<button
									type="button"
									class="flex h-9 items-center gap-1 rounded-lg bg-[#0E4C92] px-3 text-xs font-semibold text-white transition hover:bg-[#0b3e78] disabled:bg-slate-200 disabled:text-slate-400 disabled:opacity-100"
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

										<tr class="transition-colors hover:bg-slate-50/70">
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

											<td class="px-3 py-2 font-medium text-slate-700">
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
						<p
							class="rounded-lg border border-dashed border-slate-200 px-3 py-2.5 text-center text-xs text-slate-400"
						>
							Aucun médicament ajouté.
						</p>
					{/if}
				</div>
			</Card>
		</div>

		<div class="grid gap-4 xl:grid-cols-2">
			<!-- Examens -->
			<Card
				title="Examens demandés"
				subtitle="Recherche et ajout rapide"
				size="compact"
				accent="info"
				icon={FlaskConical}
			>
				<div class="space-y-3">
					<div class="relative">
						<div class="relative">
							<Search
								size={15}
								class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
							/>

							<input
								id="exam-search"
								class="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none transition focus:border-[#0E4C92] focus:ring-2 focus:ring-[#0E4C92]/10"
								value={examSearch}
								placeholder="Rechercher un examen..."
								oninput={(e) => (examSearch = e.currentTarget.value)}
							/>
						</div>

						{#if examSearch}
							<div
								class="absolute z-20 mt-1.5 max-h-52 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
								transition:slide={{ duration: 120 }}
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
										transition:fade={{ duration: 120 }}
									>
										{exam.name}

										<button
											type="button"
											class="rounded-full text-blue-400 transition hover:bg-blue-100 hover:text-red-600"
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
						<p
							class="rounded-lg border border-dashed border-slate-200 px-3 py-2.5 text-center text-xs text-slate-400"
						>
							Aucun examen ajouté.
						</p>
					{/if}
				</div>
			</Card>
			<!-- Repos / hospitalisation -->
			<Card
				title="Documents médicaux"
				subtitle="Repos maladie et hospitalisation"
				size="compact"
				accent="purple"
				icon={FileText}
			>
				<div class="space-y-3">
					<div class="flex flex-wrap gap-2">
						{#if !sickLeaveRequired}
							<button
								type="button"
								class="flex h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-100 hover:shadow-sm"
								onclick={() => (sickLeaveRequired = true)}
							>
								<Plus size={14} />
								Ajouter un repos
							</button>
						{/if}

						{#if !hospitalizationRequired}
							<button
								type="button"
								class="flex h-9 items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 text-xs font-semibold text-purple-700 transition hover:-translate-y-0.5 hover:border-purple-300 hover:bg-purple-100 hover:shadow-sm"
								onclick={() => (hospitalizationRequired = true)}
							>
								<Plus size={14} />
								Ajouter une hospitalisation
							</button>
						{/if}
					</div>

					{#if sickLeaveRequired}
						<div
							class="rounded-lg border border-blue-100 bg-blue-50/50 p-2.5"
							transition:slide={{ duration: 140 }}
						>
							<div class="flex items-center gap-2">
								<div class="min-w-0 flex-1">
									<p class="text-xs font-semibold text-blue-800">Repos maladie</p>
								</div>

								<input
									class="h-9 w-28 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-[#0E4C92]"
									bind:value={sickLeaveDays}
									placeholder="Jours"
									type="number"
									min="1"
								/>

								<button
									type="button"
									class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
									onclick={() => {
										sickLeaveRequired = false;
										sickLeaveDays = '';
									}}
									aria-label="Supprimer le repos maladie"
								>
									<X size={14} />
								</button>
							</div>
						</div>
					{/if}

					{#if hospitalizationRequired}
						<div
							class="rounded-lg border border-purple-100 bg-purple-50/50 p-2.5"
							transition:slide={{ duration: 140 }}
						>
							<div class="flex items-center gap-2">
								<div class="min-w-0 flex-1">
									<p class="text-xs font-semibold text-purple-800">Hospitalisation</p>
								</div>

								<input
									class="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-[#0E4C92]"
									bind:value={hospitalizationType}
									placeholder="Service / type"
								/>

								<input
									class="h-9 w-28 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-[#0E4C92]"
									bind:value={hospitalizationDuration}
									placeholder="Jours"
									type="number"
									min="1"
								/>

								<button
									type="button"
									class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
									onclick={() => {
										hospitalizationRequired = false;
										hospitalizationType = '';
										hospitalizationDuration = '';
										hospitalizationReason = '';
									}}
									aria-label="Supprimer l'hospitalisation"
								>
									<X size={14} />
								</button>
							</div>

							<input
								class="mt-2 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-[#0E4C92]"
								bind:value={hospitalizationReason}
								placeholder="Motif d'hospitalisation"
							/>
						</div>
					{/if}

					{#if !sickLeaveRequired && !hospitalizationRequired}
						<p
							class="rounded-lg border border-dashed border-slate-200 px-3 py-2.5 text-center text-xs text-slate-400"
						>
							Aucun document médical ajouté.
						</p>
					{/if}
				</div>
			</Card>
		</div>

		<!-- Diagnostic et prise en charge -->
		<Card
			title="Diagnostic et prise en charge"
			subtitle="Synthèse médicale et conduite à tenir"
			size="compact"
			accent="success"
			icon={ClipboardCheck}
		>
			<textarea
				class="min-h-24 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0E4C92] focus:ring-2 focus:ring-[#0E4C92]/10"
				bind:value={diagnosis}
				placeholder="Saisir le diagnostic, les observations et la conduite à tenir..."></textarea>
		</Card>

		<!-- Actions -->
		<div
			class="sticky bottom-3 z-30 flex items-center justify-between rounded-2xl border border-[#DCE7F2] bg-white/95 px-3 py-2.5 shadow-[0_10px_35px_rgba(15,23,42,0.10)] backdrop-blur-xl"
		>
			<div class="hidden items-center gap-2 text-xs text-slate-400 md:flex">
				<div class="h-2 w-2 animate-pulse rounded-full bg-amber-400"></div>

				<span> Consultation en cours · Brouillon </span>
			</div>

			<div class="flex w-full items-center justify-end gap-2 md:w-auto">
				<Button variant="secondary" onclick={() => goto(resolve(`/patients/${p.id}`))}>
					Annuler
				</Button>

				<Button loading={submitting} onclick={submit}>
					<span class="flex items-center gap-2">
						<ClipboardCheck size={16} />

						{submitting ? 'Enregistrement...' : 'Enregistrer la consultation'}
					</span>
				</Button>
			</div>
		</div>
	</div>
{/if}
