<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { jwtDecode } from 'jwt-decode';
	import {
		cashPayment,
		closeSession,
		createRegister,
		currentSession,
		listRegisters,
		listSessions,
		openSession,
		sessionJournal
	} from '$lib/api/cash';
	import { listInvoices } from '$lib/api/billing';
	import { formatXOF } from '$lib/components/billing/state';
	import {
		canCloseOwnSession,
		canCollectOnSession,
		canRecoverCloseSession,
		cashCan,
		classifyCashCommandError,
		closeNoteRequired,
		draftCloseGap,
		methods,
		needsOperator,
		needsReference,
		presentSessionSummary
	} from '$lib/components/cash/state';
	import {
		beginSessionCommand,
		completeSessionCommandError,
		completeSessionCommandSuccess,
		createSessionCommandState,
		isSessionSubmitDisabled
	} from '$lib/components/cash/session-command';
	import {
		beginPaymentCommand,
		completePaymentCommandError,
		completePaymentCommandSuccess,
		createPaymentCommandState,
		isPaymentSubmitDisabled
	} from '$lib/components/billing/payment-command';
	import type {
		CashReceipt,
		CashRegister,
		CashMethod,
		CashSession,
		SessionSummary
	} from '$lib/types/cash';
	import type { Invoice } from '$lib/types/billing';
	let session = $state<SessionSummary | null>(null),
		registers = $state<CashRegister[]>([]),
		journal = $state<CashReceipt[]>([]),
		invoices = $state<Invoice[]>([]),
		error = $state(''),
		summaryLoading = $state(true),
		summaryError = $state(''),
		search = $state(''),
		permissions = $state<string[]>([]),
		userId = $state<number | null>(null),
		openSessions = $state<CashSession[]>([]),
		recoveryTarget = $state<CashSession | null>(null),
		closeResult = $state<SessionSummary | null>(null);
	let opening = $state({ cashRegisterId: 0, openingFloat: 0, note: '' });
	let registerForm = $state({ code: '', name: '', location: '', active: true });
	let selected = $state<Invoice | null>(null);
	let payment = $state({
		amount: 0,
		paymentMethod: 'CASH' as CashMethod,
		externalReference: '',
		mobileOperator: ''
	});
	let paymentCmd = $state(createPaymentCommandState());
	let openCmd = $state(createSessionCommandState('cash-open'));
	let closeCmd = $state(createSessionCommandState('cash-close'));
	let closing = $state({ countedCashAmount: 0, note: '' });
	const kpis = $derived(presentSessionSummary(session));
	const filtered = $derived(
		invoices.filter(
			(x) =>
				!search ||
				`${x.number} ${x.patientCode} ${x.patientName}`.toLowerCase().includes(search.toLowerCase())
		)
	);
	const ownSession = $derived(
		session ? canCollectOnSession(session.session, userId, permissions) : false
	);
	const canCloseOwn = $derived(
		session ? canCloseOwnSession(session.session, userId, permissions) : false
	);
	const showRecovery = $derived(!session && canRecoverCloseSession(permissions));

	async function refresh() {
		summaryLoading = true;
		summaryError = '';
		try {
			[registers, session] = await Promise.all([listRegisters(), currentSession()]);
			closeResult = null;
			if (session) {
				[journal, invoices] = await Promise.all([
					sessionJournal(session.session.id),
					listInvoices({ limit: 100 }).then((x) =>
						x.data.filter((i) => ['ISSUED', 'PARTIALLY_PAID'].includes(i.status))
					)
				]);
				closing.countedCashAmount = session.expectedCash;
				closing.note = '';
				closeCmd = createSessionCommandState('cash-close');
				const invoiceId = Number(page.url.searchParams.get('invoiceId') || 0);
				if (invoiceId) selected = invoices.find((invoice) => invoice.id === invoiceId) ?? null;
			} else if (canRecoverCloseSession(permissions)) {
				openSessions = (await listSessions()).filter((x) => x.status === 'OPEN');
			} else {
				openSessions = [];
			}
		} catch (e) {
			session = null;
			journal = [];
			summaryError = e instanceof Error ? e.message : 'Résumé de caisse indisponible';
		} finally {
			summaryLoading = false;
		}
	}
	async function open() {
		if (isSessionSubmitDisabled(openCmd)) return;
		openCmd = beginSessionCommand(openCmd);
		const key = openCmd.idempotencyKey;
		error = '';
		try {
			session = await openSession({ ...opening, idempotencyKey: key });
			openCmd = completeSessionCommandSuccess('cash-open');
			await refresh();
		} catch (e) {
			const classified = classifyCashCommandError(e);
			error = classified.message;
			if (classified.preserveKey) {
				openCmd = completeSessionCommandError(openCmd);
			} else {
				openCmd = createSessionCommandState('cash-open');
			}
		}
	}
	async function addRegister() {
		try {
			await createRegister(registerForm);
			registerForm = { code: '', name: '', location: '', active: true };
			await refresh();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Création impossible';
		}
	}
	async function collect() {
		if (!session || !selected || !ownSession || isPaymentSubmitDisabled(paymentCmd)) return;
		paymentCmd = beginPaymentCommand(paymentCmd);
		const key = paymentCmd.idempotencyKey;
		error = '';
		try {
			const r = await cashPayment(session.session.id, {
				invoiceId: selected.id,
				...payment,
				idempotencyKey: key
			});
			paymentCmd = completePaymentCommandSuccess();
			await refresh();
			selected = null;
			await goto(resolve(`/cash/receipts/${r.id}`));
		} catch (e) {
			paymentCmd = completePaymentCommandError(paymentCmd);
			error = e instanceof Error ? e.message : 'Paiement impossible';
		}
	}
	async function finish(targetId?: number, recovery = false) {
		const id = targetId ?? session?.session.id;
		if (!id || isSessionSubmitDisabled(closeCmd)) return;
		const sess = recovery && recoveryTarget ? recoveryTarget : session?.session;
		const expectedCash = recovery ? (sess?.openingFloat ?? 0) : (session?.expectedCash ?? 0);
		if (
			closeNoteRequired(sess ?? null, userId, closing.countedCashAmount, expectedCash) &&
			!closing.note.trim()
		) {
			error = recovery
				? 'Justification obligatoire pour la clôture de récupération'
				: "Justification obligatoire en cas d'écart";
			return;
		}
		closeCmd = beginSessionCommand(closeCmd);
		const key = closeCmd.idempotencyKey;
		error = '';
		try {
			const result = await closeSession(id, { ...closing, idempotencyKey: key });
			closeCmd = completeSessionCommandSuccess('cash-close');
			recoveryTarget = null;
			// refresh() clears transient closeResult; restore authoritative backend snapshot after.
			await refresh();
			closeResult = result;
		} catch (e) {
			const classified = classifyCashCommandError(e);
			error = classified.message;
			if (classified.preserveKey) {
				closeCmd = completeSessionCommandError(closeCmd);
			} else {
				closeCmd = createSessionCommandState('cash-close');
			}
		}
	}
	function startRecovery(s: CashSession) {
		recoveryTarget = s;
		closing = { countedCashAmount: s.openingFloat, note: '' };
		closeCmd = createSessionCommandState('cash-close');
		error = '';
	}
	onMount(() => {
		const raw = localStorage.getItem('medcore_token');
		if (raw)
			try {
				const claims = jwtDecode<{ permissions?: string[]; userId?: number }>(raw);
				permissions = claims.permissions ?? [];
				userId = typeof claims.userId === 'number' ? claims.userId : null;
			} catch {
				permissions = [];
				userId = null;
			}
		void refresh();
	});
