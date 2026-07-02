<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { FileText, Shield, User, WalletCards } from 'lucide-svelte';

	import { getInsuranceCompanies } from '$lib/api/insurance';
	import { getPatient } from '$lib/api/patients';
	import { createVoucher } from '$lib/api/vouchers';

	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';

	import MetricCard from '$lib/components/dashboard/MetricCard.svelte';

	import type { InsuranceCompany } from '$lib/types/insurance';
	import type { Patient } from '$lib/types/patient';

	let patient = $state<Patient | null>(null);
	let companies = $state<InsuranceCompany[]>([]);
	let companyId = $state('');
	let reason = $state('');
	let grossAmount = $state('');
	let loading = $state(true);
	let submitting = $state(false);
	let error = $state('');

	const selectedCompany = $derived(
		companies.find((company) => String(company.id) === companyId) ?? null
	);

	onMount(async () => {
		try {
			const patientId = Number(page.params.id);
			patient = await getPatient(patientId);
			companies = await getInsuranceCompanies();

			if (companies.length > 0) {
				companyId = String(companies[0].id);
			}
		} catch {
			error = 'Impossible de charger les données du bon.';
		} finally {
			loading = false;
		}
	});

	async function submit() {
		if (!patient) return;

		submitting = true;
		error = '';

		try {
			await createVoucher({
				patientId: patient.id,
				coverageId: 1,
				companyId: Number(companyId),
				guarantorId: 1,
				reason,
				grossAmount: Number(grossAmount),
				amount: Number(grossAmount)
			});

			await goto(resolve(`/patients/${patient.id}`));
		} catch {
			error = 'Impossible de créer le bon.';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Créer un bon PEC | MedCore HIS</title>
</svelte:head>

{#if loading}
	<p class="text-slate-500">Chargement...</p>
{:else if patient}
	{@const p = patient}

	<div class="space-y-6">
		<section
			class="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-violet-700 via-[#0E4C92] to-[#18B893] p-8 text-white shadow-xl"
		>
			<div
				class="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl"
			></div>
			<div
				class="pointer-events-none absolute bottom-4 right-10 text-[140px] font-black leading-none text-white/5"
			>
				PEC
			</div>

			<div class="relative flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
				<div>
					<p class="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">
						Nouveau bon PEC
					</p>

					<h1 class="mt-3 text-4xl font-bold leading-tight">Créer une prise en charge</h1>

					<p class="mt-3 max-w-2xl text-lg text-blue-50">
						Demande de prise en charge pour {p.nom}
						{p.prenoms}.
					</p>

					<div class="mt-6 flex flex-wrap gap-3">
						<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
							👤 {p.nom}
							{p.prenoms}
						</span>

						<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
							📁 {p.numeroDossier ?? `PAT-${p.id}`}
						</span>

						<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
							🛡 {selectedCompany?.name ?? 'Compagnie à choisir'}
						</span>
					</div>
				</div>

				<Button variant="secondary" onclick={() => goto(resolve(`/patients/${p.id}`))}>
					Retour
				</Button>
			</div>
		</section>

		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<MetricCard
				icon={User}
				title="Patient"
				value={p.nom}
				detail={p.prenoms}
				trend="+0%"
				progress={80}
				accent="#0E4C92"
			/>

			<MetricCard
				icon={Shield}
				title="Compagnie"
				value={selectedCompany?.name ?? '—'}
				detail="Assurance"
				trend="+0%"
				progress={70}
				accent="#7C3AED"
			/>

			<MetricCard
				icon={WalletCards}
				title="Montant"
				value={grossAmount ? Number(grossAmount).toLocaleString('fr-FR') : '0'}
				detail="FCFA"
				trend="+0%"
				progress={50}
				accent="#EA580C"
			/>

			<MetricCard
				icon={FileText}
				title="Statut"
				value="Brouillon"
				detail="À créer"
				trend="+0%"
				progress={20}
				accent="#F59E0B"
			/>
		</div>

		{#if error}
			<div class="rounded-2xl bg-red-50 p-4 text-red-700">{error}</div>
		{/if}

		<Card title="Informations du bon" subtitle="Demande de prise en charge assurance">
			<form
				class="space-y-5"
				onsubmit={async (e) => {
					e.preventDefault();
					await submit();
				}}
			>
				<div class="grid gap-4 md:grid-cols-2">
					<div>
						<label for="voucher-patient" class="mb-2 block text-sm font-medium text-slate-700">
							Patient
						</label>
						<Input id="voucher-patient" value={`${p.nom} ${p.prenoms}`} disabled />
					</div>

					<div>
						<label for="voucher-company" class="mb-2 block text-sm font-medium text-slate-700">
							Compagnie
						</label>

						<Select
							id="voucher-company"
							bind:value={companyId}
							options={companies.map((company) => ({
								label: company.name,
								value: String(company.id)
							}))}
						/>
					</div>

					<div>
						<label for="voucher-amount" class="mb-2 block text-sm font-medium text-slate-700">
							Montant estimé
						</label>

						<Input
							id="voucher-amount"
							bind:value={grossAmount}
							type="number"
							placeholder="Ex : 250000"
						/>
					</div>
				</div>

				<div>
					<label for="voucher-reason" class="mb-2 block text-sm font-medium text-slate-700">
						Motif / Diagnostic
					</label>

					<Textarea
						id="voucher-reason"
						bind:value={reason}
						placeholder="Ex : Hospitalisation, scanner, consultation spécialisée..."
					/>
				</div>

				<div class="flex justify-end gap-3">
					<Button
						type="button"
						variant="secondary"
						onclick={() => goto(resolve(`/patients/${p.id}`))}
					>
						Annuler
					</Button>

					<Button type="submit" loading={submitting}>Créer le bon</Button>
				</div>
			</form>
		</Card>
	</div>
{/if}
