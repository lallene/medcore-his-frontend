<script lang="ts">
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import TableState from '$lib/components/ui/TableState.svelte';
	import Table from '$lib/components/ui/Table.svelte';
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
			<p class="text-xs font-semibold uppercase text-indigo-700">Vue assureur</p>
			<h1 class="text-3xl font-bold">{company.companyName}</h1>
		</header>
		<section class="grid gap-3 md:grid-cols-4">
			{#each [['Facturé', company.billed], ['Réglé', company.paid], ['Reste', company.balance], ['Non alloué', company.unallocated]] as x (x[0])}<div
					class="rounded-2xl border bg-white p-4"
				>
					<small>{x[0]}</small>
					<p class="text-xl font-bold">{formatXOF(Number(x[1]))}</p>
				</div>{/each}
		</section>
		<p>{company.invoices} facture(s) · {company.patients} patient(s)</p>
		<section class="space-y-2">
			<h2 class="text-base font-semibold text-foreground">Créances</h2>
			<Table aria-label="Créances de l’assureur">
				<thead>
					<tr>
						<th>Facture</th>
						<th>Patient</th>
						<th>Acte</th>
						<th class="mc-num">Reste assurance</th>
						<th>Statut</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as r (r.invoiceLineId)}
						<tr>
							<td class="mc-id"
								><a href={resolve(`/insurance-receivables/${r.invoiceLineId}`)}>{r.invoiceNumber}</a
								></td
							>
							<td>{r.patientName}</td>
							<td>{r.description}</td>
							<td class="mc-amount">{formatXOF(r.insuranceBalance)}</td>
							<td
								><StatusBadge
									status={r.status}
									label={insuranceReceivableStatusLabel[r.status]}
								/></td
							>
						</tr>
					{:else}
						<TableState state="empty" colspan={5} title="Aucune créance." />
					{/each}
				</tbody>
			</Table>
		</section>
		<section class="grid gap-4 md:grid-cols-2">
			<div class="space-y-2">
				<h2 class="text-base font-semibold text-foreground">Règlements</h2>
				<Table aria-label="Règlements">
					<thead>
						<tr>
							<th>Règlement</th>
							<th class="mc-num">Montant</th>
							<th>Statut</th>
						</tr>
					</thead>
					<tbody>
						{#each settlements as s (s.id)}
							<tr>
								<td class="mc-id"
									><a href={resolve(`/insurance-receivables/settlements/${s.id}`)}
										>{s.settlementNumber}</a
									></td
								>
								<td class="mc-amount">{formatXOF(s.totalAmount)}</td>
								<td><StatusBadge status={s.status} /></td>
							</tr>
						{:else}
							<TableState state="empty" colspan={3} title="Aucun règlement." />
						{/each}
					</tbody>
				</Table>
			</div>
			<div class="space-y-2">
				<h2 class="text-base font-semibold text-foreground">Bordereaux</h2>
				<Table aria-label="Bordereaux">
					<thead>
						<tr>
							<th>Bordereau</th>
							<th class="mc-num">Montant</th>
							<th>Statut</th>
						</tr>
					</thead>
					<tbody>
						{#each batches as b (b.id)}
							<tr>
								<td class="mc-id">{b.batchNumber}</td>
								<td class="mc-amount">{formatXOF(b.totalAmount)}</td>
								<td><StatusBadge status={b.status} /></td>
							</tr>
						{:else}
							<TableState state="empty" colspan={3} title="Aucun bordereau." />
						{/each}
					</tbody>
				</Table>
			</div>
		</section>
	</div>{/if}
