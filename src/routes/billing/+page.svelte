<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { jwtDecode } from 'jwt-decode';
	import { getPatients } from '$lib/api/patients';
	import {
		createInvoice,
		createTariff,
		getBillingKPIs,
		listBillableActs,
		listInvoices,
		listTariffs
	} from '$lib/api/billing';
	import { can, formatXOF } from '$lib/components/billing/state';
	import type { Patient } from '$lib/types/patient';
	import type { BillableAct, BillingKPIs, Invoice, Tariff } from '$lib/types/billing';

	let tab = $state<'invoices' | 'create' | 'tariffs'>('invoices');
	let loading = $state(true);
	let error = $state('');
	let permissions = $state<string[]>([]);
	let invoices = $state<Invoice[]>([]);
	let tariffs = $state<Tariff[]>([]);
	let patients = $state<Patient[]>([]);
	let acts = $state<BillableAct[]>([]);
	let selectedPatient = $state(0);
	let selected = $state<string[]>([]);
	let kpis = $state<BillingKPIs>({
		pendingInvoices: 0,
		patientReceivable: 0,
		paidInvoices: 0,
		insuranceExpected: 0
	});
	let tariffForm = $state({
		actType: 'CONSULTATION',
		code: '',
		label: '',
		unitPrice: 0,
		effectiveFrom: new Date().toISOString().slice(0, 10),
		isActive: true
	});
	const selectedLines = $derived(
		acts
			.filter((a) => selected.includes(a.billableKey) && a.tariff)
			.map((a) => ({ actType: a.actType, referenceId: a.referenceId, tariffId: a.tariff!.id }))
	);
	async function refresh() {
		loading = true;
		error = '';
		try {
			const [page, ts, ps, metrics] = await Promise.all([
				listInvoices(),
				listTariffs(),
				getPatients(1, 100),
				getBillingKPIs()
			]);
			invoices = page.data;
			tariffs = ts;
			patients = ps.data;
			kpis = metrics;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Chargement impossible';
		} finally {
			loading = false;
		}
	}
	async function loadActs() {
		if (!selectedPatient) {
			acts = [];
			return;
		}
		acts = await listBillableActs(selectedPatient);
		selected = [];
	}
	async function saveInvoice() {
		if (!selectedLines.length) return;
		try {
			const x = await createInvoice(selectedPatient, selectedLines);
			await refresh();
			await goto(resolve(`/billing/${x.id}`));
		} catch (e) {
			error = e instanceof Error ? e.message : 'Création impossible';
		}
	}
	async function saveTariff() {
		try {
			await createTariff({
				...tariffForm,
				actType: tariffForm.actType as Tariff['actType'],
				referenceId: null,
				effectiveTo: null
			});
			tariffForm = { ...tariffForm, code: '', label: '', unitPrice: 0 };
			await refresh();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Tarif invalide';
		}
	}
	onMount(() => {
		const raw = localStorage.getItem('medcore_token');
		if (raw) {
			try {
				permissions = jwtDecode<{ permissions?: string[] }>(raw).permissions ?? [];
			} catch {
				permissions = [];
			}
		}
		void refresh();
	});
</script>

