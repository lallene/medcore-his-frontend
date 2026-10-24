<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import LinkButton from '$lib/components/ui/LinkButton.svelte';
	import TableState from '$lib/components/ui/TableState.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { jwtDecode } from 'jwt-decode';
	import { getReceivableKPIs, listReceivables } from '$lib/api/receivables';
	import { formatXOF } from '$lib/components/billing/state';
	import { statusLabel } from '$lib/components/receivables/state';
	import type { ReceivableItem, ReceivableKPIs } from '$lib/types/receivables';
	let rows = $state<ReceivableItem[]>([]),
		kpis = $state<ReceivableKPIs | null>(null),
		loading = $state(true),
		error = $state(''),
		permissions = $state<string[]>([]);
	let search = $state(''),
		status = $state(''),
		due = $state('');
	const openCollection = (invoiceId: number) => {
		// LOT29C: primary collection is billing workspace (no cash-session required).
		if (permissions.includes('*') || permissions.includes('billing.payment.create')) {
			void goto(resolve(`/billing/${invoiceId}`));
			return;
		}
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		void goto(resolve('/cash') + `?invoiceId=${invoiceId}`);
	};
	async function load() {
		loading = true;
		try {
			const [p, k] = await Promise.all([
				listReceivables({ search, status, due, limit: 100 }),
				getReceivableKPIs()
			]);
			rows = p.items;
			kpis = k;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Chargement impossible';
		} finally {
			loading = false;
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
		void load();
	});
</script>

<div class="space-y-6 p-6">
	<header>
		<p class="text-xs font-semibold uppercase text-rose-700">Recouvrement patient</p>
		<h1 class="text-3xl font-bold">Créances patients</h1>
		<p class="text-sm text-slate-500">
			Restes dus par les patients uniquement — hors créances assurances.
		</p>
	</header>
	{#if error}<p class="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>{/if}
	{#if kpis}<section class="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
			{#each [['Total créances', formatXOF(kpis.totalReceivables)], ['Échues', formatXOF(kpis.overdueReceivables)], ['Non échues', formatXOF(kpis.nonOverdueReceivables)], ['Encaissé', formatXOF(kpis.collectedAmount)], ['Patients débiteurs', kpis.debtorPatients], ['Factures impayées', kpis.unpaidInvoices]] as x (x[0])}<div
					class="rounded-2xl border bg-white p-4"
				>
					<small class="font-bold uppercase text-slate-500">{x[0]}</small>
					<p class="mt-2 text-xl font-bold">{x[1]}</p>
				</div>{/each}
		</section>{/if}
	<section class="rounded-2xl border bg-white">
		<div class="grid gap-3 border-b p-4 md:grid-cols-4">
			<input
				bind:value={search}
				placeholder="Patient, code ou facture"
				class="min-h-control rounded-lg border px-3 py-2"
			/><select bind:value={status} class="min-h-control rounded-lg border px-3 py-2"
				><option value="">Tous statuts</option><option value="DUE">À payer</option><option
					value="PARTIALLY_PAID">Partiellement payé</option
				><option value="OVERDUE">Échu</option></select
			><select bind:value={due} class="min-h-control rounded-lg border px-3 py-2"
				><option value="">Toutes échéances</option><option value="OVERDUE">Échues</option><option
					value="FUTURE">À venir</option
				><option value="NONE">Sans échéance</option></select
			><button
				onclick={load}
				class="rounded-lg bg-primary font-semibold text-white hover:bg-primary-hover transition-colors"
				>Filtrer</button
			>
		</div>
		<Table minWidth="1250px">
			<thead
				><tr
					><th>Patient</th><th>Facture</th><th>Actes</th><th class="mc-num">Brut</th><th
						class="mc-num">Assurance</th
					><th class="mc-num">Part patient</th><th class="mc-num">Payé</th><th class="mc-num"
						>Reste patient</th
					><th>Échéance</th><th>Statut</th><th class="mc-actions">Actions</th></tr
				></thead
			><tbody
				>{#if loading}<TableState
						state="loading"
						colspan={11}
						title="Chargement…"
					/>{:else}{#each rows as r (r.invoiceId)}<tr
							><td><b>{r.patientName}</b><small class="block">{r.patientCode}</small></td><td
								><a href={resolve(`/receivables/${r.invoiceId}`)}>{r.invoiceNumber}</a><small
									class="block">{new Date(r.invoiceDate).toLocaleDateString('fr-FR')}</small
								></td
							><td class="max-w-48 truncate">{r.descriptions}</td><td class="mc-amount"
								>{formatXOF(r.grossAmount)}</td
							><td class="mc-amount">{formatXOF(r.insuranceAmount)}</td><td class="mc-amount"
								>{formatXOF(r.patientDue)}</td
							><td class="mc-amount">{formatXOF(r.patientPaid)}</td><td
								class="text-rose-700 mc-amount font-semibold">{formatXOF(r.patientBalance)}</td
							><td>{r.dueDate ? new Date(r.dueDate).toLocaleDateString('fr-FR') : '—'}</td><td
								>{statusLabel[r.status]}</td
							><td class="mc-actions"
								><LinkButton size="sm" variant="ghost" href={resolve(`/receivables/${r.invoiceId}`)}
									>Détail</LinkButton
								>{#if permissions.includes('*') || permissions.includes('billing.payment.create') || permissions.includes('cash.payment.create')}<Button
										size="sm"
										variant="secondary"
										onclick={() => openCollection(r.invoiceId)}
										data-testid={`receivable-encaisser-${r.invoiceId}`}>Encaisser</Button
									>{/if}</td
							></tr
						>{:else}<TableState
							state="empty"
							colspan={11}
							title="Aucune créance patient active."
						/>{/each}{/if}</tbody
			>
		</Table>
	</section>
</div>
