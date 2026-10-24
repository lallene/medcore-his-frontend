<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import TableState from '$lib/components/ui/TableState.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import { onMount } from 'svelte';
	import { jwtDecode } from 'jwt-decode';
	import {
		createInsuranceBatch,
		listInsuranceBatches,
		listInsuranceDebtorCompanies,
		listInsuranceReceivables,
		submitInsuranceBatch
	} from '$lib/api/insurance-receivables';
	import { formatXOF } from '$lib/components/billing/state';
	import { insuranceReceivableCan } from '$lib/components/insurance-receivables/state';
	import type {
		InsuranceBatch,
		InsuranceCompanyDebt,
		InsuranceReceivable
	} from '$lib/types/insurance-receivables';
	let batches = $state<InsuranceBatch[]>([]),
		companies = $state<InsuranceCompanyDebt[]>([]),
		debts = $state<InsuranceReceivable[]>([]),
		companyId = $state(0),
		selected = $state<number[]>([]),
		externalReference = $state(''),
		comment = $state('');
	let permissions = $state<string[]>([]);
	async function load() {
		[batches, companies] = await Promise.all([
			listInsuranceBatches(),
			listInsuranceDebtorCompanies()
		]);
	}
	async function choose() {
		selected = [];
		debts = companyId
			? (await listInsuranceReceivables({ companyId, limit: 100 })).items.filter(
					(x) => !x.batchNumber && x.insuranceBalance > 0
				)
			: [];
	}
	function toggle(id: number) {
		selected = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
	}
	async function create() {
		await createInsuranceBatch({
			insuranceCompanyId: companyId,
			externalReference,
			comment,
			invoiceLineIds: selected
		});
		selected = [];
		await load();
		await choose();
	}
	async function submit(id: number) {
		await submitInsuranceBatch(id);
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

<div class="space-y-6 p-6">
	<header>
		<p class="text-xs font-semibold uppercase text-indigo-700">Soumissions assureurs</p>
		<h1 class="text-3xl font-bold">Bordereaux</h1>
		<p class="text-sm text-slate-500">
			Un bordereau transmet des factures ; il ne constitue jamais un paiement.
		</p>
	</header>
	{#if insuranceReceivableCan(permissions, 'insurance_batches.create')}<section
			class="rounded-2xl border bg-white p-4"
		>
			<div class="grid gap-3 md:grid-cols-4">
				<select
					bind:value={companyId}
					onchange={choose}
					class="min-h-control rounded-lg border px-3 py-2"
					><option value={0}>Assureur</option>{#each companies as c (c.insuranceCompanyId)}<option
							value={c.insuranceCompanyId}>{c.companyName}</option
						>{/each}</select
				><input
					bind:value={externalReference}
					placeholder="Référence externe"
					class="min-h-control rounded-lg border px-3 py-2"
				/><input
					bind:value={comment}
					placeholder="Commentaire"
					class="min-h-control rounded-lg border px-3 py-2"
				/><button
					onclick={create}
					disabled={!selected.length}
					class="rounded-lg bg-primary text-white disabled:opacity-40 hover:bg-primary-hover transition-colors"
					>Créer le bordereau</button
				>
			</div>
			{#each debts as d (d.invoiceLineId)}<label class="mt-2 flex gap-3 border-t pt-2"
					><input
						type="checkbox"
						checked={selected.includes(d.invoiceLineId)}
						onchange={() => toggle(d.invoiceLineId)}
					/><span>{d.invoiceNumber} · {d.patientName} · {d.description}</span><b class="ml-auto"
						>{formatXOF(d.insuranceBalance)}</b
					></label
				>{/each}
		</section>{/if}
	<Table aria-label="Bordereaux assureurs">
		<thead>
			<tr>
				<th>Bordereau</th>
				<th>Assureur</th>
				<th class="mc-num">Lignes</th>
				<th class="mc-num">Montant</th>
				<th>Statut</th>
				<th class="mc-actions">Actions</th>
			</tr>
		</thead>
		<tbody>
			{#each batches as b (b.id)}
				<tr>
					<td class="mc-id">{b.batchNumber}</td>
					<td>{b.companyName}</td>
					<td class="mc-num">{b.invoiceCount} ligne(s)</td>
					<td class="mc-amount">{formatXOF(b.totalAmount)}</td>
					<td><StatusBadge status={b.status} /></td>
					<td class="mc-actions">
						{#if b.status === 'DRAFT' && insuranceReceivableCan(permissions, 'insurance_batches.submit')}<Button
								size="sm"
								variant="secondary"
								onclick={() => submit(b.id)}>Soumettre</Button
							>{/if}
					</td>
				</tr>
			{:else}
				<TableState state="empty" colspan={6} title="Aucun bordereau." />
			{/each}
		</tbody>
	</Table>
</div>
