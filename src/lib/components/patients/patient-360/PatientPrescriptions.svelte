<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import { CalendarDays, Eye, FileDown, Pill, Search, Stethoscope } from 'lucide-svelte';

	import type { PatientConsultation } from '$lib/api/patient-consultations';

	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';

	import { openConsultationDocument } from '$lib/api/consultation-documents';

	interface Props {
		patientId: number;
		consultations: PatientConsultation[];
	}

	interface PatientPrescriptionItem {
		key: string;
		id: number;
		consultationId: number;
		medicationName: string;
		dosage: string;
		form: string;
		route: string;
		quantity: number;
		frequency: string;
		duration: string;
		instructions: string;
		service: string;
		doctorName: string;
		diagnosis: string;
		date: string;
		status: PatientConsultation['status'];
	}

	let { patientId, consultations }: Props = $props();

	let search = $state('');

	const prescriptions = $derived.by<PatientPrescriptionItem[]>(() =>
		consultations
			.flatMap((consultation) =>
				(consultation.prescriptions ?? []).map((prescription) => ({
					key: `${consultation.id}-${prescription.id}`,
					id: prescription.id,
					consultationId: consultation.id,
					medicationName: prescription.medicationName,
					dosage: prescription.dosage,
					form: prescription.form,
					route: prescription.route,
					quantity: prescription.quantity,
					frequency: prescription.frequency,
					duration: prescription.duration,
					instructions: prescription.instructions,
					service: consultation.service,
					doctorName: consultation.doctorName,
					diagnosis: consultation.diagnosis,
					date: consultation.startedAt ?? consultation.completedAt ?? consultation.createdAt,
					status: consultation.status
				}))
			)
			.sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())
	);

	const filteredPrescriptions = $derived.by(() => {
		const query = search.trim().toLowerCase();

		if (!query) {
			return prescriptions;
		}

		return prescriptions.filter(
			(prescription) =>
				prescription.medicationName.toLowerCase().includes(query) ||
				prescription.doctorName.toLowerCase().includes(query) ||
				prescription.service.toLowerCase().includes(query) ||
				prescription.diagnosis.toLowerCase().includes(query)
		);
	});

	const medicationCount = $derived(
		new Set(prescriptions.map((prescription) => prescription.medicationName.trim().toLowerCase()))
			.size
	);

	const prescribingConsultationsCount = $derived(
		new Set(prescriptions.map((prescription) => prescription.consultationId)).size
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

	function presentation(prescription: PatientPrescriptionItem): string {
		const values = [prescription.dosage, prescription.form, prescription.route].filter(Boolean);

		return values.length > 0 ? values.join(' · ') : '—';
	}

	function openConsultation(consultationId: number): void {
		void goto(resolve(`/consultations/${consultationId}`));
	}

	function createConsultation(): void {
		void goto(resolve(`/patients/${patientId}/consultations/create`));
	}

	let openingPrescriptionConsultationId = $state<number | null>(null);

	async function openPrescriptionPdf(consultationId: number): Promise<void> {
		openingPrescriptionConsultationId = consultationId;

		try {
			await openConsultationDocument(consultationId, 'prescription');
		} catch (error: unknown) {
			console.error('Impossible d’ouvrir l’ordonnance :', error);
		} finally {
			openingPrescriptionConsultationId = null;
		}
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.2em] text-orange-600">
				Traitements prescrits
			</p>

			<h2 class="mt-2 text-2xl font-black text-slate-900">Prescriptions</h2>

			<p class="mt-1 text-sm leading-6 text-slate-500">
				Historique des médicaments, posologies et ordonnances du patient.
			</p>
		</div>

		<Button onclick={createConsultation}>
			<Stethoscope size={16} />
			Nouvelle consultation
		</Button>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
		<div class="rounded-2xl border border-orange-200 bg-orange-50 p-5">
			<p class="text-xs font-black uppercase text-orange-500">Prescriptions</p>

			<p class="mt-2 text-3xl font-black text-orange-900">
				{prescriptions.length}
			</p>
		</div>

		<div class="rounded-2xl border border-amber-200 bg-amber-50 p-5">
			<p class="text-xs font-black uppercase text-amber-600">Médicaments distincts</p>

			<p class="mt-2 text-3xl font-black text-amber-900">
				{medicationCount}
			</p>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-white p-5">
			<p class="text-xs font-black uppercase text-slate-400">Consultations prescriptrices</p>

			<p class="mt-2 text-3xl font-black text-slate-900">
				{prescribingConsultationsCount}
			</p>
		</div>
	</div>

	<Card
		title="Historique des prescriptions"
		subtitle={`${filteredPrescriptions.length} prescription(s) affichée(s)`}
	>
		<div class="relative mb-6 w-full max-w-xl">
			<Search size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

			<input
				bind:value={search}
				placeholder="Rechercher un médicament, médecin, diagnostic..."
				class="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-orange-500 focus:bg-white"
			/>
		</div>

		{#if filteredPrescriptions.length === 0}
			<div
				class="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center"
			>
				<div
					class="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-orange-600"
				>
					<Pill size={28} />
				</div>

				<h3 class="mt-5 text-xl font-black text-slate-900">Aucune prescription trouvée</h3>

				<p class="mt-2 text-sm text-slate-500">
					Les médicaments prescrits pendant les consultations apparaîtront ici.
				</p>
			</div>
		{:else}
			<div class="space-y-4">
				{#each filteredPrescriptions as prescription (prescription.key)}
					<article
						class="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-orange-300 hover:shadow-sm"
					>
						<div class="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
							<div class="flex min-w-0 flex-1 gap-4">
								<div
									class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600"
								>
									<Pill size={21} />
								</div>

								<div class="min-w-0 flex-1">
									<h3 class="text-lg font-black text-slate-900">
										{prescription.medicationName}
									</h3>

									<p class="mt-1 text-sm font-bold text-orange-700">
										{presentation(prescription)}
									</p>

									<div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
										<div>
											<p class="text-[10px] font-black uppercase tracking-wide text-slate-400">
												Fréquence
											</p>

											<p class="mt-1 text-sm font-bold text-slate-700">
												{prescription.frequency || '—'}
											</p>
										</div>

										<div>
											<p class="text-[10px] font-black uppercase tracking-wide text-slate-400">
												Durée
											</p>

											<p class="mt-1 text-sm font-bold text-slate-700">
												{prescription.duration || '—'}
											</p>
										</div>

										<div>
											<p class="text-[10px] font-black uppercase tracking-wide text-slate-400">
												Quantité
											</p>

											<p class="mt-1 text-sm font-bold text-slate-700">
												{prescription.quantity || 0}
											</p>
										</div>

										<div>
											<p class="text-[10px] font-black uppercase tracking-wide text-slate-400">
												Date
											</p>

											<p class="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-700">
												<CalendarDays size={14} />
												{formatDate(prescription.date)}
											</p>
										</div>
									</div>

									<div class="mt-4 grid gap-4 rounded-2xl bg-slate-50 p-4 md:grid-cols-2">
										<div>
											<p class="text-[10px] font-black uppercase tracking-wide text-slate-400">
												Médecin / service
											</p>

											<p class="mt-1 text-sm font-bold text-slate-700">
												{prescription.doctorName || '—'}
												·
												{prescription.service || '—'}
											</p>
										</div>

										<div>
											<p class="text-[10px] font-black uppercase tracking-wide text-slate-400">
												Diagnostic
											</p>

											<p class="mt-1 text-sm font-bold text-slate-700">
												{prescription.diagnosis || '—'}
											</p>
										</div>
									</div>

									{#if prescription.instructions}
										<div class="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
											<p class="text-[10px] font-black uppercase tracking-wide text-amber-600">
												Instructions
											</p>

											<p class="mt-1 text-sm leading-6 text-amber-800">
												{prescription.instructions}
											</p>
										</div>
									{/if}
								</div>
							</div>

							<div class="flex shrink-0 flex-wrap gap-2">
								<Button
									variant="secondary"
									onclick={() => openConsultation(prescription.consultationId)}
								>
									<Eye size={16} />
									Voir
								</Button>

								<Button
									variant="secondary"
									disabled={openingPrescriptionConsultationId === prescription.consultationId}
									onclick={() => void openPrescriptionPdf(prescription.consultationId)}
								>
									<FileDown size={16} />

									{openingPrescriptionConsultationId === prescription.consultationId
										? 'Ouverture...'
										: 'Ordonnance'}
								</Button>
							</div>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</Card>
</div>
