<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import {
		listInsuranceBatches,
		listInsuranceDebtorCompanies,
		listInsuranceReceivables,
		listInsuranceSettlements
	} from '$lib/api/insurance-receivables';
	import { formatXOF } from '$lib/components/billing/state';
	import { insuranceReceivableStatusLabel } from '$lib/components/insurance-receivables/state';
	import type {
		InsuranceBatch,
		InsuranceCompanyDebt,
		InsuranceReceivable,
		InsuranceSettlement
	} from '$lib/types/insurance-receivables';
	const id = $derived(Number(page.params.id));
	let company = $state<InsuranceCompanyDebt | null>(null),
		rows = $state<InsuranceReceivable[]>([]),
		settlements = $state<InsuranceSettlement[]>([]),
		batches = $state<InsuranceBatch[]>([]);
	onMount(async () => {
		const [c, p, s, b] = await Promise.all([
			listInsuranceDebtorCompanies(),
			listInsuranceReceivables({ companyId: id, limit: 100 }),
			listInsuranceSettlements(id),
			listInsuranceBatches(id)
		]);
		company = c.find((x) => x.insuranceCompanyId === id) ?? null;
		rows = p.items;
		settlements = s;
		batches = b;
	});
</script>

{#if company}<div class="space-y-6 p-6">
		<header>
			<p class="text-xs font-black uppercase text-indigo-700">Vue assureur</p>
			<h1 class="text-3xl font-black">{company.companyName}</h1>
		</header>
		<section class="grid gap-3 md:grid-cols-4">
			{#each [['Facturé', company.billed], ['Réglé', company.paid], ['Reste', company.balance], ['Non alloué', company.unallocated]] as x (x[0])}<div
					class="rounded-2xl border bg-white p-4"
				>
					<small>{x[0]}</small>
					<p class="text-xl font-black">{formatXOF(Number(x[1]))}</p>
				</div>{/each}
		</section>
		<p>{company.invoices} facture(s) · {company.patients} patient(s)</p>
		<section class="rounded-2xl border bg-white p-4">
			<h2 class="font-black">Créances</h2>
			{#each rows as r (r.invoiceLineId)}<a
					href={resolve(`/insurance-receivables/${r.invoiceLineId}`)}
					class="mt-2 grid grid-cols-5 rounded-xl border p-3"
					><span>{r.invoiceNumber}</span><span>{r.patientName}</span><span>{r.description}</span
					><span>{formatXOF(r.insuranceBalance)}</span><span
						>{insuranceReceivableStatusLabel[r.status]}</span
					></a
				>{/each}
		</section>
		<section class="grid gap-4 md:grid-cols-2">
			<div class="rounded-2xl border bg-white p-4">
				<h2 class="font-black">Règlements</h2>
				{#each settlements as s (s.id)}<a
						href={resolve(`/insurance-receivables/settlements/${s.id}`)}
						class="block border-t py-2"
						>{s.settlementNumber} · {formatXOF(s.totalAmount)} · {s.status}</a
					>{/each}
			</div>
			<div class="rounded-2xl border bg-white p-4">
				<h2 class="font-black">Bordereaux</h2>
				{#each batches as b (b.id)}<p class="border-t py-2">
						{b.batchNumber} · {formatXOF(b.totalAmount)} · {b.status}
					</p>{/each}
			</div>
		</section>
	</div>{/if}
