<script lang="ts">
	import TableState from '$lib/components/ui/TableState.svelte';
	import Table from '$lib/components/ui/Table.svelte';
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
	const openCollection = (invoiceId: number) => {
		if (permissions.includes('*') || permissions.includes('billing.payment.create')) {
			void goto(resolve(`/billing/${invoiceId}`));
			return;
		}
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		void goto(resolve('/cash') + `?invoiceId=${invoiceId}`);
	};
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
				<p class="text-xs font-semibold uppercase text-rose-700">Créance patient</p>
				<h1 class="text-3xl font-bold">{item.invoiceNumber}</h1>
				<p>{item.patientName} — {item.patientCode}</p>
			</div>
			{#if permissions.includes('*') || permissions.includes('billing.payment.create') || permissions.includes('cash.payment.create')}<button
					type="button"
					onclick={() => openCollection(item!.invoiceId)}
					class="h-fit rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white"
					data-testid="receivable-encaisser">Encaisser</button
				>{/if}
		</header>
		<section class="grid gap-3 md:grid-cols-5">
			{#each [['Brut', item.grossAmount], ['Assurance', item.insuranceAmount], ['Part patient', item.patientDue], ['Payé patient', item.patientPaid], ['Reste patient', item.patientBalance]] as x (x[0])}<div
					class="rounded-2xl border bg-white p-4"
				>
					<small>{x[0]}</small>
					<p class="text-xl font-bold">{formatXOF(Number(x[1]))}</p>
				</div>{/each}
		</section>
		<p class="rounded-xl bg-slate-50 p-3 font-bold">Statut : {statusLabel[item.status]}</p>
		<section class="space-y-2">
			<h2 class="text-base font-semibold text-foreground">Actes facturés</h2>
			<Table aria-label="Actes facturés">
				<thead>
					<tr>
						<th>Acte</th>
						<th class="mc-num">Brut</th>
						<th class="mc-num">Assurance</th>
						<th class="mc-num">Patient</th>
					</tr>
				</thead>
				<tbody>
					{#each item.lines as l, index (`${l.actType}-${index}`)}
						<tr>
							<td>{l.description}</td>
							<td class="mc-amount">{formatXOF(l.grossAmount)}</td>
							<td class="mc-amount">{formatXOF(l.insuranceAmount)}</td>
							<td class="mc-amount">{formatXOF(l.patientAmount)}</td>
						</tr>
					{/each}
				</tbody>
			</Table>
		</section>
		<section class="space-y-2">
			<h2 class="text-base font-semibold text-foreground">Paiements et reçus</h2>
			<Table aria-label="Paiements et reçus">
				<thead>
					<tr>
						<th>Date</th>
						<th>Mode</th>
						<th class="mc-num">Montant</th>
						<th>Reçu</th>
					</tr>
				</thead>
				<tbody>
					{#each item.payments as p (p.id)}
						<tr>
							<td class="whitespace-nowrap">{new Date(p.paidAt).toLocaleString('fr-FR')}</td>
							<td>{p.paymentMethod}</td>
							<td class="mc-amount">{formatXOF(p.amount)}</td>
							<td class="mc-id"
								>{#if p.receiptId}<a href={resolve(`/cash/receipts/${p.receiptId}`)}
										>{p.receiptNumber}</a
									>{:else}—{/if}</td
							>
						</tr>
					{:else}
						<TableState state="empty" colspan={4} title="Aucun paiement." />
					{/each}
				</tbody>
			</Table>
		</section>
		<section class="grid gap-4 md:grid-cols-2">
			<div class="rounded-2xl border bg-white p-5">
				<h2 class="font-bold">Échéance</h2>
				<input
					type="date"
					bind:value={dueDate}
					disabled={!receivableCan(permissions, 'receivables.due_date.manage')}
					class="min-h-control mt-3 rounded-lg border px-3 py-2"
				/>{#if receivableCan(permissions, 'receivables.due_date.manage')}<button
						onclick={saveDue}
						class="ml-2 rounded-lg bg-primary px-4 py-3 text-white hover:bg-primary-hover transition-colors"
						>Enregistrer</button
					>{/if}
			</div>
			<div class="rounded-2xl border bg-white p-5">
				<h2 class="font-bold">Historique de recouvrement</h2>
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
				<select bind:value={follow.actionType} class="min-h-control rounded-lg border px-3 py-2"
					><option>NOTE</option><option>REMINDER</option><option>PHONE_CALL</option><option
						>PAYMENT_PROMISE</option
					><option>OTHER</option></select
				><input
					bind:value={follow.note}
					placeholder="Note de suivi"
					class="min-h-control rounded-lg border px-3 py-2"
				/>{#if follow.actionType === 'PAYMENT_PROMISE'}<input
						type="date"
						bind:value={follow.promisedPaymentDate}
						class="min-h-control rounded-lg border px-3 py-2"
					/><input
						type="number"
						min="0"
						bind:value={follow.promisedAmount}
						class="min-h-control rounded-lg border px-3 py-2"
					/>{/if}<button
					disabled={!follow.note}
					onclick={addFollow}
					class="rounded-lg bg-primary p-3 font-semibold text-white hover:bg-primary-hover transition-colors"
					>Ajouter la relance</button
				>
			</section>{/if}
	</div>{/if}
