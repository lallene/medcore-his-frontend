<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import { BedDouble, CalendarDays, Clock3, Eye, Hospital, Plus, UserRound } from 'lucide-svelte';

	import type { PatientConsultation } from '$lib/api/patient-consultations';

	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';

	interface Props {
		patientId: number;
		consultations: PatientConsultation[];
	}

	interface PatientHospitalizationItem {
		id: number;
		consultationId: number;
		service: string;
		doctorName: string;
		diagnosis: string;
		reason: string;
		type: string;
		duration: number;
		date: string;
		status: PatientConsultation['status'];
	}

	let { patientId, consultations }: Props = $props();

	const hospitalizations = $derived.by<PatientHospitalizationItem[]>(() =>
		consultations
			.filter((consultation) => consultation.hospitalizationRequired)
			.map((consultation) => ({
				id: consultation.id,
				consultationId: consultation.id,
				service: consultation.service,
				doctorName: consultation.doctorName,
				diagnosis: consultation.diagnosis,
				reason: consultation.hospitalizationReason,
				type: consultation.hospitalizationType,
				duration: consultation.hospitalizationDuration,
				date: consultation.startedAt ?? consultation.completedAt ?? consultation.createdAt,
				status: consultation.status
			}))
			.sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())
	);

	const totalDuration = $derived(
		hospitalizations.reduce(
			(total, hospitalization) => total + Math.max(hospitalization.duration ?? 0, 0),
			0
		)
	);

	const completedCount = $derived(
		hospitalizations.filter((hospitalization) => hospitalization.status === 'completed').length
	);

	const activeCount = $derived(
		hospitalizations.filter((hospitalization) => hospitalization.status === 'in_progress').length
	);

	function formatDate(value: string): string {
		const date = new Date(value);

		if (Number.isNaN(date.getTime())) {
			return 'Date non renseignée';
		}

		return new Intl.DateTimeFormat('fr-FR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	}

	function statusLabel(status: PatientConsultation['status']): string {
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

	function statusClass(status: PatientConsultation['status']): string {
		switch (status) {
			case 'draft':
				return 'bg-slate-100 text-slate-700';

			case 'in_progress':
				return 'bg-blue-50 text-blue-700';

			case 'completed':
				return 'bg-emerald-50 text-emerald-700';

			case 'cancelled':
				return 'bg-red-50 text-red-700';
		}
	}

	function formatDuration(duration: number): string {
		if (!duration || duration <= 0) {
			return 'Durée non renseignée';
		}

		return `${duration} jour${duration > 1 ? 's' : ''}`;
	}

	function openConsultation(consultationId: number): void {
		void goto(resolve(`/consultations/${consultationId}`));
	}

	function createConsultation(): void {
		void goto(resolve(`/patients/${patientId}/consultations/create`));
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.2em] text-red-700">Séjours hospitaliers</p>

			<h2 class="mt-2 text-2xl font-black text-slate-900">Hospitalisations</h2>

			<p class="mt-1 text-sm leading-6 text-slate-500">
				Historique des admissions, services, durées et motifs d’hospitalisation.
			</p>
		</div>

		<Button onclick={createConsultation}>
			<Plus size={16} />
			Nouvelle consultation
		</Button>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<div class="rounded-2xl border border-red-200 bg-red-50 p-5">
			<p class="text-xs font-black uppercase text-red-500">Hospitalisations</p>

			<p class="mt-2 text-3xl font-black text-red-900">
				{hospitalizations.length}
			</p>
		</div>

		<div class="rounded-2xl border border-blue-200 bg-blue-50 p-5">
			<p class="text-xs font-black uppercase text-blue-500">En cours</p>

			<p class="mt-2 text-3xl font-black text-blue-900">
				{activeCount}
			</p>
		</div>

		<div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
			<p class="text-xs font-black uppercase text-emerald-500">Terminées</p>

			<p class="mt-2 text-3xl font-black text-emerald-900">
				{completedCount}
			</p>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-white p-5">
			<p class="text-xs font-black uppercase text-slate-400">Durée cumulée</p>

			<p class="mt-2 text-3xl font-black text-slate-900">
				{totalDuration}
			</p>

			<p class="mt-1 text-xs font-semibold text-slate-500">jour(s)</p>
		</div>
	</div>

	<Card
		title="Historique hospitalier"
		subtitle={`${hospitalizations.length} hospitalisation(s) enregistrée(s)`}
	>
		{#if hospitalizations.length === 0}
			<div
				class="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center"
			>
				<div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-700">
					<Hospital size={28} />
				</div>

				<h3 class="mt-5 text-xl font-black text-slate-900">Aucune hospitalisation</h3>

				<p class="mt-2 max-w-md text-sm leading-6 text-slate-500">
					Les admissions décidées pendant les consultations apparaîtront ici.
				</p>
			</div>
		{:else}
			<div class="space-y-4">
				{#each hospitalizations as hospitalization (hospitalization.id)}
					<article
						class="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-red-300 hover:shadow-sm"
					>
						<div class="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
							<div class="flex min-w-0 flex-1 gap-4">
								<div
									class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-700"
								>
									<BedDouble size={21} />
								</div>

								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-center gap-2">
										<h3 class="text-lg font-black text-slate-900">
											{hospitalization.service || 'Service non renseigné'}
										</h3>

										<span
											class={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${statusClass(
												hospitalization.status
											)}`}
										>
											{statusLabel(hospitalization.status)}
										</span>

										{#if hospitalization.type}
											<span
												class="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-red-700"
											>
												{hospitalization.type}
											</span>
										{/if}
									</div>

									<div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
										<div>
											<p class="text-[10px] font-black uppercase tracking-wide text-slate-400">
												Admission
											</p>

											<p class="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-700">
												<CalendarDays size={14} />
												{formatDate(hospitalization.date)}
											</p>
										</div>

										<div>
											<p class="text-[10px] font-black uppercase tracking-wide text-slate-400">
												Médecin
											</p>

											<p class="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-700">
												<UserRound size={14} />
												{hospitalization.doctorName || '—'}
											</p>
										</div>

										<div>
											<p class="text-[10px] font-black uppercase tracking-wide text-slate-400">
												Durée
											</p>

											<p class="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-700">
												<Clock3 size={14} />
												{formatDuration(hospitalization.duration)}
											</p>
										</div>

										<div>
											<p class="text-[10px] font-black uppercase tracking-wide text-slate-400">
												Consultation
											</p>

											<p class="mt-1 text-sm font-bold text-slate-700">
												#{hospitalization.consultationId}
											</p>
										</div>
									</div>

									<div class="mt-4 grid gap-4 rounded-2xl bg-slate-50 p-4 md:grid-cols-2">
										<div>
											<p class="text-[10px] font-black uppercase tracking-wide text-slate-400">
												Motif
											</p>

											<p class="mt-1 text-sm font-bold leading-6 text-slate-700">
												{hospitalization.reason || 'Non renseigné'}
											</p>
										</div>

										<div>
											<p class="text-[10px] font-black uppercase tracking-wide text-slate-400">
												Diagnostic
											</p>

											<p class="mt-1 text-sm font-bold leading-6 text-slate-700">
												{hospitalization.diagnosis || 'Non renseigné'}
											</p>
										</div>
									</div>
								</div>
							</div>

							<Button
								variant="secondary"
								onclick={() => openConsultation(hospitalization.consultationId)}
							>
								<Eye size={16} />
								Voir
							</Button>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</Card>
</div>
