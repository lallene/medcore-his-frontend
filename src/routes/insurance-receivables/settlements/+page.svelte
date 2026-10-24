<script lang="ts">
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import TableState from '$lib/components/ui/TableState.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { listInsuranceSettlements } from '$lib/api/insurance-receivables';
	import { formatXOF } from '$lib/components/billing/state';
	import type { InsuranceSettlement } from '$lib/types/insurance-receivables';
	let rows = $state<InsuranceSettlement[]>([]);
	onMount(async () => (rows = await listInsuranceSettlements()));
</script>

<div class="space-y-5 p-6">
	<header>
		<p class="text-xs font-semibold uppercase text-indigo-700">Journal financier</p>
		<h1 class="text-3xl font-bold">Règlements assureurs</h1>
	</header>
	<Table aria-label="Règlements assureurs">
		<thead>
			<tr>
				<th>Règlement</th>
				<th>Assureur</th>
				<th>Référence</th>
				<th class="mc-num">Montant</th>
				<th class="mc-num">Non alloué</th>
				<th>Statut</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as r (r.id)}
				<tr>
					<td class="mc-id"
						><a href={resolve(`/insurance-receivables/settlements/${r.id}`)}>{r.settlementNumber}</a
						></td
					>
					<td>{r.companyName}</td>
					<td>{r.externalReference}</td>
					<td class="mc-amount">{formatXOF(r.totalAmount)}</td>
					<td class="mc-amount">{formatXOF(r.unallocatedAmount)}</td>
					<td><StatusBadge status={r.status} /></td>
				</tr>
			{:else}
				<TableState state="empty" colspan={6} title="Aucun règlement assureur." />
			{/each}
		</tbody>
	</Table>
</div>
