<script lang="ts">
	import { onMount } from 'svelte';

	import {
		Activity,
		AlertTriangle,
		CalendarDays,
		FileText,
		HeartPulse,
		Pill,
		ShieldCheck,
		Stethoscope,
		UserRound
	} from 'lucide-svelte';

	import { getPatientSummary } from '$lib/api/patient-summary';
	import type { PatientClinicalAlert, PatientSummary } from '$lib/types/patient-summary';

	type Props = {
		patientId: number;
		onRecordLoaded?: (recordId: number) => void;
	};

	let { patientId, onRecordLoaded = () => undefined }: Props = $props();

	let summary = $state<PatientSummary | null>(null);
	let loading = $state(true);
	let error = $state('');

	const patientName = $derived(
		summary ? `${summary.patient.last_name} ${summary.patient.first_names}`.trim() : ''
	);

	const patientInitials = $derived.by(() => {
		if (!summary) {
			return '';
		}

		const lastNameInitial = summary.patient.last_name.trim().charAt(0).toUpperCase();

		const firstNameInitial = summary.patient.first_names.trim().charAt(0).toUpperCase();

		return `${lastNameInitial}${firstNameInitial}`;
	});

	function severityLabel(value: string): string {
		switch (value.toLowerCase()) {
			case 'critical':
			case 'anaphylaxis':
				return 'Critique';
			case 'high':
				return 'Élevée';
			case 'medium':
			case 'moderate':
				return 'Modérée';
			default:
				return 'Faible';
		}
	}

	function severityClasses(value: string): string {
		switch (value.toLowerCase()) {
			case 'critical':
			case 'anaphylaxis':
				return 'border-red-200 bg-red-50 text-red-700';
			case 'high':
				return 'border-orange-200 bg-orange-50 text-orange-700';
			case 'medium':
			case 'moderate':
				return 'border-amber-200 bg-amber-50 text-amber-700';
			default:
				return 'border-emerald-200 bg-emerald-50 text-emerald-700';
		}
	}

	type VitalStatus = 'normal' | 'warning' | 'critical' | 'unknown';

	function vitalStatusClasses(status: VitalStatus): string {
		switch (status) {
			case 'normal':
				return 'bg-emerald-500';
			case 'warning':
				return 'bg-amber-500';
			case 'critical':
				return 'bg-red-500';
			default:
				return 'bg-slate-300';
		}
	}

	function bloodPressureStatus(): VitalStatus {
		const systolic = summary?.last_vitals?.systolic_bp;
		const diastolic = summary?.last_vitals?.diastolic_bp;

		if (systolic === null || systolic === undefined) {
			return 'unknown';
		}

		if (diastolic === null || diastolic === undefined) {
			return 'unknown';
		}

		if (systolic >= 180 || diastolic >= 120) {
			return 'critical';
		}

		if (systolic >= 140 || diastolic >= 90 || systolic < 90 || diastolic < 60) {
			return 'warning';
		}

		return 'normal';
	}

	function temperatureStatus(): VitalStatus {
		const value = summary?.last_vitals?.temperature;

		if (value === null || value === undefined) {
			return 'unknown';
		}

		if (value >= 39 || value < 35) {
			return 'critical';
		}

		if (value >= 37.5 || value < 36) {
			return 'warning';
		}

		return 'normal';
	}

	function saturationStatus(): VitalStatus {
		const value = summary?.last_vitals?.oxygen_saturation;

		if (value === null || value === undefined) {
			return 'unknown';
		}

		if (value < 90) {
			return 'critical';
		}

		if (value < 95) {
			return 'warning';
		}

		return 'normal';
	}

	function heartRateStatus(): VitalStatus {
		const value = summary?.last_vitals?.heart_rate;

		if (value === null || value === undefined) {
			return 'unknown';
		}

		if (value >= 130 || value < 40) {
			return 'critical';
		}

		if (value >= 100 || value < 60) {
			return 'warning';
		}

		return 'normal';
	}

	function bmiStatus(): VitalStatus {
		const value = summary?.last_vitals?.bmi;

		if (value === null || value === undefined) {
			return 'unknown';
		}

		if (value >= 40 || value < 16) {
			return 'critical';
		}

		if (value >= 30 || value < 18.5) {
			return 'warning';
		}

		return 'normal';
	}

	function painStatus(): VitalStatus {
		const value = summary?.last_vitals?.pain_score;

		if (value === null || value === undefined) {
			return 'unknown';
		}

		if (value >= 8) {
			return 'critical';
		}

		if (value >= 4) {
			return 'warning';
		}

		return 'normal';
	}

	const sexLabel = $derived(
		summary?.patient.sex === 'M'
			? 'Homme'
			: summary?.patient.sex === 'F'
				? 'Femme'
				: summary?.patient.sex || 'Non renseigné'
	);

	const bloodGroupLabel = $derived(
		summary?.patient.blood_group
			? `${summary.patient.blood_group}${summary.patient.rhesus}`
			: 'Non renseigné'
	);

	const insuranceLabel = $derived(
		summary?.patient.insurance_name ||
			summary?.patient.mutual_name ||
			(summary?.patient.is_insured ? 'Patient assuré' : 'Non assuré')
	);

	function formatDate(value: string | null | undefined): string {
		if (!value) {
			return 'Non renseignée';
		}

		return new Intl.DateTimeFormat('fr-FR', {
			dateStyle: 'medium'
		}).format(new Date(value));
	}

	function formatDateTime(value: string | null | undefined): string {
		if (!value) {
			return 'Non renseignée';
		}

		return new Intl.DateTimeFormat('fr-FR', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));
	}

	function formatNumber(value: number | null | undefined, decimals = 0): string {
		if (value === null || value === undefined) {
			return '—';
		}

		return value.toFixed(decimals);
	}

	function alertClasses(alert: PatientClinicalAlert): string {
		switch (alert.severity.toLowerCase()) {
			case 'critical':
				return 'border-red-200 bg-red-50 text-red-800';
			case 'high':
				return 'border-orange-200 bg-orange-50 text-orange-800';
			case 'medium':
				return 'border-amber-200 bg-amber-50 text-amber-800';
			default:
				return 'border-blue-200 bg-blue-50 text-blue-800';
		}
	}

	onMount(async () => {
		try {
			summary = await getPatientSummary(patientId);
			onRecordLoaded(summary.medical_record.id);
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Impossible de charger le résumé du patient.';
		} finally {
			loading = false;
		}
	});
