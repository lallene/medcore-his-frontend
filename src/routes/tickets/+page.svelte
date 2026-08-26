<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { listTickets } from '$lib/api/ticketing';
	import { statusLabels } from '$lib/components/ticketing/state';
	import type { Ticket } from '$lib/types/ticketing';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import FilterBar from '$lib/components/ui/FilterBar.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';

	let rows = $state<Ticket[]>([]);
	let loading = $state(true);
	let error = $state('');
	let search = $state('');
	let status = $state('');
	let priority = $state('');

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

<div class="space-y-6">
	<PageHeader
		eyebrow="MedCore Service Desk"
		title="Mes tickets"
		description="Incidents et demandes transmis au support interne."
	>
		{#snippet actions()}
			<Button onclick={() => goto(resolve('/tickets/create'))}>Créer un ticket</Button>
		{/snippet}
	</PageHeader>

	{#if error}
		<Alert tone="danger">{error}</Alert>
	{/if}

	<section class="rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)]">
		<FilterBar class="rounded-none border-0 border-b border-border shadow-none">
			<SearchInput
				id="ticket-search"
				bind:value={search}
				placeholder="Référence, titre ou description"
				class="min-w-[12rem] flex-1"
			/>
			<Select aria-label="Statut" bind:value={status} class="min-w-[10rem]">
				<option value="">Tous statuts</option>
				{#each Object.entries(statusLabels) as [value, label] (value)}
					<option {value}>{label}</option>
				{/each}
			</Select>
			<Select aria-label="Priorité" bind:value={priority} class="min-w-[8rem]">
				<option value="">Toutes priorités</option>
				{#each ['P1', 'P2', 'P3', 'P4'] as value (value)}
					<option {value}>{value}</option>
				{/each}
			</Select>
			<Button variant="secondary" onclick={load}>Filtrer</Button>
		</FilterBar>

		{#if loading}
			<LoadingState label="Chargement des tickets…" />
		{:else if rows.length === 0}
			<div class="p-4">
				<EmptyState
					title="Aucun ticket"
					description="Utilisez « Créer un ticket » pour contacter le support."
				/>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="bg-surface-muted text-xs uppercase text-slate-500">
						<tr>
							<th class="p-3">Référence</th>
							<th>Sujet</th>
							<th>Type</th>
							<th>Priorité</th>
							<th>Statut</th>
							<th>SLA</th>
							<th>Créé</th>
						</tr>
					</thead>
					<tbody>
						{#each rows as ticket (ticket.id)}
							<tr class="border-t border-border hover:bg-surface-muted/50">
								<td class="p-3">
									<a
										class="font-bold text-primary hover:underline"
										href={resolve(`/tickets/${ticket.id}`)}>{ticket.reference}</a
									>
								</td>
								<td>
									<b>{ticket.title}</b>
									<small class="block text-slate-500"
										>{ticket.applicationModule || ticket.categoryCode || 'Général'}</small
									>
								</td>
								<td>{ticket.type}</td>
								<td><StatusBadge status={ticket.priority} /></td>
								<td><StatusBadge status={ticket.status} label={statusLabels[ticket.status]} /></td>
								<td class:text-danger={ticket.responseSlaBreached || ticket.resolutionSlaBreached}>
									{ticket.responseSlaBreached || ticket.resolutionSlaBreached
										? 'Dépassé'
										: 'Dans les délais'}
								</td>
								<td>{new Date(ticket.createdAt).toLocaleString('fr-FR')}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</div>
