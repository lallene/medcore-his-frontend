<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { getSession, listMovements, sessionJournal } from '$lib/api/cash';
	import { formatXOF } from '$lib/components/billing/state';
	import {
		canShowClosingReport,
		isIncompleteClosed,
		methods,
		presentClosedSnapshot,
		presentSessionSummary
	} from '$lib/components/cash/state';
	import { MOVEMENT_IN_LABEL, MOVEMENT_OUT_LABEL } from '$lib/components/cash/movement';
	import type { CashMovement, CashReceipt, SessionSummary } from '$lib/types/cash';

	let session = $state<SessionSummary | null>(null),
		rows = $state<CashReceipt[]>([]),
		movements = $state<CashMovement[]>([]),
		loading = $state(true),
		error = $state('');
	const kpis = $derived(presentSessionSummary(session));
	const closed = $derived(presentClosedSnapshot(session));
	const showReport = $derived(canShowClosingReport(session));
	const incomplete = $derived(isIncompleteClosed(session));

	onMount(async () => {
		loading = true;
		error = '';
		try {
			const id = Number(page.params.id);
			[session, rows, movements] = await Promise.all([
				getSession(id),
				sessionJournal(id).catch(() => [] as CashReceipt[]),
				listMovements(id).catch(() => [] as CashMovement[])
			]);
		} catch (e) {
			session = null;
			rows = [];
			movements = [];
			error = e instanceof Error ? e.message : 'Résumé de session indisponible';
		} finally {
			loading = false;
		}
	});

	function methodLabel(code: string) {
		return methods.find((m) => m.value === code)?.label ?? code;
	}
</script>

