<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import {
		Activity,
		CalendarDays,
		ClipboardList,
		Eye,
		FileDown,
		FlaskConical,
		HeartPulse,
		Pill,
		Plus,
		Stethoscope,
		UserRound
	} from 'lucide-svelte';

	import type { ConsultationStatus, PatientConsultation } from '$lib/api/patient-consultations';

	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';

	interface Props {
		patientId: number;
		consultations: PatientConsultation[];
	}

	let { patientId, consultations }: Props = $props();

	const completedCount = $derived(
		consultations.filter((consultation) => consultation.status === 'completed').length
	);

	const inProgressCount = $derived(
		consultations.filter((consultation) => consultation.status === 'in_progress').length
	);

	const prescriptionCount = $derived(
		consultations.reduce((total, consultation) => total + consultation.prescriptions.length, 0)
	);

	const examCount = $derived(
		consultations.reduce((total, consultation) => total + consultation.exams.length, 0)
	);

	function formatDateTime(value?: string | null): string {
		if (!value) {
			return 'Date non renseignée';
		}

		const date = new Date(value);

		if (Number.isNaN(date.getTime())) {
			return 'Date invalide';
		}

		return new Intl.DateTimeFormat('fr-FR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	}

	function statusLabel(status: ConsultationStatus): string {
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

	function statusClass(status: ConsultationStatus): string {
		switch (status) {
			case 'draft':
				return 'border-slate-200 bg-slate-100 text-slate-700';

			case 'in_progress':
				return 'border-blue-200 bg-blue-50 text-blue-700';

			case 'completed':
				return 'border-emerald-200 bg-emerald-50 text-emerald-700';

			case 'cancelled':
				return 'border-red-200 bg-red-50 text-red-700';
		}
	}

	function valueOrDash(value: number | null | undefined, unit = ''): string {
		if (value === null || value === undefined) {
			return '—';
		}

		return `${value}${unit}`;
	}

	function bloodPressure(consultation: PatientConsultation): string {
		const systolic = consultation.vitals?.bloodPressureSystolic;

		const diastolic = consultation.vitals?.bloodPressureDiastolic;

		if (
			systolic === null ||
			systolic === undefined ||
			diastolic === null ||
			diastolic === undefined
		) {
			return '—';
		}

		return `${systolic}/${diastolic}`;
	}

	function consultationDate(consultation: PatientConsultation): string {
		return formatDateTime(
			consultation.startedAt ?? consultation.completedAt ?? consultation.createdAt
		);
	}

	function openConsultation(consultationId: number): void {
		void goto(resolve(`/consultations/${consultationId}`));
	}

	function createConsultation(): void {
		void goto(resolve(`/patients/${patientId}/consultations/create`));
	}

	function pdfUrl(
		consultationId: number,
		type: 'prescription' | 'exam-request' | 'sick-leave'
	): string {
		return `/api/consultations/${consultationId}/${type}/pdf`;
	}

	function openPdf(
		consultationId: number,
		type: 'prescription' | 'exam-request' | 'sick-leave'
	): void {
		window.open(pdfUrl(consultationId, type), '_blank', 'noopener,noreferrer');
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.2em] text-[#0E4C92]">Parcours clinique</p>

			<h2 class="mt-2 text-2xl font-black text-slate-900">Consultations du patient</h2>

			<p class="mt-1 text-sm text-slate-500">
				Historique des consultations, diagnostics, constantes, examens et prescriptions.
			</p>
		</div>

		<Button onclick={createConsultation}>
			<Plus size={16} />
			Nouvelle consultation
		</Button>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<div class="flex items-center gap-3">
				<div
					class="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#0E4C92]"
				>
					<Stethoscope size={20} />
				</div>

				<div>
					<p class="text-xs font-bold uppercase text-slate-400">Consultations</p>

					<p class="text-2xl font-black text-slate-900">
						{consultations.length}
					</p>
				</div>
			</div>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<div class="flex items-center gap-3">
				<div
					class="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"
				>
					<ClipboardList size={20} />
				</div>

				<div>
					<p class="text-xs font-bold uppercase text-slate-400">Terminées</p>

					<p class="text-2xl font-black text-slate-900">
						{completedCount}
					</p>
				</div>
			</div>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<div class="flex items-center gap-3">
				<div
					class="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-700"
				>
					<Pill size={20} />
				</div>

				<div>
					<p class="text-xs font-bold uppercase text-slate-400">Prescriptions</p>

					<p class="text-2xl font-black text-slate-900">
						{prescriptionCount}
					</p>
				</div>
			</div>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<div class="flex items-center gap-3">
				<div
					class="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700"
				>
					<FlaskConical size={20} />
				</div>

				<div>
					<p class="text-xs font-bold uppercase text-slate-400">Examens</p>

					<p class="text-2xl font-black text-slate-900">
						{examCount}
					</p>
				</div>
			</div>
		</div>
	</div>

	{#if inProgressCount > 0}
		<div
			class="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-700"
		>
			{inProgressCount} consultation(s) actuellement en cours.
		</div>
	{/if}

	{#if consultations.length === 0}
		<Card
			title="Aucune consultation"
			subtitle="Le patient ne possède aucun historique de consultation"
		>
			<div
				class="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center"
			>
				<div
					class="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-[#0E4C92]"
				>
					<Stethoscope size={28} />
				</div>

				<h3 class="mt-5 text-xl font-black text-slate-900">Aucune consultation enregistrée</h3>

				<p class="mt-2 max-w-md text-sm leading-6 text-slate-500">
					Créez une première consultation afin d’alimenter le dossier médical longitudinal du
					patient.
				</p>

				<div class="mt-6">
					<Button onclick={createConsultation}>
						<Plus size={16} />
						Créer une consultation
					</Button>
				</div>
			</div>
		</Card>
	{:else}
		<div class="space-y-5">
			{#each consultations as consultation (consultation.id)}
				<article
					class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
				>
					<div
						class="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/60 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
					>
						<div class="flex min-w-0 items-start gap-4">
							<div
								class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#0E4C92]"
							>
								<Stethoscope size={21} />
							</div>

							<div class="min-w-0">
								<div class="flex flex-wrap items-center gap-2">
									<h3 class="text-lg font-black text-slate-900">
										{consultation.service || 'Service non renseigné'}
									</h3>

									<span
										class={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${statusClass(
											consultation.status
										)}`}
									>
										{statusLabel(consultation.status)}
									</span>
								</div>

								<div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
									<span class="inline-flex items-center gap-1.5">
										<CalendarDays size={14} />
										{consultationDate(consultation)}
									</span>

									<span class="inline-flex items-center gap-1.5">
										<UserRound size={14} />
										{consultation.doctorName || 'Médecin non renseigné'}
									</span>
								</div>
							</div>
						</div>

						<button
							type="button"
							onclick={() => openConsultation(consultation.id)}
							class="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-[#0E4C92] hover:text-[#0E4C92]"
						>
							<Eye size={16} />
							Voir la consultation
						</button>
					</div>

					<div class="space-y-5 p-5">
						<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
							<div class="rounded-2xl border border-slate-100 bg-slate-50 p-4">
								<p class="text-[11px] font-black uppercase tracking-wide text-slate-400">
									Diagnostic
								</p>

								<p class="mt-2 text-sm font-bold leading-6 text-slate-800">
									{consultation.diagnosis || '—'}
								</p>
							</div>

							<div class="rounded-2xl border border-slate-100 bg-slate-50 p-4">
								<p class="text-[11px] font-black uppercase tracking-wide text-slate-400">Motifs</p>

								<p class="mt-2 text-sm font-bold leading-6 text-slate-800">
									{consultation.reasons?.map((reason) => reason.name).join(', ') || '—'}
								</p>
							</div>

							<div class="rounded-2xl border border-slate-100 bg-slate-50 p-4">
								<p class="text-[11px] font-black uppercase tracking-wide text-slate-400">
									Examens demandés
								</p>

								<p class="mt-2 text-2xl font-black text-slate-900">
									{consultation.exams?.length ?? 0}
								</p>
							</div>

							<div class="rounded-2xl border border-slate-100 bg-slate-50 p-4">
								<p class="text-[11px] font-black uppercase tracking-wide text-slate-400">
									Prescriptions
								</p>

								<p class="mt-2 text-2xl font-black text-slate-900">
									{consultation.prescriptions?.length ?? 0}
								</p>
							</div>
						</div>

						<div>
							<div class="mb-3 flex items-center gap-2">
								<HeartPulse size={17} class="text-[#0E4C92]" />

								<h4 class="font-black text-slate-900">Constantes vitales</h4>
							</div>

							<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
								<div class="rounded-xl border border-slate-200 p-3">
									<p class="text-[10px] font-black uppercase text-slate-400">TA</p>

									<p class="mt-1 font-black text-slate-800">
										{bloodPressure(consultation)}
									</p>
								</div>

								<div class="rounded-xl border border-slate-200 p-3">
									<p class="text-[10px] font-black uppercase text-slate-400">Temp.</p>

									<p class="mt-1 font-black text-slate-800">
										{valueOrDash(consultation.vitals?.temperature, ' °C')}
									</p>
								</div>

								<div class="rounded-xl border border-slate-200 p-3">
									<p class="text-[10px] font-black uppercase text-slate-400">Pouls</p>

									<p class="mt-1 font-black text-slate-800">
										{valueOrDash(consultation.vitals?.heartRate, ' bpm')}
									</p>
								</div>

								<div class="rounded-xl border border-slate-200 p-3">
									<p class="text-[10px] font-black uppercase text-slate-400">SpO₂</p>

									<p class="mt-1 font-black text-slate-800">
										{valueOrDash(consultation.vitals?.oxygenSaturation, ' %')}
									</p>
								</div>

								<div class="rounded-xl border border-slate-200 p-3">
									<p class="text-[10px] font-black uppercase text-slate-400">FR</p>

									<p class="mt-1 font-black text-slate-800">
										{valueOrDash(consultation.vitals?.respiratoryRate, '/min')}
									</p>
								</div>

								<div class="rounded-xl border border-slate-200 p-3">
									<p class="text-[10px] font-black uppercase text-slate-400">Poids</p>

									<p class="mt-1 font-black text-slate-800">
										{valueOrDash(consultation.vitals?.weight, ' kg')}
									</p>
								</div>

								<div class="rounded-xl border border-slate-200 p-3">
									<p class="text-[10px] font-black uppercase text-slate-400">Glycémie</p>

									<p class="mt-1 font-black text-slate-800">
										{valueOrDash(consultation.vitals?.bloodGlucose, ' g/L')}
									</p>
								</div>

								<div class="rounded-xl border border-slate-200 p-3">
									<p class="text-[10px] font-black uppercase text-slate-400">Douleur</p>

									<p class="mt-1 font-black text-slate-800">
										{valueOrDash(consultation.vitals?.painScore, '/10')}
									</p>
								</div>
							</div>
						</div>

						{#if consultation.observations || consultation.treatment}
							<div class="grid gap-4 md:grid-cols-2">
								<div class="rounded-2xl border border-slate-200 p-4">
									<p class="text-xs font-black uppercase tracking-wide text-slate-400">
										Observations
									</p>

									<p class="mt-2 text-sm leading-6 text-slate-700">
										{consultation.observations || '—'}
									</p>
								</div>

								<div class="rounded-2xl border border-slate-200 p-4">
									<p class="text-xs font-black uppercase tracking-wide text-slate-400">
										Traitement
									</p>

									<p class="mt-2 text-sm leading-6 text-slate-700">
										{consultation.treatment || '—'}
									</p>
								</div>
							</div>
						{/if}

						{#if consultation.prescriptions?.length}
							<div>
								<div class="mb-3 flex items-center gap-2">
									<Pill size={17} class="text-orange-600" />

									<h4 class="font-black text-slate-900">Prescriptions</h4>
								</div>

								<div class="overflow-hidden rounded-2xl border border-slate-200">
									{#each consultation.prescriptions as prescription (prescription.id)}
										<div
											class="grid gap-3 border-b border-slate-100 p-4 last:border-b-0 md:grid-cols-4"
										>
											<div>
												<p class="text-[10px] font-black uppercase text-slate-400">Médicament</p>

												<p class="mt-1 text-sm font-bold text-slate-800">
													{prescription.medicationName}
												</p>
											</div>

											<div>
												<p class="text-[10px] font-black uppercase text-slate-400">Présentation</p>

												<p class="mt-1 text-sm font-bold text-slate-800">
													{[prescription.dosage, prescription.form, prescription.route]
														.filter(Boolean)
														.join(' · ') || '—'}
												</p>
											</div>

											<div>
												<p class="text-[10px] font-black uppercase text-slate-400">Fréquence</p>

												<p class="mt-1 text-sm font-bold text-slate-800">
													{prescription.frequency || '—'}
												</p>
											</div>

											<div>
												<p class="text-[10px] font-black uppercase text-slate-400">Durée</p>

												<p class="mt-1 text-sm font-bold text-slate-800">
													{prescription.duration || '—'}
												</p>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						{#if consultation.exams?.length}
							<div>
								<div class="mb-3 flex items-center gap-2">
									<FlaskConical size={17} class="text-violet-700" />

									<h4 class="font-black text-slate-900">Examens demandés</h4>
								</div>

								<div class="flex flex-wrap gap-2">
									{#each consultation.exams as exam (exam.id)}
										<span
											class="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700"
										>
											{exam.name}
										</span>
									{/each}
								</div>
							</div>
						{/if}

						<div class="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-5">
							{#if consultation.prescriptions?.length}
								<Button
									variant="secondary"
									onclick={() => openPdf(consultation.id, 'prescription')}
								>
									<FileDown size={16} />
									Ordonnance PDF
								</Button>
							{/if}

							{#if consultation.exams?.length}
								<Button
									variant="secondary"
									onclick={() => openPdf(consultation.id, 'exam-request')}
								>
									<FileDown size={16} />
									Demande d'examens
								</Button>
							{/if}

							{#if consultation.sickLeaveRequired}
								<Button variant="secondary" onclick={() => openPdf(consultation.id, 'sick-leave')}>
									<FileDown size={16} />
									Repos maladie
								</Button>
							{/if}

							{#if consultation.hospitalizationRequired}
								<span
									class="inline-flex h-10 items-center rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700"
								>
									Hospitalisation requise
								</span>
							{/if}
						</div>
					</div>
				</article>
			{/each}
		</div>
	{/if}

	<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
		<Activity size={16} class="mr-2 inline text-[#0E4C92]" />
		Les consultations terminées alimentent automatiquement le dossier médical et la timeline du patient.
	</div>
</div>
