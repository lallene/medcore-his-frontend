<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import {
		Activity,
		AlertTriangle,
		CalendarDays,
		FileHeart,
		FileText,
		FlaskConical,
		HeartPulse,
		Pill,
		ShieldAlert,
		Stethoscope
	} from 'lucide-svelte';

	import type { PatientConsultation } from '$lib/api/patient-consultations';
	import type { Patient } from '$lib/types/patient';
	import type { PatientSummary } from '$lib/types/patient-summary';

	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import MiniInfo from '$lib/components/patients/MiniInfo.svelte';

	interface Props {
		patient: Patient;
		summary: PatientSummary | null;
		consultations: PatientConsultation[];
	}

	let { patient, summary, consultations }: Props = $props();

	const completedConsultations = $derived(
		consultations.filter((consultation) => consultation.status === 'completed')
	);

	const sortedConsultations = $derived.by(() =>
		[...consultations].sort((first, second) => {
			const firstDate = new Date(first.startedAt ?? first.completedAt ?? first.createdAt).getTime();

			const secondDate = new Date(
				second.startedAt ?? second.completedAt ?? second.createdAt
			).getTime();

			return secondDate - firstDate;
		})
	);

	const latestConsultation = $derived(sortedConsultations[0] ?? null);

	const latestVitals = $derived(latestConsultation?.vitals ?? null);

	const activeAllergyCount = $derived(summary?.medical_record.active_allergies ?? 0);

	const chronicDiseaseCount = $derived(summary?.medical_record.chronic_diseases ?? 0);

	const activeTreatmentCount = $derived(summary?.medical_record.current_treatments ?? 0);

	const totalPrescriptions = $derived(
		consultations.reduce(
			(total, consultation) => total + (consultation.prescriptions?.length ?? 0),
			0
		)
	);

	const totalExams = $derived(
		consultations.reduce((total, consultation) => total + (consultation.exams?.length ?? 0), 0)
	);

	const hospitalizations = $derived(
		consultations.filter((consultation) => consultation.hospitalizationRequired)
	);

	const diagnoses = $derived.by(() => {
		const values = consultations
			.map((consultation) => consultation.diagnosis?.trim())
			.filter((diagnosis): diagnosis is string => Boolean(diagnosis));

		return [...new Set(values)];
	});

	const prescribedMedications = $derived.by(() => {
		const medications = consultations.flatMap(
			(consultation) =>
				consultation.prescriptions?.map((prescription) => ({
					key: `${consultation.id}-${prescription.id}`,
					name: prescription.medicationName,
					dosage: prescription.dosage,
					form: prescription.form,
					route: prescription.route,
					frequency: prescription.frequency,
					duration: prescription.duration,
					consultationId: consultation.id,
					date: consultation.startedAt ?? consultation.createdAt
				})) ?? []
		);

		return medications.slice(0, 8);
	});

	const requestedExams = $derived.by(() => {
		const exams = consultations.flatMap(
			(consultation) =>
				consultation.exams?.map((exam) => ({
					key: `${consultation.id}-${exam.id}`,
					name: exam.name,
					category: exam.category,
					consultationId: consultation.id,
					date: consultation.startedAt ?? consultation.createdAt
				})) ?? []
		);

		return exams.slice(0, 8);
	});

	function formatDate(value?: string | null): string {
		if (!value) {
			return 'Date non renseignée';
		}

		const date = new Date(value);

		if (Number.isNaN(date.getTime())) {
			return 'Date non renseignée';
		}

		return new Intl.DateTimeFormat('fr-FR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		}).format(date);
	}

	function valueOrDash(value: number | null | undefined, unit = ''): string {
		if (value === null || value === undefined) {
			return '—';
		}

		return `${value}${unit}`;
	}

	function bloodPressure(): string {
		const systolic = latestVitals?.bloodPressureSystolic;

		const diastolic = latestVitals?.bloodPressureDiastolic;

		if (
			systolic === null ||
			systolic === undefined ||
			diastolic === null ||
			diastolic === undefined
		) {
			return '—';
		}

		return `${systolic}/${diastolic} mmHg`;
	}

	function medicationDescription(medication: {
		dosage: string;
		form: string;
		route: string;
	}): string {
		const values = [medication.dosage, medication.form, medication.route].filter(Boolean);

		return values.length > 0 ? values.join(' · ') : '—';
	}

	function openCompleteMedicalRecord(): void {
		void goto(resolve(`/patients/${patient.id}/medical-record`));
	}

	function openConsultation(consultationId: number): void {
		void goto(resolve(`/consultations/${consultationId}`));
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.2em] text-[#0E4C92]">
				Dossier clinique longitudinal
			</p>

			<h2 class="mt-2 text-2xl font-black text-slate-900">Dossier médical</h2>

			<p class="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
				Synthèse des allergies, maladies chroniques, traitements, diagnostics, prescriptions,
				examens et constantes du patient.
			</p>
		</div>

		<Button onclick={openCompleteMedicalRecord}>
			<FileHeart size={16} />
			Ouvrir le dossier complet
		</Button>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<div class="rounded-2xl border border-red-200 bg-red-50 p-5">
			<div class="flex items-center gap-3">
				<div
					class="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm"
				>
					<AlertTriangle size={20} />
				</div>

				<div>
					<p class="text-xs font-black uppercase tracking-wide text-red-500">Allergies actives</p>

					<p class="text-2xl font-black text-red-800">
						{activeAllergyCount}
					</p>
				</div>
			</div>
		</div>

		<div class="rounded-2xl border border-rose-200 bg-rose-50 p-5">
			<div class="flex items-center gap-3">
				<div
					class="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-rose-600 shadow-sm"
				>
					<HeartPulse size={20} />
				</div>

				<div>
					<p class="text-xs font-black uppercase tracking-wide text-rose-500">
						Maladies chroniques
					</p>

					<p class="text-2xl font-black text-rose-800">
						{chronicDiseaseCount}
					</p>
				</div>
			</div>
		</div>

		<div class="rounded-2xl border border-orange-200 bg-orange-50 p-5">
			<div class="flex items-center gap-3">
				<div
					class="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-orange-600 shadow-sm"
				>
					<Pill size={20} />
				</div>

				<div>
					<p class="text-xs font-black uppercase tracking-wide text-orange-500">
						Traitements actifs
					</p>

					<p class="text-2xl font-black text-orange-800">
						{activeTreatmentCount}
					</p>
				</div>
			</div>
		</div>

		<div class="rounded-2xl border border-blue-200 bg-blue-50 p-5">
			<div class="flex items-center gap-3">
				<div
					class="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm"
				>
					<Stethoscope size={20} />
				</div>

				<div>
					<p class="text-xs font-black uppercase tracking-wide text-blue-500">
						Consultations terminées
					</p>

					<p class="text-2xl font-black text-blue-900">
						{completedConsultations.length}
					</p>
				</div>
			</div>
		</div>
	</div>

	{#if summary?.clinical_alerts?.length}
		<Card title="Alertes cliniques" subtitle="Informations nécessitant une attention particulière">
			<div class="space-y-3">
				{#each summary.clinical_alerts as alert (`${alert.code}-${alert.title}`)}
					<div class="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
						<div
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm"
						>
							<ShieldAlert size={18} />
						</div>

						<div>
							<p class="font-black text-red-800">
								{alert.title}
							</p>

							<p class="mt-1 text-sm leading-6 text-red-700">
								{alert.description}
							</p>
						</div>
					</div>
				{/each}
			</div>
		</Card>
	{/if}

	<div class="grid gap-6 xl:grid-cols-3">
		<div class="space-y-6 xl:col-span-2">
			<Card
				title="Dernières constantes"
				subtitle={latestConsultation
					? `Consultation du ${formatDate(
							latestConsultation.startedAt ?? latestConsultation.createdAt
						)}`
					: 'Aucune consultation disponible'}
			>
				{#if latestVitals}
					<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<MiniInfo title="Tension artérielle" value={bloodPressure()} />

						<MiniInfo title="Température" value={valueOrDash(latestVitals.temperature, ' °C')} />

						<MiniInfo
							title="Fréquence cardiaque"
							value={valueOrDash(latestVitals.heartRate, ' bpm')}
						/>

						<MiniInfo title="SpO₂" value={valueOrDash(latestVitals.oxygenSaturation, ' %')} />

						<MiniInfo
							title="Fréquence respiratoire"
							value={valueOrDash(latestVitals.respiratoryRate, '/min')}
						/>

						<MiniInfo title="Poids" value={valueOrDash(latestVitals.weight, ' kg')} />

						<MiniInfo title="Taille" value={valueOrDash(latestVitals.height, ' cm')} />

						<MiniInfo title="Glycémie" value={valueOrDash(latestVitals.bloodGlucose, ' g/L')} />

						<MiniInfo title="Douleur" value={valueOrDash(latestVitals.painScore, '/10')} />
					</div>
				{:else}
					<div
						class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500"
					>
						Aucune constante vitale disponible.
					</div>
				{/if}
			</Card>

			<Card
				title="Diagnostics enregistrés"
				subtitle="Diagnostics issus des consultations du patient"
			>
				{#if diagnoses.length > 0}
					<div class="grid gap-3 md:grid-cols-2">
						{#each diagnoses as diagnosis (diagnosis)}
							<div
								class="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
							>
								<div
									class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#0E4C92] shadow-sm"
								>
									<Stethoscope size={17} />
								</div>

								<p class="text-sm font-bold leading-6 text-slate-800">
									{diagnosis}
								</p>
							</div>
						{/each}
					</div>
				{:else}
					<div
						class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500"
					>
						Aucun diagnostic enregistré.
					</div>
				{/if}
			</Card>

			<Card
				title="Historique médicamenteux"
				subtitle={`${totalPrescriptions} prescription(s) enregistrée(s)`}
			>
				{#if prescribedMedications.length > 0}
					<div class="overflow-hidden rounded-2xl border border-slate-200">
						{#each prescribedMedications as medication (medication.key)}
							<div
								class="grid gap-4 border-b border-slate-100 p-4 last:border-b-0 md:grid-cols-[1.2fr_1fr_1fr_auto]"
							>
								<div>
									<p class="text-[10px] font-black uppercase tracking-wide text-slate-400">
										Médicament
									</p>

									<p class="mt-1 font-black text-slate-900">
										{medication.name}
									</p>

									<p class="mt-1 text-xs text-slate-500">
										{medicationDescription(medication)}
									</p>
								</div>

								<div>
									<p class="text-[10px] font-black uppercase tracking-wide text-slate-400">
										Fréquence
									</p>

									<p class="mt-1 text-sm font-bold text-slate-700">
										{medication.frequency || '—'}
									</p>
								</div>

								<div>
									<p class="text-[10px] font-black uppercase tracking-wide text-slate-400">Durée</p>

									<p class="mt-1 text-sm font-bold text-slate-700">
										{medication.duration || '—'}
									</p>

									<p class="mt-1 text-xs text-slate-400">
										{formatDate(medication.date)}
									</p>
								</div>

								<button
									type="button"
									onclick={() => openConsultation(medication.consultationId)}
									class="self-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-[#0E4C92] transition hover:bg-blue-50"
								>
									Voir
								</button>
							</div>
						{/each}
					</div>
				{:else}
					<div
						class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500"
					>
						Aucun médicament prescrit.
					</div>
				{/if}
			</Card>

			<Card title="Examens demandés" subtitle={`${totalExams} examen(s) enregistré(s)`}>
				{#if requestedExams.length > 0}
					<div class="grid gap-3 md:grid-cols-2">
						{#each requestedExams as exam (exam.key)}
							<button
								type="button"
								onclick={() => openConsultation(exam.consultationId)}
								class="flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-left transition hover:border-violet-300 hover:bg-violet-100"
							>
								<div
									class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-violet-700 shadow-sm"
								>
									<FlaskConical size={18} />
								</div>

								<div>
									<p class="font-black text-violet-900">
										{exam.name}
									</p>

									<p class="mt-1 text-xs font-semibold text-violet-700">
										{exam.category || 'Examen médical'}
										·
										{formatDate(exam.date)}
									</p>
								</div>
							</button>
						{/each}
					</div>
				{:else}
					<div
						class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500"
					>
						Aucun examen demandé.
					</div>
				{/if}
			</Card>
		</div>

		<div class="space-y-6">
			<Card title="Résumé du dossier" subtitle="Indicateurs médicaux essentiels">
				<div class="space-y-3">
					<div
						class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
					>
						<span class="text-sm font-semibold text-slate-600"> Consultations </span>

						<span class="font-black text-slate-900">
							{consultations.length}
						</span>
					</div>

					<div
						class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
					>
						<span class="text-sm font-semibold text-slate-600"> Prescriptions </span>

						<span class="font-black text-slate-900">
							{totalPrescriptions}
						</span>
					</div>

					<div
						class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
					>
						<span class="text-sm font-semibold text-slate-600"> Examens </span>

						<span class="font-black text-slate-900">
							{totalExams}
						</span>
					</div>

					<div
						class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
					>
						<span class="text-sm font-semibold text-slate-600"> Hospitalisations </span>

						<span class="font-black text-slate-900">
							{hospitalizations.length}
						</span>
					</div>
				</div>
			</Card>

			<Card title="Dernière consultation" subtitle="Dernier événement clinique disponible">
				{#if latestConsultation}
					<div class="space-y-4">
						<div class="flex items-center gap-3 rounded-2xl bg-blue-50 p-4">
							<div
								class="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#0E4C92] shadow-sm"
							>
								<Stethoscope size={19} />
							</div>

							<div>
								<p class="font-black text-slate-900">
									{latestConsultation.service || 'Service non renseigné'}
								</p>

								<p class="mt-1 text-xs font-semibold text-slate-500">
									{latestConsultation.doctorName || 'Médecin non renseigné'}
								</p>
							</div>
						</div>

						<div class="flex items-center gap-2 text-sm font-semibold text-slate-500">
							<CalendarDays size={15} />
							{formatDate(latestConsultation.startedAt ?? latestConsultation.createdAt)}
						</div>

						<div class="rounded-2xl border border-slate-200 p-4">
							<p class="text-[10px] font-black uppercase tracking-wide text-slate-400">
								Diagnostic
							</p>

							<p class="mt-2 text-sm font-bold leading-6 text-slate-800">
								{latestConsultation.diagnosis || '—'}
							</p>
						</div>

						<Button
							fullWidth
							variant="secondary"
							onclick={() => openConsultation(latestConsultation.id)}
						>
							<Stethoscope size={16} />
							Voir la consultation
						</Button>
					</div>
				{:else}
					<p class="text-sm font-semibold leading-6 text-slate-500">
						Aucune consultation disponible.
					</p>
				{/if}
			</Card>

			<Card title="Documents médicaux" subtitle="Pièces disponibles dans le dossier">
				<div
					class="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4"
				>
					<div class="flex items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#0E4C92] shadow-sm"
						>
							<FileText size={18} />
						</div>

						<div>
							<p class="font-black text-slate-900">Documents</p>

							<p class="mt-1 text-xs text-slate-500">Ordonnances, examens et certificats</p>
						</div>
					</div>

					<span class="rounded-full bg-blue-50 px-3 py-1 text-sm font-black text-[#0E4C92]">
						{summary?.statistics.documents ?? 0}
					</span>
				</div>
			</Card>
		</div>
	</div>

	<div
		class="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700"
	>
		<Activity size={18} class="mt-0.5 shrink-0" />

		<p class="leading-6">
			Le dossier médical est alimenté automatiquement par les consultations, prescriptions, examens,
			hospitalisations et événements cliniques du patient.
		</p>
	</div>
</div>
