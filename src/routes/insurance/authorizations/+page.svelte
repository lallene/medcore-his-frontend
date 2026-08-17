<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { jwtDecode } from 'jwt-decode';
	import { Plus, Search, ShieldCheck, X } from 'lucide-svelte';
	import {
		cancelInsuranceAuthorization,
		createInsuranceAuthorization,
		decideInsuranceAuthorization,
		getInsuranceAuthorizations,
		getInsuranceCompanies,
		getPatientCoverages,
		markInsuranceAuthorizationPending,
		submitInsuranceAuthorization
	} from '$lib/api/insurance';
	import {
		authorizationActions,
		authorizationStatusLabel,
		hasAuthorizationPermission,
		previewDecision
	} from '$lib/components/insurance/authorization-state';
	import type {
		AuthorizationStatus,
		InsuranceAuthorization,
		InsuranceCompany,
		PatientCoverage
	} from '$lib/types/insurance';
	import ActSelector from '$lib/components/insurance/ActSelector.svelte';

	type Claims = { permissions?: string[] };
	let claims = $state<Claims | null>(null),
		items = $state<InsuranceAuthorization[]>([]),
		total = $state(0);
	let loading = $state(true),
		busy = $state(false),
		error = $state(''),
		selected = $state<InsuranceAuthorization | null>(null);
	let search = $state(''),
		status = $state(''),
		referenceType = $state(''),
		companyId = $state(''),
		currentPage = $state(1);
	let companies = $state<InsuranceCompany[]>([]),
		coverages = $state<PatientCoverage[]>([]),
		showCreate = $state(false);
	let patientId = $state(0),
		coverageId = $state(0),
		createType = $state('CONSULTATION'),
		referenceId = $state(0),
		service = $state(''),
		requestedAmount = $state<number | null>(null),
		comment = $state('');
	let externalReference = $state(''),
		decisionDate = $state(new Date().toISOString().slice(0, 10)),
		decisionStatus = $state<AuthorizationStatus>('APPROVED'),
		approvedRate = $state<number | null>(null),
		approvedAmount = $state<number | null>(null),
		ceilingAmount = $state<number | null>(null),
		rejectionReason = $state('');
	const canCreate = $derived(hasAuthorizationPermission(claims, 'insurance.authorization.create'));
	const canSubmit = $derived(hasAuthorizationPermission(claims, 'insurance.authorization.submit'));
	const canDecide = $derived(hasAuthorizationPermission(claims, 'insurance.authorization.decide'));
	const canCancel = $derived(hasAuthorizationPermission(claims, 'insurance.authorization.cancel'));
	const canLink = $derived(hasAuthorizationPermission(claims, 'insurance.authorization.link_act'));
	const preview = $derived(
		previewDecision(
			selected?.requestedAmount ?? 0,
			decisionStatus,
			approvedRate,
			approvedAmount,
			ceilingAmount
		)
	);
	const metrics = $derived({
		pending: items.filter((i) => ['SUBMITTED', 'PENDING'].includes(i.status)).length,
		approved: items.filter((i) => i.status === 'APPROVED').length,
		partial: items.filter((i) => i.status === 'PARTIALLY_APPROVED').length,
		rejected: items.filter((i) => i.status === 'REJECTED').length,
		today: items.filter((i) => i.requestedAt.slice(0, 10) === new Date().toISOString().slice(0, 10))
			.length
	});
	function money(value: number | null) {
		return value == null ? '—' : new Intl.NumberFormat('fr-FR').format(value) + ' FCFA';
	}
	async function load() {
		loading = true;
		error = '';
		try {
			const result = await getInsuranceAuthorizations({
				search,
				status,
				referenceType,
				companyId: companyId ? Number(companyId) : undefined,
				page: currentPage,
				pageSize: 20
			});
			items = result.items;
			total = result.total;
			companies = await getInsuranceCompanies();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Chargement impossible';
		} finally {
			loading = false;
		}
	}
	async function loadCoverages() {
		if (!patientId) {
			coverages = [];
			return;
		}
		try {
			coverages = await getPatientCoverages(patientId);
			coverageId = coverages.find((c) => c.isPrincipal)?.id ?? coverages[0]?.id ?? 0;
		} catch {
			coverages = [];
			coverageId = 0;
		}
	}
	function resetCreate() {
		showCreate = false;
		coverageId = 0;
		requestedAmount = null;
		comment = '';
		coverages = [];
	}
	async function create() {
		busy = true;
		error = '';
		try {
			selected = await createInsuranceAuthorization({
				patientId,
				patientCoverageId: coverageId,
				referenceType: createType,
				referenceId,
				service,
				requestedAmount,
				comment
			});
			resetCreate();
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Création impossible';
		} finally {
			busy = false;
		}
	}
	async function submit() {
		if (!selected) return;
		busy = true;
		try {
			selected = await submitInsuranceAuthorization(selected.id, { externalReference });
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Envoi impossible';
		} finally {
			busy = false;
		}
	}
	async function markPending() {
		if (!selected) return;
		busy = true;
		try {
			selected = await markInsuranceAuthorizationPending(selected.id);
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Transition impossible';
		} finally {
			busy = false;
		}
	}
	async function decide() {
		if (!selected) return;
		busy = true;
		try {
			selected = await decideInsuranceAuthorization(selected.id, {
				status: decisionStatus,
				externalReference,
				externalDecisionDate: decisionDate,
				approvedRate,
				approvedAmount,
				ceilingAmount,
				rejectionReason
			});
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Décision impossible';
		} finally {
			busy = false;
		}
	}
	async function cancel() {
		if (!selected) return;
		busy = true;
		try {
			selected = await cancelInsuranceAuthorization(selected.id);
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Annulation impossible';
		} finally {
			busy = false;
		}
	}
	async function refreshSelected() {
		if (!selected) return;
		const selectedId = selected.id;
		const refreshed = await getInsuranceAuthorizations({
			patientId: selected.patientId,
			pageSize: 100
		});
		selected = refreshed.items.find((item) => item.id === selectedId) ?? selected;
		await load();
	}
	onMount(() => {
		const token = localStorage.getItem('medcore_token');
		if (token)
			try {
				claims = jwtDecode(token);
			} catch {
				claims = null;
			}
		const q = page.url.searchParams;
		patientId = Number(q.get('patientId') || 0);
		referenceId = Number(q.get('referenceId') || 0);
		createType = q.get('referenceType') || 'CONSULTATION';
		service = q.get('service') || '';
		showCreate = Boolean(patientId && referenceId && canCreate);
		if (showCreate) void loadCoverages();
		void load().then(() => {
			const authorizationId = Number(q.get('authorizationId') || 0);
			if (authorizationId) selected = items.find((item) => item.id === authorizationId) ?? null;
		});
	});