</script>

<section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
	{#if loading}
		<p class="text-sm text-slate-500">Chargement du résumé patient...</p>
	{:else if error}
		<div
			class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
		>
			{error}
		</div>
	{:else if summary}
		<div class="space-y-6">
			<header class="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
				<div class="flex items-start gap-4">
					<div
						class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-blue-50 text-[#0E4C92]"
					>
						{#if summary.patient.photo_url}
							<img
								src={summary.patient.photo_url}
								alt={patientName}
								class="h-full w-full object-cover"
							/>
						{:else if patientInitials}
							<span class="text-xl font-black">
								{patientInitials}
							</span>
						{:else}
							<UserRound size={30} />
						{/if}
					</div>

					<div>
						<p class="text-xs font-black uppercase tracking-[0.18em] text-[#0E4C92]">
							Résumé clinique
						</p>

						<h2 class="mt-1 text-2xl font-black text-slate-900">
							{patientName}
						</h2>

						<div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
							<span>{sexLabel}</span>
							<span>
								{summary.patient.age !== null ? `${summary.patient.age} ans` : 'Âge non renseigné'}
							</span>
							<span>
								Dossier {summary.medical_record.record_number}
							</span>
							<span>
								Groupe sanguin : {bloodGroupLabel}
							</span>
						</div>
					</div>
				</div>

				<div class="grid gap-3 sm:grid-cols-2 xl:min-w-[420px]">
					<div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
						<div class="flex items-center gap-2 text-[#0E4C92]">
							<ShieldCheck size={17} />
							<p class="text-xs font-black uppercase tracking-wide">Couverture</p>
						</div>

						<p class="mt-2 text-sm font-bold text-slate-900">
							{insuranceLabel}
						</p>

						<p class="mt-1 text-xs text-slate-500">
							{summary.patient.insurance_number || 'Aucun matricule'}
						</p>
					</div>

					<div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
						<div class="flex items-center gap-2 text-[#0E4C92]">
							<CalendarDays size={17} />

							<p class="text-xs font-black uppercase tracking-wide">Dernière consultation</p>
						</div>

						<p class="mt-2 text-sm font-black text-slate-900">
							{summary.last_consultation?.service || 'Aucune consultation'}
						</p>

						{#if summary.last_consultation}
							<p class="mt-1 text-xs font-semibold text-slate-600">
								{summary.last_consultation.doctor_name || 'Médecin non renseigné'}
							</p>

							{#if summary.last_consultation.diagnosis}
								<p class="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
									<strong>Diagnostic :</strong>
									{summary.last_consultation.diagnosis}
								</p>
							{/if}
						{/if}

						<p class="mt-2 text-xs text-slate-400">
							{formatDateTime(summary.last_consultation?.date)}
						</p>
					</div>
				</div>
			</header>

			{#if summary.clinical_alerts.length > 0}
				<section>
					<div class="mb-3 flex items-center gap-2">
						<AlertTriangle size={18} class="text-red-600" />

						<h3 class="text-sm font-black uppercase tracking-wide text-slate-900">
							Alertes cliniques
						</h3>
					</div>

					<div class="grid gap-3 lg:grid-cols-2">
						{#each summary.clinical_alerts as alert, index (`${alert.code}-${index}`)}
							<div class={`rounded-xl border p-4 ${alertClasses(alert)}`}>
								<p class="text-sm font-black">
									{alert.title}
								</p>

								<p class="mt-1 text-sm">
									{alert.description}
								</p>
							</div>
						{/each}
					</div>
				</section>
			{/if}

			<div class="grid gap-4 lg:grid-cols-3">
				<section class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
					<div class="flex items-center justify-between gap-3">
						<div class="flex items-center gap-2 text-[#0E4C92]">
							<AlertTriangle size={18} />
							<h3 class="font-black text-slate-900">Allergies</h3>
						</div>

						<span class="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
							{summary.medical_record.active_allergies}
						</span>
					</div>

					<div class="mt-4 space-y-2">
						{#if summary.allergies.length === 0}
							<p class="text-sm text-slate-500">Aucune allergie active.</p>
						{:else}
							{#each summary.allergies.slice(0, 4) as allergy (allergy.id)}
								<div class="rounded-xl border border-slate-200 bg-white p-3">
									<div class="flex items-start justify-between gap-3">
										<div class="min-w-0">
											<p class="truncate text-sm font-black text-slate-900">
												{allergy.name}
											</p>

											<p class="mt-1 text-xs text-slate-500">
												{allergy.reaction || 'Réaction non renseignée'}
											</p>
										</div>

										<span
											class={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${severityClasses(
												allergy.severity
											)}`}
										>
											{severityLabel(allergy.severity)}
										</span>
									</div>
								</div>
							{/each}
						{/if}
					</div>
				</section>

				<section class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
					<div class="flex items-center justify-between gap-3">
						<div class="flex items-center gap-2 text-[#0E4C92]">
							<HeartPulse size={18} />
							<h3 class="font-black text-slate-900">Maladies chroniques</h3>
						</div>

						<span class="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
							{summary.medical_record.chronic_diseases}
						</span>
					</div>

					<div class="mt-4 space-y-2">
						{#if summary.chronic_diseases.length === 0}
							<p class="text-sm text-slate-500">Aucune maladie chronique active.</p>
						{:else}
							{#each summary.chronic_diseases.slice(0, 4) as disease (disease.id)}
								<div class="rounded-xl border border-slate-200 bg-white p-3">
									<p class="text-sm font-bold text-slate-900">
										{disease.name}
									</p>

									<p class="mt-1 text-xs text-slate-500">
										Depuis {formatDate(disease.diagnosed_at)}
									</p>
								</div>
							{/each}
						{/if}
					</div>
				</section>

				<section class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
					<div class="flex items-center justify-between gap-3">
						<div class="flex items-center gap-2 text-[#0E4C92]">
							<Pill size={18} />
							<h3 class="font-black text-slate-900">Traitements actifs</h3>
						</div>

						<span class="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
							{summary.medical_record.current_treatments}
						</span>
					</div>

					<div class="mt-4 space-y-2">
						{#if summary.active_treatments.length === 0}
							<p class="text-sm text-slate-500">Aucun traitement habituel actif.</p>
						{:else}
							{#each summary.active_treatments.slice(0, 4) as treatment (treatment.id)}
								<div class="rounded-xl border border-slate-200 bg-white p-3">
									<p class="text-sm font-bold text-slate-900">
										{treatment.medication_name}
									</p>

									<p class="mt-1 text-xs text-slate-500">
										{treatment.dosage}
										{treatment.frequency}
									</p>
								</div>
							{/each}
						{/if}
					</div>
				</section>
			</div>

			<section class="rounded-2xl border border-slate-200 bg-white">
				<div class="border-b border-slate-200 px-5 py-4">
					<div class="flex items-center gap-2">
						<Activity size={18} class="text-[#0E4C92]" />

						<h3 class="font-black text-slate-900">Dernières constantes</h3>
					</div>
					<div class="mt-3 flex flex-wrap gap-4 text-[11px] font-bold text-slate-500">
						<span class="inline-flex items-center gap-1.5">
							<span class="h-2 w-2 rounded-full bg-emerald-500"></span>
							Normal
						</span>

						<span class="inline-flex items-center gap-1.5">
							<span class="h-2 w-2 rounded-full bg-amber-500"></span>
							Surveillance
						</span>

						<span class="inline-flex items-center gap-1.5">
							<span class="h-2 w-2 rounded-full bg-red-500"></span>
							Critique
						</span>
					</div>

					<p class="mt-1 text-xs text-slate-500">
						{summary.last_vitals
							? `Mesurées le ${formatDateTime(summary.last_vitals.measured_at)}`
							: 'Aucune constante disponible'}
					</p>
				</div>

				<div class="grid gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
					{@render VitalItem(
						'TA',
						summary.last_vitals
							? `${formatNumber(summary.last_vitals.systolic_bp)}/${formatNumber(summary.last_vitals.diastolic_bp)}`
							: '—',
						'mmHg',
						bloodPressureStatus()
					)}

					{@render VitalItem(
						'FC',
						formatNumber(summary.last_vitals?.heart_rate),
						'bpm',
						heartRateStatus()
					)}

					{@render VitalItem(
						'Température',
						formatNumber(summary.last_vitals?.temperature, 1),
						'°C',
						temperatureStatus()
					)}

					{@render VitalItem(
						'Saturation',
						formatNumber(summary.last_vitals?.oxygen_saturation, 1),
						'%',
						saturationStatus()
					)}

					{@render VitalItem('Poids', formatNumber(summary.last_vitals?.weight_kg, 1), 'kg')}

					{@render VitalItem(
						'IMC',
						formatNumber(summary.last_vitals?.bmi, 1),
						'kg/m²',
						bmiStatus()
					)}

					{@render VitalItem('Glycémie', formatNumber(summary.last_vitals?.blood_glucose, 2), '')}

					{@render VitalItem(
						'Douleur',
						formatNumber(summary.last_vitals?.pain_score),
						'/10',
						painStatus()
					)}
				</div>
			</section>

			<section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
				<div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
					<div class="flex items-center gap-2 text-[#0E4C92]">
						<Stethoscope size={17} />
						<p class="text-xs font-black uppercase tracking-wide">Consultations</p>
					</div>

					<p class="mt-3 text-2xl font-black text-slate-900">
						{summary.statistics.consultations}
					</p>
				</div>

				<div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
					<div class="flex items-center gap-2 text-[#0E4C92]">
						<HeartPulse size={17} />
						<p class="text-xs font-black uppercase tracking-wide">Hospitalisations</p>
					</div>

					<p class="mt-3 text-2xl font-black text-slate-900">
						{summary.statistics.hospitalizations}
					</p>
				</div>

				<div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
					<div class="flex items-center gap-2 text-[#0E4C92]">
						<Pill size={17} />
						<p class="text-xs font-black uppercase tracking-wide">Prescriptions</p>
					</div>

					<p class="mt-3 text-2xl font-black text-slate-900">
						{summary.statistics.prescriptions}
					</p>
				</div>

				<div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
					<div class="flex items-center gap-2 text-[#0E4C92]">
						<Activity size={17} />
						<p class="text-xs font-black uppercase tracking-wide">Examens</p>
					</div>

					<p class="mt-3 text-2xl font-black text-slate-900">
						{summary.statistics.exams}
					</p>
				</div>

				<div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
					<div class="flex items-center gap-2 text-[#0E4C92]">
						<FileText size={17} />
						<p class="text-xs font-black uppercase tracking-wide">Documents</p>
					</div>

					<p class="mt-3 text-2xl font-black text-slate-900">
						{summary.statistics.documents}
					</p>
				</div>
			</section>
		</div>
	{/if}
</section>

{#snippet VitalItem(label: string, value: string, unit: string, status: VitalStatus = 'unknown')}
	<div class="relative bg-white p-4">
		<span
			class={`absolute right-3 top-3 h-2.5 w-2.5 rounded-full ${vitalStatusClasses(status)}`}
			aria-label={`Statut ${status}`}
		></span>

		<p class="pr-5 text-xs font-bold uppercase tracking-wide text-slate-400">
			{label}
		</p>

		<p class="mt-2 text-lg font-black text-slate-900">
			{value}
		</p>

		{#if unit}
			<p class="mt-1 text-xs text-slate-400">
				{unit}
			</p>
		{/if}
	</div>
{/snippet}
