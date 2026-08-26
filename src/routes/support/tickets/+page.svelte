<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { getTicketKPIs, listTickets } from '$lib/api/ticketing';
	import { statusLabels } from '$lib/components/ticketing/state';
	import type { Ticket, TicketKPIs } from '$lib/types/ticketing';
	let tickets = $state<Ticket[]>([]),
		kpis = $state<TicketKPIs | null>(null),
		loading = $state(true),
		error = $state(''),
		search = $state(''),
		status = $state(''),
		priority = $state(''),
		sla = $state(false);
	async function load() {
		loading = true;
		try {
			const [p, k] = await Promise.all([
				listTickets({ search, status, priority, slaBreached: sla, limit: 100 }),
				getTicketKPIs()
			]);
			tickets = p.items;
			kpis = k;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Accès support impossible';
		} finally {
			loading = false;
		}
	}
	onMount(() => {
		void load();
	});
</script>

<div class="space-y-6 p-6">
	<header>
		<p class="text-xs font-black uppercase text-violet-700">Service Desk</p>
		<h1 class="text-3xl font-black">File support</h1>
		<p class="text-sm text-slate-500">Qualification, SLA et traitement des tickets autorisés.</p>
	</header>
	{#if error}<p role="alert" class="rounded-xl bg-red-50 p-3 text-red-700">
			{error}
		</p>{/if}{#if kpis}<section class="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
			{#each [['Ouverts', kpis.open], ['Nouveaux', kpis.newToday], ['P1/P2', kpis.p1p2], ['SLA dépassés', kpis.slaBreached], ['Résolus', kpis.resolved], ['Rouverts', kpis.reopened], ['Réponse moy.', `${Math.round(kpis.averageFirstResponseMinutes)} min`], ['MTTR', `${Math.round(kpis.mttrMinutes)} min`]] as x (x[0])}<div
					class="rounded-2xl border bg-white p-4"
				>
					<small class="font-bold uppercase text-slate-500">{x[0]}</small>
					<p class="mt-2 text-xl font-black">{x[1]}</p>
				</div>{/each}
		</section>{/if}
	<section class="rounded-2xl border bg-white">
		<div class="grid gap-3 border-b p-4 md:grid-cols-5">
			<input
				aria-label="Recherche"
				bind:value={search}
				placeholder="Référence ou sujet"
				class="rounded-xl border p-3"
			/><select aria-label="Statut" bind:value={status} class="rounded-xl border p-3"
				><option value="">Tous statuts</option
				>{#each Object.entries(statusLabels) as [v, l] (v)}<option value={v}>{l}</option
					>{/each}</select
			><select aria-label="Priorité" bind:value={priority} class="rounded-xl border p-3"
				><option value="">Toutes priorités</option>{#each ['P1', 'P2', 'P3', 'P4'] as v (v)}<option
						value={v}>{v}</option
					>{/each}</select
			><label class="flex items-center gap-2 rounded-xl border p-3"
				><input type="checkbox" bind:checked={sla} /> SLA dépassé</label
			><button onclick={load} class="rounded-xl bg-slate-900 font-bold text-white">Filtrer</button>
		</div>
		{#if loading}<p class="p-10 text-center">Chargement…</p>{:else}<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="bg-slate-50"
						><tr
							><th class="p-3">Ticket</th><th>Demandeur</th><th>Service</th><th>Priorité</th><th
								>Statut</th
							><th>Assigné</th></tr
						></thead
					><tbody
						>{#each tickets as t (t.id)}<tr class="border-t"
								><td class="p-3"
									><a href={resolve(`/tickets/${t.id}`)} class="font-black text-blue-700"
										>{t.reference}</a
									><small class="block">{t.title}</small></td
								><td>{t.requesterName}</td><td>{t.serviceName || '—'}</td><td>{t.priority}</td><td
									>{statusLabels[t.status]}</td
								><td>{t.assignedName || t.assignedQueue || '—'}</td></tr
							>{:else}<tr
								><td colspan="6" class="p-10 text-center text-slate-500">Aucun résultat.</td></tr
							>{/each}</tbody
					>
				</table>
			</div>{/if}
	</section>
</div>
