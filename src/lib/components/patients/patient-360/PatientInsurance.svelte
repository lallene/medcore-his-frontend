<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';

	import {
		BadgeCheck,
		FilePlus2,
		Percent,
		Shield,
		ShieldCheck,
		UserRoundCheck,
		WalletCards
	} from 'lucide-svelte';

	import type { Patient } from '$lib/types/patient';
	import type { InsuranceAuthorization, PatientInsuranceView } from '$lib/types/insurance';
	import { getInsuranceAuthorizations } from '$lib/api/insurance';
	import { authorizationStatusLabel } from '$lib/components/insurance/authorization-state';
	import {
		insuranceAuthorizationDisplay,
		normalizeInsuranceAuthorizations
	} from './patient-360-data';

	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import MiniInfo from '$lib/components/patients/MiniInfo.svelte';

	interface Props {
		patient: Patient;
		insurance: PatientInsuranceView;
	}

	let { patient, insurance }: Props = $props();
	let authorizations = $state<InsuranceAuthorization[]>([]);

	const coverageRate = $derived(insurance.coverageRate);

	const patientShareRate = $derived(insurance.insured ? Math.max(0, 100 - coverageRate) : 100);

	const coverageLabel = $derived(insurance.insured ? `${coverageRate} %` : '0 %');

	const patientShareLabel = $derived(`${patientShareRate} %`);

	const insuranceStatus = $derived(insurance.status);

	function formatDate(value: string): string {
		if (!value) return '—';
		const date = new Date(`${value}T00:00:00`);
		return Number.isNaN(date.getTime())
			? value
			: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(date);
	}

	function addInsurance(): void {
		void goto(resolve('/insurance'));
	}

	function createVoucher(): void {
		void goto(resolve(`/insurance/authorizations?patientId=${patient.id}`));
	}

	function openVouchers(): void {
		void goto(resolve(`/insurance/authorizations?patientId=${patient.id}`));
	}

	onMount(async () => {
		try {
			authorizations = normalizeInsuranceAuthorizations(
				(await getInsuranceAuthorizations({ patientId: patient.id, pageSize: 100 })).items
			);
		} catch {
			authorizations = [];
		}
	});
</script>

