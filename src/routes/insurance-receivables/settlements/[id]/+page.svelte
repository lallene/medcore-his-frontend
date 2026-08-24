<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { jwtDecode } from 'jwt-decode';
	import {
		allocateInsuranceSettlement,
		getInsuranceSettlement,
		listInsuranceReceivables,
		postInsuranceSettlement
	} from '$lib/api/insurance-receivables';
	import { formatXOF } from '$lib/components/billing/state';
	import { insuranceReceivableCan } from '$lib/components/insurance-receivables/state';
	import type { InsuranceReceivable, InsuranceSettlement } from '$lib/types/insurance-receivables';
	const id = $derived(Number(page.params.id));
	let settlement = $state<InsuranceSettlement | null>(null),
		debts = $state<InsuranceReceivable[]>([]),
		amounts = $state<Record<number, number>>({}),
		error = $state('');
	let permissions = $state<string[]>([]);
	async function load() {
		const loaded = await getInsuranceSettlement(id);
		settlement = loaded;
		debts = (
			await listInsuranceReceivables({ companyId: loaded.insuranceCompanyId, limit: 100 })
		).items.filter((x) => x.insuranceBalance > 0);
	}
	async function allocate(lineId: number) {
		try {
			settlement = await allocateInsuranceSettlement(id, {
				invoiceLineId: lineId,
				amount: amounts[lineId] || 0
			});
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Conflit d’allocation';
		}
	}
	async function post() {
		settlement = await postInsuranceSettlement(id);
		await load();
	}
	onMount(() => {
		const raw = localStorage.getItem('medcore_token');
		if (raw)
			try {
				permissions = jwtDecode<{ permissions?: string[] }>(raw).permissions ?? [];
			} catch {
				permissions = [];
			}
		void load();
	});
</script>

{#if settlement}<div class="space-y-6 p-6">
		<header>
			<p class="text-xs font-black uppercase text-indigo-700">Règlement assureur</p>
			<h1 class="text-3xl font-black">{settlement.settlementNumber}</h1>
			<p>{settlement.companyName} · {settlement.externalReference} · {settlement.status}</p>
		</header>
		{#if error}<p class="bg-red-50 p-3 text-red-700">{error}</p>{/if}
		<section class="grid gap-3 md:grid-cols-3">
			{#each [['Reçu', settlement.totalAmount], ['Alloué', settlement.allocatedAmount], ['Non alloué', settlement.unallocatedAmount]] as x (x[0])}<div
					class="rounded-2xl border bg-white p-4"
				>
					<small>{x[0]}</small>
					<p class="text-xl font-black">{formatXOF(Number(x[1]))}</p>
				</div>{/each}
		</section>
		{#if settlement.status === 'DRAFT' && insuranceReceivableCan(permissions, 'insurance_settlements.allocate')}<section
				class="rounded-2xl border bg-white p-4"
			>
				<h2 class="font-black">Allocation assistée</h2>
				<p class="text-sm text-slate-500">
					Sélection explicite des créances ouvertes de cet assureur.
				</p>
				{#each debts as d (d.invoiceLineId)}<div
						class="mt-2 grid grid-cols-6 items-center gap-2 border-t pt-2"
					>
						<span>{d.invoiceNumber}</span><span>{d.patientName}</span><span>{d.description}</span
						><span>Reste {formatXOF(d.insuranceBalance)}</span><input
							type="number"
							bind:value={amounts[d.invoiceLineId]}
							max={d.insuranceBalance}
							class="rounded-lg border p-2"
						/><button
							onclick={() => allocate(d.invoiceLineId)}
							class="rounded-lg bg-indigo-700 p-2 text-white">Allouer</button
						>
					</div>{/each}<button
					onclick={post}
					class="mt-4 rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white"
					>Comptabiliser le règlement</button
				>
			</section>{/if}
		<section class="rounded-2xl border bg-white p-4">
			<h2 class="font-black">Allocations</h2>
			{#each settlement.allocations as a (a.id)}<p class="border-t py-2">
					Facture #{a.invoiceId} · ligne #{a.invoiceLineId} · {formatXOF(a.amount)}
				</p>{:else}<p>Aucune allocation.</p>{/each}
		</section>
	</div>{/if}
