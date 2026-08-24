<script lang="ts">
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
		<p class="text-xs font-black uppercase text-indigo-700">Journal financier</p>
		<h1 class="text-3xl font-black">Règlements assureurs</h1>
	</header>
	<section class="rounded-2xl border bg-white">
		{#each rows as r (r.id)}<a
				href={resolve(`/insurance-receivables/settlements/${r.id}`)}
				class="grid grid-cols-6 border-b p-4"
				><b>{r.settlementNumber}</b><span>{r.companyName}</span><span>{r.externalReference}</span
				><span>{formatXOF(r.totalAmount)}</span><span
					>Non alloué {formatXOF(r.unallocatedAmount)}</span
				><span>{r.status}</span></a
			>{:else}<p class="p-8">Aucun règlement assureur.</p>{/each}
	</section>
</div>
