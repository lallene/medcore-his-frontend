<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import {
		Activity,
		FileText,
		HeartPulse,
		Phone,
		Printer,
		Shield,
		User,
		UserPlus,
		WalletCards
	} from 'lucide-svelte';

	import type { PatientConsultation } from '$lib/api/patient-consultations';
	import type { Patient } from '$lib/types/patient';
	import type { PatientSummary } from '$lib/types/patient-summary';
	import type { PatientInsuranceView } from '$lib/types/insurance';
	import type { Hospitalization } from '$lib/types/hospitalization';

	import MetricCard from '$lib/components/dashboard/MetricCard.svelte';
	import InfoBlock from '$lib/components/patients/InfoBlock.svelte';
	import JourneyStep from '$lib/components/patients/JourneyStep.svelte';
	import MiniInfo from '$lib/components/patients/MiniInfo.svelte';
	import TimelineItem from '$lib/components/patients/TimelineItem.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';

	interface Props {
		patient: Patient;
		summary: PatientSummary | null;
		consultations: PatientConsultation[];
		insurance: PatientInsuranceView;
		hospitalizations: Hospitalization[];
	}

	let { patient, summary, consultations, insurance, hospitalizations }: Props = $props();

	const insuranceStatus = $derived(insurance.status);

	const insuranceDetail = $derived(
		insurance.insured ? insurance.memberNumber : 'Aucune couverture'
	);

	const coverageRate = $derived(insurance.insured ? `${insurance.coverageRate} %` : '0 %');

	const patientShareRate = $derived(
		insurance.insured ? `${Math.max(0, 100 - insurance.coverageRate)} %` : '100 %'
	);

	const consultationCount = $derived(consultations.length);

	const hospitalizationCount = $derived(hospitalizations.length);

	const prescriptionCount = $derived(
		consultations.reduce(
			(total, consultation) => total + (consultation.prescriptions?.length ?? 0),
			0
		)
	);

	const examCount = $derived(
		consultations.reduce((total, consultation) => total + (consultation.exams?.length ?? 0), 0)
	);

	const documentCount = $derived(summary?.statistics.documents ?? 0);

	const activeAllergyCount = $derived(summary?.medical_record.active_allergies ?? 0);

	const activeTreatmentCount = $derived(summary?.medical_record.current_treatments ?? 0);

	const chronicDiseaseCount = $derived(summary?.medical_record.chronic_diseases ?? 0);

	const consultationProgress = $derived(Math.min(consultationCount * 10, 100));

	const prescriptionProgress = $derived(Math.min(prescriptionCount * 8, 100));

	const examProgress = $derived(Math.min(examCount * 6, 100));

	const documentProgress = $derived(Math.min(documentCount * 10, 100));

	function formatSex(value?: string | null): string {
		switch (value?.trim().toUpperCase()) {
			case 'M':
				return 'Homme';

			case 'F':
				return 'Femme';

			default:
				return 'Non renseigné';
		}
	}

	function calculateAgeInMonths(value?: string | null): number | null {
		if (!value) {
			return null;
		}

		const birthDate = new Date(value);

		if (Number.isNaN(birthDate.getTime())) {
			return null;
		}

		const today = new Date();

		let months =
			(today.getFullYear() - birthDate.getFullYear()) * 12 +
			today.getMonth() -
			birthDate.getMonth();

		if (today.getDate() < birthDate.getDate()) {
			months--;
		}

		return Math.max(0, months);
	}

	function formatPatientAge(age: number | null | undefined, birthDate?: string | null): string {
		if (age === null || age === undefined) {
			return 'Non renseigné';
		}

		if (age > 0) {
			return `${age} an${age > 1 ? 's' : ''}`;
		}

		const months = calculateAgeInMonths(birthDate);

		if (months === null) {
			return 'Moins d’un an';
		}

		return months === 0 ? 'Nouveau-né' : `${months} mois`;
	}

	function goToConsultation(): void {
		void goto(resolve(`/patients/${patient.id}/consultations/create`));
	}

	function goToInsurance(): void {
		void goto(resolve('/insurance'));
	}

	function goToVoucher(): void {
		void goto(resolve(`/patients/${patient.id}/vouchers/create`));
	}

	function goToMedicalRecord(): void {
		void goto(resolve(`/patients/${patient.id}/medical-record`));
	}

	function goToEditPatient(): void {
		void goto(resolve('/patients'));
	}
