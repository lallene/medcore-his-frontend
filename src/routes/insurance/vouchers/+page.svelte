<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';

	import { getVouchers } from '$lib/api/vouchers';
	import DataTable from '$lib/components/table/DataTable.svelte';
	import KpiCard from '$lib/components/dashboard/KpiCard.svelte';
	import type { InsuranceVoucher } from '$lib/types/voucher';
	import type { TableAction, TableColumn, TableRow } from '$lib/types/table';

	interface VoucherRow extends TableRow {
		id: number;
		patientName: string;
		companyName: string;
		status: string;
		reason: string;
		amount: string;
	}

	let vouchers = $state<VoucherRow[]>([]);
	let loading = $state(true);
	let error = $state('');

	const columns: TableColumn[] = [
		{ key: 'id', label: 'N° Bon' },
		{ key: 'patientName', label: 'Patient' },
		{ key: 'companyName', label: 'Compagnie' },
		{ key: 'reason', label: 'Motif' },
		{ key: 'amount', label: 'Montant' },
		{ key: 'status', label: 'Statut' }
	];

	const actions: TableAction[] = [
		{
			label: 'Voir',
			onClick: (row) => {
				const voucher = row as VoucherRow;
				void goto(resolve(`/insurance/vouchers/${voucher.id}`));
			}
		}
	];

	function toRow(voucher: InsuranceVoucher): VoucherRow {
		return {
			id: voucher.id,
			patientName: voucher.patientName ?? `Patient #${voucher.patientId}`,
			companyName: voucher.companyName ?? `Compagnie #${voucher.companyId}`,
			status: voucher.status,
			reason: voucher.reason,
			amount: `${voucher.estimatedAmount ?? 0} FCFA`
		};
	}

	onMount(async () => {
		try {
			const data = await getVouchers();
			vouchers = data.map(toRow);
		} catch {
			error = 'Impossible de charger les bons.';
		} finally {
			loading = false;
		}
	});
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold text-slate-900">Voucher Workspace</h1>
		<p class="text-slate-500">Bons de prise en charge et workflow assurance</p>
	</div>

	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
		<KpiCard title="Bons" value={vouchers.length} icon="file" />
		<KpiCard
			title="En attente"
			value={vouchers.filter((v) => v.status === 'submitted').length}
			icon="file"
		/>
		<KpiCard
			title="Validés"
			value={vouchers.filter((v) => v.status === 'validated').length}
			icon="shield"
		/>
		<KpiCard
			title="Rejetés"
			value={vouchers.filter((v) => v.status === 'rejected').length}
			icon="file"
		/>
	</div>

	{#if error}
		<div class="rounded-lg bg-red-50 p-4 text-red-700">{error}</div>
	{/if}

	<DataTable
		title="Liste des bons"
		description="Demandes de prise en charge enregistrées"
		{columns}
		rows={vouchers}
		{actions}
		{loading}
		emptyMessage="Aucun bon trouvé"
	/>
</div>
