<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { jwtDecode } from 'jwt-decode';
	import {
		cashPayment,
		closeSession,
		createRegister,
		currentSession,
		listRegisters,
		openSession,
		sessionJournal
	} from '$lib/api/cash';
	import { listInvoices } from '$lib/api/billing';
	import { formatXOF } from '$lib/components/billing/state';
	import {
		cashCan,
		cashKpis,
		difference,
		methods,
		needsOperator,
		needsReference
	} from '$lib/components/cash/state';
	import type { CashReceipt, CashRegister, CashMethod, SessionSummary } from '$lib/types/cash';
	import type { Invoice } from '$lib/types/billing';
	let session = $state<SessionSummary | null>(null),
		registers = $state<CashRegister[]>([]),
		journal = $state<CashReceipt[]>([]),
		invoices = $state<Invoice[]>([]),
		error = $state(''),
		search = $state(''),
		permissions = $state<string[]>([]);
	let opening = $state({ cashRegisterId: 0, openingFloat: 0, note: '' });
	let registerForm = $state({ code: '', name: '', location: '', active: true });
	let selected = $state<Invoice | null>(null);
	let payment = $state({
		amount: 0,
		paymentMethod: 'CASH' as CashMethod,
		externalReference: '',
		mobileOperator: ''
	});
	let closing = $state({ countedCashAmount: 0, note: '' });
	const kpis = $derived(session ? cashKpis(session) : null);
	const filtered = $derived(
		invoices.filter(
			(x) =>
				!search ||
				`${x.number} ${x.patientCode} ${x.patientName}`.toLowerCase().includes(search.toLowerCase())
		)
	);
	async function refresh() {
		[registers, session] = await Promise.all([listRegisters(), currentSession()]);
		if (session) {
			[journal, invoices] = await Promise.all([
				sessionJournal(session.session.id),
				listInvoices({ limit: 100 }).then((x) =>
					x.data.filter((i) => ['ISSUED', 'PARTIALLY_PAID'].includes(i.status))
				)
			]);
			closing.countedCashAmount = session.expectedCash;
		}
	}
	async function open() {
		try {
			session = await openSession(opening);
			await refresh();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Ouverture impossible';
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
		if (!session || !selected) return;
		try {
			const r = await cashPayment(session.session.id, {
				invoiceId: selected.id,
				...payment,
				idempotencyKey: crypto.randomUUID()
			});
			await refresh();
			selected = null;
			await goto(resolve(`/cash/receipts/${r.id}`));
		} catch (e) {
			error = e instanceof Error ? e.message : 'Paiement impossible';
		}
	}
	async function finish() {
		if (!session) return;
		try {
			await closeSession(session.session.id, closing);
			await refresh();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Clôture impossible';
		}
	}
	onMount(() => {
		const raw = localStorage.getItem('medcore_token');
		if (raw)
			try {
				permissions = jwtDecode<{ permissions?: string[] }>(raw).permissions ?? [];
			} catch {
				permissions = [];
			}
		void refresh();
	});
</script>

<div class="space-y-5 p-6">
	<header>
		<p class="text-xs font-black uppercase text-emerald-700">Finance</p>
		<h1 class="text-3xl font-black">Caisse</h1>
	</header>
	{#if error}<p class="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>{/if}
	{#if !session}<section class="max-w-3xl rounded-2xl border bg-white p-6">
			<h2 class="text-xl font-black">Ouvrir la caisse</h2>
			<div class="mt-4 grid gap-3 md:grid-cols-2">
				<select class="rounded-xl border p-3" bind:value={opening.cashRegisterId}
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
				/><textarea
					class="rounded-xl border p-3 md:col-span-2"
					bind:value={opening.note}
					placeholder="Note facultative"></textarea><button
					class="rounded-xl bg-emerald-700 p-3 font-bold text-white disabled:opacity-40"
					disabled={!cashCan(permissions, 'cash.session.open')}
					onclick={open}>Ouvrir</button
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
	{:else}<section class="rounded-2xl border bg-white p-5">
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
		{#if kpis}<div class="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
				{#each [['Fond initial', kpis.opening], ['Espèces', kpis.cash], ['Autres', kpis.other], ['Total', kpis.total], ['Opérations', kpis.count], ['Espèces théoriques', kpis.expected]] as x (x[0])}<div
						class="rounded-xl border bg-white p-3"
					>
						<small>{x[0]}</small><strong class="block"
							>{x[0] === 'Opérations' ? x[1] : formatXOF(Number(x[1]))}</strong
						>
					</div>{/each}
			</div>{/if}
		<section class="rounded-2xl border bg-white p-5">
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
						>{#each methods as m (m.value)}<option value={m.value}>{m.label}</option>{/each}</select
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
						disabled={!cashCan(permissions, 'cash.payment.create')}
						class="rounded-xl bg-emerald-700 p-2 font-bold text-white disabled:opacity-40"
						onclick={collect}>Encaisser</button
					>
				</div>
			</section>{/if}
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
		<section class="rounded-2xl border bg-white p-5">
			<h2 class="font-black">Clôture</h2>
			<p>Espèces théoriques <b>{formatXOF(session.expectedCash)}</b></p>
			<input
				class="rounded-xl border p-2"
				type="number"
				min="0"
				bind:value={closing.countedCashAmount}
			/>
			<p>Écart {formatXOF(difference(closing.countedCashAmount, session.expectedCash))}</p>
			{#if difference(closing.countedCashAmount, session.expectedCash) !== 0}<textarea
					class="w-full rounded-xl border p-2"
					bind:value={closing.note}
					placeholder="Justification obligatoire"></textarea>{/if}<button
				class="mt-2 rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-40"
				disabled={!cashCan(permissions, 'cash.session.close')}
				onclick={finish}>Clôturer</button
			>
		</section>{/if}
</div>
