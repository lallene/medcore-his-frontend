<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { FileText, HeartPulse, Stethoscope, User } from 'lucide-svelte';

	import { getPatient } from '$lib/api/patients';
	import { createConsultation } from '$lib/api/consultations';

	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import MetricCard from '$lib/components/dashboard/MetricCard.svelte';

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
		<section
			class="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#0E4C92] via-[#155DA8] to-[#18B893] p-8 text-white shadow-xl"
		>
			<div
				class="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl"
			></div>
			<div
				class="pointer-events-none absolute bottom-4 right-10 text-[140px] font-black leading-none text-white/5"
			>
				CNS
			</div>

			<div class="relative flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
				<div>
					<p class="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">
						Consultation Center
					</p>

					<h1 class="mt-3 text-4xl font-bold leading-tight">Nouvelle consultation</h1>

					<p class="mt-3 max-w-2xl text-lg text-blue-50">
						Création d’une consultation médicale pour {p.nom}
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
							🩺 {service}
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
				icon={Stethoscope}
				title="Médecin"
				value={doctorName}
				detail="Responsable"
				trend="+0%"
				progress={70}
				accent="#18B893"
			/>

			<MetricCard
				icon={HeartPulse}
				title="Service"
				value={service}
				detail="Unité médicale"
				trend="+0%"
				progress={60}
				accent="#7C3AED"
			/>

			<MetricCard
				icon={FileText}
				title="Statut"
				value="Brouillon"
				detail="À enregistrer"
				trend="+0%"
				progress={25}
				accent="#F59E0B"
			/>
		</div>

		{#if error}
			<div class="rounded-2xl bg-red-50 p-4 text-red-700">{error}</div>
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
						<label for="doctor" class="mb-2 block text-sm font-medium text-slate-700">
							Médecin
						</label>
						<Input id="doctor" bind:value={doctorName} />
					</div>

					<div>
						<label for="service" class="mb-2 block text-sm font-medium text-slate-700">
							Service
						</label>
						<Input id="service" bind:value={service} />
					</div>
				</div>

				<div>
					<label for="reason" class="mb-2 block text-sm font-medium text-slate-700"> Motif </label>
					<Textarea id="reason" bind:value={reason} placeholder="Motif de la consultation..." />
				</div>

				<div>
					<label for="diagnosis" class="mb-2 block text-sm font-medium text-slate-700">
						Diagnostic
					</label>
					<Textarea id="diagnosis" bind:value={diagnosis} placeholder="Diagnostic médical..." />
				</div>

				<div>
					<label for="treatment" class="mb-2 block text-sm font-medium text-slate-700">
						Traitement / Prescription
					</label>
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
