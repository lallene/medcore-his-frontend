<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
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
	import {
		BILLING_ACT_TYPES,
		billableActSelectable,
		can,
		formatBillingActType,
		formatXOF,
		MISSING_TARIFF_MESSAGE,
		tariffReferenceLabel
	} from '$lib/components/billing/state';
	import {
		canShowEncaisser,
		collectibleStatusLabel,
		filterInvoicesForCashier,
		invoiceCollectibleKind
	} from '$lib/components/billing/collection';
	import type { Patient } from '$lib/types/patient';
	import type {
		ActType,
		BillableAct,
		BillingKPIs,
		Invoice,
		InvoiceStatus,
		Tariff
	} from '$lib/types/billing';

	let tab = $state<'invoices' | 'create' | 'tariffs'>('invoices');
	let loading = $state(true);
	let error = $state('');
	let actsError = $state('');
	let permissions = $state<string[]>([]);
	let invoices = $state<Invoice[]>([]);
	let tariffs = $state<Tariff[]>([]);
	let patients = $state<Patient[]>([]);
	let acts = $state<BillableAct[]>([]);
	let selectedPatient = $state(0);
	let selected = $state<string[]>([]);
	let deepLinkActType = $state('');
	let deepLinkReferenceId = $state(0);
	let invoiceSearch = $state('');
	let statusFilter = $state<'all' | 'collectible' | InvoiceStatus>('collectible');
	let searchInput = $state('');
	let kpis = $state<BillingKPIs>({
		pendingInvoices: 0,
		patientReceivable: 0,
		paidInvoices: 0,
		insuranceExpected: 0
	});
	let tariffForm = $state({
		actType: 'CONSULTATION' as ActType,
		code: '',
		label: '',
		unitPrice: 0,
		effectiveFrom: new Date().toISOString().slice(0, 10),
		isActive: true
	});

	const selectedLines = $derived(
		acts
			.filter((a) => selected.includes(a.billableKey) && billableActSelectable(a))
			.map((a) => ({ actType: a.actType, referenceId: a.referenceId, tariffId: a.tariff!.id }))
	);

	const missingTariffActs = $derived(acts.filter((a) => !a.alreadyBilled && !a.tariff));

	const visibleInvoices = $derived(
		filterInvoicesForCashier(invoices, {
			collectibleOnly: statusFilter === 'collectible',
			search: invoiceSearch
		}).filter((x) => {
			if (statusFilter === 'all' || statusFilter === 'collectible') return true;
			return x.status === statusFilter;
		})
	);

	async function refresh() {
		loading = true;
		error = '';
		try {
			const params: Record<string, string | number> = { limit: 100 };
			if (invoiceSearch.trim()) params.search = invoiceSearch.trim();
			if (
				statusFilter !== 'all' &&
				statusFilter !== 'collectible' &&
				statusFilter !== 'PARTIALLY_PAID'
			) {
				params.status = statusFilter;
			}
			if (statusFilter === 'PARTIALLY_PAID') params.status = 'PARTIALLY_PAID';
			const [pageData, ts, ps, metrics] = await Promise.all([
				listInvoices(params),
				listTariffs(),
				getPatients(1, 100),
				getBillingKPIs()
			]);
			invoices = pageData.data;
			tariffs = ts;
			patients = ps.data;
			kpis = metrics;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Chargement impossible';
		} finally {
			loading = false;
		}
	}

	async function applyInvoiceFilters() {
		invoiceSearch = searchInput;
		await refresh();
	}

	async function loadActs(opts?: { preserveSelection?: boolean }) {
		if (!selectedPatient) {
			acts = [];
			selected = [];
			return;
		}
		actsError = '';
		try {
			acts = await listBillableActs(selectedPatient);
			if (!opts?.preserveSelection) {
				selected = [];
			}
			if (deepLinkActType && deepLinkReferenceId > 0) {
				const match = acts.find(
					(a) =>
						a.actType.toUpperCase() === deepLinkActType.toUpperCase() &&
						a.referenceId === deepLinkReferenceId
				);
				if (match && billableActSelectable(match) && !selected.includes(match.billableKey)) {
					selected = [...selected, match.billableKey];
				}
				deepLinkActType = '';
				deepLinkReferenceId = 0;
			}
		} catch (e) {
			acts = [];
			actsError = e instanceof Error ? e.message : 'Impossible de charger les actes facturables.';
		}
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
				actType: tariffForm.actType,
				referenceId: null,
				effectiveTo: null
			});
			tariffForm = { ...tariffForm, code: '', label: '', unitPrice: 0 };
			await refresh();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Tarif invalide';
		}
	}

	async function applyDeepLink() {
		const q = page.url.searchParams;
		const patientId = Number(q.get('patientId') || 0);
		const actType = (q.get('actType') || '').trim().toUpperCase();
		const referenceId = Number(q.get('referenceId') || 0);
		if (patientId > 0 && can(permissions, 'billing.create')) {
			tab = 'create';
			selectedPatient = patientId;
			if (actType === 'PERFORMED_ACT' && referenceId > 0) {
				deepLinkActType = actType;
				deepLinkReferenceId = referenceId;
			}
			await loadActs();
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
		void (async () => {
			await refresh();
			await applyDeepLink();
		})();
	});
