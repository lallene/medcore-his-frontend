<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	import { getVoucher } from '$lib/api/vouchers';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import type { InsuranceVoucher } from '$lib/types/voucher';

	let voucher = $state<InsuranceVoucher | null>(null);
	let loading = $state(true);
	let error = $state('');

	function statusVariant(
		status: string
	): 'primary' | 'success' | 'warning' | 'danger' | 'secondary' {
		if (status === 'validated') return 'success';
		if (status === 'rejected') return 'danger';
		if (status === 'submitted' || status === 'controlled') return 'warning';
		return 'secondary';
	}

	onMount(async () => {
		try {
			const id = Number(page.params.id);
			voucher = await getVoucher(id);
		} catch {
			error = 'Impossible de charger le bon.';
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Détail bon | MedCore HIS</title>
</svelte:head>

{#if loading}
	<p class="text-slate-500">Chargement du bon...</p>
{:else if error}
	<div class="rounded-lg bg-red-50 p-4 text-red-700">{error}</div>
{:else if voucher}
	<div class="space-y-6">
		<div class="rounded-xl border bg-white p-6 shadow-sm">
			<div class="flex items-center justify-between">
				<div>
					<div class="flex items-center gap-3">
						<h1 class="text-3xl font-bold text-slate-900">Bon #{voucher.id}</h1>
						<Badge variant={statusVariant(voucher.status)}>{voucher.status}</Badge>
					</div>

					<p class="mt-1 text-slate-500">
						{voucher.patientName ?? `Patient #${voucher.patientId}`} ·
						{voucher.companyName ?? `Compagnie #${voucher.companyId}`}
					</p>
				</div>

				<Button variant="secondary" onclick={() => goto(resolve('/insurance/vouchers'))}>
					Retour
				</Button>
			</div>
		</div>

		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<Card>
				<p class="text-sm text-slate-500">Montant estimé</p>
				<p class="mt-2 text-3xl font-bold">{voucher.estimatedAmount ?? 0}</p>
				<p class="mt-1 text-xs text-slate-400">FCFA</p>
			</Card>

			<Card>
				<p class="text-sm text-slate-500">Statut</p>
				<p class="mt-2 text-2xl font-bold capitalize">{voucher.status}</p>
			</Card>

			<Card>
				<p class="text-sm text-slate-500">Patient</p>
				<p class="mt-2 text-lg font-bold">{voucher.patientName ?? `#${voucher.patientId}`}</p>
			</Card>

			<Card>
				<p class="text-sm text-slate-500">Compagnie</p>
				<p class="mt-2 text-lg font-bold">{voucher.companyName ?? `#${voucher.companyId}`}</p>
			</Card>
		</div>

		<div class="grid gap-6 xl:grid-cols-3">
			<div class="space-y-6 xl:col-span-2">
				<Card title="Informations du bon" subtitle="Détails de la demande de prise en charge">
					<div class="grid gap-4 md:grid-cols-2">
						<div>
							<p class="text-sm text-slate-500">Patient</p>
							<p class="font-semibold">{voucher.patientName ?? `Patient #${voucher.patientId}`}</p>
						</div>

						<div>
							<p class="text-sm text-slate-500">Compagnie</p>
							<p class="font-semibold">
								{voucher.companyName ?? `Compagnie #${voucher.companyId}`}
							</p>
						</div>

						<div>
							<p class="text-sm text-slate-500">Motif</p>
							<p class="font-semibold">{voucher.reason}</p>
						</div>

						<div>
							<p class="text-sm text-slate-500">Montant</p>
							<p class="font-semibold">{voucher.estimatedAmount ?? 0} FCFA</p>
						</div>
					</div>
				</Card>

				<Card title="Workflow" subtitle="Suivi du traitement du bon">
					<div class="grid gap-3 md:grid-cols-5">
						<div class="rounded-lg bg-slate-50 p-4">
							<p class="text-sm text-slate-500">Draft</p>
							<p class="mt-1 text-xs">Création</p>
						</div>

						<div class="rounded-lg bg-blue-50 p-4">
							<p class="text-sm text-blue-700">Submitted</p>
							<p class="mt-1 text-xs text-blue-600">Soumission</p>
						</div>

						<div class="rounded-lg bg-amber-50 p-4">
							<p class="text-sm text-amber-700">Controlled</p>
							<p class="mt-1 text-xs text-amber-600">Contrôle</p>
						</div>

						<div class="rounded-lg bg-green-50 p-4">
							<p class="text-sm text-green-700">Validated</p>
							<p class="mt-1 text-xs text-green-600">Validation</p>
						</div>

						<div class="rounded-lg bg-red-50 p-4">
							<p class="text-sm text-red-700">Rejected</p>
							<p class="mt-1 text-xs text-red-600">Rejet</p>
						</div>
					</div>
				</Card>

				<Card title="Historique" subtitle="Timeline du bon">
					<div class="space-y-4">
						<div class="border-l-2 border-blue-300 pl-4">
							<p class="text-sm font-semibold text-slate-800">Bon créé</p>
							<p class="text-xs text-slate-500">Aujourd’hui · MedCore</p>
						</div>

						<div class="border-l-2 border-amber-300 pl-4">
							<p class="text-sm font-semibold text-slate-800">En attente de traitement</p>
							<p class="text-xs text-slate-500">Workflow assurance</p>
						</div>
					</div>
				</Card>
			</div>

			<div class="space-y-6">
				<Card title="Actions rapides" subtitle="Traitement du bon">
					<div class="space-y-3">
						<Button fullWidth>Soumettre</Button>
						<Button fullWidth variant="secondary">Contrôler</Button>
						<Button fullWidth variant="success">Valider</Button>
						<Button fullWidth variant="danger">Rejeter</Button>
						<Button fullWidth variant="secondary">Télécharger PDF</Button>
					</div>
				</Card>

				<Card title="Documents">
					<p class="text-sm text-slate-500">Aucun document attaché pour le moment.</p>
				</Card>
			</div>
		</div>
	</div>
{/if}
