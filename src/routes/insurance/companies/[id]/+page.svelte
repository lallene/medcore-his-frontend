<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	import { getInsuranceCompany } from '$lib/api/insurance';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import type { InsuranceCompany } from '$lib/types/insurance';

	let company = $state<InsuranceCompany | null>(null);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			const id = Number(page.params.id);
			company = await getInsuranceCompany(id);
		} catch {
			error = "Impossible de charger la compagnie d'assurance.";
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Compagnie assurance | MedCore HIS</title>
</svelte:head>

{#if loading}
	<p class="text-slate-500">Chargement...</p>
{:else if error}
	<div class="rounded-lg bg-red-50 p-4 text-red-700">{error}</div>
{:else if company}
	<div class="space-y-6">
		<div class="rounded-xl border bg-white p-6 shadow-sm">
			<div class="flex items-center justify-between">
				<div>
					<div class="flex items-center gap-3">
						<h1 class="text-3xl font-bold text-slate-900">{company.name}</h1>
						<Badge variant={company.isActive ? 'success' : 'danger'}>
							{company.isActive ? 'Active' : 'Inactive'}
						</Badge>
					</div>

					<p class="mt-1 text-slate-500">Code compagnie : {company.code}</p>
				</div>

				<Button variant="secondary" onclick={() => goto(resolve('/insurance'))}>Retour</Button>
			</div>
		</div>

		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<Card>
				<p class="text-sm text-slate-500">Patients couverts</p>
				<p class="mt-2 text-3xl font-bold">—</p>
			</Card>

			<Card>
				<p class="text-sm text-slate-500">Bons en attente</p>
				<p class="mt-2 text-3xl font-bold">—</p>
			</Card>

			<Card>
				<p class="text-sm text-slate-500">Bons validés</p>
				<p class="mt-2 text-3xl font-bold">—</p>
			</Card>

			<Card>
				<p class="text-sm text-slate-500">Taux moyen</p>
				<p class="mt-2 text-3xl font-bold">—</p>
			</Card>
		</div>

		<div class="grid gap-6 xl:grid-cols-3">
			<div class="space-y-6 xl:col-span-2">
				<Card title="Informations compagnie" subtitle="Coordonnées et identification">
					<div class="grid gap-4 md:grid-cols-2">
						<div>
							<p class="text-sm text-slate-500">Code</p>
							<p class="font-semibold">{company.code}</p>
						</div>

						<div>
							<p class="text-sm text-slate-500">Nom</p>
							<p class="font-semibold">{company.name}</p>
						</div>

						<div>
							<p class="text-sm text-slate-500">Téléphone</p>
							<p class="font-semibold">{company.phone ?? '—'}</p>
						</div>

						<div>
							<p class="text-sm text-slate-500">Email</p>
							<p class="font-semibold">{company.email ?? '—'}</p>
						</div>

						<div>
							<p class="text-sm text-slate-500">Ville</p>
							<p class="font-semibold">{company.city ?? '—'}</p>
						</div>

						<div>
							<p class="text-sm text-slate-500">Pays</p>
							<p class="font-semibold">{company.country ?? '—'}</p>
						</div>
					</div>
				</Card>

				<Card title="Workflow assurance" subtitle="Suivi des prises en charge">
					<div class="space-y-4">
						<div class="border-l-2 border-blue-300 pl-4">
							<p class="text-sm font-semibold">Bons soumis</p>
							<p class="text-xs text-slate-500">En attente de contrôle</p>
						</div>

						<div class="border-l-2 border-amber-300 pl-4">
							<p class="text-sm font-semibold">Contrôle</p>
							<p class="text-xs text-slate-500">Vérification des pièces</p>
						</div>

						<div class="border-l-2 border-green-300 pl-4">
							<p class="text-sm font-semibold">Validation</p>
							<p class="text-xs text-slate-500">Prise en charge acceptée</p>
						</div>
					</div>
				</Card>
			</div>

			<div class="space-y-6">
				<Card title="Actions rapides" subtitle="Opérations compagnie">
					<div class="space-y-3">
						<Button fullWidth>Créer un bon</Button>
						<Button fullWidth variant="secondary">Voir patients couverts</Button>
						<Button fullWidth variant="secondary">Voir garants</Button>
						<Button fullWidth variant="secondary">Exporter</Button>
					</div>
				</Card>

				<Card title="Description">
					<p class="text-sm text-slate-600">
						{company.description ?? 'Aucune description renseignée pour cette compagnie.'}
					</p>
				</Card>
			</div>
		</div>
	</div>
{/if}