</script>

<svelte:head><title>Autorisations PEC | MedCore HIS</title></svelte:head>
<div class="space-y-6">
	<header class="flex flex-wrap items-center justify-between gap-4">
		<div>
			<p class="text-xs font-black uppercase tracking-widest text-violet-700">Assurance</p>
			<h1 class="text-3xl font-black">Autorisations PEC par acte</h1>
			<p class="text-sm text-slate-500">
				Décisions externes consignées dans MedCore — distinctes des couvertures contractuelles.
			</p>
		</div>
		{#if canCreate}<button
				onclick={() => (showCreate = true)}
				class="rounded-xl bg-violet-700 px-4 py-3 font-bold text-white"
				><Plus class="inline" size={18} /> Nouvelle PEC</button
			>{/if}
	</header>
	{#if error}<p class="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>{/if}
	<section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
		{#each [['En attente', metrics.pending], ['Accordées', metrics.approved], ['Partielles', metrics.partial], ['Refusées', metrics.rejected], ['Aujourd’hui', metrics.today]] as metric (metric[0])}<div
				class="rounded-2xl border bg-white p-4"
			>
				<p class="text-xs font-bold uppercase text-slate-400">{metric[0]}</p>
				<p class="text-2xl font-black">{metric[1]}</p>
			</div>{/each}
	</section>
	<section class="rounded-2xl border bg-white">
		<div class="grid gap-3 border-b p-4 md:grid-cols-6">
			<label class="relative md:col-span-2"
				><Search class="absolute left-3 top-2.5" size={16} /><input
					bind:value={search}
					placeholder="Patient, code, PEC, référence"
					class="h-10 w-full rounded-lg border pl-9"
				/></label
			><select bind:value={status} class="rounded-lg border px-3"
				><option value="">Tous statuts</option
				>{#each Object.entries(authorizationStatusLabel) as [value, label] (value)}<option {value}
						>{label}</option
					>{/each}</select
			><select bind:value={referenceType} class="rounded-lg border px-3"
				><option value="">Tous actes</option
				>{#each ['CONSULTATION', 'LABORATORY', 'IMAGING', 'HOSPITALIZATION', 'MEDICATION'] as type (type)}<option
						value={type}>{type}</option
					>{/each}</select
			><select bind:value={companyId} class="rounded-lg border px-3"
				><option value="">Tous assureurs</option>{#each companies as company (company.id)}<option
						value={company.id}>{company.name}</option
					>{/each}</select
			><button
				onclick={() => {
					currentPage = 1;
					void load();
				}}
				class="rounded-lg border font-bold">Filtrer</button
			>
		</div>
		{#if loading}<p class="p-8 text-center text-sm text-slate-500">Chargement des PEC…</p>{/if}
		<div class="overflow-x-auto">
			<table class="w-full min-w-[1000px] text-left text-sm">
				<thead class="bg-slate-50 text-xs uppercase text-slate-400"
					><tr
						><th class="p-3">PEC</th><th>Patient</th><th>Acte</th><th>Assureur</th><th>Demandé</th
						><th>Décision</th><th>Assurance</th><th>Patient</th><th>Action</th></tr
					></thead
				><tbody
					>{#each items as item (item.id)}<tr class="border-t"
							><td class="p-3 font-black text-violet-800">{item.authorizationNumber}</td><td
								><b>{item.patientName}</b><small class="block">{item.patientCode}</small></td
							><td>{item.referenceLabel}<small class="block">{item.service || '—'}</small></td><td
								>{item.companyName}<small class="block">Contrat {item.contractRate}%</small></td
							><td>{money(item.requestedAmount)}</td><td>{authorizationStatusLabel[item.status]}</td
							><td>{money(item.insuranceAmount)}</td><td>{money(item.patientAmount)}</td><td
								><button onclick={() => (selected = item)} class="font-bold text-violet-700"
									>Ouvrir</button
								></td
							></tr
						>{:else}<tr
							><td colspan="9" class="p-12 text-center"
								><ShieldCheck class="mx-auto text-slate-300" /><b class="mt-2 block">Aucune PEC</b
								></td
							></tr
						>{/each}</tbody
				>
			</table>
		</div>
		<footer class="flex justify-between border-t p-3 text-sm">
			<span>{total} résultat(s)</span>
			<div class="space-x-2">
				<button
					disabled={currentPage <= 1}
					onclick={() => {
						currentPage--;
						void load();
					}}>Précédent</button
				><span>Page {currentPage}</span><button
					disabled={items.length < 20}
					onclick={() => {
						currentPage++;
						void load();
					}}>Suivant</button
				>
			</div>
		</footer>
	</section>
</div>

{#if showCreate}<div class="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
		<form
			onsubmit={(e) => {
				e.preventDefault();
				void create();
			}}
			class="w-full max-w-2xl space-y-4 rounded-2xl bg-white p-6"
		>
			<header class="flex justify-between">
				<div>
					<h2 class="text-xl font-black">Nouvelle demande PEC</h2>
					<p class="text-sm text-slate-500">
						Le taux contractuel reste informatif et ne préremplit aucune décision.
					</p>
				</div>
				<button type="button" onclick={resetCreate}><X /></button>
			</header>
			<div class="grid gap-3 sm:grid-cols-2">
				<label
					>Patient ID<input
						type="number"
						required
						bind:value={patientId}
						onblur={loadCoverages}
						class="block h-10 w-full rounded-lg border px-3"
					/></label
				><label
					>Couverture<select
						required
						bind:value={coverageId}
						class="block h-10 w-full rounded-lg border px-3"
						><option value={0}>Choisir</option>{#each coverages as c (c.id)}<option value={c.id}
								>{c.companyName} · {c.memberNumber} · contrat {c.coverageRate}%</option
							>{/each}</select
					></label
				><label
					>Type d’acte<select
						bind:value={createType}
						class="block h-10 w-full rounded-lg border px-3"
						>{#each ['CONSULTATION', 'LABORATORY', 'IMAGING', 'HOSPITALIZATION', 'MEDICATION'] as type (type)}<option
								>{type}</option
							>{/each}</select
					></label
				><label
					>ID acte<input
						type="number"
						required
						bind:value={referenceId}
						class="block h-10 w-full rounded-lg border px-3"
					/></label
				><label
					>Service<input
						bind:value={service}
						class="block h-10 w-full rounded-lg border px-3"
					/></label
				><label
					>Montant demandé<input
						type="number"
						min="0"
						bind:value={requestedAmount}
						class="block h-10 w-full rounded-lg border px-3"
					/></label
				>
			</div>
			<label
				>Commentaire<textarea bind:value={comment} class="block w-full rounded-lg border p-3"
				></textarea></label
			><button
				disabled={busy || !coverageId}
				class="rounded-lg bg-violet-700 px-4 py-2 font-bold text-white disabled:opacity-40"
				>Créer la demande</button
			>
		</form>
	</div>{/if}

{#if selected}{@const actions = authorizationActions(selected)}
	<div class="fixed inset-0 z-50 flex justify-end bg-slate-950/40">
		<aside class="h-full w-full max-w-2xl overflow-y-auto bg-white p-6">
			<header class="flex justify-between">
				<div>
					<p class="font-black text-violet-700">{selected.authorizationNumber}</p>
					<h2 class="text-2xl font-black">{authorizationStatusLabel[selected.status]}</h2>
				</div>
				<button onclick={() => (selected = null)}><X /></button>
			</header>
			<section class="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
				<p><b>Patient</b><br />{selected.patientName} · {selected.patientCode}</p>
				<p><b>Acte</b><br />{selected.referenceLabel}</p>
				<p><b>Assurance</b><br />{selected.companyName}</p>
				<p><b>Contrat informatif</b><br />{selected.contractRate}%</p>
				<p><b>Demandé</b><br />{money(selected.requestedAmount)}</p>
				<p><b>Référence externe</b><br />{selected.externalReference || '—'}</p>
				<p><b>Part assurance</b><br />{money(selected.insuranceAmount)}</p>
				<p><b>Part patient</b><br />{money(selected.patientAmount)}</p>
			</section>
			<section class="mt-5 rounded-xl border p-4">
				<h3 class="font-black">Actes couverts par cette PEC</h3>
				<p class="mt-1 text-sm text-slate-500">Acte principal : {selected.referenceLabel}</p>
				{#if selected.coveredActs?.length}
					<ul class="mt-3 space-y-2 text-sm">
						{#each selected.coveredActs as act (act.id)}
							<li class="rounded-lg bg-violet-50 p-2 font-bold">
								{act.referenceLabel} · {act.referenceType}
							</li>
						{/each}
					</ul>
				{:else}<p class="mt-3 text-sm">Aucun acte supplémentaire explicitement couvert.</p>{/if}
				{#if selected.status !== 'CANCELLED'}
					<ActSelector
						authorizationId={selected.id}
						authorizationNumber={selected.authorizationNumber}
						patientId={selected.patientId}
						coverageId={selected.patientCoverageId}
						patientName={selected.patientName}
						{canLink}
						onLinked={refreshSelected}
					/>
				{/if}
			</section>
			{#if actions.submittable && canSubmit}<section class="mt-5 rounded-xl border p-4">
					<h3 class="font-black">Envoi au portail assureur</h3>
					<input
						bind:value={externalReference}
						placeholder="Référence externe si disponible"
						class="mt-3 h-10 w-full rounded-lg border px-3"
					/><button
						disabled={busy}
						onclick={submit}
						class="mt-3 rounded-lg bg-blue-700 px-4 py-2 font-bold text-white"
						>Marquer comme envoyée</button
					>
				</section>{/if}
			{#if selected.status === 'SUBMITTED' && canSubmit}
				<button
					disabled={busy}
					onclick={markPending}
					class="mt-5 rounded-lg border px-4 py-2 text-sm font-bold">Marquer en attente</button
				>
			{/if}
			{#if actions.decidable && canDecide}<section class="mt-5 space-y-3 rounded-xl border p-4">
					<h3 class="font-black">Décision saisie depuis le portail assureur</h3>
					<div class="grid gap-3 sm:grid-cols-2">
						<select bind:value={decisionStatus} class="h-10 rounded-lg border px-3"
							><option value="APPROVED">Accordée</option><option value="PARTIALLY_APPROVED"
								>Partielle</option
							><option value="REJECTED">Refusée</option></select
						><input
							required
							bind:value={externalReference}
							placeholder="Référence assureur"
							class="h-10 rounded-lg border px-3"
						/><input
							type="date"
							bind:value={decisionDate}
							class="h-10 rounded-lg border px-3"
						/><input
							type="number"
							min="0"
							max="100"
							bind:value={approvedRate}
							placeholder="Taux accordé"
							class="h-10 rounded-lg border px-3"
						/><input
							type="number"
							min="0"
							bind:value={approvedAmount}
							placeholder="Montant accordé"
							class="h-10 rounded-lg border px-3"
						/><input
							type="number"
							min="0"
							bind:value={ceilingAmount}
							placeholder="Plafond"
							class="h-10 rounded-lg border px-3"
						/>
					</div>
					{#if decisionStatus === 'REJECTED'}<textarea
							bind:value={rejectionReason}
							placeholder="Motif du refus"
							class="w-full rounded-lg border p-3"></textarea>{/if}
					<p class="rounded-lg bg-violet-50 p-3 text-sm">
						<b>Prévisualisation uniquement</b> — Assurance {money(preview.insurance)}, patient {money(
							preview.patient
						)}. Le backend recalcule la décision.
					</p>
					<button
						disabled={busy}
						onclick={decide}
						class="rounded-lg bg-violet-700 px-4 py-2 font-bold text-white"
						>Enregistrer la décision</button
					>
				</section>{/if}{#if actions.cancellable && canCancel}<button
					disabled={busy}
					onclick={cancel}
					class="mt-5 text-sm font-bold text-red-700">Annuler cette demande</button
				>{/if}{#if actions.readonly}<p class="mt-5 rounded-lg bg-slate-100 p-3 text-sm font-bold">
					Décision finale en lecture seule.
				</p>{/if}
		</aside>
	</div>{/if}
