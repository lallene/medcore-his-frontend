<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Activity,
		ContactRound,
		FileText,
		HeartPulse,
		Plus,
		Save,
		ShieldCheck,
		Trash2,
		UserRound
	} from 'lucide-svelte';

	import { getPatientMedicalRecord, updatePatientMedicalRecord } from '$lib/api/medical-record';

	import type {
		CommonMedicalRecord,
		MedicalRecordAllergy,
		MedicalHistoryItem,
		SurgicalHistoryItem,
		FamilyHistoryItem,
		UsualTreatmentItem,
		VaccinationItem,
		DisabilityItem,
		MedicalDeviceItem,
		VitalRecord,
		MedicalDocument
	} from '$lib/types/medical-record';

	type SectionId =
		'identity' | 'coverage' | 'history' | 'treatments' | 'lifestyle' | 'vitals' | 'documents';

	type Props = {
		patientId: number;
	};

	let { patientId }: Props = $props();

	let record = $state<CommonMedicalRecord | null>(null);
	let activeSection = $state<SectionId>('identity');

	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');
	let success = $state('');

	const sections = [
		{
			id: 'identity' as const,
			label: 'Identité',
			description: 'Patient et contacts',
			icon: UserRound
		},
		{
			id: 'coverage' as const,
			label: 'Couverture',
			description: 'Assurance et groupe sanguin',
			icon: ShieldCheck
		},
		{
			id: 'history' as const,
			label: 'Antécédents',
			description: 'Allergies et histoires médicales',
			icon: HeartPulse
		},
		{
			id: 'treatments' as const,
			label: 'Traitements',
			description: 'Médicaments et vaccinations',
			icon: ContactRound
		},
		{
			id: 'lifestyle' as const,
			label: 'Mode de vie',
			description: 'Habitudes, handicaps et dispositifs',
			icon: Activity
		},
		{
			id: 'vitals' as const,
			label: 'Constantes',
			description: 'Mesures et traçabilité',
			icon: Activity
		},
		{
			id: 'documents' as const,
			label: 'Documents',
			description: 'Pièces médicales',
			icon: FileText
		}
	];

	onMount(async () => {
		try {
			record = await getPatientMedicalRecord(patientId);
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Impossible de charger le dossier médical.';
		} finally {
			loading = false;
		}
	});

	async function save() {
		if (!record) {
			return;
		}

		saving = true;
		error = '';
		success = '';

		try {
			const { id, patientId: _patientId, createdAt, updatedAt, age, ...payload } = record;

			void id;
			void _patientId;
			void createdAt;
			void updatedAt;
			void age;

			record = await updatePatientMedicalRecord(patientId, payload);

			success = 'Dossier médical enregistré avec succès.';
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Impossible d’enregistrer le dossier médical.';
		} finally {
			saving = false;
		}
	}

	function addAllergy() {
		if (!record) return;

		const item: MedicalRecordAllergy = {
			category: 'MEDICATION',
			name: '',
			reaction: '',
			severity: 'LOW',
			diagnosedAt: '',
			notes: ''
		};

		record.allergies = [...record.allergies, item];
	}

	function removeMedicalHistory(index: number) {
		if (!record) return;

		record.medicalHistories = record.medicalHistories.filter((_, itemIndex) => itemIndex !== index);
	}

	function removeSurgicalHistory(index: number) {
		if (!record) return;

		record.surgicalHistories = record.surgicalHistories.filter(
			(_, itemIndex) => itemIndex !== index
		);
	}

	function removeFamilyHistory(index: number) {
		if (!record) return;

		record.familyHistories = record.familyHistories.filter((_, itemIndex) => itemIndex !== index);
	}

	function removeUsualTreatment(index: number) {
		if (!record) return;

		record.usualTreatments = record.usualTreatments.filter((_, itemIndex) => itemIndex !== index);
	}

	function removeVaccination(index: number) {
		if (!record) return;

		record.vaccinations = record.vaccinations.filter((_, itemIndex) => itemIndex !== index);
	}

	function removeDisability(index: number) {
		if (!record) return;

		record.disabilities = record.disabilities.filter((_, itemIndex) => itemIndex !== index);
	}

	function removeMedicalDevice(index: number) {
		if (!record) return;

		record.medicalDevices = record.medicalDevices.filter((_, itemIndex) => itemIndex !== index);
	}

	function removeVitalRecord(index: number) {
		if (!record) return;

		record.vitalsHistory = record.vitalsHistory.filter((_, itemIndex) => itemIndex !== index);
	}

	function removeDocument(index: number) {
		if (!record) return;

		record.documents = record.documents.filter((_, itemIndex) => itemIndex !== index);
	}

	function removeAllergy(index: number) {
		if (!record) return;

		record.allergies = record.allergies.filter((_, itemIndex) => itemIndex !== index);
	}

	function addMedicalHistory() {
		if (!record) return;

		const item: MedicalHistoryItem = {
			disease: '',
			historyType: 'PAST',
			diagnosedAt: '',
			resolvedAt: '',
			status: 'UNKNOWN',
			notes: ''
		};

		record.medicalHistories = [...record.medicalHistories, item];
	}

	function addSurgicalHistory() {
		if (!record) return;

		const item: SurgicalHistoryItem = {
			procedureName: '',
			procedureDate: '',
			facility: '',
			indication: '',
			complications: '',
			notes: ''
		};

		record.surgicalHistories = [...record.surgicalHistories, item];
	}

	function addFamilyHistory() {
		if (!record) return;

		const item: FamilyHistoryItem = {
			relationship: '',
			disease: '',
			ageAtDiagnosis: null,
			notes: ''
		};

		record.familyHistories = [...record.familyHistories, item];
	}

	function addUsualTreatment() {
		if (!record) return;

		const item: UsualTreatmentItem = {
			medicationName: '',
			dosage: '',
			frequency: '',
			startDate: '',
			endDate: '',
			prescriber: '',
			status: 'ONGOING',
			notes: ''
		};

		record.usualTreatments = [...record.usualTreatments, item];
	}

	function addVaccination() {
		if (!record) return;

		const item: VaccinationItem = {
			vaccineName: '',
			dose: '',
			administeredDate: '',
			nextReminderDate: '',
			status: 'PLANNED',
			batchNumber: '',
			center: ''
		};

		record.vaccinations = [...record.vaccinations, item];
	}

	function addDisability() {
		if (!record) return;

		const item: DisabilityItem = {
			type: '',
			level: '',
			specialNeeds: '',
			notes: ''
		};

		record.disabilities = [...record.disabilities, item];
	}

	function addMedicalDevice() {
		if (!record) return;

		const item: MedicalDeviceItem = {
			type: 'OTHER',
			name: '',
			reference: '',
			implantationDate: '',
			manufacturer: '',
			notes: ''
		};

		record.medicalDevices = [...record.medicalDevices, item];
	}

	function addVitalRecord() {
		if (!record) return;

		const item: VitalRecord = {
			measuredAt: '',
			weightKg: null,
			heightCm: null,
			bmi: null,
			temperature: null,
			bloodPressureSystolic: null,
			bloodPressureDiastolic: null,
			heartRate: null,
			respiratoryRate: null,
			oxygenSaturation: null,
			bloodGlucose: null,
			waistCircumferenceCm: null,
			painScore: null,
			painLocation: '',
			painType: '',
			painDuration: '',
			measuredBy: ''
		};

		record.vitalsHistory = [...record.vitalsHistory, item];
	}

	function updateBMI(item: VitalRecord) {
		if (item.weightKg === null || item.heightCm === null || item.heightCm <= 0) {
			item.bmi = null;
			return;
		}

		const heightInMeters = item.heightCm / 100;

		item.bmi = Math.round((item.weightKg / (heightInMeters * heightInMeters)) * 10) / 10;
	}

	function addDocument() {
		if (!record) return;

		const item: MedicalDocument = {
			type: 'OTHER',
			title: '',
			documentDate: '',
			fileReference: '',
			description: '',
			uploadedBy: ''
		};

		record.documents = [...record.documents, item];
	}
