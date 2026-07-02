<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { Search, UserPlus, Users, Phone, FolderOpen, HeartPulse } from 'lucide-svelte';

	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import MetricCard from '$lib/components/dashboard/MetricCard.svelte';
	import { createPatient, getPatients } from '$lib/api/patients';
	import type { Patient } from '$lib/types/patient';

	let patients = $state<Patient[]>([]);
	let loading = $state(true);
	let error = $state('');
	let search = $state('');

	const filteredPatients = $derived(
		patients.filter((patient) => {
			const query = search.toLowerCase();

			return (
				patient.numeroDossier?.toLowerCase().includes(query) ||
				patient.nom?.toLowerCase().includes(query) ||
				patient.prenoms?.toLowerCase().includes(query) ||
				patient.telephone?.toLowerCase().includes(query)
			);
		})
	);

	onMount(async () => {
		try {
			patients = await getPatients();
		} catch {
			error = 'Impossible de charger les patients.';
		} finally {
			loading = false;
		}
	});

	async function submitDemoPatient() {
		try {
			const patient = await createPatient({
				nom: 'KOUASSI',
				prenoms: 'Nouveau Patient',
				sexe: 'M',
				telephone: '+2250700000000',
				quartier: 'Cocody'
			});

			await goto(resolve(`/patients/${patient.id}`));
		} catch {
			error = 'Impossible de créer le patient.';
		}
	}
</script>

<svelte:head>
	<title>Patients | MedCore HIS</title>
</svelte:head>

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
			PAT
		</div>

		<div class="relative flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
			<div>
				<p class="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">
					Patient Center
				</p>

				<h1 class="mt-3 text-4xl font-bold leading-tight">Gestion des patients</h1>

				<p class="mt-3 max-w-2xl text-lg text-blue-50">
					Suivi des dossiers patients, identités, contacts, consultations et parcours médicaux.
				</p>

				<div class="mt-6 flex flex-wrap gap-3">
					<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
						👥 {patients.length} Patients
					</span>
					<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
						📁 Dossiers actifs
					</span>
					<span class="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
						🩺 Patient 360° bientôt
					</span>
				</div>
			</div>

			<Button variant="secondary" onclick={submitDemoPatient}>
				<UserPlus size={16} />
				Nouveau patient
			</Button>
		</div>
	</section>

	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
		<MetricCard
			icon={Users}
			title="Patients"
			value={patients.length}
			detail="Dossiers enregistrés"
			trend="+12%"
			progress={78}
			accent="#0E4C92"
		/>

		<MetricCard
			icon={FolderOpen}
			title="Dossiers"
			value={patients.length}
			detail="Dossiers actifs"
			trend="+8%"
			progress={70}
			accent="#18B893"
		/>

		<MetricCard
			icon={Phone}
			title="Contacts"
			value={patients.filter((p) => p.telephone).length}
			detail="Téléphones renseignés"
			trend="+6%"
			progress={64}
			accent="#7C3AED"
		/>

		<MetricCard
			icon={HeartPulse}
			title="Consultations"
			value="42"
			detail="Aujourd’hui"
			trend="+4%"
			progress={58}
			accent="#F59E0B"
		/>
	</div>

	{#if error}
		<div class="rounded-2xl bg-red-50 p-4 text-red-700">{error}</div>
	{/if}

	<Card title="Liste des patients" subtitle="Patients enregistrés dans MedCore HIS">
		<div class="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
			<div class="relative w-full max-w-md">
				<Search class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />

				<input
					bind:value={search}
					placeholder="Rechercher un patient, dossier, téléphone..."
					class="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#0E4C92] focus:bg-white"
				/>
			</div>
		</div>

		{#if loading}
			<p class="text-sm text-slate-500">Chargement des patients...</p>
		{:else if filteredPatients.length === 0}
			<div class="rounded-2xl border border-dashed border-slate-300 p-10 text-center">
				<p class="text-4xl">👤</p>
				<h3 class="mt-4 text-lg font-bold text-slate-900">Aucun patient trouvé</h3>
				<p class="mt-2 text-sm text-slate-500">Essayez une autre recherche.</p>
			</div>
		{:else}
			<div class="overflow-hidden rounded-2xl border border-slate-200">
				{#each filteredPatients as patient (patient.id)}
					<div
						class="flex flex-col gap-4 border-b border-slate-100 bg-white p-5 transition hover:bg-slate-50 lg:flex-row lg:items-center lg:justify-between"
					>
						<div class="flex items-center gap-4">
							<div
								class="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 font-bold text-[#0E4C92]"
							>
								{patient.nom?.slice(0, 1)}{patient.prenoms?.slice(0, 1)}
							</div>

							<div>
								<p class="font-bold text-slate-900">
									{patient.nom}
									{patient.prenoms}
								</p>
								<p class="text-sm text-slate-500">{patient.numeroDossier}</p>
							</div>
						</div>

						<div class="grid gap-4 text-sm md:grid-cols-3 lg:w-[560px]">
							<div>
								<p class="text-xs text-slate-400">Téléphone</p>
								<p class="font-semibold text-slate-700">{patient.telephone || '—'}</p>
							</div>

							<div>
								<p class="text-xs text-slate-400">Statut</p>
								<span
									class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600"
								>
									Actif
								</span>
							</div>

							<div>
								<p class="text-xs text-slate-400">Dossier</p>
								<p class="font-semibold text-slate-700">{patient.numeroDossier}</p>
							</div>
						</div>

						<Button onclick={() => goto(resolve(`/patients/${patient.id}`))}>Voir</Button>
					</div>
				{/each}
			</div>
		{/if}
	</Card>
</div>
