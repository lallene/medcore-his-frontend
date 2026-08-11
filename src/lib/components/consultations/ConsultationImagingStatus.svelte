<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { listImagingOrders } from '$lib/api/imaging';
	import { imagingStatusLabel } from '$lib/components/imaging/state';
	import type { ImagingListItem } from '$lib/types/imaging';
	let { consultationId }: { consultationId: number } = $props();
	let orders = $state<ImagingListItem[]>([]);
	onMount(async () => {
		orders = (await listImagingOrders({ consultationId, limit: 100 })).data;
	});
</script>

{#if orders.length}<section class="rounded-2xl border border-cyan-200 bg-cyan-50/40 p-5">
		<h3 class="font-black text-slate-900">Suivi imagerie</h3>
		<div class="mt-3 space-y-2">
			{#each orders as order (order.id)}<button
					type="button"
					onclick={() => goto(resolve(`/imaging/${order.id}`))}
					class="flex w-full items-center justify-between rounded-xl border bg-white p-3 text-left"
					><span
						><b>{order.examName}</b><small class="ml-2 text-slate-500">{order.orderNumber}</small
						></span
					><span class="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700"
						>{imagingStatusLabel(order.status)}</span
					></button
				>{/each}
		</div>
	</section>{/if}