</script>

<div class="space-y-6 p-6" data-testid="billing-page">
	<header class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<p class="text-xs font-black uppercase tracking-widest text-blue-600">Finance</p>
			<h1 class="text-3xl font-black text-slate-950">Facturation</h1>
			<p class="text-sm text-slate-500">Tarifs, factures par acte et encaissements patient.</p>
		</div>
		<div class="flex gap-2">
			{#if can(permissions, 'billing.create')}<button
					class="rounded-xl bg-blue-700 px-4 py-2 font-bold text-white"
					data-testid="billing-new-invoice"
					onclick={() => (tab = 'create')}>Nouvelle facture</button
				>{/if}{#if can(permissions, 'billing.tariff.read')}<button
					class="rounded-xl border px-4 py-2 font-bold"
					data-testid="billing-tariffs-tab"
					onclick={() => (tab = 'tariffs')}>Tarifs</button
				>{/if}
		</div>
	</header>
	{#if error}<p class="rounded-xl bg-red-50 p-3 text-red-700" data-testid="billing-error">
			{error}
		</p>{/if}
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
				data-testid="billing-tab-create"
				onclick={() => (tab = 'create')}>Nouvelle facture</button
			>{/if}{#if can(permissions, 'billing.tariff.read')}<button
				class:font-black={tab === 'tariffs'}
				class="px-4 py-3"
				onclick={() => (tab = 'tariffs')}>Tarifs</button
			>{/if}
	</nav>
	{#if loading}<p>Chargement…</p>{:else if tab === 'invoices'}
		<section
			class="flex flex-wrap items-end gap-3 rounded-2xl border bg-white p-4"
			data-testid="billing-invoice-filters"
		>
			<label class="min-w-[14rem] flex-1 text-sm"
				><span class="font-bold">Recherche</span><input
					class="mt-1 w-full rounded-xl border p-2"
					placeholder="INV-*, code patient, nom…"
					bind:value={searchInput}
					data-testid="billing-invoice-search"
					onkeydown={(e) => {
						if (e.key === 'Enter') void applyInvoiceFilters();
					}}
				/></label
			><label class="text-sm"
				><span class="font-bold">Filtre</span><select
					class="mt-1 rounded-xl border p-2"
					bind:value={statusFilter}
					data-testid="billing-invoice-status-filter"
					onchange={() => void refresh()}
					><option value="collectible">À encaisser</option><option value="all">Toutes</option
					><option value="ISSUED">ISSUED</option><option value="PARTIALLY_PAID"
						>PARTIALLY_PAID</option
					><option value="PAID">PAID</option><option value="DRAFT">DRAFT</option><option
						value="CANCELLED">CANCELLED</option
					></select
				></label
			><button
				type="button"
				class="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white"
				data-testid="billing-invoice-filter-apply"
				onclick={() => void applyInvoiceFilters()}>Filtrer</button
			>
		</section>
		<div class="overflow-x-auto rounded-2xl border bg-white" data-testid="billing-invoice-table">
			<table class="w-full text-left text-sm">
				<thead class="bg-slate-50 text-xs uppercase text-slate-500"
					><tr
						><th class="p-3">Numéro</th><th>Patient</th><th>Brut</th><th>Assurance</th><th
							>Patient</th
						><th>Payé</th><th>Reste</th><th>Statut</th><th class="p-3">Action</th></tr
					></thead
				><tbody
					>{#each visibleInvoices as x (x.id)}<tr
							class="border-t hover:bg-slate-50"
							data-testid={`billing-invoice-row-${x.id}`}
							><td class="p-3"
								><a
									class="font-black text-blue-700"
									href={resolve(`/billing/${x.id}`)}
									data-testid={`billing-invoice-link-${x.id}`}>{x.number}</a
								></td
							><td>{x.patientCode} — {x.patientName}</td><td>{formatXOF(x.grossAmount)}</td><td
								>{formatXOF(x.insuranceAmount)}</td
							><td>{formatXOF(x.patientAmount)}</td><td>{formatXOF(x.paidAmount)}</td><td
								class="font-bold">{formatXOF(x.balanceAmount)}</td
							><td
								><span data-testid={`billing-invoice-status-${x.id}`}>{x.status}</span><small
									class="block text-slate-500"
									>{collectibleStatusLabel(invoiceCollectibleKind(x))}</small
								></td
							><td class="p-3"
								>{#if canShowEncaisser(x, permissions)}<a
										class="font-bold text-emerald-700"
										href={resolve(`/billing/${x.id}`)}
										data-testid={`billing-invoice-encaisser-${x.id}`}>Encaisser</a
									>{:else}<span class="text-slate-400">—</span>{/if}</td
							></tr
						>{:else}<tr
							><td class="p-8 text-center text-slate-500" colspan="9">Aucune facture</td></tr
						>{/each}</tbody
				>
			</table>
		</div>
	{:else if tab === 'create'}
		<section class="space-y-4 rounded-2xl border bg-white p-5" data-testid="billing-create">
			<label class="block font-bold"
				>Patient<select
					class="mt-2 w-full rounded-xl border p-3"
					bind:value={selectedPatient}
					data-testid="billing-patient-select"
					onchange={() => void loadActs()}
					><option value={0}>Sélectionner</option>{#each patients as p (p.id)}<option value={p.id}
							>{p.codePatient} — {p.prenoms} {p.nom}</option
						>{/each}</select
				></label
			>
			{#if actsError}
				<p class="rounded-xl bg-red-50 p-3 text-red-700" data-testid="billing-acts-error">
					{actsError}
				</p>
			{/if}
			{#if selectedPatient}<h2 class="font-black">Actes non facturés</h2>
				{#if missingTariffActs.length > 0}
					<p
						class="rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-900"
						data-testid="billing-missing-tariff"
					>
						{MISSING_TARIFF_MESSAGE}
					</p>
				{/if}
				{#each acts as act (act.billableKey)}<label
						class:opacity-50={!billableActSelectable(act)}
						class="flex items-center gap-3 rounded-xl border p-3"
						data-testid={`billing-act-${act.billableKey}`}
						data-act-type={act.actType}
						data-reference-id={act.referenceId}
						><input
							type="checkbox"
							value={act.billableKey}
							bind:group={selected}
							disabled={!billableActSelectable(act)}
							data-testid={`billing-act-check-${act.billableKey}`}
						/><span class="flex-1"
							><strong>{act.label}</strong><small class="block text-slate-500"
								>{formatBillingActType(act.actType)} · {act.quantity} × {act.tariff
									? formatXOF(act.tariff.unitPrice)
									: 'Tarif manquant'} · {act.authorizationNumber || act.coverageResolution}</small
							></span
						><span>{act.alreadyBilled ? 'Déjà facturé' : !act.tariff ? 'Tarif manquant' : ''}</span
						></label
					>{:else}<p class="text-slate-500">Aucun acte disponible.</p>{/each}<button
					class="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white disabled:opacity-40"
					disabled={!selectedLines.length}
					data-testid="billing-create-draft"
					onclick={saveInvoice}>Créer le brouillon</button
				>{/if}
		</section>
	{:else}
		<section class="space-y-4" data-testid="billing-tariffs">
			{#if can(permissions, 'billing.tariff.manage')}<div
					class="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-5"
				>
					<select
						class="rounded-xl border p-2"
						bind:value={tariffForm.actType}
						data-testid="billing-tariff-act-type"
						>{#each BILLING_ACT_TYPES as type (type)}<option value={type}
								>{formatBillingActType(type)}</option
							>{/each}</select
					><input
						class="rounded-xl border p-2"
						placeholder="Code"
						bind:value={tariffForm.code}
						data-testid="billing-tariff-code"
					/><input
						class="rounded-xl border p-2"
						placeholder="Libellé"
						bind:value={tariffForm.label}
						data-testid="billing-tariff-label"
					/><input
						class="rounded-xl border p-2"
						type="number"
						min="1"
						placeholder="Prix XOF"
						bind:value={tariffForm.unitPrice}
						data-testid="billing-tariff-unit-price"
					/><button
						class="rounded-xl bg-blue-700 font-bold text-white"
						data-testid="billing-tariff-save"
						onclick={saveTariff}>Enregistrer</button
					>
				</div>{/if}
			<div class="rounded-2xl border bg-white">
				{#each tariffs as t (t.id)}<div
						class="grid grid-cols-4 gap-3 border-b p-3"
						data-testid={`billing-tariff-row-${t.id}`}
					>
						<strong>{t.code}</strong><span>{t.label}</span><span>{tariffReferenceLabel(t)}</span
						><span class="text-right font-black">{formatXOF(t.unitPrice)}</span>
					</div>{:else}<p class="p-6 text-center text-slate-500">Aucun tarif actif.</p>{/each}
			</div>
		</section>
	{/if}
</div>
