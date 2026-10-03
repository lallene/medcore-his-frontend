<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { getSession, sessionJournal } from '$lib/api/cash';
	import { formatXOF } from '$lib/components/billing/state';
	import {
		canShowClosingReport,
		isIncompleteClosed,
		methods,
		presentClosedSnapshot,
		presentSessionSummary
	} from '$lib/components/cash/state';
	import type { CashReceipt, SessionSummary } from '$lib/types/cash';

	let session = $state<SessionSummary | null>(null),
		rows = $state<CashReceipt[]>([]),
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
			[session, rows] = await Promise.all([
				getSession(Number(page.params.id)),
				sessionJournal(Number(page.params.id)).catch(() => [] as CashReceipt[])
			]);
		} catch (e) {
			session = null;
			rows = [];
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
				<p data-testid="cash-session-cash">Espèces <b>{formatXOF(kpis.cash)}</b></p>
				<p data-testid="cash-session-other">Autres <b>{formatXOF(kpis.other)}</b></p>
				<p data-testid="cash-session-total">Total <b>{formatXOF(kpis.total)}</b></p>
				<p data-testid="cash-session-count">Opérations <b>{kpis.count}</b></p>
				<p data-testid="cash-session-expected">
					Espèces théoriques <b>{formatXOF(kpis.expected)}</b>
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
						Le total encaissé n’inclut pas le fond de caisse. Les espèces attendues en caisse
						incluent le fond + espèces encaissées uniquement.
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
			</div>
			<button
				class="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white print:hidden"
				data-testid="cash-recon-print"
				onclick={() => print()}>Imprimer le rapport</button
			>
		{/if}

		<section class="rounded-2xl border bg-white print:hidden" data-testid="cash-session-journal">
			<h2 class="border-b p-3 font-black">Journal des opérations (documentaire)</h2>
			{#each rows as r (r.id)}<a
					class="grid gap-2 border-b p-3 md:grid-cols-4"
					href={resolve(`/cash/receipts/${r.id}`)}
					><b>{r.receiptNumber}</b><span>{r.invoiceNumber}</span><span>{r.paymentMethod}</span><b
						>{formatXOF(r.amount)}</b
					></a
				>{:else}<p class="p-3 text-slate-500">Aucune opération.</p>{/each}
		</section>
	{/if}
</div>
