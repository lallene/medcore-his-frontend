<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { listLaboratoryOrders } from '$lib/api/laboratory';
	import { laboratoryStatusLabel } from '$lib/components/laboratory/state';
	import type { LaboratoryListItem } from '$lib/types/laboratory';
	let { consultationId }: { consultationId: number } = $props();
	let orders = $state<LaboratoryListItem[]>([]);
	onMount(async () => {
		orders = (await listLaboratoryOrders({ consultationId, limit: 100 })).data;
	});
</script>

{#if orders.length}
	<section class="rounded-2xl border border-violet-200 bg-violet-50/40 p-5">
		<h3 class="font-black text-slate-900">Suivi laboratoire</h3>
		<div class="mt-3 space-y-2">
			{#each orders as order (order.id)}
				<button
					type="button"
					onclick={() => goto(resolve(`/laboratory/${order.id}`))}
					class="flex w-full items-center justify-between rounded-xl border bg-white p-3 text-left"
				>
					<span
						><b>{order.examName}</b><small class="ml-2 text-slate-500">{order.requestNumber}</small
						></span
					>
					<span class="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700"
						>{laboratoryStatusLabel(order.status)}</span
					>
				</button>
			{/each}
		</div>
	</section>
{/if}
