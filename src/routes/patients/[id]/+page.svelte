<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	import { getPatient } from '$lib/api/patients';
	import type { Patient } from '$lib/types/patient';

	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';

	let patient = $state<Patient | null>(null);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			const id = Number(page.params.id);
			patient = await getPatient(id);
		} catch {
			error = 'Impossible de charger la fiche patient.';
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Patient Workspace | MedCore HIS</title>
</svelte:head>

{#if loading}
	<p class="text-slate-500">Chargement du dossier patient...</p>
{:else if error}
	<div class="rounded-lg bg-red-50 p-4 text-red-700">{error}</div>
{:else if patient}
	{@const p = patient}
	<div class="space-y-6">
		<!-- Header -->
		<div class="rounded-xl border bg-white p-6 shadow-sm">
			<div class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
				<div class="flex items-center gap-4">
					<Avatar name={`${patient.prenoms} ${patient.nom}`} />

					<div>
						<div class="flex items-center gap-3">
							<h1 class="text-3xl font-bold text-slate-900">
								{patient.nom}
								{patient.prenoms}
							</h1>
							<Badge variant="success">Actif</Badge>
						</div>

						<p class="mt-1 text-slate-500">Dossier patient #{patient.id}</p>

						<div class="mt-3 flex flex-wrap gap-2 text-sm text-slate-600">
							<span class="rounded-full bg-slate-100 px-3 py-1"
								>Téléphone : {patient.telephone}</span
							>
							<span class="rounded-full bg-blue-50 px-3 py-1 text-blue-700"
								>Assurance : à connecter</span
							>
							<span class="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700"
								>Statut administratif OK</span
							>
						</div>
					</div>
				</div>

				<Button variant="secondary" onclick={() => goto(resolve('/patients'))}>Retour</Button>
			</div>
		</div>

		<!-- KPI -->
		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<Card padding={true}>
				<p class="text-sm text-slate-500">Assurances</p>
				<p class="mt-2 text-3xl font-bold">0</p>
				<p class="mt-1 text-xs text-slate-400">À connecter</p>
			</Card>

			<Card padding={true}>
				<p class="text-sm text-slate-500">Bons</p>
				<p class="mt-2 text-3xl font-bold">0</p>
				<p class="mt-1 text-xs text-slate-400">Aucun bon actif</p>
			</Card>

			<Card padding={true}>
				<p class="text-sm text-slate-500">Consultations</p>
				<p class="mt-2 text-3xl font-bold">0</p>
				<p class="mt-1 text-xs text-slate-400">Module à venir</p>
			</Card>

			<Card padding={true}>
				<p class="text-sm text-slate-500">Factures</p>
				<p class="mt-2 text-3xl font-bold">0</p>
				<p class="mt-1 text-xs text-slate-400">Module à venir</p>
			</Card>
		</div>

		<div class="grid gap-6 xl:grid-cols-3">
			<!-- Main -->
			<div class="space-y-6 xl:col-span-2">
				<Card title="Informations patient" subtitle="Identité et coordonnées">
					<div class="grid gap-4 md:grid-cols-2">
						<div>
							<p class="text-sm text-slate-500">Nom</p>
							<p class="font-semibold">{patient.nom}</p>
						</div>

						<div>
							<p class="text-sm text-slate-500">Prénoms</p>
							<p class="font-semibold">{patient.prenoms}</p>
						</div>

						<div>
							<p class="text-sm text-slate-500">Téléphone</p>
							<p class="font-semibold">{patient.telephone}</p>
						</div>

						<div>
							<p class="text-sm text-slate-500">Numéro dossier</p>
							<p class="font-semibold">#{patient.id}</p>
						</div>
					</div>
				</Card>

				<Card title="Assurances et prise en charge" subtitle="Couvertures, garants et bons">
					<div class="grid gap-4 md:grid-cols-3">
						<div class="rounded-lg bg-slate-50 p-4">
							<p class="text-sm text-slate-500">Compagnie</p>
							<p class="mt-1 font-semibold">À connecter</p>
						</div>

						<div class="rounded-lg bg-slate-50 p-4">
							<p class="text-sm text-slate-500">Taux couverture</p>
							<p class="mt-1 font-semibold">—</p>
						</div>

						<div class="rounded-lg bg-slate-50 p-4">
							<p class="text-sm text-slate-500">Bons actifs</p>
							<p class="mt-1 font-semibold">0</p>
						</div>
					</div>
				</Card>

				<Card title="Historique patient" subtitle="Timeline administrative et médicale">
					<div class="space-y-4">
						<div class="border-l-2 border-blue-300 pl-4">
							<p class="text-sm font-semibold text-slate-800">Dossier patient consulté</p>
							<p class="text-xs text-slate-500">Aujourd’hui · MedCore</p>
						</div>

						<div class="border-l-2 border-green-300 pl-4">
							<p class="text-sm font-semibold text-slate-800">Patient actif dans le système</p>
							<p class="text-xs text-slate-500">Statut administratif</p>
						</div>
					</div>
				</Card>
			</div>

			<!-- Actions -->
			<div class="space-y-6">
				<Card title="Actions rapides" subtitle="Opérations sur le dossier">
					<div class="space-y-3">
						<Button
							fullWidth
							onclick={() => goto(resolve(`/patients/${p.id}/consultations/create`))}
						>
							Nouvelle consultation
						</Button>
						<Button fullWidth onclick={() => goto(resolve(`/patients/${p.id}/vouchers/create`))}
							>Créer un bon</Button
						>
						<Button
							fullWidth
							variant="secondary"
							onclick={() => goto(resolve(`/patients/${p.id}/insurances/create`))}
							>Ajouter assurance</Button
						>
						<Button fullWidth variant="secondary">Modifier patient</Button>
						<Button fullWidth variant="secondary">Imprimer dossier</Button>
					</div>
				</Card>

				<Card title="Contact d’urgence" subtitle="Personne à prévenir">
					<div class="space-y-3 text-sm">
						<div class="flex justify-between">
							<span class="text-slate-500">Contact</span>
							<span class="font-medium">—</span>
						</div>

						<div class="flex justify-between">
							<span class="text-slate-500">Téléphone</span>
							<span class="font-medium">—</span>
						</div>

						<div class="flex justify-between">
							<span class="text-slate-500">Lien</span>
							<span class="font-medium">—</span>
						</div>
					</div>
				</Card>
			</div>
		</div>
	</div>
{/if}
