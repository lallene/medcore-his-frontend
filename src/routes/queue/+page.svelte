<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { getQueueKPIs, listQueueTickets } from '$lib/api/queue';
	import {
		dashboardQueueColumns,
		formatWaitMinutes,
		priorityLabels,
		queuePatientLabel,
		queueServiceLabel,
		stageLabels
	} from '$lib/components/queue/state';
	import type { QueueKPIs, QueueTicketRow } from '$lib/types/queue';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import MetricCard from '$lib/components/ui/MetricCard.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';

	let kpis = $state<QueueKPIs | null>(null);
	let tickets = $state<QueueTicketRow[]>([]);
	let loading = $state(true);
	let error = $state('');

	async function load() {
		loading = true;
		error = '';
		try {
			const [k, p] = await Promise.all([getQueueKPIs(), listQueueTickets({ limit: 20 })]);
			kpis = k;
			tickets = p.items;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Impossible de charger la file patients';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void load();
	});
</script>

<div class="space-y-6" data-testid="queue-dashboard">
	<PageHeader
		eyebrow="Clinique"
		title="File patients"
		description="Vue d'ensemble des arrivées, attentes et parcours du jour."
	/>

	{#if error}
		<Alert tone="danger">{error}</Alert>
	{/if}

	<div class="flex flex-wrap gap-3">
		<a
			class="inline-flex items-center justify-center rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground hover:bg-slate-300"
			href={resolve('/queue/reception')}>Accueil</a
		>
		<a
			class="inline-flex items-center justify-center rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground hover:bg-slate-300"
			href={resolve('/queue/triage')}>Pré-triage</a
		>
		<a
			class="inline-flex items-center justify-center rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground hover:bg-slate-300"
			href={resolve('/queue/doctor')}>File médecin</a
		>
	</div>

	{#if kpis}
		<section class="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
			<div data-testid="queue-kpi-arrived">
				<MetricCard title="Arrivées" value={kpis.arrivedToday} />
			</div>
			<MetricCard title="Attente accueil" value={kpis.waitingReception} />
			<MetricCard title="Attente triage" value={kpis.waitingTriage} />
			<MetricCard title="Attente médecin" value={kpis.waitingDoctor} />
			<MetricCard title="En cours" value={kpis.inProgress} />
			<MetricCard title="Terminés" value={kpis.completedToday} />
			<MetricCard title="Attente moy." value={`${Math.round(kpis.avgWaitMinutes)} min`} />
			<MetricCard title="Retards RDV" value={kpis.lateAppointments} />
		</section>
	{/if}

	<section class="rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)]">
		<div class="border-b border-border px-4 py-3">
			<h2 class="text-sm font-bold text-slate-700">Tickets récents</h2>
		</div>

		{#if loading}
			<LoadingState />
		{:else if tickets.length === 0}
			<div class="p-4"><EmptyState title="Aucun ticket actif" /></div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="bg-surface-muted text-xs uppercase text-slate-500">
						<tr>
							{#each dashboardQueueColumns as column, index (column)}
								<th class={index === 0 ? 'p-3' : 'p-3'}>{column}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each tickets as ticket (ticket.id)}
							<tr class="border-t border-border hover:bg-surface-muted/50">
								<td class="p-3">
									<a
										class="font-bold text-primary hover:underline"
										href={resolve(`/queue/${ticket.id}`)}>{ticket.reference}</a
									>
								</td>
								<td class="p-3">{queuePatientLabel(ticket)}</td>
								<td class="p-3">{queueServiceLabel(ticket)}</td>
								<td class="p-3">
									<StatusBadge status={ticket.priority} label={priorityLabels[ticket.priority]} />
								</td>
								<td class="p-3">
									<StatusBadge status={ticket.stage} label={stageLabels[ticket.stage]} />
								</td>
								<td class="p-3">{formatWaitMinutes(ticket.waitMinutes)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</div>
