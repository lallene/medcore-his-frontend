<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { jwtDecode } from 'jwt-decode';
	import {
		createInsuranceSettlement,
		getInsuranceReceivableKPIs,
		listInsuranceDebtorCompanies,
		listInsuranceReceivables
	} from '$lib/api/insurance-receivables';
	import { formatXOF } from '$lib/components/billing/state';
	import {
		insuranceReceivableCan,
		insuranceReceivableStatusLabel
	} from '$lib/components/insurance-receivables/state';
	import type {
		InsuranceCompanyDebt,
		InsuranceReceivable,
		InsuranceReceivableKPIs
	} from '$lib/types/insurance-receivables';
	let rows = $state<InsuranceReceivable[]>([]),
		kpis = $state<InsuranceReceivableKPIs | null>(null),
		companies = $state<InsuranceCompanyDebt[]>([]),
		permissions = $state<string[]>([]),
		error = $state('');
	let search = $state(''),
		status = $state(''),
		companyId = $state(0),
		showSettlement = $state(false);
	let form = $state({
		insuranceCompanyId: 0,
		totalAmount: 0,
		receivedAt: new Date().toISOString().slice(0, 10),
		externalReference: '',
		paymentMethod: 'BANK_TRANSFER',
		bankReference: '',
		comment: '',
		idempotencyKey: ''
	});
	async function load() {
		try {
			const [p, k, c] = await Promise.all([
				listInsuranceReceivables({ search, status, companyId: companyId || undefined, limit: 100 }),
				getInsuranceReceivableKPIs(),
				listInsuranceDebtorCompanies()
			]);
			rows = p.items;
			kpis = k;
			companies = c;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Chargement impossible';
		}
	}
	async function create() {
		form.idempotencyKey =
			form.idempotencyKey || `INS-${form.insuranceCompanyId}-${form.externalReference}`;
		const created = await createInsuranceSettlement(form);
		await goto(resolve(`/insurance-receivables/settlements/${created.id}`));
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
	<header class="flex flex-wrap justify-between gap-3">
		<div>
			<p class="text-xs font-black uppercase text-indigo-700">Recouvrement assurances</p>
			<h1 class="text-3xl font-black">Créances assureurs</h1>
			<p class="text-sm text-slate-500">
				Règlements assureurs réels — strictement séparés de la caisse patient.
			</p>
		</div>
		<div class="space-x-2">
			<a
				href={resolve('/insurance-receivables/settlements')}
				class="rounded-xl border px-4 py-3 font-bold">Règlements</a
			><a
				href={resolve('/insurance-receivables/batches')}
				class="rounded-xl border px-4 py-3 font-bold">Bordereaux</a
			>{#if insuranceReceivableCan(permissions, 'insurance_settlements.create')}<button
					onclick={() => (showSettlement = !showSettlement)}
					class="rounded-xl bg-indigo-700 px-4 py-3 font-bold text-white">Nouveau règlement</button
				>{/if}
		</div>
	</header>
	{#if error}<p class="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>{/if}
	{#if showSettlement}<section class="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-4">
			<select bind:value={form.insuranceCompanyId} class="rounded-xl border p-3"
				><option value={0}>Assureur</option>{#each companies as c (c.insuranceCompanyId)}<option
						value={c.insuranceCompanyId}>{c.companyName}</option
					>{/each}</select
			><input
				type="number"
				bind:value={form.totalAmount}
				placeholder="Montant reçu"
				class="rounded-xl border p-3"
			/><input type="date" bind:value={form.receivedAt} class="rounded-xl border p-3" /><input
				bind:value={form.externalReference}
				placeholder="Référence externe"
				class="rounded-xl border p-3"
			/><select bind:value={form.paymentMethod} class="rounded-xl border p-3"
				><option>BANK_TRANSFER</option><option>CHECK</option><option>OTHER</option></select
			><input
				bind:value={form.bankReference}
				placeholder="Référence bancaire (facultatif)"
				class="rounded-xl border p-3"
			/><input
				bind:value={form.comment}
				placeholder="Commentaire"
				class="rounded-xl border p-3"
			/><button onclick={create} class="rounded-xl bg-slate-900 text-white">Enregistrer</button>
		</section>{/if}
	{#if kpis}<section class="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
			{#each [['À recouvrer', kpis.totalReceivables], ['Réglé', kpis.settledAmount], ['En retard', kpis.overdueAmount], ['Non alloué', kpis.unallocatedAmount], ['Factures en attente', kpis.pendingInvoices], ['Assureurs débiteurs', kpis.debtorCompanies]] as x (x[0])}<div
					class="rounded-2xl border bg-white p-4"
				>
					<small class="font-bold uppercase text-slate-500">{x[0]}</small>
					<p class="mt-2 text-xl font-black">
						{typeof x[1] === 'number' && String(x[0]).includes('Assureurs')
							? x[1]
							: typeof x[1] === 'number' && String(x[0]).includes('Factures')
								? x[1]
								: formatXOF(Number(x[1]))}
					</p>
				</div>{/each}
		</section>{/if}
	<section class="rounded-2xl border bg-white">
		<div class="grid gap-3 border-b p-4 md:grid-cols-4">
			<input
				bind:value={search}
				placeholder="Assureur, patient, facture, PEC"
				class="rounded-xl border p-3"
			/><select bind:value={companyId} class="rounded-xl border p-3"
				><option value={0}>Tous assureurs</option
				>{#each companies as c (c.insuranceCompanyId)}<option value={c.insuranceCompanyId}
						>{c.companyName}</option
					>{/each}</select
			><select bind:value={status} class="rounded-xl border p-3"
				><option value="">Tous statuts</option><option>UNPAID</option><option>PARTIALLY_PAID</option
				><option>OVERDUE</option><option>PAID</option></select
			><button onclick={load} class="rounded-xl bg-slate-900 text-white">Filtrer</button>
		</div>
		<div class="overflow-x-auto">
			<table class="w-full min-w-[1450px] text-left text-sm">
				<thead
					><tr class="bg-slate-50"
						><th class="p-3">Assureur</th><th>Patient</th><th>Facture</th><th>PEC</th><th>Acte</th
						><th>Brut</th><th>Part assurance</th><th>Réglé</th><th>Reste</th><th>Échéance</th><th
							>Statut</th
						><th>Bordereau</th></tr
					></thead
				><tbody
					>{#each rows as r (r.invoiceLineId)}<tr class="border-t"
							><td class="p-3"
								><a
									class="font-bold text-indigo-700"
									href={resolve(`/insurance-receivables/companies/${r.insuranceCompanyId}`)}
									>{r.companyName}</a
								></td
							><td>{r.patientName}<small class="block">{r.patientCode}</small></td><td
								><a
									class="text-blue-700"
									href={resolve(`/insurance-receivables/${r.invoiceLineId}`)}>{r.invoiceNumber}</a
								></td
							><td>{r.authorizationNumber} · {r.coverageResolution}</td><td>{r.description}</td><td
								>{formatXOF(r.grossAmount)}</td
							><td>{formatXOF(r.insuranceDue)}</td><td>{formatXOF(r.insurancePaid)}</td><td
								class="font-black">{formatXOF(r.insuranceBalance)}</td
							><td>{r.dueDate ? new Date(r.dueDate).toLocaleDateString('fr-FR') : '—'}</td><td
								>{insuranceReceivableStatusLabel[r.status]}</td
							><td>{r.batchNumber || '—'}</td></tr
						>{:else}<tr><td colspan="12" class="p-10 text-center">Aucune créance assureur.</td></tr
						>{/each}</tbody
				>
			</table>
		</div>
	</section>
</div>
