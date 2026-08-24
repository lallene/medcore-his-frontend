<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { jwtDecode } from 'jwt-decode';
	import { addReceivableFollowUp, getReceivable, setReceivableDueDate } from '$lib/api/receivables';
	import { formatXOF } from '$lib/components/billing/state';
	import { receivableCan, statusLabel } from '$lib/components/receivables/state';
	import type { ReceivableDetail } from '$lib/types/receivables';
	let item = $state<ReceivableDetail | null>(null),
		error = $state(''),
		permissions = $state<string[]>([]),
		dueDate = $state('');
	let follow = $state({ actionType: 'NOTE', note: '', promisedPaymentDate: '', promisedAmount: 0 });
	const id = $derived(Number(page.params.id));
	const openCash = (invoiceId: number) =>
		// The route itself is resolved; only its query string is appended dynamically.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(resolve('/cash') + `?invoiceId=${invoiceId}`);
	async function load() {
		try {
			item = await getReceivable(id);
			dueDate = item.dueDate?.slice(0, 10) ?? '';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Créance introuvable';
		}
	}
	async function saveDue() {
		await setReceivableDueDate(id, dueDate || null);
		await load();
	}
	async function addFollow() {
		await addReceivableFollowUp(id, {
			...follow,
			promisedPaymentDate: follow.promisedPaymentDate || null,
			promisedAmount: follow.actionType === 'PAYMENT_PROMISE' ? follow.promisedAmount : null
		});
		follow = { actionType: 'NOTE', note: '', promisedPaymentDate: '', promisedAmount: 0 };
		await load();
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

{#if error}<p class="m-6 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>{/if}{#if item}<div
		class="space-y-6 p-6"
	>
		<header class="flex justify-between">
			<div>
				<p class="text-xs font-black uppercase text-rose-700">Créance patient</p>
				<h1 class="text-3xl font-black">{item.invoiceNumber}</h1>
				<p>{item.patientName} — {item.patientCode}</p>
			</div>
			{#if permissions.includes('*') || permissions.includes('cash.payment.create')}<button
					onclick={() => openCash(item!.invoiceId)}
					class="h-fit rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white"
					>Encaisser à la caisse</button
				>{/if}
		</header>
		<section class="grid gap-3 md:grid-cols-5">
			{#each [['Brut', item.grossAmount], ['Assurance', item.insuranceAmount], ['Part patient', item.patientDue], ['Payé patient', item.patientPaid], ['Reste patient', item.patientBalance]] as x (x[0])}<div
					class="rounded-2xl border bg-white p-4"
				>
					<small>{x[0]}</small>
					<p class="text-xl font-black">{formatXOF(Number(x[1]))}</p>
				</div>{/each}
		</section>
		<p class="rounded-xl bg-slate-50 p-3 font-bold">Statut : {statusLabel[item.status]}</p>
		<section class="rounded-2xl border bg-white p-5">
			<h2 class="font-black">Actes facturés</h2>
			{#each item.lines as l, index (`${l.actType}-${index}`)}<div
					class="mt-3 grid grid-cols-4 border-t pt-3"
				>
					<span>{l.description}</span><span>Brut {formatXOF(l.grossAmount)}</span><span
						>Assurance {formatXOF(l.insuranceAmount)}</span
					><span>Patient {formatXOF(l.patientAmount)}</span>
				</div>{/each}
		</section>
		<section class="rounded-2xl border bg-white p-5">
			<h2 class="font-black">Paiements et reçus</h2>
			{#each item.payments as p (p.id)}<p class="mt-2 border-t pt-2">
					{new Date(p.paidAt).toLocaleString('fr-FR')} · {p.paymentMethod} ·
					<b>{formatXOF(p.amount)}</b>{#if p.receiptId}
						· <a class="text-blue-700" href={resolve(`/cash/receipts/${p.receiptId}`)}
							>{p.receiptNumber}</a
						>{/if}
				</p>{:else}<p class="mt-3 text-slate-500">Aucun paiement.</p>{/each}
		</section>
		<section class="grid gap-4 md:grid-cols-2">
			<div class="rounded-2xl border bg-white p-5">
				<h2 class="font-black">Échéance</h2>
				<input
					type="date"
					bind:value={dueDate}
					disabled={!receivableCan(permissions, 'receivables.due_date.manage')}
					class="mt-3 rounded-xl border p-3"
				/>{#if receivableCan(permissions, 'receivables.due_date.manage')}<button
						onclick={saveDue}
						class="ml-2 rounded-xl bg-slate-900 px-4 py-3 text-white">Enregistrer</button
					>{/if}
			</div>
			<div class="rounded-2xl border bg-white p-5">
				<h2 class="font-black">Historique de recouvrement</h2>
				{#each item.followUps as f (f.id)}<div class="mt-2 border-t pt-2">
						<b>{f.actionType}</b> · {f.note}{#if f.promisedAmount}<small class="block"
								>Promesse : {formatXOF(f.promisedAmount)} le {f.promisedPaymentDate}</small
							>{/if}
					</div>{:else}<p class="mt-2 text-slate-500">Aucune relance.</p>{/each}
			</div>
		</section>
		{#if receivableCan(permissions, 'receivables.followup.create')}<section
				class="grid gap-3 rounded-2xl border bg-white p-5 md:grid-cols-4"
			>
				<select bind:value={follow.actionType} class="rounded-xl border p-3"
					><option>NOTE</option><option>REMINDER</option><option>PHONE_CALL</option><option
						>PAYMENT_PROMISE</option
					><option>OTHER</option></select
				><input
					bind:value={follow.note}
					placeholder="Note de suivi"
					class="rounded-xl border p-3"
				/>{#if follow.actionType === 'PAYMENT_PROMISE'}<input
						type="date"
						bind:value={follow.promisedPaymentDate}
						class="rounded-xl border p-3"
					/><input
						type="number"
						min="0"
						bind:value={follow.promisedAmount}
						class="rounded-xl border p-3"
					/>{/if}<button
					disabled={!follow.note}
					onclick={addFollow}
					class="rounded-xl bg-blue-700 p-3 font-bold text-white">Ajouter la relance</button
				>
			</section>{/if}
	</div>{/if}