</script>

<div class="space-y-6">
	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
		<MetricCard
			icon={Shield}
			title="Couverture"
			value={insuranceStatus}
			detail={insuranceDetail}
			trend={coverageRate}
			progress={insurance.coverageRate}
			accent="#7C3AED"
		/>

		<MetricCard
			icon={HeartPulse}
			title="Consultations"
			value={String(consultationCount)}
			detail="Historique médical"
			trend={`${hospitalizationCount} hospitalisation(s)`}
			progress={consultationProgress}
			accent="#18B893"
		/>

		<MetricCard
			icon={WalletCards}
			title="Prescriptions"
			value={String(prescriptionCount)}
			detail={`${activeTreatmentCount} traitement(s) actif(s)`}
			trend="Médicaments"
			progress={prescriptionProgress}
			accent="#EA580C"
		/>

		<MetricCard
			icon={Activity}
			title="Examens"
			value={String(examCount)}
			detail="Laboratoire et imagerie"
			trend="Parcours clinique"
			progress={examProgress}
			accent="#0E4C92"
		/>

		<MetricCard
			icon={FileText}
			title="Documents"
			value={String(documentCount)}
			detail="Pièces médicales"
			trend="Dossier patient"
			progress={documentProgress}
			accent="#F59E0B"
		/>
	</div>

	<div class="grid gap-6 xl:grid-cols-3">
		<div class="space-y-6 xl:col-span-2">
			<Card title="Informations patient" subtitle="Identité, dossier et coordonnées">
				<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					<InfoBlock label="Nom" value={patient.nom || '—'} />

					<InfoBlock label="Prénoms" value={patient.prenoms || '—'} />

					<InfoBlock label="Sexe" value={formatSex(patient.sexe)} />

					<InfoBlock label="Âge" value={formatPatientAge(patient.age, patient.dateNaissance)} />

					<InfoBlock label="Téléphone" value={patient.telephone || '—'} />

					<InfoBlock label="Quartier" value={patient.quartier || '—'} />

					<InfoBlock label="Numéro dossier" value={patient.numeroDossier || `#${patient.id}`} />

					<InfoBlock label="Code patient" value={patient.codePatient || '—'} />

					<InfoBlock label="Contact d’urgence" value={patient.personneContact || '—'} />
				</div>
			</Card>

			<Card title="Assurance et prise en charge" subtitle="Situation administrative du patient">
				<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					<MiniInfo title="Statut" value={insuranceStatus} />

					<MiniInfo title="Organisme" value={insurance.organization} />

					<MiniInfo title="Matricule" value={insurance.memberNumber} />

					<MiniInfo title="Taux couverture" value={coverageRate} />

					<MiniInfo title="Part patient" value={patientShareRate} />
				</div>

				{#if !insurance.insured}
					<div
						class="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700"
					>
						Ce patient ne dispose actuellement d’aucune couverture médicale active.
					</div>
				{/if}
			</Card>

			<Card title="Résumé médical" subtitle="Données importantes du dossier">
				<div class="grid gap-4 md:grid-cols-3">
					<MiniInfo title="Allergies actives" value={String(activeAllergyCount)} />

					<MiniInfo title="Maladies chroniques" value={String(chronicDiseaseCount)} />

					<MiniInfo title="Traitements actifs" value={String(activeTreatmentCount)} />
				</div>

				{#if summary?.clinical_alerts?.length}
					<div class="mt-5 space-y-3">
						{#each summary.clinical_alerts as alert (`${alert.code}-${alert.title}`)}
							<div class="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
								<p class="font-black">
									{alert.title}
								</p>

								<p class="mt-1 text-sm">
									{alert.description}
								</p>
							</div>
						{/each}
					</div>
				{:else}
					<div
						class="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700"
					>
						Aucune alerte clinique active.
					</div>
				{/if}
			</Card>

			<Card title="Parcours patient" subtitle="Vue synthétique du parcours dans la clinique">
				<div class="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
					<JourneyStep icon={User} title="Accueil" detail="Dossier créé" color="#0E4C92" />

					<JourneyStep
						icon={HeartPulse}
						title="Consultations"
						detail={`${consultationCount} enregistrée(s)`}
						color="#18B893"
					/>

					<JourneyStep
						icon={Shield}
						title="Assurance"
						detail={insurance.insured ? `${insurance.coverageRate} % couvert` : 'Non assuré'}
						color="#7C3AED"
					/>

					<JourneyStep
						icon={WalletCards}
						title="Prescriptions"
						detail={`${prescriptionCount} enregistrée(s)`}
						color="#EA580C"
					/>

					<JourneyStep
						icon={Activity}
						title="Examens"
						detail={`${examCount} demandé(s)`}
						color="#2563EB"
					/>

					<JourneyStep
						icon={FileText}
						title="Documents"
						detail={`${documentCount} document(s)`}
						color="#F59E0B"
					/>
				</div>
			</Card>

			<Card title="Historique patient" subtitle="Timeline administrative et médicale">
				<div class="space-y-5">
					<TimelineItem
						icon={User}
						title="Dossier patient consulté"
						detail="Aujourd’hui · MedCore HIS"
						color="#0E4C92"
					/>

					<TimelineItem
						icon={Activity}
						title="Patient actif dans le système"
						detail="Statut administratif validé"
						color="#22C55E"
					/>

					{#if summary?.last_consultation}
						<TimelineItem
							icon={HeartPulse}
							title={`Dernière consultation — ${summary.last_consultation.service}`}
							detail={`${summary.last_consultation.doctor_name || 'Médecin non renseigné'} · ${
								summary.last_consultation.diagnosis || 'Diagnostic non renseigné'
							}`}
							color="#18B893"
						/>
					{/if}

					{#if documentCount > 0}
						<TimelineItem
							icon={FileText}
							title={`${documentCount} document(s) médical(aux)`}
							detail="Documents disponibles dans le dossier patient"
							color="#F59E0B"
						/>
					{/if}
				</div>
			</Card>
		</div>

		<div class="space-y-6">
			<Card title="Actions rapides" subtitle="Opérations sur le dossier">
				<div class="space-y-3">
					<Button fullWidth onclick={goToConsultation}>
						<HeartPulse size={16} />
						Nouvelle consultation
					</Button>

					<Button fullWidth onclick={goToVoucher}>
						<FileText size={16} />
						Créer un bon PEC
					</Button>

					<Button fullWidth variant="secondary" onclick={goToInsurance}>
						<Shield size={16} />
						Ajouter assurance
					</Button>

					<Button fullWidth variant="secondary" onclick={goToMedicalRecord}>
						<Activity size={16} />
						Ouvrir le dossier médical
					</Button>

					<Button fullWidth variant="secondary" onclick={goToEditPatient}>
						<UserPlus size={16} />
						Modifier patient
					</Button>

					<Button fullWidth variant="secondary" onclick={() => window.print()}>
						<Printer size={16} />
						Imprimer dossier
					</Button>
				</div>
			</Card>

			<Card title="Contact" subtitle="Coordonnées principales">
				<div class="space-y-4">
					<div class="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
						<div class="rounded-xl bg-white p-2 text-[#0E4C92] shadow-sm">
							<Phone size={18} />
						</div>

						<div class="min-w-0">
							<p class="text-sm text-slate-500">Téléphone</p>

							<p class="truncate font-semibold text-slate-900">
								{patient.telephone || '—'}
							</p>
						</div>
					</div>

					<div class="rounded-2xl border border-dashed border-slate-300 p-5">
						<p class="font-semibold text-slate-800">Contact d’urgence</p>

						<p class="mt-2 text-sm leading-6 text-slate-500">
							{patient.personneContact || 'Non renseigné'}
						</p>
					</div>
				</div>
			</Card>

			<Card title="Situation médicale" subtitle="Indicateurs essentiels">
				<div class="space-y-3">
					<div
						class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
					>
						<span class="text-sm font-semibold text-slate-600"> Allergies </span>

						<span class="font-black text-slate-900">
							{activeAllergyCount}
						</span>
					</div>

					<div
						class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
					>
						<span class="text-sm font-semibold text-slate-600"> Maladies chroniques </span>

						<span class="font-black text-slate-900">
							{chronicDiseaseCount}
						</span>
					</div>

					<div
						class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
					>
						<span class="text-sm font-semibold text-slate-600"> Traitements actifs </span>

						<span class="font-black text-slate-900">
							{activeTreatmentCount}
						</span>
					</div>

					<div
						class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
					>
						<span class="text-sm font-semibold text-slate-600"> Hospitalisations </span>

						<span class="font-black text-slate-900">
							{hospitalizationCount}
						</span>
					</div>
				</div>
			</Card>
		</div>
	</div>
</div>
