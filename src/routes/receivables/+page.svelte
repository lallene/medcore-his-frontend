<script lang="ts">
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
	const openCash = (invoiceId: number) =>
		// The route itself is resolved; only its query string is appended dynamically.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(resolve('/cash') + `?invoiceId=${invoiceId}`);
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
		<p class="text-xs font-black uppercase text-rose-700">Recouvrement patient</p>
		<h1 class="text-3xl font-black">Créances patients</h1>
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
					<p class="mt-2 text-xl font-black">{x[1]}</p>
				</div>{/each}
		</section>{/if}
	<section class="rounded-2xl border bg-white">
		<div class="grid gap-3 border-b p-4 md:grid-cols-4">
			<input
				bind:value={search}
				placeholder="Patient, code ou facture"
				class="rounded-xl border p-3"
			/><select bind:value={status} class="rounded-xl border p-3"
				><option value="">Tous statuts</option><option value="DUE">À payer</option><option
					value="PARTIALLY_PAID">Partiellement payé</option
				><option value="OVERDUE">Échu</option></select
			><select bind:value={due} class="rounded-xl border p-3"
				><option value="">Toutes échéances</option><option value="OVERDUE">Échues</option><option
					value="FUTURE">À venir</option
				><option value="NONE">Sans échéance</option></select
			><button onclick={load} class="rounded-xl bg-slate-900 font-bold text-white">Filtrer</button>
		</div>
		{#if loading}<p class="p-8 text-center">Chargement…</p>{:else}<div class="overflow-x-auto">
				<table class="w-full min-w-[1250px] text-left text-sm">
					<thead class="bg-slate-50 text-xs uppercase text-slate-500"
						><tr
							><th class="p-3">Patient</th><th>Facture</th><th>Actes</th><th>Brut</th><th
								>Assurance</th
							><th>Part patient</th><th>Payé</th><th>Reste patient</th><th>Échéance</th><th
								>Statut</th
							><th>Actions</th></tr
						></thead
					><tbody
						>{#each rows as r (r.invoiceId)}<tr class="border-t"
								><td class="p-3"
									><b>{r.patientName}</b><small class="block">{r.patientCode}</small></td
								><td
									><a class="font-black text-blue-700" href={resolve(`/receivables/${r.invoiceId}`)}
										>{r.invoiceNumber}</a
									><small class="block">{new Date(r.invoiceDate).toLocaleDateString('fr-FR')}</small
									></td
								><td class="max-w-48 truncate">{r.descriptions}</td><td
									>{formatXOF(r.grossAmount)}</td
								><td>{formatXOF(r.insuranceAmount)}</td><td>{formatXOF(r.patientDue)}</td><td
									>{formatXOF(r.patientPaid)}</td
								><td class="font-black text-rose-700">{formatXOF(r.patientBalance)}</td><td
									>{r.dueDate ? new Date(r.dueDate).toLocaleDateString('fr-FR') : '—'}</td
								><td>{statusLabel[r.status]}</td><td class="space-x-2"
									><a href={resolve(`/receivables/${r.invoiceId}`)} class="font-bold text-blue-700"
										>Détail</a
									>{#if permissions.includes('*') || permissions.includes('cash.payment.create')}<button
											onclick={() => openCash(r.invoiceId)}
											class="font-bold text-emerald-700">Encaisser</button
										>{/if}</td
								></tr
							>{:else}<tr
								><td colspan="11" class="p-10 text-center text-slate-500"
									>Aucune créance patient active.</td
								></tr
							>{/each}</tbody
					>
				</table>
			</div>{/if}
	</section>
</div>