<div class="space-y-6">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.2em] text-violet-700">
				Couverture financière
			</p>

			<h2 class="mt-2 text-2xl font-black text-slate-900">Assurance et prise en charge</h2>

			<p class="mt-1 text-sm leading-6 text-slate-500">
				Situation d’assurance, taux de couverture, matricule et gestion des bons de prise en charge.
			</p>
		</div>

		<div class="flex flex-wrap gap-2">
			<Button variant="secondary" onclick={addInsurance}>
				<ShieldCheck size={16} />
				Ajouter une assurance
			</Button>

			<Button onclick={createVoucher}>
				<FilePlus2 size={16} />
				Créer un bon PEC
			</Button>
		</div>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<div
			class={`rounded-2xl border p-5 ${
				insurance.insured ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
			}`}
		>
			<div class="flex items-center gap-3">
				<div
					class={`flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm ${
						insurance.insured ? 'text-emerald-700' : 'text-amber-700'
					}`}
				>
					{#if insurance.insured}
						<BadgeCheck size={20} />
					{:else}
						<Shield size={20} />
					{/if}
				</div>

				<div>
					<p class="text-xs font-black uppercase tracking-wide text-slate-500">Statut</p>

					<p class="text-xl font-black text-slate-900">
						{insuranceStatus}
					</p>
				</div>
			</div>
		</div>

		<div class="rounded-2xl border border-violet-200 bg-violet-50 p-5">
			<div class="flex items-center gap-3">
				<div
					class="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-violet-700 shadow-sm"
				>
					<Percent size={20} />
				</div>

				<div>
					<p class="text-xs font-black uppercase tracking-wide text-violet-500">Couverture</p>

					<p class="text-2xl font-black text-violet-900">
						{coverageLabel}
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
					<p class="text-xs font-black uppercase tracking-wide text-orange-500">Part patient</p>

					<p class="text-2xl font-black text-orange-900">
						{patientShareLabel}
					</p>
				</div>
			</div>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-white p-5">
			<div class="flex items-center gap-3">
				<div
					class="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-slate-700"
				>
					<UserRoundCheck size={20} />
				</div>

				<div class="min-w-0">
					<p class="text-xs font-black uppercase tracking-wide text-slate-400">Matricule</p>

					<p class="truncate text-lg font-black text-slate-900">
						{insurance.memberNumber}
					</p>
				</div>
			</div>
		</div>
	</div>

	<div class="grid gap-6 xl:grid-cols-3">
		<div class="space-y-6 xl:col-span-2">
			<Card title="Situation d’assurance" subtitle="Informations principales de couverture">
				<div class="grid gap-4 md:grid-cols-2">
					<MiniInfo title="Statut du patient" value={insuranceStatus} />

					<MiniInfo title="Organisme" value={insurance.organization} />

					<MiniInfo title="Matricule assuré" value={insurance.memberNumber} />

					<MiniInfo title="Taux de couverture" value={coverageLabel} />

					<MiniInfo title="Reste à charge" value={patientShareLabel} />

					<MiniInfo title="Début de validité" value={formatDate(insurance.validFrom)} />

					<MiniInfo title="Fin de validité" value={formatDate(insurance.validTo)} />

					<MiniInfo title="Garant" value={insurance.guarantor} />

					<MiniInfo title="Bénéficiaire" value={insurance.beneficiary} />
				</div>

				{#if insurance.source === 'legacy'}
					<p class="mt-4 text-xs font-semibold text-amber-700">
						Couverture issue des anciens champs patient, utilisée faute de couverture structurée
						active.
					</p>
				{/if}

				<div class="mt-6">
					<div class="mb-2 flex items-center justify-between text-sm font-bold">
						<span class="text-slate-600"> Répartition de la couverture </span>

						<span class="text-violet-700">
							{coverageRate} %
						</span>
					</div>

					<div class="h-3 overflow-hidden rounded-full bg-slate-100">
						<div
							class="h-full rounded-full bg-violet-600 transition-all"
							style={`width: ${coverageRate}%`}
						></div>
					</div>

					<div
						class="mt-3 flex flex-wrap justify-between gap-2 text-xs font-semibold text-slate-500"
					>
						<span>
							Assurance : {coverageRate} %
						</span>

						<span>
							Patient : {patientShareRate} %
						</span>
					</div>
				</div>
			</Card>

			<Card
				title="Décisions PEC par acte"
				subtitle="Distinctes de la couverture contractuelle ci-dessus"
			>
				{#if authorizations.length === 0}<div
						class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"
					>
						<div
							class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700"
						>
							<FilePlus2 size={24} />
						</div>

						<h3 class="mt-4 text-lg font-black text-slate-900">Aucune décision PEC</h3>

						<p class="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
							Les demandes et décisions seront affichées ici acte par acte, sans modifier la
							couverture.
						</p>

						<div class="mt-5 flex flex-wrap justify-center gap-2">
							<Button onclick={createVoucher}>
								<FilePlus2 size={16} />
								Nouvelle demande PEC
							</Button>

							<Button variant="secondary" onclick={openVouchers}>
								<WalletCards size={16} />
								Voir les PEC
							</Button>
						</div>
					</div>{:else}<div class="divide-y rounded-2xl border">
						{#each authorizations as authorization (authorization.id)}
							{@const display = insuranceAuthorizationDisplay(authorization)}
							<article class="space-y-4 p-5">
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div>
										<b class="text-violet-800">{authorization.authorizationNumber}</b>
										<small class="block text-slate-500">{authorization.companyName}</small>
										<b class="mt-1 block text-slate-900">{authorization.referenceLabel}</b>
										<small class="text-slate-500">{authorization.service || '—'}</small>
									</div>
									<span
										class="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-800"
										>{authorizationStatusLabel[authorization.status]}</span
									>
								</div>
								<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
									<MiniInfo title="Montant demandé" value={display.requestedAmount} />
									<MiniInfo title="Taux accordé" value={display.approvedRate} />
									<MiniInfo title="Part assurance" value={display.insuranceAmount} />
									<MiniInfo title="Part patient" value={display.patientAmount} />
									<MiniInfo title="Référence assureur" value={display.externalReference} />
									<MiniInfo
										title="Date de décision"
										value={authorization.externalDecisionDate
											? formatDate(authorization.externalDecisionDate.slice(0, 10))
											: '—'}
									/>
								</div>
								<button onclick={openVouchers} class="text-sm font-bold text-violet-700"
									>Ouvrir la PEC</button
								>
								<div class="rounded-xl bg-slate-50 p-3 text-sm">
									<b>Acte principal :</b>
									{authorization.referenceLabel}
									{#if authorization.coveredActs?.length}
										<p class="mt-2 font-bold">Actes également couverts :</p>
										<ul class="mt-1 list-disc pl-5">
											{#each authorization.coveredActs as act (act.id)}<li>
													{act.referenceLabel}
												</li>{/each}
										</ul>
									{/if}
								</div>
							</article>{/each}
					</div>{/if}
			</Card>
		</div>

		<div class="space-y-6">
			<Card title="Actions assurance" subtitle="Opérations rapides">
				<div class="space-y-3">
					<Button fullWidth onclick={createVoucher}>
						<FilePlus2 size={16} />
						Créer un bon PEC
					</Button>

					<Button fullWidth variant="secondary" onclick={addInsurance}>
						<ShieldCheck size={16} />
						Ajouter une couverture
					</Button>

					<Button fullWidth variant="secondary" onclick={openVouchers}>
						<WalletCards size={16} />
						Historique PEC
					</Button>
				</div>
			</Card>

			<Card title="Règle de paiement" subtitle="Répartition estimée">
				<div class="space-y-3">
					<div class="flex items-center justify-between rounded-xl bg-violet-50 px-4 py-3">
						<span class="text-sm font-semibold text-violet-700"> Part assurance </span>

						<span class="font-black text-violet-900">
							{coverageLabel}
						</span>
					</div>

					<div class="flex items-center justify-between rounded-xl bg-orange-50 px-4 py-3">
						<span class="text-sm font-semibold text-orange-700"> Part patient </span>

						<span class="font-black text-orange-900">
							{patientShareLabel}
						</span>
					</div>
				</div>
			</Card>
		</div>
	</div>

	{#if !insurance.insured}
		<div
			class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800"
		>
			Ce patient est actuellement non assuré. Il supporte donc 100 % des frais médicaux jusqu’à
			l’ajout d’une couverture active.
		</div>
	{/if}
</div>
