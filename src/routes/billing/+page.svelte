<script lang="ts">
	import LinkButton from '$lib/components/ui/LinkButton.svelte';
	import TableState from '$lib/components/ui/TableState.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import HelpHint from '$lib/components/help/HelpHint.svelte';
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
		eligibleTariffsOf,
		resolveSelectedTariff,
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
	let tariffChoice = $state<Record<string, number>>({});
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
			.map((a) => ({
				actType: a.actType,
				referenceId: a.referenceId,
				tariffId: resolveSelectedTariff(a, tariffChoice)!.id
			}))
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
			<p class="text-xs font-semibold uppercase tracking-widest text-blue-600">Finance</p>
			<h1 class="text-3xl font-bold text-slate-950">Facturation</h1>
			<p class="text-sm text-slate-500">Tarifs, factures par acte et encaissements patient.</p>
		</div>
		<div class="flex gap-2">
			{#if can(permissions, 'billing.create')}<button
					class="rounded-lg bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-hover transition-colors"
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
				<p class="mt-2 text-2xl font-bold">{metric[1]}</p>
			</div>{/each}
	</div>
	<nav class="flex gap-2 border-b">
		<button
			class:font-bold={tab === 'invoices'}
			class="px-4 py-3"
			onclick={() => (tab = 'invoices')}>Factures</button
		>{#if can(permissions, 'billing.create')}<button
				class:font-bold={tab === 'create'}
				class="px-4 py-3"
				data-testid="billing-tab-create"
				onclick={() => (tab = 'create')}>Nouvelle facture</button
			>{/if}{#if can(permissions, 'billing.tariff.read')}<button
				class:font-bold={tab === 'tariffs'}
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
					class="min-h-control mt-1 w-full rounded-lg border px-3 py-2"
					placeholder="INV-*, code patient, nom…"
					bind:value={searchInput}
					data-testid="billing-invoice-search"
					onkeydown={(e) => {
						if (e.key === 'Enter') void applyInvoiceFilters();
					}}
				/></label
			><label class="text-sm"
				><span class="font-bold">Filtre</span><select
					class="min-h-control mt-1 rounded-lg border px-3 py-2"
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
				class="rounded-lg bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-hover transition-colors"
				data-testid="billing-invoice-filter-apply"
				onclick={() => void applyInvoiceFilters()}>Filtrer</button
			>
		</section>
		<Table containerTestId="billing-invoice-table">
			<thead
				><tr
					><th>Numéro</th><th>Patient</th><th class="mc-num">Brut</th><th class="mc-num"
						>Assurance</th
					><th class="mc-num">Patient</th><th class="mc-num">Payé</th><th class="mc-num">Reste</th
					><th>Statut</th><th class="mc-actions">Action</th></tr
				></thead
			><tbody
				>{#each visibleInvoices as x (x.id)}<tr data-testid={`billing-invoice-row-${x.id}`}
						><td
							><a
								class="mc-id"
								href={resolve(`/billing/${x.id}`)}
								data-testid={`billing-invoice-link-${x.id}`}>{x.number}</a
							></td
						><td>{x.patientCode} — {x.patientName}</td><td class="mc-amount"
							>{formatXOF(x.grossAmount)}</td
						><td class="mc-amount">{formatXOF(x.insuranceAmount)}</td><td class="mc-amount"
							>{formatXOF(x.patientAmount)}</td
						><td class="mc-amount">{formatXOF(x.paidAmount)}</td><td class="mc-amount font-semibold"
							>{formatXOF(x.balanceAmount)}</td
						><td
							><span data-testid={`billing-invoice-status-${x.id}`}>{x.status}</span><small
								class="block text-slate-500"
								>{collectibleStatusLabel(invoiceCollectibleKind(x))}</small
							></td
						><td class="mc-actions"
							>{#if canShowEncaisser(x, permissions)}<LinkButton
									size="sm"
									variant="secondary"
									href={resolve(`/billing/${x.id}`)}
									data-testid={`billing-invoice-encaisser-${x.id}`}>Encaisser</LinkButton
								>{:else}<span class="text-slate-500">—</span>{/if}</td
						></tr
					>{:else}<TableState state="empty" colspan={9} title="Aucune facture" />{/each}</tbody
			>
		</Table>
	{:else if tab === 'create'}
		<section class="space-y-4 rounded-2xl border bg-white p-5" data-testid="billing-create">
			<label class="block font-bold"
				>Patient<select
					class="min-h-control mt-2 w-full rounded-lg border px-3 py-2"
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
			{#if selectedPatient}<h2 class="font-bold">Actes non facturés</h2>
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
								>{formatBillingActType(act.actType)} · {act.quantity} × {resolveSelectedTariff(
									act,
									tariffChoice
								)
									? formatXOF(resolveSelectedTariff(act, tariffChoice)!.unitPrice)
									: 'Tarif manquant'} · {act.authorizationNumber || act.coverageResolution}</small
							></span
						><span>{act.alreadyBilled ? 'Déjà facturé' : !act.tariff ? 'Tarif manquant' : ''}</span
						></label
					>{#if !act.alreadyBilled && eligibleTariffsOf(act).length > 1}<label
							class="ml-8 block text-sm"
							data-testid={`billing-act-tariff-${act.billableKey}`}
							><span class="font-semibold">Tarif applicable</span><select
								class="ml-2 rounded-lg border p-1"
								value={resolveSelectedTariff(act, tariffChoice)?.id}
								onchange={(e) =>
									(tariffChoice = {
										...tariffChoice,
										[act.billableKey]: Number((e.currentTarget as HTMLSelectElement).value)
									})}
								>{#each eligibleTariffsOf(act) as t (t.id)}<option value={t.id}
										>{t.label} — {formatXOF(t.unitPrice)}</option
									>{/each}</select
							></label
						><HelpHint helpKey="billing.invoice.tariff_choice" class="ml-1" />{/if}{:else}<p
						class="text-slate-500"
					>
						Aucun acte disponible.
					</p>{/each}<button
					class="rounded-lg bg-primary px-5 py-3 font-semibold text-white disabled:opacity-40 hover:bg-primary-hover transition-colors"
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
						class="min-h-control rounded-lg border px-3 py-2"
						bind:value={tariffForm.actType}
						data-testid="billing-tariff-act-type"
						>{#each BILLING_ACT_TYPES as type (type)}<option value={type}
								>{formatBillingActType(type)}</option
							>{/each}</select
					><input
						class="min-h-control rounded-lg border px-3 py-2"
						placeholder="Code"
						bind:value={tariffForm.code}
						data-testid="billing-tariff-code"
					/><input
						class="min-h-control rounded-lg border px-3 py-2"
						placeholder="Libellé"
						bind:value={tariffForm.label}
						data-testid="billing-tariff-label"
					/><input
						class="min-h-control rounded-lg border px-3 py-2"
						type="number"
						min="1"
						placeholder="Prix XOF"
						bind:value={tariffForm.unitPrice}
						data-testid="billing-tariff-unit-price"
					/><button
						class="rounded-lg bg-primary font-semibold text-white hover:bg-primary-hover transition-colors"
						data-testid="billing-tariff-save"
						onclick={saveTariff}>Enregistrer</button
					>
				</div>{/if}
			<Table aria-label="Tarifs actifs">
				<thead>
					<tr>
						<th>Code</th>
						<th>Libellé</th>
						<th>Référence</th>
						<th class="mc-num">Prix unitaire</th>
					</tr>
				</thead>
				<tbody>
					{#each tariffs as t (t.id)}
						<tr data-testid={`billing-tariff-row-${t.id}`}>
							<td class="mc-id">{t.code}</td>
							<td>{t.label}</td>
							<td>{tariffReferenceLabel(t)}</td>
							<td class="mc-amount">{formatXOF(t.unitPrice)}</td>
						</tr>
					{:else}
						<TableState state="empty" colspan={4} title="Aucun tarif actif." />
					{/each}
				</tbody>
			</Table>
		</section>
	{/if}
</div>
