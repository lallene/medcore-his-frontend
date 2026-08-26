<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { listTickets } from '$lib/api/ticketing';
	import { statusLabels } from '$lib/components/ticketing/state';
	import type { Ticket } from '$lib/types/ticketing';
	let rows = $state<Ticket[]>([]),
		loading = $state(true),
		error = $state(''),
		search = $state(''),
		status = $state(''),
		priority = $state('');
	async function load() {
		loading = true;
		error = '';
		try {
			rows = (await listTickets({ search, status, priority, limit: 100 })).items;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Chargement impossible';
		} finally {
			loading = false;
		}
	}
	onMount(() => {
		void load();
	});
</script>

<div class="space-y-6 p-6">
	<header class="flex items-end justify-between">
		<div>
			<p class="text-xs font-black uppercase text-blue-700">MedCore Service Desk</p>
			<h1 class="text-3xl font-black">Mes tickets</h1>
			<p class="text-sm text-slate-500">Incidents et demandes transmis au support interne.</p>
		</div>
		<a
			href={resolve('/tickets/create')}
			class="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white">Créer un ticket</a
		>
	</header>
	{#if error}<p role="alert" class="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>{/if}
	<section class="rounded-2xl border bg-white">
		<div class="grid gap-3 border-b p-4 md:grid-cols-4">
			<label class="sr-only" for="ticket-search">Recherche</label><input
				id="ticket-search"
				bind:value={search}
				placeholder="Référence, titre ou description"
				class="rounded-xl border p-3"
			/><select aria-label="Statut" bind:value={status} class="rounded-xl border p-3"
				><option value="">Tous statuts</option
				>{#each Object.entries(statusLabels) as [value, label] (value)}<option {value}
						>{label}</option
					>{/each}</select
			><select aria-label="Priorité" bind:value={priority} class="rounded-xl border p-3"
				><option value="">Toutes priorités</option
				>{#each ['P1', 'P2', 'P3', 'P4'] as value (value)}<option {value}>{value}</option
					>{/each}</select
			><button onclick={load} class="rounded-xl bg-slate-900 font-bold text-white">Filtrer</button>
		</div>
		{#if loading}<p class="p-10 text-center">Chargement…</p>{:else}<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="bg-slate-50 text-xs uppercase text-slate-500"
						><tr
							><th class="p-3">Référence</th><th>Sujet</th><th>Type</th><th>Priorité</th><th
								>Statut</th
							><th>SLA</th><th>Créé</th></tr
						></thead
					><tbody
						>{#each rows as ticket (ticket.id)}<tr class="border-t"
								><td class="p-3"
									><a class="font-black text-blue-700" href={resolve(`/tickets/${ticket.id}`)}
										>{ticket.reference}</a
									></td
								><td
									><b>{ticket.title}</b><small class="block text-slate-500"
										>{ticket.applicationModule || ticket.categoryCode || 'Général'}</small
									></td
								><td>{ticket.type}</td><td
									><span class="rounded-full bg-slate-100 px-2 py-1 font-black"
										>{ticket.priority}</span
									></td
								><td>{statusLabels[ticket.status]}</td><td
									class:text-red-700={ticket.responseSlaBreached || ticket.resolutionSlaBreached}
									>{ticket.responseSlaBreached || ticket.resolutionSlaBreached
										? 'Dépassé'
										: 'Dans les délais'}</td
								><td>{new Date(ticket.createdAt).toLocaleString('fr-FR')}</td></tr
							>{:else}<tr
								><td colspan="7" class="p-10 text-center text-slate-500"
									>Aucun ticket. Utilisez « Créer un ticket » pour contacter le support.</td
								></tr
							>{/each}</tbody
					>
				</table>
			</div>{/if}
	</section>
</div>
