<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	import { getInsuranceCompanies } from '$lib/api/insurance';
	import { getPatient } from '$lib/api/patients';
	import { createVoucher } from '$lib/api/vouchers';

	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';

	import type { InsuranceCompany } from '$lib/types/insurance';
	import type { Patient } from '$lib/types/patient';

	let patient = $state<Patient | null>(null);
	let companies = $state<InsuranceCompany[]>([]);
	let companyId = $state('');
	let reason = $state('');
	let estimatedAmount = $state('');
	let loading = $state(true);
	let submitting = $state(false);
	let error = $state('');

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
				amount: Number(estimatedAmount)
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
	<title>Créer un bon | MedCore HIS</title>
</svelte:head>

{#if loading}
	<p class="text-slate-500">Chargement...</p>
{:else if patient}
	{@const p = patient}

	<div class="space-y-6">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold text-slate-900">Créer un bon de prise en charge</h1>
				<p class="text-slate-500">
					Patient : {p.nom}
					{p.prenoms}
				</p>
			</div>

			<Button variant="secondary" onclick={() => goto(resolve(`/patients/${p.id}`))}>Retour</Button>
		</div>

		{#if error}
			<div class="rounded-lg bg-red-50 p-4 text-red-700">{error}</div>
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
						<label for="voucher-patient" class="mb-2 block text-sm font-medium">Patient</label>
						<Input id="voucher-patient" value={`${p.nom} ${p.prenoms}`} disabled />
					</div>

					<div>
						<label for="voucher-company" class="mb-2 block text-sm font-medium">Compagnie</label>
						<Select
							id="voucher-company"
							bind:value={companyId}
							options={companies.map((company) => ({
								label: company.name,
								value: String(company.id)
							}))}
						/>
						bind:value={companyId}
						options={companies.map((company) => ({
							label: company.name,
							value: String(company.id)
						}))}
						/>
					</div>

					<div>
						<label for="voucher-amount" class="mb-2 block text-sm font-medium">Montant estimé</label
						>
						<Input bind:value={estimatedAmount} type="number" placeholder="Ex : 250000" />
					</div>
				</div>

				<div>
					<label for="voucher-amount" class="mb-2 block text-sm font-medium">Montant estimé</label>
					<Textarea
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
