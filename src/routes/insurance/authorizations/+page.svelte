<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { jwtDecode } from 'jwt-decode';
	import { Plus, Search, ShieldCheck, X } from 'lucide-svelte';
	import { getPatients, getPatient } from '$lib/api/patients';
	import { listBillableActs } from '$lib/api/billing';
	import {
		cancelInsuranceAuthorization,
		createInsuranceAuthorization,
		decideInsuranceAuthorization,
		getInsuranceAuthorizations,
		getInsuranceCompanies,
		getPatientCoverages,
		getEligibleInsuranceActs,
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
	import type { EligibleInsuranceAct } from '$lib/types/insurance';
	import type { Patient } from '$lib/types/patient';
	import ActSelector from '$lib/components/insurance/ActSelector.svelte';

	type Claims = {
		permissions?: string[];
		email?: string;
		name?: string;
		firstName?: string;
		lastName?: string;
	};
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
		referenceId = $state(0),
		requestedAmount = $state<number | null>(null),
		comment = $state('');
	let createType = $state('CONSULTATION'),
		contextLocked = $state(false);
	let patients = $state<Patient[]>([]),
		patientSearch = $state(''),
		selectedPatient = $state<Patient | null>(null);
	let eligibleActs = $state<EligibleInsuranceAct[]>([]),
		selectedActKeys = $state<string[]>([]);
	let tariffAmounts = $state<Record<string, number>>({}),
		loadingCreate = $state(false);
	const filteredPatients = $derived(
		patients
			.filter((p) =>
				`${p.nom} ${p.prenoms} ${p.codePatient}`.toLowerCase().includes(patientSearch.toLowerCase())
			)
			.slice(0, 12)
	);
	const selectedCoverage = $derived(coverages.find((c) => c.id === coverageId));
	const agentLabel = $derived(
		claims?.name ||
			[claims?.firstName, claims?.lastName].filter(Boolean).join(' ') ||
			claims?.email ||
			'Utilisateur connecté'
	);
	const actKey = (act: Pick<EligibleInsuranceAct, 'referenceType' | 'referenceId'>) =>
		`${act.referenceType}:${act.referenceId}`;
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
			coverages = (await getPatientCoverages(patientId)).filter((c) => {
				const today = new Date().toISOString().slice(0, 10);
				return (
					c.isActive && (!c.validFrom || c.validFrom <= today) && (!c.validTo || c.validTo >= today)
				);
			});
			coverageId = coverages.find((c) => c.isPrincipal)?.id ?? coverages[0]?.id ?? 0;
			await loadEligibleActs();
		} catch {
			coverages = [];
			coverageId = 0;
		}
	}
	async function loadEligibleActs() {
		eligibleActs = [];
		selectedActKeys = [];
		if (!patientId || !coverageId) return;
		loadingCreate = true;
		try {
			const types = ['CONSULTATION', 'LABORATORY', 'IMAGING', 'HOSPITALIZATION', 'MEDICATION'];
			eligibleActs = (
				await Promise.all(
					types.map((type) => getEligibleInsuranceActs({ patientId, coverageId, type }))
				)
			).flat();
			const billable = await listBillableActs(patientId).catch(() => []);
			tariffAmounts = Object.fromEntries(
				billable
					.filter((a) => a.tariff)
					.map((a) => [`${a.actType}:${a.referenceId}`, a.tariff!.unitPrice * a.quantity])
			);
			const contextual = `${createType}:${referenceId}`;
			if (
				referenceId &&
				eligibleActs.some((a) => actKey(a) === contextual && a.authorizationResolution === 'NONE')
			)
				selectedActKeys = [contextual];
			recalculateAmount();
		} finally {
			loadingCreate = false;
		}
	}
	function recalculateAmount() {
		requestedAmount =
			selectedActKeys.reduce((sum, key) => sum + (tariffAmounts[key] || 0), 0) || null;
	}
	async function choosePatient(patient: Patient) {
		selectedPatient = patient;
		patientId = patient.id;
		patientSearch = `${patient.nom} ${patient.prenoms} — ${patient.codePatient}`;
		await loadCoverages();
	}
	async function openCreate() {
		showCreate = true;
		if (!contextLocked && !patients.length) {
			const first = await getPatients(1, 100);
			const remaining = await Promise.all(
				Array.from({ length: Math.max(0, first.meta.totalPages - 1) }, (_, index) =>
					getPatients(index + 2, 100)
				)
			);
			patients = [first, ...remaining].flatMap((result) => result.data);
		}
	}
	function resetCreate() {
		showCreate = false;
		coverageId = 0;
		requestedAmount = null;
		comment = '';
		coverages = [];
		eligibleActs = [];
		selectedActKeys = [];
		selectedPatient = null;
		patientSearch = '';
		contextLocked = false;
	}
	async function create() {
		busy = true;
		error = '';
		try {
			const acts = eligibleActs.filter((act) => selectedActKeys.includes(actKey(act)));
			if (!acts.length) throw new Error('Sélectionnez au moins un acte non couvert.');
			const primary = acts[0];
			selected = await createInsuranceAuthorization({
				patientId,
				patientCoverageId: coverageId,
				referenceType: primary.referenceType,
				referenceId: primary.referenceId,
				service: primary.secondaryLabel,
				requestedAmount,
				comment,
				coveredActs: acts
					.slice(1)
					.map((act) => ({ referenceType: act.referenceType, referenceId: act.referenceId }))
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
		showCreate = Boolean(patientId && referenceId && canCreate);
		contextLocked = showCreate;
		if (showCreate)
			void getPatient(patientId).then((p) => {
				selectedPatient = p;
				patientSearch = `${p.nom} ${p.prenoms} — ${p.codePatient}`;
				return loadCoverages();
			});
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
				onclick={openCreate}
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
				<div class="relative sm:col-span-2">
					<label for="pec-patient" class="font-bold">Patient</label>
					<input
						id="pec-patient"
						bind:value={patientSearch}
						disabled={contextLocked}
						placeholder="Rechercher par nom ou code patient"
						class="mt-1 block h-11 w-full rounded-lg border px-3 disabled:bg-slate-100"
					/>
					{#if !contextLocked && patientSearch && !selectedPatient}<div
							class="absolute z-10 mt-1 max-h-52 w-full overflow-auto rounded-lg border bg-white shadow-xl"
						>
							{#each filteredPatients as patient (patient.id)}<button
									type="button"
									onclick={() => choosePatient(patient)}
									class="block w-full border-b px-3 py-2 text-left hover:bg-violet-50"
									><b>{patient.nom} {patient.prenoms}</b> — {patient.codePatient}{#if patient.age}
										· {patient.age} ans{/if}</button
								>{/each}
						</div>{/if}
				</div>
				<div class="rounded-lg bg-slate-50 p-3">
					<b>Agent demandeur</b>
					<p>{agentLabel}</p>
					<small>Identité vérifiée par le backend</small>
				</div>
				{#if selectedCoverage}<div class="rounded-lg bg-violet-50 p-3">
						<b>Assurance</b>
						<p>{selectedCoverage.companyName}</p>
						<small
							>{selectedCoverage.memberNumber} · taux contractuel {selectedCoverage.coverageRate}%
							(informatif)</small
						>
					</div>{:else if selectedPatient}<div class="rounded-lg bg-amber-50 p-3 text-amber-800">
						<b>Patient non assuré</b>
						<p>Aucune PEC ne peut être créée sans couverture active.</p>
					</div>{/if}
				{#if coverages.length > 1}<label class="sm:col-span-2"
						>Couverture active<select
							bind:value={coverageId}
							onchange={loadEligibleActs}
							class="mt-1 block h-10 w-full rounded-lg border px-3"
							>{#each coverages as c (c.id)}<option value={c.id}
									>{c.companyName} · {c.memberNumber}{c.isPrincipal ? ' · Principale' : ''}</option
								>{/each}</select
						></label
					>{/if}
			</div>
			<section class="rounded-xl border p-3">
				<h3 class="font-black">Actes concernés</h3>
				{#if loadingCreate}<p class="py-4 text-sm text-slate-500">
						Chargement des actes du patient…
					</p>{:else if !coverageId}<p class="py-4 text-sm text-slate-500">
						Sélectionnez un patient assuré.
					</p>{:else}<div class="mt-2 max-h-64 space-y-2 overflow-auto">
						{#each eligibleActs as act (actKey(act))}<label
								class="flex gap-3 rounded-lg border p-3"
								class:opacity-60={act.authorizationResolution !== 'NONE'}
								><input
									type="checkbox"
									value={actKey(act)}
									bind:group={selectedActKeys}
									onchange={recalculateAmount}
									disabled={act.authorizationResolution !== 'NONE'}
								/><span class="min-w-0"
									><b>{act.label}</b><small class="block text-slate-500"
										>{act.referenceType} · {act.secondaryLabel || 'Service dérivé de l’acte'} · {act.date
											? new Date(act.date).toLocaleDateString('fr-FR')
											: '—'}</small
									><small class="block font-bold text-violet-700"
										>{act.authorizationResolution === 'NONE'
											? tariffAmounts[actKey(act)]
												? money(tariffAmounts[actKey(act)])
												: 'Aucune PEC'
											: `${act.authorizationResolution === 'DIRECT' ? 'Déjà couvert' : 'Couvert'} par ${act.existingAuthorizationNumber}`}</small
									></span
								></label
							>{:else}<p class="py-4 text-sm text-slate-500">
								Aucun acte clinique éligible.
							</p>{/each}
					</div>{/if}
			</section>
			<label
				>Montant demandé <span class="text-xs text-slate-500"
					>(prérempli depuis la tarification, modifiable)</span
				><input
					type="number"
					min="0"
					bind:value={requestedAmount}
					class="mt-1 block h-10 w-full rounded-lg border px-3"
				/></label
			>
			<label
				>Commentaire<textarea bind:value={comment} class="block w-full rounded-lg border p-3"
				></textarea></label
			><button
				disabled={busy || !coverageId || selectedActKeys.length === 0}
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
