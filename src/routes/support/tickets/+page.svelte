<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { getTicketKPIs, listTickets } from '$lib/api/ticketing';
	import {
		statusLabels,
		supportAssigneeLabel,
		supportQueueColumns,
		supportRequesterLabel,
		supportServiceLabel,
		supportSlaLabel
	} from '$lib/components/ticketing/state';
	import type { Ticket, TicketKPIs } from '$lib/types/ticketing';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import MetricCard from '$lib/components/ui/MetricCard.svelte';
	import FilterBar from '$lib/components/ui/FilterBar.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';

	let tickets = $state<Ticket[]>([]);
	let kpis = $state<TicketKPIs | null>(null);
	let loading = $state(true);
	let error = $state('');
	let search = $state('');
	let status = $state('');
	let priority = $state('');
	let sla = $state(false);

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

<div class="space-y-6">
	<PageHeader
		eyebrow="Service Desk"
		title="File support"
		description="Qualification, SLA et traitement des tickets autorisés."
	/>

	{#if error}
		<Alert tone="danger">{error}</Alert>
	{/if}

	{#if kpis}
		<section class="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
			{#each [['Ouverts', kpis.open], ['Nouveaux', kpis.newToday], ['P1/P2', kpis.p1p2], ['SLA dépassés', kpis.slaBreached], ['Résolus', kpis.resolved], ['Rouverts', kpis.reopened], ['Réponse moy.', `${Math.round(kpis.averageFirstResponseMinutes)} min`], ['MTTR', `${Math.round(kpis.mttrMinutes)} min`]] as x (x[0])}
				<MetricCard title={String(x[0])} value={x[1]} />
			{/each}
		</section>
	{/if}

	<section class="rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)]">
		<FilterBar class="rounded-none border-0 border-b border-border shadow-none">
			<SearchInput bind:value={search} class="min-w-[12rem] flex-1" />
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
			<Checkbox bind:checked={sla} label="SLA dépassé" />
			<Button variant="secondary" onclick={load}>Filtrer</Button>
		</FilterBar>

		{#if loading}
			<LoadingState />
		{:else if tickets.length === 0}
			<div class="p-4"><EmptyState title="Aucun ticket dans le périmètre" /></div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm" data-testid="support-queue-table">
					<thead class="bg-surface-muted text-xs uppercase text-slate-500">
						<tr>
							{#each supportQueueColumns as column, index (column)}
								<th class={index === 0 ? 'p-3' : ''}>{column}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each tickets as ticket (ticket.id)}
							<tr class="border-t border-border hover:bg-surface-muted/50">
								<td class="p-3">
									<a
										class="font-bold text-primary hover:underline"
										href={resolve(`/tickets/${ticket.id}`)}>{ticket.reference}</a
									>
								</td>
								<td>{ticket.title || '—'}</td>
								<td>{supportRequesterLabel(ticket)}</td>
								<td>{supportServiceLabel(ticket)}</td>
								<td><StatusBadge status={ticket.priority} /></td>
								<td><StatusBadge status={ticket.status} label={statusLabels[ticket.status]} /></td>
								<td>{supportAssigneeLabel(ticket)}</td>
								<td class:text-danger={ticket.responseSlaBreached || ticket.resolutionSlaBreached}>
									{supportSlaLabel(ticket)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</div>