<div class="space-y-5 p-6" data-testid="cash-session-detail">
	<p class="print:hidden">
		<a
			class="text-sm font-bold text-blue-700"
			href={resolve('/cash/sessions')}
			data-testid="cash-session-back">← Historique</a
		>
		·
		<a class="text-sm font-bold text-blue-700" href={resolve('/cash')}>Caisse</a>
	</p>

	{#if loading}<p data-testid="cash-session-summary-loading">Chargement…</p>{/if}
	{#if error}<p class="text-red-700" data-testid="cash-session-summary-error" role="alert">
			{error}
		</p>{/if}

	{#if session && kpis}
		{#if session.session.status === 'OPEN'}
			<p class="rounded-xl bg-amber-50 p-3 text-amber-900" data-testid="cash-session-not-closed">
				Session non clôturée — le rapprochement final n’est disponible qu’après clôture.
			</p>
			<div class="grid gap-3 md:grid-cols-4" data-testid="cash-session-summary">
				<p data-testid="cash-session-opening">Fond <b>{formatXOF(kpis.opening)}</b></p>
				<p data-testid="cash-session-cash">Espèces encaissées <b>{formatXOF(kpis.cash)}</b></p>
				<p data-testid="cash-session-movement-in">
					Entrées de caisse <b>{formatXOF(kpis.movementIn)}</b>
				</p>
				<p data-testid="cash-session-movement-out">
					Sorties de caisse <b>{formatXOF(kpis.movementOut)}</b>
				</p>
				<p data-testid="cash-session-other">Autres <b>{formatXOF(kpis.other)}</b></p>
				<p data-testid="cash-session-total">Total encaissé <b>{formatXOF(kpis.total)}</b></p>
				<p data-testid="cash-session-count">Opérations <b>{kpis.count}</b></p>
				<p data-testid="cash-session-expected">
					Espèces attendues <b>{formatXOF(kpis.expected)}</b>
				</p>
			</div>
		{/if}

		{#if incomplete}
			<p
				class="rounded-xl bg-red-50 p-3 text-red-800"
				data-testid="cash-session-incomplete"
				role="alert"
			>
				Preuve de clôture incomplète — aucune valeur de rapprochement n’est affichée.
			</p>
		{/if}

		{#if showReport && closed}
			<div class="rounded-2xl border bg-white p-5" data-testid="cash-closing-report">
				<header class="mb-4 border-b pb-3">
					<p class="text-xs font-black uppercase tracking-wide text-emerald-700">MedCore HIS</p>
					<h1 class="text-2xl font-black">Rapport de clôture — session #{session.session.id}</h1>
					<p class="text-sm text-slate-600">État {session.session.status}</p>
				</header>

				<section class="mb-4" data-testid="cash-recon-register">
					<h2 class="font-black">Caisse</h2>
					<p>
						{session.session.register.code} — {session.session.register.name}
						{#if session.session.register.location}
							· {session.session.register.location}{/if}
					</p>
				</section>

				<section class="mb-4 grid gap-2 md:grid-cols-2" data-testid="cash-recon-opening">
					<h2 class="font-black md:col-span-2">Ouverture</h2>
					<p>Ouvreur <b data-testid="cash-recon-opened-by">#{closed.openedBy}</b></p>
					<p>
						Ouverte le <b data-testid="cash-recon-opened-at"
							>{new Date(closed.openedAt).toLocaleString('fr-FR')}</b
						>
					</p>
					<p>
						Fond de caisse <b data-testid="cash-recon-opening-float">{formatXOF(kpis.opening)}</b>
					</p>
					{#if closed.openingNote}<p class="md:col-span-2">
							Note d’ouverture <b data-testid="cash-recon-opening-note">{closed.openingNote}</b>
						</p>{/if}
				</section>

				<section class="mb-4" data-testid="cash-recon-collections">
					<h2 class="font-black">Encaissements</h2>
					<p class="text-sm text-slate-600">
						Le total encaissé n’inclut pas le fond de caisse ni les mouvements de caisse. Les
						espèces attendues = fond + espèces encaissées + entrées − sorties (serveur).
					</p>
					<div class="mt-2 grid gap-2 md:grid-cols-3">
						<p data-testid="cash-recon-cash">Espèces encaissées <b>{formatXOF(kpis.cash)}</b></p>
						<p data-testid="cash-recon-noncash">
							Autres encaissements <b>{formatXOF(kpis.other)}</b>
						</p>
						<p data-testid="cash-recon-total">Total encaissé <b>{formatXOF(kpis.total)}</b></p>
						<p data-testid="cash-recon-ops">Opérations <b>{kpis.count}</b></p>
					</div>
					<ul class="mt-2 grid gap-1 text-sm md:grid-cols-2" data-testid="cash-recon-methods">
						<li>{methodLabel('CASH')} : {formatXOF(kpis.cash)}</li>
						<li>{methodLabel('CARD')} : {formatXOF(kpis.card)}</li>
						<li>{methodLabel('MOBILE_MONEY')} : {formatXOF(kpis.mobile)}</li>
						<li>{methodLabel('BANK_TRANSFER')} : {formatXOF(kpis.transfer)}</li>
						<li>{methodLabel('CHECK')} : {formatXOF(kpis.check)}</li>
					</ul>
				</section>

				<section class="mb-4" data-testid="cash-recon-movements">
					<h2 class="font-black">Mouvements de caisse</h2>
					<div class="mt-2 grid gap-2 md:grid-cols-3">
						<p data-testid="cash-recon-movement-in">
							Entrées de caisse <b>{formatXOF(kpis.movementIn)}</b>
						</p>
						<p data-testid="cash-recon-movement-out">
							Sorties de caisse <b>{formatXOF(kpis.movementOut)}</b>
						</p>
						<p data-testid="cash-recon-manual-out">
							Sorties manuelles <b>{formatXOF(kpis.manualOut)}</b>
						</p>
						<p data-testid="cash-recon-reversal-out">
							Sorties contrepassation <b>{formatXOF(kpis.reversalOut)}</b>
						</p>
						{#if (kpis.refundOut ?? 0) > 0 || (kpis.refundCount ?? 0) > 0}
							<p data-testid="cash-recon-refund-out">
								Remboursements exécutés
								<b>{formatXOF(kpis.refundOut)}</b>
								<span class="text-slate-500"> ({kpis.refundCount ?? 0})</span>
							</p>
						{/if}
						<p data-testid="cash-recon-post-close-out">
							Corrections de caisse postérieures <b>{formatXOF(kpis.postCloseCorrectionOut)}</b>
						</p>
						<p data-testid="cash-recon-net-movement">
							Net mouvements <b>{formatXOF(kpis.netMovement)}</b>
						</p>
					</div>
				</section>

				<section
					class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4"
					data-testid="cash-recon-closing"
				>
					<h2 class="font-black">Rapprochement / Clôture</h2>
					<div class="mt-2 grid gap-2 md:grid-cols-3">
						<p data-testid="cash-recon-expected">
							Espèces attendues en caisse <b>{formatXOF(closed.expected ?? 0)}</b>
						</p>
						<p data-testid="cash-recon-counted">
							Espèces comptées <b>{formatXOF(closed.counted ?? 0)}</b>
						</p>
						<p data-testid="cash-recon-difference">
							Écart <b>{formatXOF(closed.difference ?? 0)}</b>
						</p>
					</div>
					<p class="mt-2 font-semibold" data-testid="cash-recon-variance-label">
						{closed.varianceLabel}
					</p>
					{#if closed.closingNote}<p class="mt-2" data-testid="cash-recon-closing-note">
							Note de clôture : <b>{closed.closingNote}</b>
						</p>{/if}
					<p class="mt-2">
						Clôturée par <b data-testid="cash-recon-closed-by">#{closed.closedBy}</b>
						le
						<b data-testid="cash-recon-closed-at"
							>{closed.closedAt ? new Date(closed.closedAt).toLocaleString('fr-FR') : '—'}</b
						>
					</p>
					{#if closed.recoveryClose}<p
							class="mt-2 text-sm text-amber-900"
							data-testid="cash-recon-recovery"
						>
							Clôture effectuée par un autre utilisateur autorisé.
						</p>{/if}
				</section>
				{#if rows.some((r) => r.postCloseCorrection)}
					<section
						class="mb-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4"
						data-testid="cash-recon-post-close"
					>
						<h2 class="font-black">Corrections postérieures à la clôture</h2>
						<p class="text-sm text-slate-600">
							Informations documentaires — les totaux de clôture ci-dessus restent inchangés.
						</p>
						<ul class="mt-2 space-y-1 text-sm">
							{#each rows.filter((r) => r.postCloseCorrection) as r (r.id)}
								<li data-testid={`cash-recon-post-close-${r.id}`}>
									{r.receiptNumber} — {formatXOF(r.amount)} — Correction postérieure
								</li>
							{/each}
						</ul>
					</section>
				{/if}
			</div>
			<button
				class="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white print:hidden"
				data-testid="cash-recon-print"
				onclick={() => print()}>Imprimer le rapport</button
			>
		{/if}

		<section class="rounded-2xl border bg-white print:hidden" data-testid="cash-session-journal">
			<h2 class="border-b p-3 font-black">Journal des encaissements (documentaire)</h2>
			{#each rows as r (r.id)}<a
					class="grid gap-2 border-b p-3 md:grid-cols-5"
					href={resolve(`/cash/receipts/${r.id}`)}
					><b>{r.receiptNumber}</b><span>{r.invoiceNumber}</span><span>{r.paymentMethod}</span><b
						>{formatXOF(r.amount)}</b
					>{#if r.postCloseCorrection}<span
							class="text-xs font-semibold text-amber-900"
							data-testid={`cash-journal-post-close-${r.id}`}>Correction postérieure</span
						>{:else if r.paymentReversed}<span class="text-xs text-amber-800">Contrepassé</span
						>{:else}<span></span>{/if}</a
				>{:else}<p class="p-3 text-slate-500">Aucune opération.</p>{/each}
		</section>
		<section class="rounded-2xl border bg-white print:hidden" data-testid="cash-session-movements">
			<h2 class="border-b p-3 font-black">Journal des mouvements de caisse</h2>
			{#each movements as m (m.id)}<div
					class="grid gap-2 border-b p-3 md:grid-cols-4"
					data-testid="cash-session-movement-row"
				>
					<span>{m.direction === 'IN' ? MOVEMENT_IN_LABEL : MOVEMENT_OUT_LABEL}</span>
					<span>{new Date(m.occurredAt).toLocaleString('fr-FR')}</span>
					<span class="truncate">{m.reason}</span>
					<b>{formatXOF(m.amount)}</b>
				</div>{:else}<p class="p-3 text-slate-500">Aucun mouvement de caisse.</p>{/each}
		</section>
	{/if}
</div>