<div class="space-y-6 p-6">
	<header class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<p class="text-xs font-black uppercase tracking-widest text-blue-600">Finance</p>
			<h1 class="text-3xl font-black text-slate-950">Facturation</h1>
			<p class="text-sm text-slate-500">Tarifs, factures par acte et encaissements patient.</p>
		</div>
		<div class="flex gap-2">
			{#if can(permissions, 'billing.create')}<button
					class="rounded-xl bg-blue-700 px-4 py-2 font-bold text-white"
					onclick={() => (tab = 'create')}>Nouvelle facture</button
				>{/if}{#if can(permissions, 'billing.tariff.read')}<button
					class="rounded-xl border px-4 py-2 font-bold"
					onclick={() => (tab = 'tariffs')}>Tarifs</button
				>{/if}
		</div>
	</header>
	{#if error}<p class="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>{/if}
	<div class="grid gap-3 md:grid-cols-4">
		{#each [['Factures en attente', kpis.pendingInvoices], ['Part patient à encaisser', formatXOF(kpis.patientReceivable)], ['Factures payées', kpis.paidInvoices], ['Assurance attendue', formatXOF(kpis.insuranceExpected)]] as metric (metric[0])}<div
				class="rounded-2xl border bg-white p-4 shadow-sm"
			>
				<p class="text-xs font-bold uppercase text-slate-500">{metric[0]}</p>
				<p class="mt-2 text-2xl font-black">{metric[1]}</p>
			</div>{/each}
	</div>
	<nav class="flex gap-2 border-b">
		<button
			class:font-black={tab === 'invoices'}
			class="px-4 py-3"
			onclick={() => (tab = 'invoices')}>Factures</button
		>{#if can(permissions, 'billing.create')}<button
				class:font-black={tab === 'create'}
				class="px-4 py-3"
				onclick={() => (tab = 'create')}>Nouvelle facture</button
			>{/if}{#if can(permissions, 'billing.tariff.read')}<button
				class:font-black={tab === 'tariffs'}
				class="px-4 py-3"
				onclick={() => (tab = 'tariffs')}>Tarifs</button
			>{/if}
	</nav>
	{#if loading}<p>Chargement…</p>{:else if tab === 'invoices'}
		<div class="overflow-x-auto rounded-2xl border bg-white">
			<table class="w-full text-left text-sm">
				<thead class="bg-slate-50 text-xs uppercase text-slate-500"
					><tr
						><th class="p-3">Numéro</th><th>Patient</th><th>Brut</th><th>Assurance</th><th
							>Patient</th
						><th>Payé</th><th>Reste</th><th>Statut</th></tr
					></thead
				><tbody
					>{#each invoices as x (x.id)}<tr class="border-t hover:bg-slate-50"
							><td class="p-3"
								><a class="font-black text-blue-700" href={resolve(`/billing/${x.id}`)}
									>{x.number}</a
								></td
							><td>{x.patientName}</td><td>{formatXOF(x.grossAmount)}</td><td
								>{formatXOF(x.insuranceAmount)}</td
							><td>{formatXOF(x.patientAmount)}</td><td>{formatXOF(x.paidAmount)}</td><td
								>{formatXOF(x.balanceAmount)}</td
							><td>{x.status}</td></tr
						>{:else}<tr
							><td class="p-8 text-center text-slate-500" colspan="8">Aucune facture</td></tr
						>{/each}</tbody
				>
			</table>
		</div>
	{:else if tab === 'create'}
		<section class="space-y-4 rounded-2xl border bg-white p-5">
			<label class="block font-bold"
				>Patient<select
					class="mt-2 w-full rounded-xl border p-3"
					bind:value={selectedPatient}
					onchange={loadActs}
					><option value={0}>Sélectionner</option>{#each patients as p (p.id)}<option value={p.id}
							>{p.codePatient} — {p.prenoms} {p.nom}</option
						>{/each}</select
				></label
			>{#if selectedPatient}<h2 class="font-black">Actes non facturés</h2>
				{#each acts as act (act.billableKey)}<label
						class:opacity-50={act.alreadyBilled || !act.tariff}
						class="flex items-center gap-3 rounded-xl border p-3"
						><input
							type="checkbox"
							value={act.billableKey}
							bind:group={selected}
							disabled={act.alreadyBilled || !act.tariff}
						/><span class="flex-1"
							><strong>{act.label}</strong><small class="block text-slate-500"
								>{act.actType} · {act.quantity} × {act.tariff
									? formatXOF(act.tariff.unitPrice)
									: 'Tarif manquant'} · {act.authorizationNumber || act.coverageResolution}</small
							></span
						><span>{act.alreadyBilled ? 'Déjà facturé' : ''}</span></label
					>{:else}<p class="text-slate-500">Aucun acte disponible.</p>{/each}<button
					class="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white disabled:opacity-40"
					disabled={!selectedLines.length}
					onclick={saveInvoice}>Créer le brouillon</button
				>{/if}
		</section>
	{:else}
		<section class="space-y-4">
			{#if can(permissions, 'billing.tariff.manage')}<div
					class="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-5"
				>
					<select class="rounded-xl border p-2" bind:value={tariffForm.actType}
						>{#each ['CONSULTATION', 'LABORATORY', 'IMAGING', 'HOSPITALIZATION', 'MEDICATION'] as type (type)}<option
								>{type}</option
							>{/each}</select
					><input
						class="rounded-xl border p-2"
						placeholder="Code"
						bind:value={tariffForm.code}
					/><input
						class="rounded-xl border p-2"
						placeholder="Libellé"
						bind:value={tariffForm.label}
					/><input
						class="rounded-xl border p-2"
						type="number"
						min="1"
						placeholder="Prix XOF"
						bind:value={tariffForm.unitPrice}
					/><button class="rounded-xl bg-blue-700 font-bold text-white" onclick={saveTariff}
						>Enregistrer</button
					>
				</div>{/if}
			<div class="rounded-2xl border bg-white">
				{#each tariffs as t (t.id)}<div class="grid grid-cols-4 gap-3 border-b p-3">
						<strong>{t.code}</strong><span>{t.label}</span><span>{t.actType}</span><span
							class="text-right font-black">{formatXOF(t.unitPrice)}</span
						>
					</div>{:else}<p class="p-6 text-center text-slate-500">Aucun tarif actif.</p>{/each}
			</div>
		</section>
	{/if}
</div>
