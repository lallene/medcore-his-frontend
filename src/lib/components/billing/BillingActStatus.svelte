<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { jwtDecode } from 'jwt-decode';
	import { getActBillingStatus } from '$lib/api/billing';
	interface Props {
		patientId: number;
		actType: string;
		referenceId: number;
	}
	let { patientId, actType, referenceId }: Props = $props();
	let status = $state<{
		billed: boolean;
		invoiceId?: number;
		invoiceNumber?: string;
		invoiceStatus?: string;
	} | null>(null);
	onMount(async () => {
		const raw = localStorage.getItem('medcore_token');
		if (!raw) return;
		try {
			const permissions = jwtDecode<{ permissions?: string[] }>(raw).permissions ?? [];
			if (!permissions.includes('*') && !permissions.includes('billing.read')) return;
			status = await getActBillingStatus(patientId, actType, referenceId);
		} catch {
			status = null;
		}
	});
</script>

{#if status}
	<div
		class={`rounded-xl border p-3 text-sm font-bold ${status.billed ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-600'}`}
	>
		{#if status.billed}<a href={resolve(`/billing/${status.invoiceId}`)}
				>Facturé · {status.invoiceNumber} · {status.invoiceStatus}</a
			>{:else}Non facturé{/if}
	</div>
{/if}
