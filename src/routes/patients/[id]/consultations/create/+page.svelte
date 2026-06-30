<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	import { getPatient } from '$lib/api/patients';
	import { createConsultation } from '$lib/api/consultations';

	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';

	import type { Patient } from '$lib/types/patient';

	let patient = $state<Patient | null>(null);
	let loading = $state(true);
	let submitting = $state(false);
	let error = $state('');

	let doctorName = $state('Dr Kouassi');
	let service = $state('Consultation externe');
	let reason = $state('');
	let diagnosis = $state('');
	let treatment = $state('');

	onMount(async () => {
		try {
			patient = await getPatient(Number(page.params.id));
		} catch {
			error = 'Impossible de charger le patient.';
		} finally {
			loading = false;
		}
	});

	async function submit() {
		if (!patient) return;

		submitting = true;
		error = '';

		try {
			await createConsultation({
				patientId: patient.id,
				patientName: `${patient.nom} ${patient.prenoms}`,
				doctorName,
				service,
				reason,
				diagnosis,
				treatment
			});

			await goto(resolve(`/patients/${patient.id}`));
		} catch {
			error = 'Impossible de créer la consultation.';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Nouvelle consultation | MedCore HIS</title>
</svelte:head>

{#if loading}
	<p class="text-slate-500">Chargement...</p>
{:else if patient}
	{@const p = patient}

	<div class="space-y-6">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold text-slate-900">Nouvelle consultation</h1>
				<p class="text-slate-500">Patient : {p.nom} {p.prenoms}</p>
			</div>

			<Button variant="secondary" onclick={() => goto(resolve(`/patients/${p.id}`))}>Retour</Button>
		</div>

		{#if error}
			<div class="rounded-lg bg-red-50 p-4 text-red-700">{error}</div>
		{/if}

		<Card title="Consultation médicale" subtitle="Diagnostic, traitement et observations">
			<form
				class="space-y-5"
				onsubmit={async (e) => {
					e.preventDefault();
					await submit();
				}}
			>
				<div class="grid gap-4 md:grid-cols-2">
					<div>
						<label for="doctor" class="mb-2 block text-sm font-medium">Médecin</label>
						<Input id="doctor" bind:value={doctorName} />
					</div>

					<div>
						<label for="service" class="mb-2 block text-sm font-medium">Service</label>
						<Input id="service" bind:value={service} />
					</div>
				</div>

				<div>
					<label for="reason" class="mb-2 block text-sm font-medium">Motif</label>
					<Textarea id="reason" bind:value={reason} placeholder="Motif de la consultation..." />
				</div>

				<div>
					<label for="diagnosis" class="mb-2 block text-sm font-medium">Diagnostic</label>
					<Textarea id="diagnosis" bind:value={diagnosis} placeholder="Diagnostic médical..." />
				</div>

				<div>
					<label for="treatment" class="mb-2 block text-sm font-medium"
						>Traitement / Prescription</label
					>
					<Textarea id="treatment" bind:value={treatment} placeholder="Traitement proposé..." />
				</div>

				<div class="flex justify-end gap-3">
					<Button
						type="button"
						variant="secondary"
						onclick={() => goto(resolve(`/patients/${p.id}`))}
					>
						Annuler
					</Button>

					<Button type="submit" loading={submitting}>Enregistrer la consultation</Button>
				</div>
			</form>
		</Card>
	</div>
{/if}
