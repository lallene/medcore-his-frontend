<script lang="ts">
	import { onMount } from 'svelte';
	import { getInsuranceCompanies } from '$lib/api/insurance';
	import DataTable from '$lib/components/table/DataTable.svelte';

	import type { InsuranceCompany } from '$lib/types/insurance';
	import type { TableAction, TableColumn, TableRow } from '$lib/types/table';

	interface CompanyRow extends TableRow {
		id: number;
		code: string;
		name: string;
		isActive: boolean;
		status: string;
	}

	let companies = $state<CompanyRow[]>([]);
	let loading = $state(true);
	let error = $state('');

	const columns: TableColumn[] = [
		{ key: 'code', label: 'Code' },
		{ key: 'name', label: 'Compagnie' },
		{ key: 'status', label: 'Statut' }
	];

	const actions: TableAction[] = [
		{
			label: 'Voir',
			onClick: (row) => {
				console.log(row);
			}
		}
	];

	function toCompanyRow(company: InsuranceCompany): CompanyRow {
		return {
			id: company.id,
			code: company.code,
			name: company.name,
			isActive: company.isActive,
			status: company.isActive ? 'Active' : 'Inactive'
		};
	}

	async function loadCompanies() {
		loading = true;
		error = '';

		try {
			const data = await getInsuranceCompanies();
			companies = data.map(toCompanyRow);
		} catch {
			error = "Impossible de charger les compagnies d'assurance.";
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void loadCompanies();
	});
</script>

<svelte:head>
	<title>Compagnies d'assurance | MedCore HIS</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold text-slate-900">Compagnies d’assurance</h1>
		<p class="text-slate-500">Gestion des partenaires assurance et organismes de prise en charge</p>
	</div>

	{#if error}
		<div class="rounded-lg bg-red-50 p-4 text-red-700">{error}</div>
	{/if}

	<DataTable
		title="Liste des compagnies"
		description="Compagnies configurées dans MedCore"
		{columns}
		rows={companies}
		{actions}
		{loading}
		emptyMessage="Aucune compagnie trouvée"
	/>
</div>