</script>

<div class="space-y-5 p-6" data-testid="cash-workspace">
	<header>
		<p class="text-xs font-black uppercase text-emerald-700">Finance</p>
		<h1 class="text-3xl font-black">Caisse</h1>
	</header>
	{#if error}<p class="rounded-xl bg-red-50 p-3 text-red-700" data-testid="cash-error" role="alert">
			{error}
		</p>{/if}
	{#if summaryLoading}<p class="text-sm text-slate-500" data-testid="cash-summary-loading">
			Chargement du résumé…
		</p>{/if}
	{#if summaryError}<p
			class="rounded-xl bg-red-50 p-3 text-red-700"
			data-testid="cash-summary-error"
			role="alert"
		>
			{summaryError}
		</p>{/if}
	{#if closeResult}<section
			class="rounded-2xl border border-emerald-300 bg-emerald-50 p-4"
			data-testid="cash-close-result"
		>
			<h2 class="font-black text-emerald-900">Session clôturée</h2>
			<p>
				Théorique <b data-testid="cash-close-expected"
					>{formatXOF(closeResult.session.expectedCashAmount ?? closeResult.expectedCash)}</b
				>
				· Compté
				<b data-testid="cash-close-counted"
					>{formatXOF(closeResult.session.countedCashAmount ?? 0)}</b
				>
				· Écart
				<b data-testid="cash-close-difference"
					>{formatXOF(closeResult.session.cashDifference ?? 0)}</b
				>
			</p>
		</section>{/if}
	{#if session}
		<section class="rounded-2xl border bg-white p-5">
			<div class="flex justify-between">
				<div>
					<h2 class="font-black">
						{session.session.register.code} — {session.session.register.name}
					</h2>
					<p class="text-sm text-slate-500">
						Ouverte {new Date(session.session.openedAt).toLocaleString('fr-FR')}
					</p>
				</div>
				<a class="text-blue-700" href={resolve(`/cash/sessions/${session.session.id}`)}
					>Journal complet</a
				>
			</div>
		</section>
		{#if kpis && !summaryError}<div
				class="grid gap-3 md:grid-cols-3 xl:grid-cols-6"
				data-testid="cash-summary"
			>
				<div class="rounded-xl border bg-white p-3" data-testid="cash-kpi-opening">
					<small>Fond initial</small><strong class="block">{formatXOF(kpis.opening)}</strong>
				</div>
				<div class="rounded-xl border bg-white p-3" data-testid="cash-kpi-cash">
					<small>Espèces</small><strong class="block">{formatXOF(kpis.cash)}</strong>
				</div>
				<div class="rounded-xl border bg-white p-3" data-testid="cash-kpi-other">
					<small>Autres</small><strong class="block">{formatXOF(kpis.other)}</strong>
				</div>
				<div class="rounded-xl border bg-white p-3" data-testid="cash-kpi-total">
					<small>Total</small><strong class="block">{formatXOF(kpis.total)}</strong>
				</div>
				<div class="rounded-xl border bg-white p-3" data-testid="cash-kpi-count">
					<small>Opérations</small><strong class="block">{kpis.count}</strong>
				</div>
				<div class="rounded-xl border bg-white p-3" data-testid="cash-kpi-expected">
					<small>Espèces théoriques</small><strong class="block">{formatXOF(kpis.expected)}</strong>
				</div>
			</div>{/if}
		{#if ownSession}<section class="rounded-2xl border bg-white p-5">
				<h2 class="font-black">Recherche facture/patient</h2>
				<input
					class="mt-3 w-full rounded-xl border p-3"
					bind:value={search}
					placeholder="INV-*, P*, nom patient"
				/>
				<div class="mt-3 space-y-2">
					{#each filtered as x (x.id)}<button
							class="grid w-full gap-2 rounded-xl border p-3 text-left md:grid-cols-4"
							onclick={() => {
								selected = x;
								payment.amount = x.balanceAmount;
								paymentCmd = createPaymentCommandState();
							}}
							><strong>{x.number}</strong><span>{x.patientCode} — {x.patientName}</span><span
								>Assurance {formatXOF(x.insuranceAmount)}</span
							><span class="font-black">Reste patient {formatXOF(x.balanceAmount)}</span></button
						>{/each}
				</div>
			</section>
			{#if selected}<section class="rounded-2xl border-2 border-emerald-300 bg-white p-5">
					<h2 class="font-black">Encaisser {selected.number}</h2>
					<div class="grid gap-2 md:grid-cols-4">
						<p>Brut <b>{formatXOF(selected.grossAmount)}</b></p>
						<p>Assurance <b>{formatXOF(selected.insuranceAmount)}</b></p>
						<p>Patient <b>{formatXOF(selected.patientAmount)}</b></p>
						<p>Reste <b>{formatXOF(selected.balanceAmount)}</b></p>
					</div>
					<div class="mt-4 grid gap-3 md:grid-cols-4">
						<input
							class="rounded-xl border p-2"
							type="number"
							min="1"
							max={selected.balanceAmount}
							bind:value={payment.amount}
						/><select class="rounded-xl border p-2" bind:value={payment.paymentMethod}
							>{#each methods as m (m.value)}<option value={m.value}>{m.label}</option
								>{/each}</select
						>{#if needsOperator(payment.paymentMethod)}<select
								class="rounded-xl border p-2"
								bind:value={payment.mobileOperator}
								><option value="">Opérateur</option
								>{#each ['Orange Money', 'MTN Mobile Money', 'Wave', 'Moov Money', 'Autre'] as o (o)}<option
										>{o}</option
									>{/each}</select
							>{/if}<input
							class="rounded-xl border p-2"
							bind:value={payment.externalReference}
							placeholder={needsReference(payment.paymentMethod)
								? 'Référence obligatoire'
								: 'Référence facultative'}
						/><button
							disabled={isPaymentSubmitDisabled(paymentCmd)}
							class="rounded-xl bg-emerald-700 p-2 font-bold text-white disabled:opacity-40"
							data-testid="cash-pay"
							onclick={collect}
							>{isPaymentSubmitDisabled(paymentCmd) ? 'Encaissement…' : 'Encaisser'}</button
						>
					</div>
				</section>{/if}
		{:else}<p
				class="rounded-xl bg-slate-50 p-3 text-sm text-slate-600"
				data-testid="cash-collect-denied"
			>
				Encaissement réservé à la caissière / au caissier ouvreur de cette session.
			</p>{/if}
		<section class="rounded-2xl border bg-white p-5">
			<h2 class="font-black">Opérations récentes</h2>
			{#each journal.slice(0, 10) as r (r.id)}<a
					class="grid gap-2 border-t py-2 md:grid-cols-4"
					href={resolve(`/cash/receipts/${r.id}`)}
					><b>{r.receiptNumber}</b><span>{r.invoiceNumber}</span><span>{r.paymentMethod}</span><b
						>{formatXOF(r.amount)}</b
					></a
				>{:else}<p class="text-slate-500">Aucune opération.</p>{/each}
		</section>
		{#if canCloseOwn}<section
				class="rounded-2xl border bg-white p-5"
				data-testid="cash-close-panel"
			>
				<h2 class="font-black">Clôture</h2>
				<p>
					Espèces théoriques <b data-testid="cash-close-expected-preview"
						>{formatXOF(session.expectedCash)}</b
					>
				</p>
				<input
					class="rounded-xl border p-2"
					type="number"
					min="0"
					bind:value={closing.countedCashAmount}
					data-testid="cash-close-counted"
				/>
				<p data-testid="cash-close-gap-preview">
					Écart (saisie) {formatXOF(draftCloseGap(closing.countedCashAmount, session.expectedCash))}
				</p>
				{#if closeNoteRequired(session.session, userId, closing.countedCashAmount, session.expectedCash)}<textarea
						class="w-full rounded-xl border p-2"
						bind:value={closing.note}
						placeholder="Justification obligatoire"
						data-testid="cash-close-note"></textarea>{/if}<button
					class="mt-2 rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-40"
					disabled={isSessionSubmitDisabled(closeCmd)}
					data-testid="cash-close-submit"
					onclick={() => finish()}
					>{isSessionSubmitDisabled(closeCmd) ? 'Clôture…' : 'Clôturer'}</button
				>
			</section>{:else}<p
				class="rounded-xl bg-slate-50 p-3 text-sm text-slate-600"
				data-testid="cash-close-denied"
			>
				Clôture réservée à l’ouvreur (récupération superviseur hors session courante).
			</p>{/if}
	{:else if !summaryLoading}
		<section class="max-w-3xl rounded-2xl border bg-white p-6" data-testid="cash-open-panel">
			<h2 class="text-xl font-black">Ouvrir la caisse</h2>
			<div class="mt-4 grid gap-3 md:grid-cols-2">
				<select
					class="rounded-xl border p-3"
					bind:value={opening.cashRegisterId}
					data-testid="cash-open-register"
					><option value={0}>Choisir une caisse</option
					>{#each registers.filter((x) => x.active) as r (r.id)}<option value={r.id}
							>{r.code} — {r.name}</option
						>{/each}</select
				><input
					class="rounded-xl border p-3"
					type="number"
					min="0"
					bind:value={opening.openingFloat}
					placeholder="Fond initial"
					data-testid="cash-open-float"
				/><textarea
					class="rounded-xl border p-3 md:col-span-2"
					bind:value={opening.note}
					placeholder="Note facultative"
					data-testid="cash-open-note"></textarea><button
					class="rounded-xl bg-emerald-700 p-3 font-bold text-white disabled:opacity-40"
					disabled={!cashCan(permissions, 'cash.session.open') || isSessionSubmitDisabled(openCmd)}
					onclick={open}
					data-testid="cash-open-submit"
					>{isSessionSubmitDisabled(openCmd) ? 'Ouverture…' : 'Ouvrir'}</button
				>
			</div>
		</section>
		{#if cashCan(permissions, 'cash.register.manage')}<section
				class="max-w-3xl rounded-2xl border bg-white p-6"
			>
				<h2 class="font-black">Créer une caisse</h2>
				<div class="mt-3 grid gap-2 md:grid-cols-3">
					<input
						class="rounded-xl border p-2"
						bind:value={registerForm.code}
						placeholder="Code unique"
					/><input
						class="rounded-xl border p-2"
						bind:value={registerForm.name}
						placeholder="Nom"
					/><input
						class="rounded-xl border p-2"
						bind:value={registerForm.location}
						placeholder="Emplacement"
					/><button class="rounded-xl bg-blue-700 p-2 font-bold text-white" onclick={addRegister}
						>Créer</button
					>
				</div>
			</section>{/if}
		{#if showRecovery}<section
				class="max-w-3xl rounded-2xl border border-amber-300 bg-amber-50 p-6"
				data-testid="cash-recovery-panel"
			>
				<h2 class="font-black text-amber-950">Récupération — sessions ouvertes</h2>
				<p class="text-sm text-amber-900">
					Clôture d’une session ouverte par un autre caissier. Justification obligatoire.
				</p>
				{#each openSessions as s (s.id)}<div
						class="mt-3 flex items-center justify-between border-t pt-2"
					>
						<span>{s.register?.code ?? s.cashRegisterId} · ouvreur #{s.openedBy}</span>
						<button
							type="button"
							class="text-sm font-bold text-amber-900 underline"
							data-testid={`cash-recovery-select-${s.id}`}
							onclick={() => startRecovery(s)}>Clôturer (récupération)</button
						>
					</div>{/each}
				{#if recoveryTarget}<div class="mt-4 space-y-2" data-testid="cash-recovery-form">
						<p class="text-sm font-semibold">
							Session #{recoveryTarget.id} — caissier #{recoveryTarget.openedBy}
						</p>
						<input
							class="w-full rounded-xl border p-2"
							type="number"
							min="0"
							bind:value={closing.countedCashAmount}
							data-testid="cash-recovery-counted"
						/><textarea
							class="w-full rounded-xl border p-2"
							bind:value={closing.note}
							placeholder="Justification obligatoire"
							data-testid="cash-recovery-note"></textarea><button
							type="button"
							class="rounded-xl bg-amber-900 px-4 py-2 font-bold text-white disabled:opacity-40"
							disabled={isSessionSubmitDisabled(closeCmd)}
							data-testid="cash-recovery-submit"
							onclick={() => finish(recoveryTarget!.id, true)}
							>{isSessionSubmitDisabled(closeCmd)
								? 'Clôture…'
								: 'Confirmer la récupération'}</button
						>
					</div>{/if}
			</section>{/if}
	{/if}
</div>
