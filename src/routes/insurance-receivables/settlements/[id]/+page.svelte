<script lang="ts">
	import TableState from '$lib/components/ui/TableState.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Table from '$lib/components/ui/Table.svelte';
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
			<p class="text-xs font-semibold uppercase text-indigo-700">Règlement assureur</p>
			<h1 class="text-3xl font-bold">{settlement.settlementNumber}</h1>
			<p>{settlement.companyName} · {settlement.externalReference} · {settlement.status}</p>
		</header>
		{#if error}<p class="bg-red-50 p-3 text-red-700">{error}</p>{/if}
		<section class="grid gap-3 md:grid-cols-3">
			{#each [['Reçu', settlement.totalAmount], ['Alloué', settlement.allocatedAmount], ['Non alloué', settlement.unallocatedAmount]] as x (x[0])}<div
					class="rounded-2xl border bg-white p-4"
				>
					<small>{x[0]}</small>
					<p class="text-xl font-bold">{formatXOF(Number(x[1]))}</p>
				</div>{/each}
		</section>
		{#if settlement.status === 'DRAFT' && insuranceReceivableCan(permissions, 'insurance_settlements.allocate')}<section
				class="rounded-2xl border bg-white p-4"
			>
				<h2 class="font-bold">Allocation assistée</h2>
				<p class="text-sm text-slate-500">
					Sélection explicite des créances ouvertes de cet assureur.
				</p>
				<Table class="mt-3" aria-label="Créances ouvertes de l’assureur">
					<thead>
						<tr>
							<th>Facture</th>
							<th>Patient</th>
							<th>Acte</th>
							<th class="mc-num">Reste</th>
							<th class="mc-num">Montant à allouer</th>
							<th class="mc-actions">Action</th>
						</tr>
					</thead>
					<tbody>
						{#each debts as d (d.invoiceLineId)}
							<tr>
								<td class="mc-id">{d.invoiceNumber}</td>
								<td>{d.patientName}</td>
								<td>{d.description}</td>
								<td class="mc-amount">{formatXOF(d.insuranceBalance)}</td>
								<td class="mc-num"
									><input
										type="number"
										bind:value={amounts[d.invoiceLineId]}
										max={d.insuranceBalance}
										aria-label={`Montant à allouer pour ${d.invoiceNumber}`}
										class="min-h-control-sm w-32 rounded-md border border-input px-2 text-right text-sm tabular-nums"
									/></td
								>
								<td class="mc-actions"
									><Button size="sm" variant="secondary" onclick={() => allocate(d.invoiceLineId)}
										>Allouer</Button
									></td
								>
							</tr>
						{/each}
					</tbody>
				</Table><Button class="mt-4" variant="success" onclick={post}
					>Comptabiliser le règlement</Button
				>
			</section>{/if}
		<section class="space-y-2">
			<h2 class="text-base font-semibold text-foreground">Allocations</h2>
			<Table aria-label="Allocations">
				<thead>
					<tr>
						<th>Facture</th>
						<th>Ligne</th>
						<th class="mc-num">Montant</th>
					</tr>
				</thead>
				<tbody>
					{#each settlement.allocations as a (a.id)}
						<tr>
							<td class="mc-id">Facture #{a.invoiceId}</td>
							<td>ligne #{a.invoiceLineId}</td>
							<td class="mc-amount">{formatXOF(a.amount)}</td>
						</tr>
					{:else}
						<TableState state="empty" colspan={3} title="Aucune allocation." />
					{/each}
				</tbody>
			</Table>
		</section>
	</div>{/if}
