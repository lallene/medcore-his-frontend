<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';

	import { getInsuranceCompanies } from '$lib/api/insurance';
	import DataTable from '$lib/components/table/DataTable.svelte';
	import KpiCard from '$lib/components/dashboard/KpiCard.svelte';
	import type { CompanyRow, InsuranceCompany } from '$lib/types/insurance';
	import type { TableAction, TableColumn } from '$lib/types/table';

	let companies = $state<CompanyRow[]>([]);
	let loading = $state(true);
	let error = $state('');

	const columns: TableColumn[] = [
		{ key: 'code', label: 'Code' },
		{ key: 'name', label: 'Compagnie' },
		{ key: 'city', label: 'Ville' },
		{ key: 'status', label: 'Statut' }
	];

	const actions: TableAction[] = [
		{
			label: 'Voir',
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
	<div>
		<h1 class="text-3xl font-bold text-slate-900">Insurance Workspace</h1>
		<p class="text-slate-500">Compagnies, prises en charge et workflow assurance</p>
	</div>

	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
		<KpiCard title="Compagnies" value={companies.length} icon="building" />
		<KpiCard title="Bons en attente" value={60} icon="file" />
		<KpiCard title="Validés" value={70} icon="shield" />
		<KpiCard title="Rejetés" value={20} icon="file" />
	</div>

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
