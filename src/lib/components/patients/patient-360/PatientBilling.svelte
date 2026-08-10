<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import { BadgeCheck, FileText, Percent, ReceiptText, Shield, WalletCards } from 'lucide-svelte';

	import type { PatientConsultation } from '$lib/api/patient-consultations';
	import type { Patient } from '$lib/types/patient';

	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import MiniInfo from '$lib/components/patients/MiniInfo.svelte';

	interface Props {
		patient: Patient;
		consultations: PatientConsultation[];
	}

	let { patient, consultations }: Props = $props();

	const coverageRate = $derived(
		patient.isAssure ? Math.max(0, Math.min(patient.tauxCouverture ?? 0, 100)) : 0
	);

	const patientShareRate = $derived(patient.isAssure ? Math.max(0, 100 - coverageRate) : 100);

	const consultationCount = $derived(consultations.length);

	const prescriptionCount = $derived(
		consultations.reduce(
			(total, consultation) => total + (consultation.prescriptions?.length ?? 0),
			0
		)
	);

	const examCount = $derived(
		consultations.reduce((total, consultation) => total + (consultation.exams?.length ?? 0), 0)
	);

	const hospitalizationCount = $derived(
		consultations.filter((consultation) => consultation.hospitalizationRequired).length
	);

	function openBilling(): void {
		void goto(resolve('/billing'));
	}

	function createVoucher(): void {
		void goto(resolve(`/patients/${patient.id}/vouchers/create`));
	}

	function openInsurance(): void {
		void goto(resolve('/insurance/vouchers'));
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.2em] text-orange-600">
				Situation financière
			</p>

			<h2 class="mt-2 text-2xl font-black text-slate-900">Facturation</h2>

			<p class="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
				Synthèse des actes potentiellement facturables, de la couverture médicale et du reste à
				charge du patient.
			</p>
		</div>

		<div class="flex flex-wrap gap-2">
			<Button variant="secondary" onclick={createVoucher}>
				<Shield size={16} />
				Créer un bon PEC
			</Button>

			<Button onclick={openBilling}>
				<ReceiptText size={16} />
				Ouvrir la facturation
			</Button>
		</div>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<div class="rounded-2xl border border-blue-200 bg-blue-50 p-5">
			<div class="flex items-center gap-3">
				<div
					class="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm"
				>
					<ReceiptText size={20} />
				</div>

				<div>
					<p class="text-xs font-black uppercase tracking-wide text-blue-500">Consultations</p>

					<p class="text-2xl font-black text-blue-900">
						{consultationCount}
					</p>
				</div>
			</div>
		</div>

		<div class="rounded-2xl border border-orange-200 bg-orange-50 p-5">
			<div class="flex items-center gap-3">
				<div
					class="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-orange-700 shadow-sm"
				>
					<WalletCards size={20} />
				</div>

				<div>
					<p class="text-xs font-black uppercase tracking-wide text-orange-500">Prescriptions</p>

					<p class="text-2xl font-black text-orange-900">
						{prescriptionCount}
					</p>
				</div>
			</div>
		</div>

		<div class="rounded-2xl border border-violet-200 bg-violet-50 p-5">
			<div class="flex items-center gap-3">
				<div
					class="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-violet-700 shadow-sm"
				>
					<FileText size={20} />
				</div>

				<div>
					<p class="text-xs font-black uppercase tracking-wide text-violet-500">Examens</p>

					<p class="text-2xl font-black text-violet-900">
						{examCount}
					</p>
				</div>
			</div>
		</div>

		<div class="rounded-2xl border border-red-200 bg-red-50 p-5">
			<div class="flex items-center gap-3">
				<div
					class="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-red-700 shadow-sm"
				>
					<BadgeCheck size={20} />
				</div>

				<div>
					<p class="text-xs font-black uppercase tracking-wide text-red-500">Hospitalisations</p>

					<p class="text-2xl font-black text-red-900">
						{hospitalizationCount}
					</p>
				</div>
			</div>
		</div>
	</div>

	<div class="grid gap-6 xl:grid-cols-3">
		<div class="space-y-6 xl:col-span-2">
			<Card
				title="Répartition financière"
				subtitle="Répartition théorique selon la couverture actuelle"
			>
				<div class="grid gap-4 md:grid-cols-3">
					<MiniInfo title="Statut assurance" value={patient.isAssure ? 'Assuré' : 'Non assuré'} />

					<MiniInfo title="Part assurance" value={`${coverageRate} %`} />

					<MiniInfo title="Part patient" value={`${patientShareRate} %`} />
				</div>

				<div class="mt-6">
					<div class="mb-3 flex items-center justify-between gap-4 text-sm font-bold">
						<span class="text-slate-600"> Répartition estimée des dépenses </span>

						<span class="text-[#0E4C92]">
							{coverageRate} % pris en charge
						</span>
					</div>

					<div class="flex h-4 overflow-hidden rounded-full bg-orange-200">
						<div
							class="h-full bg-violet-600 transition-all"
							style={`width: ${coverageRate}%`}
							title={`Assurance : ${coverageRate} %`}
						></div>

						<div
							class="h-full flex-1 bg-orange-400"
							title={`Patient : ${patientShareRate} %`}
						></div>
					</div>

					<div class="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-bold">
						<span class="inline-flex items-center gap-2 text-violet-700">
							<span class="h-3 w-3 rounded-full bg-violet-600"></span>
							Assurance : {coverageRate} %
						</span>

						<span class="inline-flex items-center gap-2 text-orange-700">
							<span class="h-3 w-3 rounded-full bg-orange-400"></span>
							Patient : {patientShareRate} %
						</span>
					</div>
				</div>
			</Card>

			<Card
				title="Éléments potentiellement facturables"
				subtitle="Synthèse issue du parcours clinique"
			>
				<div class="overflow-hidden rounded-2xl border border-slate-200">
					<div class="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-100 p-4">
						<div>
							<p class="font-black text-slate-900">Consultations médicales</p>

							<p class="mt-1 text-sm text-slate-500">Consultations enregistrées dans le dossier</p>
						</div>

						<span
							class="self-center rounded-full bg-blue-50 px-3 py-1 text-sm font-black text-blue-700"
						>
							{consultationCount}
						</span>
					</div>

					<div class="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-100 p-4">
						<div>
							<p class="font-black text-slate-900">Examens médicaux</p>

							<p class="mt-1 text-sm text-slate-500">Laboratoire, imagerie et explorations</p>
						</div>

						<span
							class="self-center rounded-full bg-violet-50 px-3 py-1 text-sm font-black text-violet-700"
						>
							{examCount}
						</span>
					</div>

					<div class="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-100 p-4">
						<div>
							<p class="font-black text-slate-900">Prescriptions</p>

							<p class="mt-1 text-sm text-slate-500">
								Médicaments prescrits pendant les consultations
							</p>
						</div>

						<span
							class="self-center rounded-full bg-orange-50 px-3 py-1 text-sm font-black text-orange-700"
						>
							{prescriptionCount}
						</span>
					</div>

					<div class="grid grid-cols-[1fr_auto] gap-4 p-4">
						<div>
							<p class="font-black text-slate-900">Hospitalisations</p>

							<p class="mt-1 text-sm text-slate-500">Séjours hospitaliers indiqués</p>
						</div>

						<span
							class="self-center rounded-full bg-red-50 px-3 py-1 text-sm font-black text-red-700"
						>
							{hospitalizationCount}
						</span>
					</div>
				</div>
			</Card>

			<Card title="Factures et paiements" subtitle="Historique financier du patient">
				<div
					class="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"
				>
					<div
						class="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-orange-700"
					>
						<ReceiptText size={28} />
					</div>

					<h3 class="mt-5 text-xl font-black text-slate-900">Historique des factures</h3>

					<p class="mt-2 max-w-xl text-sm leading-6 text-slate-500">
						Les factures, paiements, avoirs et soldes du patient seront affichés ici après connexion
						de l’API de facturation.
					</p>

					<div class="mt-6">
						<Button onclick={openBilling}>
							<ReceiptText size={16} />
							Ouvrir le module facturation
						</Button>
					</div>
				</div>
			</Card>
		</div>

		<div class="space-y-6">
			<Card title="Situation de paiement" subtitle="Estimation selon l’assurance">
				<div class="space-y-3">
					<div class="flex items-center justify-between rounded-xl bg-violet-50 px-4 py-3">
						<span class="text-sm font-semibold text-violet-700"> Assurance </span>

						<span class="font-black text-violet-900">
							{coverageRate} %
						</span>
					</div>

					<div class="flex items-center justify-between rounded-xl bg-orange-50 px-4 py-3">
						<span class="text-sm font-semibold text-orange-700"> Patient </span>

						<span class="font-black text-orange-900">
							{patientShareRate} %
						</span>
					</div>
				</div>
			</Card>

			<Card title="Actions financières" subtitle="Opérations rapides">
				<div class="space-y-3">
					<Button fullWidth onclick={openBilling}>
						<ReceiptText size={16} />
						Accéder aux factures
					</Button>

					<Button fullWidth variant="secondary" onclick={createVoucher}>
						<Shield size={16} />
						Créer un bon PEC
					</Button>

					<Button fullWidth variant="secondary" onclick={openInsurance}>
						<WalletCards size={16} />
						Consulter les PEC
					</Button>
				</div>
			</Card>

			<Card title="Information" subtitle="Calcul du reste à charge">
				<div class="rounded-2xl border border-blue-200 bg-blue-50 p-4">
					<div class="flex gap-3">
						<Percent size={19} class="mt-0.5 shrink-0 text-blue-700" />

						<p class="text-sm font-semibold leading-6 text-blue-800">
							Le montant exact dépendra des tarifs appliqués, des actes facturés et des validations
							des bons de prise en charge.
						</p>
					</div>
				</div>
			</Card>
		</div>
	</div>

	{#if !patient.isAssure}
		<div
			class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800"
		>
			Le patient n’est pas assuré. Le reste à charge théorique est actuellement de 100 %.
		</div>
	{/if}
</div>