</script>

<section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
	<div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.18em] text-[#0E4C92]">Dossier médical</p>

			<h2 class="mt-1 text-2xl font-black text-slate-900">Dossier médical commun</h2>

			<p class="mt-2 text-sm text-slate-500">
				Informations médicales longitudinales accessibles à tous les départements autorisés.
			</p>
		</div>

		<button
			type="button"
			onclick={save}
			disabled={saving || loading || !record}
			class="inline-flex items-center gap-2 rounded-xl bg-[#0E4C92] px-5 py-2.5 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60"
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
			class="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700"
		>
			{success}
		</div>
	{/if}

	{#if loading}
		<p class="mt-6 text-sm text-slate-500">Chargement du dossier médical...</p>
	{:else if record}
		<div class="mt-6 space-y-6">
			<nav class="flex gap-3 overflow-x-auto pb-2">
				{#each sections as section (section.id)}
					<button
						type="button"
						onclick={() => (activeSection = section.id)}
						class={`min-w-[210px] flex-none rounded-xl border p-4 text-left transition ${
							activeSection === section.id
								? 'border-[#0E4C92] bg-[#0E4C92] text-white'
								: 'border-slate-200 bg-white text-slate-700 hover:bg-blue-50'
						}`}
					>
						<section.icon size={18} />

						<p class="mt-3 text-sm font-black">
							{section.label}
						</p>

						<p
							class={`mt-1 text-xs ${
								activeSection === section.id ? 'text-blue-100' : 'text-slate-400'
							}`}
						>
							{section.description}
						</p>
					</button>
				{/each}
			</nav>

			{#if activeSection === 'identity'}
				<section class="space-y-6">
					<div>
						<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
							Identification
						</p>

						<h3 class="mt-1 text-lg font-black text-slate-900">Dossier et identité du patient</h3>
					</div>

					<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
						<input
							type="text"
							bind:value={record.recordNumber}
							placeholder="Numéro du dossier"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<input
							type="text"
							bind:value={record.facilityName}
							placeholder="Établissement"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<select
							bind:value={record.status}
							aria-label="Statut du dossier"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						>
							<option value="ACTIVE">Actif</option>
							<option value="ARCHIVED">Archivé</option>
							<option value="CLOSED">Clôturé</option>
						</select>

						<input
							type="text"
							value={record.createdAt}
							readonly
							aria-label="Date de création du dossier"
							class="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm"
						/>

						<input
							type="text"
							bind:value={record.lastName}
							placeholder="Nom"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<input
							type="text"
							bind:value={record.firstNames}
							placeholder="Prénoms"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<input
							type="date"
							bind:value={record.birthDate}
							aria-label="Date de naissance"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<input
							type="number"
							value={record.age ?? ''}
							readonly
							placeholder="Âge"
							class="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm"
						/>

						<select
							bind:value={record.sex}
							aria-label="Sexe"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						>
							<option value="">Sexe</option>
							<option value="M">Masculin</option>
							<option value="F">Féminin</option>
							<option value="OTHER">Autre</option>
						</select>

						<input
							type="text"
							bind:value={record.photoReference}
							placeholder="Référence de la photo"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<input
							type="tel"
							bind:value={record.phone}
							placeholder="Téléphone"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<input
							type="email"
							bind:value={record.email}
							placeholder="Email"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<input
							type="text"
							bind:value={record.maritalStatus}
							placeholder="Situation matrimoniale"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<input
							type="text"
							bind:value={record.profession}
							placeholder="Profession"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<textarea
							bind:value={record.address}
							rows="3"
							placeholder="Adresse"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm md:col-span-2"></textarea>
					</div>
				</section>
			{/if}

			{#if activeSection === 'coverage'}
				<section class="space-y-6">
					<div>
						<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
							Couverture médicale
						</p>

						<h3 class="mt-1 text-lg font-black text-slate-900">
							Assurance, contacts et informations sanguines
						</h3>
					</div>

					<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
						<label class="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
							<input type="checkbox" bind:checked={record.medicalCoverage.isInsured} />
							<span class="text-sm font-bold text-slate-700"> Patient assuré </span>
						</label>

						<input
							type="text"
							bind:value={record.medicalCoverage.insuranceName}
							placeholder="Assurance"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<input
							type="text"
							bind:value={record.medicalCoverage.mutualName}
							placeholder="Mutuelle"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<input
							type="text"
							bind:value={record.medicalCoverage.insuredNumber}
							placeholder="Numéro d’assuré"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<input
							type="text"
							bind:value={record.medicalCoverage.coverageOrganization}
							placeholder="Organisme de prise en charge"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm md:col-span-2"
						/>

						<input
							type="number"
							min="0"
							max="100"
							step="0.01"
							bind:value={record.medicalCoverage.coverageRate}
							placeholder="Taux de couverture (%)"
							class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
						/>

						<select
							bind:value={record.bloodGroup}
							aria-label="Groupe sanguin"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						>
							<option value="">Groupe sanguin</option>
							<option value="A">A</option>
							<option value="B">B</option>
							<option value="AB">AB</option>
							<option value="O">O</option>
						</select>

						<select
							bind:value={record.rhesus}
							aria-label="Rhésus"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
						>
							<option value="">Rhésus</option>
							<option value="+">Positif</option>
							<option value="-">Négatif</option>
						</select>
					</div>

					<div class="grid gap-6 xl:grid-cols-2">
						<section class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
							<h4 class="font-black text-slate-900">Contact d’urgence</h4>

							<div class="mt-4 grid gap-4 md:grid-cols-2">
								<input
									type="text"
									bind:value={record.emergencyContact.lastName}
									placeholder="Nom"
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
								/>

								<input
									type="text"
									bind:value={record.emergencyContact.firstNames}
									placeholder="Prénoms"
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
								/>

								<input
									type="text"
									bind:value={record.emergencyContact.relationship}
									placeholder="Lien avec le patient"
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
								/>

								<input
									type="tel"
									bind:value={record.emergencyContact.phone}
									placeholder="Téléphone"
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
								/>

								<input
									type="email"
									bind:value={record.emergencyContact.email}
									placeholder="Email"
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm md:col-span-2"
								/>

								<textarea
									bind:value={record.emergencyContact.address}
									rows="2"
									placeholder="Adresse"
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm md:col-span-2"
								></textarea>
							</div>
						</section>

						<section class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
							<h4 class="font-black text-slate-900">Responsable légal</h4>

							<div class="mt-4 grid gap-4 md:grid-cols-2">
								<input
									type="text"
									bind:value={record.legalGuardian.lastName}
									placeholder="Nom"
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
								/>

								<input
									type="text"
									bind:value={record.legalGuardian.firstNames}
									placeholder="Prénoms"
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
								/>

								<input
									type="text"
									bind:value={record.legalGuardian.relationship}
									placeholder="Lien avec le patient"
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
								/>

								<input
									type="tel"
									bind:value={record.legalGuardian.phone}
									placeholder="Téléphone"
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
								/>

								<input
									type="email"
									bind:value={record.legalGuardian.email}
									placeholder="Email"
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm md:col-span-2"
								/>

								<textarea
									bind:value={record.legalGuardian.address}
									rows="2"
									placeholder="Adresse"
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm md:col-span-2"
								></textarea>
							</div>
						</section>
					</div>
				</section>
			{/if}

			{#if activeSection === 'treatments'}
				<section class="space-y-8">
					<section class="space-y-4">
						<div class="flex items-center justify-between gap-4">
							<div>
								<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
									Traitements habituels
								</p>

								<h3 class="mt-1 text-lg font-black text-slate-900">
									Médicaments pris régulièrement
								</h3>
							</div>

							<button
								type="button"
								onclick={addUsualTreatment}
								class="inline-flex items-center gap-2 rounded-xl bg-[#0E4C92] px-4 py-2 text-sm font-bold text-white"
							>
								<Plus size={16} />
								Ajouter
							</button>
						</div>

						<div class="space-y-3">
							{#each record.usualTreatments as treatment, index (treatment.id ?? index)}
								<div
									class="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-[1.2fr_160px_180px_160px_1fr_160px_48px]"
								>
									<input
										type="text"
										bind:value={treatment.medicationName}
										placeholder="Médicament"
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<input
										type="text"
										bind:value={treatment.dosage}
										placeholder="Dosage"
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<input
										type="text"
										bind:value={treatment.frequency}
										placeholder="Fréquence"
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<input
										type="date"
										bind:value={treatment.startDate}
										aria-label={`Date de début du traitement ${index + 1}`}
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<input
										type="text"
										bind:value={treatment.prescriber}
										placeholder="Prescripteur"
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<select
										bind:value={treatment.status}
										aria-label={`Statut du traitement ${index + 1}`}
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									>
										<option value="ONGOING">En cours</option>
										<option value="STOPPED">Arrêté</option>
									</select>

									<button
										type="button"
										onclick={() => removeUsualTreatment(index)}
										aria-label={`Supprimer le traitement ${index + 1}`}
										class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
									>
										<Trash2 size={17} />
									</button>

									<textarea
										bind:value={treatment.notes}
										rows="2"
										placeholder="Notes"
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm md:col-span-2 xl:col-span-7"
									></textarea>
								</div>
							{/each}
						</div>
					</section>

					<section class="space-y-4 border-t border-slate-200 pt-6">
						<div class="flex items-center justify-between gap-4">
							<div>
								<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
									Vaccinations
								</p>

								<h3 class="mt-1 text-lg font-black text-slate-900">Historique vaccinal</h3>
							</div>

							<button
								type="button"
								onclick={addVaccination}
								class="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold"
							>
								<Plus size={16} />
								Ajouter
							</button>
						</div>

						<div class="space-y-3">
							{#each record.vaccinations as vaccination, index (vaccination.id ?? index)}
								<div
									class="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-[1.2fr_130px_160px_160px_160px_1fr_48px]"
								>
									<input
										type="text"
										bind:value={vaccination.vaccineName}
										placeholder="Vaccin"
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<input
										type="text"
										bind:value={vaccination.dose}
										placeholder="Dose"
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<input
										type="date"
										bind:value={vaccination.administeredDate}
										aria-label={`Date de vaccination ${index + 1}`}
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<input
										type="date"
										bind:value={vaccination.nextReminderDate}
										aria-label={`Date de rappel ${index + 1}`}
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<select
										bind:value={vaccination.status}
										aria-label={`Statut vaccinal ${index + 1}`}
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									>
										<option value="PLANNED">Planifié</option>
										<option value="COMPLETED">Réalisé</option>
										<option value="DELAYED">En retard</option>
										<option value="MISSED">Manqué</option>
									</select>

									<input
										type="text"
										bind:value={vaccination.batchNumber}
										placeholder="Numéro de lot"
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<button
										type="button"
										onclick={() => removeVaccination(index)}
										aria-label={`Supprimer le vaccin ${index + 1}`}
										class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
									>
										<Trash2 size={17} />
									</button>

									<input
										type="text"
										bind:value={vaccination.center}
										placeholder="Centre de vaccination"
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm md:col-span-2 xl:col-span-7"
									/>
								</div>
							{/each}
						</div>
					</section>
				</section>
			{/if}

			{#if activeSection === 'lifestyle'}
				<section class="space-y-8">
					<section class="space-y-4">
						<div>
							<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
								Habitudes de vie
							</p>

							<h3 class="mt-1 text-lg font-black text-slate-900">
								Tabac, alcool, activité et alimentation
							</h3>
						</div>

						<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
							<input
								type="text"
								bind:value={record.lifestyle.smokingStatus}
								placeholder="Statut tabagique"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="number"
								min="0"
								bind:value={record.lifestyle.cigarettesPerDay}
								placeholder="Cigarettes par jour"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="text"
								bind:value={record.lifestyle.alcoholStatus}
								placeholder="Consommation d’alcool"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<input
								type="text"
								bind:value={record.lifestyle.physicalActivityLevel}
								placeholder="Activité physique"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm"
							/>

							<textarea
								bind:value={record.lifestyle.dietDescription}
								rows="3"
								placeholder="Habitudes alimentaires"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm md:col-span-2"
							></textarea>

							<textarea
								bind:value={record.lifestyle.notes}
								rows="3"
								placeholder="Observations"
								class="rounded-xl border border-slate-200 px-4 py-3 text-sm md:col-span-2"
							></textarea>
						</div>
					</section>

					<section class="space-y-4 border-t border-slate-200 pt-6">
						<div class="flex items-center justify-between gap-4">
							<div>
								<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
									Handicaps
								</p>

								<h3 class="mt-1 text-lg font-black text-slate-900">Besoins particuliers</h3>
							</div>

							<button
								type="button"
								onclick={addDisability}
								class="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold"
							>
								<Plus size={16} />
								Ajouter
							</button>
						</div>

						<div class="space-y-3">
							{#each record.disabilities as disability, index (disability.id ?? index)}
								<div
									class="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-[1fr_180px_1.5fr_1fr_48px]"
								>
									<input
										type="text"
										bind:value={disability.type}
										placeholder="Type de handicap"
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<input
										type="text"
										bind:value={disability.level}
										placeholder="Niveau"
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<input
										type="text"
										bind:value={disability.specialNeeds}
										placeholder="Besoins particuliers"
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<input
										type="text"
										bind:value={disability.notes}
										placeholder="Notes"
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<button
										type="button"
										onclick={() => removeDisability(index)}
										aria-label={`Supprimer le handicap ${index + 1}`}
										class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
									>
										<Trash2 size={17} />
									</button>
								</div>
							{/each}
						</div>
					</section>

					<section class="space-y-4 border-t border-slate-200 pt-6">
						<div class="flex items-center justify-between gap-4">
							<div>
								<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
									Dispositifs médicaux
								</p>

								<h3 class="mt-1 text-lg font-black text-slate-900">
									Implants, prothèses et autres dispositifs
								</h3>
							</div>

							<button
								type="button"
								onclick={addMedicalDevice}
								class="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold"
							>
								<Plus size={16} />
								Ajouter
							</button>
						</div>

						<div class="space-y-3">
							{#each record.medicalDevices as device, index (device.id ?? index)}
								<div
									class="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-[180px_1fr_1fr_160px_1fr_48px]"
								>
									<select
										bind:value={device.type}
										aria-label={`Type de dispositif ${index + 1}`}
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									>
										<option value="PACEMAKER">Pacemaker</option>
										<option value="PROSTHESIS">Prothèse</option>
										<option value="IMPLANT">Implant</option>
										<option value="CATHETER">Sonde</option>
										<option value="OTHER">Autre</option>
									</select>

									<input
										type="text"
										bind:value={device.name}
										placeholder="Nom du dispositif"
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<input
										type="text"
										bind:value={device.reference}
										placeholder="Référence"
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<input
										type="date"
										bind:value={device.implantationDate}
										aria-label={`Date d’implantation ${index + 1}`}
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<input
										type="text"
										bind:value={device.manufacturer}
										placeholder="Fabricant"
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<button
										type="button"
										onclick={() => removeMedicalDevice(index)}
										aria-label={`Supprimer le dispositif ${index + 1}`}
										class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
									>
										<Trash2 size={17} />
									</button>

									<textarea
										bind:value={device.notes}
										rows="2"
										placeholder="Notes"
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm md:col-span-2 xl:col-span-6"
									></textarea>
								</div>
							{/each}
						</div>
					</section>
				</section>
			{/if}

			{#if activeSection === 'documents'}
				<section class="space-y-6">
					<div class="flex items-center justify-between gap-4">
						<div>
							<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
								Documents médicaux
							</p>

							<h3 class="mt-1 text-lg font-black text-slate-900">
								Ordonnances, certificats, comptes rendus et pièces jointes
							</h3>
						</div>

						<button
							type="button"
							onclick={addDocument}
							class="inline-flex items-center gap-2 rounded-xl bg-[#0E4C92] px-4 py-2 text-sm font-bold text-white"
						>
							<Plus size={16} />
							Ajouter
						</button>
					</div>

					<div class="space-y-3">
						{#each record.documents as document, index (document.id ?? index)}
							<div
								class="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-[180px_1.2fr_170px_1.5fr_1fr_48px]"
							>
								<select
									bind:value={document.type}
									aria-label={`Type de document ${index + 1}`}
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
								>
									<option value="PRESCRIPTION">Ordonnance</option>
									<option value="CERTIFICATE">Certificat</option>
									<option value="REPORT">Compte rendu</option>
									<option value="IMAGE">Image</option>
									<option value="PDF">PDF</option>
									<option value="OTHER">Autre</option>
								</select>

								<input
									type="text"
									bind:value={document.title}
									placeholder="Titre"
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
								/>

								<input
									type="date"
									bind:value={document.documentDate}
									aria-label={`Date du document ${index + 1}`}
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
								/>

								<input
									type="text"
									bind:value={document.fileReference}
									placeholder="Référence ou URL"
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
								/>

								<input
									type="text"
									bind:value={document.uploadedBy}
									placeholder="Ajouté par"
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
								/>

								<button
									type="button"
									onclick={() => removeDocument(index)}
									aria-label={`Supprimer le document ${index + 1}`}
									class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
								>
									<Trash2 size={17} />
								</button>

								<textarea
									bind:value={document.description}
									rows="2"
									placeholder="Description"
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm md:col-span-2 xl:col-span-6"
								></textarea>
							</div>
						{/each}
					</div>
				</section>
			{/if}

			{#if activeSection === 'history'}
				<section class="space-y-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">Allergies</p>

							<h3 class="mt-1 text-lg font-black text-slate-900">Allergies connues</h3>
						</div>

						<button
							type="button"
							onclick={addAllergy}
							class="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold"
						>
							<Plus size={16} />
							Ajouter
						</button>
					</div>

					<div class="space-y-3">
						{#each record.allergies as allergy, index (index)}
							<div
								class="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[180px_1fr_1fr_180px_48px]"
							>
								<select
									bind:value={allergy.category}
									aria-label={`Catégorie de l’allergie ${index + 1}`}
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
								>
									<option value="MEDICATION">Médicament</option>
									<option value="FOOD">Aliment</option>
									<option value="PRODUCT">Produit</option>
									<option value="SUBSTANCE">Substance</option>
									<option value="OTHER">Autre</option>
								</select>

								<input
									type="text"
									bind:value={allergy.name}
									placeholder="Allergène"
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
								/>

								<input
									type="text"
									bind:value={allergy.reaction}
									placeholder="Réaction"
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
								/>

								<select
									bind:value={allergy.severity}
									aria-label={`Gravité de l’allergie ${index + 1}`}
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
								>
									<option value="LOW">Faible</option>
									<option value="MODERATE">Modérée</option>
									<option value="HIGH">Sévère</option>
									<option value="ANAPHYLAXIS">Anaphylaxie</option>
								</select>

								<button
									type="button"
									onclick={() => removeAllergy(index)}
									aria-label={`Supprimer l’allergie ${index + 1}`}
									class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
								>
									<Trash2 size={17} />
								</button>
							</div>
						{/each}
					</div>
				</section>
				<section class="space-y-4 border-t border-slate-200 pt-6">
					<div class="flex items-center justify-between gap-4">
						<div>
							<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
								Antécédents médicaux
							</p>

							<h3 class="mt-1 text-lg font-black text-slate-900">Maladies passées et chroniques</h3>
						</div>

						<button
							type="button"
							onclick={addMedicalHistory}
							class="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold"
						>
							<Plus size={16} />
							Ajouter
						</button>
					</div>

					<div class="space-y-3">
						{#each record.medicalHistories as history, index (history.id ?? index)}
							<div
								class="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-[1.2fr_180px_160px_160px_1fr_48px]"
							>
								<input
									type="text"
									bind:value={history.disease}
									placeholder="Maladie"
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
								/>

								<select
									bind:value={history.historyType}
									aria-label={`Type d’antécédent ${index + 1}`}
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
								>
									<option value="PAST">Passé</option>
									<option value="CHRONIC">Chronique</option>
								</select>

								<input
									type="date"
									bind:value={history.diagnosedAt}
									aria-label={`Date du diagnostic ${index + 1}`}
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
								/>

								<input
									type="date"
									bind:value={history.resolvedAt}
									aria-label={`Date de résolution ${index + 1}`}
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
								/>

								<select
									bind:value={history.status}
									aria-label={`Statut de l’antécédent ${index + 1}`}
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
								>
									<option value="UNKNOWN">Inconnu</option>
									<option value="ACTIVE">Actif</option>
									<option value="RESOLVED">Résolu</option>
								</select>

								<button
									type="button"
									onclick={() => removeMedicalHistory(index)}
									aria-label={`Supprimer l’antécédent médical ${index + 1}`}
									class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
								>
									<Trash2 size={17} />
								</button>

								<textarea
									bind:value={history.notes}
									rows="2"
									placeholder="Observations"
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm md:col-span-2 xl:col-span-6"
								></textarea>
							</div>
						{/each}
					</div>
				</section>
				<section class="space-y-4 border-t border-slate-200 pt-6">
					<div class="flex items-center justify-between gap-4">
						<div>
							<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
								Antécédents chirurgicaux
							</p>

							<h3 class="mt-1 text-lg font-black text-slate-900">Interventions antérieures</h3>
						</div>

						<button
							type="button"
							onclick={addSurgicalHistory}
							class="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold"
						>
							<Plus size={16} />
							Ajouter
						</button>
					</div>

					<div class="space-y-3">
						{#each record.surgicalHistories as surgery, index (surgery.id ?? index)}
							<div
								class="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-[1.2fr_170px_1fr_1fr_48px]"
							>
								<input
									type="text"
									bind:value={surgery.procedureName}
									placeholder="Intervention"
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
								/>

								<input
									type="date"
									bind:value={surgery.procedureDate}
									aria-label={`Date de l’intervention ${index + 1}`}
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
								/>

								<input
									type="text"
									bind:value={surgery.facility}
									placeholder="Établissement"
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
								/>

								<input
									type="text"
									bind:value={surgery.indication}
									placeholder="Indication"
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
								/>

								<button
									type="button"
									onclick={() => removeSurgicalHistory(index)}
									aria-label={`Supprimer l’intervention ${index + 1}`}
									class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
								>
									<Trash2 size={17} />
								</button>

								<textarea
									bind:value={surgery.complications}
									rows="2"
									placeholder="Complications"
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm md:col-span-2 xl:col-span-2"
								></textarea>

								<textarea
									bind:value={surgery.notes}
									rows="2"
									placeholder="Notes"
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm md:col-span-2 xl:col-span-3"
								></textarea>
							</div>
						{/each}
					</div>
				</section>
				<section class="space-y-4 border-t border-slate-200 pt-6">
					<div class="flex items-center justify-between gap-4">
						<div>
							<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
								Antécédents familiaux
							</p>

							<h3 class="mt-1 text-lg font-black text-slate-900">
								Maladies familiales et héréditaires
							</h3>
						</div>

						<button
							type="button"
							onclick={addFamilyHistory}
							class="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold"
						>
							<Plus size={16} />
							Ajouter
						</button>
					</div>

					<div class="space-y-3">
						{#each record.familyHistories as history, index (history.id ?? index)}
							<div
								class="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-[220px_1fr_180px_1fr_48px]"
							>
								<input
									type="text"
									bind:value={history.relationship}
									placeholder="Lien familial"
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
								/>

								<input
									type="text"
									bind:value={history.disease}
									placeholder="Maladie"
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
								/>

								<input
									type="number"
									min="0"
									bind:value={history.ageAtDiagnosis}
									placeholder="Âge au diagnostic"
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
								/>

								<input
									type="text"
									bind:value={history.notes}
									placeholder="Observations"
									class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
								/>

								<button
									type="button"
									onclick={() => removeFamilyHistory(index)}
									aria-label={`Supprimer l’antécédent familial ${index + 1}`}
									class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
								>
									<Trash2 size={17} />
								</button>
							</div>
						{/each}
					</div>
				</section>
			{/if}
			{#if activeSection === 'vitals'}
				<section class="space-y-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-xs font-black uppercase tracking-[0.16em] text-[#0E4C92]">
								Constantes
							</p>

							<h3 class="mt-1 text-lg font-black text-slate-900">Historique des mesures</h3>
						</div>

						<button
							type="button"
							onclick={addVitalRecord}
							class="inline-flex items-center gap-2 rounded-xl bg-[#0E4C92] px-4 py-2 text-sm font-bold text-white"
						>
							<Plus size={16} />
							Ajouter une mesure
						</button>
					</div>

					<div class="space-y-4">
						{#each record.vitalsHistory as vital, index (index)}
							<article class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
								<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
									<input
										type="datetime-local"
										bind:value={vital.measuredAt}
										aria-label={`Date de mesure ${index + 1}`}
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<input
										type="number"
										step="0.1"
										bind:value={vital.weightKg}
										oninput={() => updateBMI(vital)}
										placeholder="Poids (kg)"
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<input
										type="number"
										step="0.1"
										bind:value={vital.heightCm}
										oninput={() => updateBMI(vital)}
										placeholder="Taille (cm)"
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<input
										type="number"
										value={vital.bmi ?? ''}
										readonly
										placeholder="IMC"
										class="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm"
									/>

									<input
										type="number"
										step="0.1"
										bind:value={vital.temperature}
										placeholder="Température"
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<input
										type="number"
										bind:value={vital.bloodPressureSystolic}
										placeholder="TA systolique"
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<input
										type="number"
										bind:value={vital.bloodPressureDiastolic}
										placeholder="TA diastolique"
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<input
										type="number"
										bind:value={vital.heartRate}
										placeholder="Fréquence cardiaque"
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<input
										type="number"
										bind:value={vital.respiratoryRate}
										placeholder="Fréquence respiratoire"
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<input
										type="number"
										step="0.1"
										bind:value={vital.oxygenSaturation}
										placeholder="Saturation"
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<input
										type="number"
										step="0.01"
										bind:value={vital.bloodGlucose}
										placeholder="Glycémie"
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<input
										type="number"
										step="0.1"
										bind:value={vital.waistCircumferenceCm}
										placeholder="Tour de taille"
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<input
										type="number"
										min="0"
										max="10"
										bind:value={vital.painScore}
										placeholder="Douleur /10"
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<input
										type="text"
										bind:value={vital.painDuration}
										placeholder="Durée de la douleur"
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<button
										type="button"
										onclick={() => removeVitalRecord(index)}
										aria-label={`Supprimer la mesure ${index + 1}`}
										class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500"
									>
										<Trash2 size={17} />
									</button>

									<input
										type="text"
										bind:value={vital.painLocation}
										placeholder="Localisation douleur"
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<input
										type="text"
										bind:value={vital.painType}
										placeholder="Type de douleur"
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>

									<input
										type="text"
										bind:value={vital.measuredBy}
										placeholder="Mesuré par"
										class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
									/>
								</div>
							</article>
						{/each}
					</div>
				</section>
			{/if}
		</div>
	{/if}
</section>
