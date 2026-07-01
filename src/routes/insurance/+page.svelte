<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { CheckCircle2, Clock3, FileText, Shield, XCircle } from 'lucide-svelte';

	import { getInsuranceCompanies } from '$lib/api/insurance';
	import DataTable from '$lib/components/table/DataTable.svelte';
	import KpiCard from '$lib/components/dashboard/KpiCard.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';

	import type { CompanyRow, InsuranceCompany } from '$lib/types/insurance';
	import type { TableAction, TableColumn } from '$lib/types/table';

	let companies = $state<CompanyRow[]>([]);
	let loading = $state(true);
	let error = $state('');

	const pendingVouchers = 60;
	const validatedVouchers = 70;
	const rejectedVouchers = 20;

	const columns: TableColumn[] = [
		{ key: 'code', label: 'Code' },
		{ key: 'name', label: 'Compagnie' },
		{ key: 'city', label: 'Ville' },
		{ key: 'status', label: 'Statut' }
	];

	const actions: TableAction[] = [
		{
			label: 'Ouvrir',
			onClick: (row) => {
				const company = row as CompanyRow;
				void goto(resolve(`/insurance/companies/${company.id}`));
			}
		}
	];

	function toRow(company: InsuranceCompany): CompanyRow {
		return {
			id: company.id,
			code: company.code,
			name: company.name,
			city: company.city ?? '—',
			status: company.isActive ? 'Active' : 'Inactive'
		};
	}

	onMount(async () => {
		try {
			const data = await getInsuranceCompanies();
			companies = data.map(toRow);
		} catch {
			error = "Impossible de charger l'espace assurance.";
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Assurance | MedCore HIS</title>
</svelte:head>

<div class="space-y-6">
	<section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
		<div class="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
			<div>
				<div class="flex items-center gap-3">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white"
					>
						<Shield size={24} />
					</div>

					<div>
						<h1 class="text-3xl font-bold text-slate-900">Insurance Workspace</h1>
						<p class="text-slate-500">
							Gestion des compagnies, bons de prise en charge et workflow assurance
						</p>
					</div>
				</div>

				<div class="mt-5 flex flex-wrap gap-2">
					<Badge variant="primary">API connectée</Badge>
					<Badge variant="success">Workflow actif</Badge>
					<Badge variant="secondary">PEC Assurance</Badge>
				</div>
			</div>

			<div class="grid gap-3 sm:grid-cols-3">
				<div class="rounded-xl bg-slate-50 p-4">
					<p class="text-xs text-slate-500">Délai moyen</p>
					<p class="mt-1 text-xl font-bold text-slate-900">48h</p>
				</div>

				<div class="rounded-xl bg-slate-50 p-4">
					<p class="text-xs text-slate-500">Taux validation</p>
					<p class="mt-1 text-xl font-bold text-green-600">78%</p>
				</div>

				<div class="rounded-xl bg-slate-50 p-4">
					<p class="text-xs text-slate-500">Priorité</p>
					<p class="mt-1 text-xl font-bold text-amber-600">12</p>
				</div>
			</div>
		</div>
	</section>

	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
		<KpiCard
			title="Compagnies"
			value={companies.length}
			icon="building"
			description="Partenaires actifs"
		/>
		<KpiCard
			title="Bons en attente"
			value={pendingVouchers}
			icon="file"
			description="À contrôler"
		/>
		<KpiCard
			title="Validés"
			value={validatedVouchers}
			icon="shield"
			description="Prises en charge acceptées"
		/>
		<KpiCard title="Rejetés" value={rejectedVouchers} icon="file" description="À reprendre" />
	</div>

	<div class="grid gap-6 xl:grid-cols-3">
		<div class="space-y-6 xl:col-span-2">
			<Card title="Processus assurance" subtitle="Parcours de prise en charge">
				<div class="grid gap-4 md:grid-cols-5">
					<div class="rounded-xl border border-blue-100 bg-blue-50 p-4">
						<FileText class="text-blue-600" size={22} />
						<p class="mt-3 text-sm font-semibold text-slate-900">Création</p>
						<p class="mt-1 text-xs text-slate-500">Bon PEC créé depuis le patient</p>
					</div>

					<div class="rounded-xl border border-slate-100 bg-slate-50 p-4">
						<Clock3 class="text-slate-600" size={22} />
						<p class="mt-3 text-sm font-semibold text-slate-900">Soumission</p>
						<p class="mt-1 text-xs text-slate-500">Transmission à la compagnie</p>
					</div>

					<div class="rounded-xl border border-amber-100 bg-amber-50 p-4">
						<Clock3 class="text-amber-600" size={22} />
						<p class="mt-3 text-sm font-semibold text-slate-900">Contrôle</p>
						<p class="mt-1 text-xs text-slate-500">Vérification des pièces</p>
					</div>

					<div class="rounded-xl border border-green-100 bg-green-50 p-4">
						<CheckCircle2 class="text-green-600" size={22} />
						<p class="mt-3 text-sm font-semibold text-slate-900">Validation</p>
						<p class="mt-1 text-xs text-slate-500">Accord de prise en charge</p>
					</div>

					<div class="rounded-xl border border-red-100 bg-red-50 p-4">
						<XCircle class="text-red-600" size={22} />
						<p class="mt-3 text-sm font-semibold text-slate-900">Rejet</p>
						<p class="mt-1 text-xs text-slate-500">Correction ou refus</p>
					</div>
				</div>
			</Card>

			{#if error}
				<div class="rounded-lg bg-red-50 p-4 text-red-700">{error}</div>
			{/if}

			<DataTable
				title="Compagnies d’assurance"
				description="Organismes partenaires configurés dans MedCore"
				{columns}
				rows={companies}
				{actions}
				{loading}
				emptyMessage="Aucune compagnie trouvée"
			/>
		</div>

		<div class="space-y-6">
			<Card title="Activité assurance" subtitle="Derniers événements">
				<div class="space-y-4">
					<div class="border-l-2 border-blue-300 pl-4">
						<p class="text-sm font-semibold text-slate-800">Bon PEC créé</p>
						<p class="text-xs text-slate-500">Aujourd’hui · Patient Workspace</p>
					</div>

					<div class="border-l-2 border-amber-300 pl-4">
						<p class="text-sm font-semibold text-slate-800">Demande en contrôle</p>
						<p class="text-xs text-slate-500">ATLANTIQUE · 48h estimées</p>
					</div>

					<div class="border-l-2 border-green-300 pl-4">
						<p class="text-sm font-semibold text-slate-800">Prise en charge validée</p>
						<p class="text-xs text-slate-500">Workflow assurance</p>
					</div>
				</div>
			</Card>

			<Card title="Indicateurs clés" subtitle="Pilotage assurance">
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<span class="text-sm text-slate-500">Total bons</span>
						<span class="font-semibold"
							>{pendingVouchers + validatedVouchers + rejectedVouchers}</span
						>
					</div>

					<div class="flex items-center justify-between">
						<span class="text-sm text-slate-500">En attente</span>
						<span class="font-semibold text-amber-600">{pendingVouchers}</span>
					</div>

					<div class="flex items-center justify-between">
						<span class="text-sm text-slate-500">Validés</span>
						<span class="font-semibold text-green-600">{validatedVouchers}</span>
					</div>

					<div class="flex items-center justify-between">
						<span class="text-sm text-slate-500">Rejetés</span>
						<span class="font-semibold text-red-600">{rejectedVouchers}</span>
					</div>
				</div>
			</Card>
		</div>
	</div>
</div>
