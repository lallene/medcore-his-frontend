<script lang="ts">
	import TableState from '$lib/components/ui/TableState.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import HelpHint from '$lib/components/help/HelpHint.svelte';
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { completeTriage, listQueueTickets, takeTriage } from '$lib/api/queue';
	import {
		formatWaitMinutes,
		priorityLabels,
		queuePatientLabel,
		queueServiceLabel,
		stageLabels,
		triageQueueColumns
	} from '$lib/components/queue/state';
	import type { QueueTicketRow } from '$lib/types/queue';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';

	let tickets = $state<QueueTicketRow[]>([]);
	let loading = $state(true);
	let error = $state('');
	let actingId = $state<number | null>(null);

	async function load() {
		loading = true;
		error = '';
		try {
			const [waiting, inProgress] = await Promise.all([
				listQueueTickets({ stage: 'WAITING_TRIAGE', limit: 100 }),
				listQueueTickets({ stage: 'TRIAGE_IN_PROGRESS', limit: 100 })
			]);
			tickets = [...waiting.items, ...inProgress.items];
		} catch (e) {
			error = e instanceof Error ? e.message : 'Impossible de charger la file triage';
		} finally {
			loading = false;
		}
	}

	async function take(id: number) {
		actingId = id;
		error = '';
		try {
			await takeTriage(id);
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Prise en charge refusée';
		} finally {
			actingId = null;
		}
	}

	async function complete(id: number) {
		actingId = id;
		error = '';
		try {
			await completeTriage(id);
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Clôture triage refusée';
		} finally {
			actingId = null;
		}
	}

	onMount(() => {
		void load();
	});
	// LOT AIDE: help keys for non-obvious triage columns.
	const triageColumnHelp: Partial<Record<string, string>> = {
		Priorité: 'queue.ticket.priority',
		Attente: 'queue.ticket.wait_time',
		Étape: 'queue.ticket.stage'
	};
</script>

<div class="space-y-6" data-testid="queue-triage">
	<PageHeader
		eyebrow="File patients"
		title="Pré-triage"
		description="Patients en attente ou en cours de triage infirmier."
	/>

	{#if error}
		<Alert tone="danger">{error}</Alert>
	{/if}

	<section class="rounded-2xl border border-border bg-surface shadow-xs">
		<div class="flex items-center justify-between border-b border-border px-4 py-3">
			<h2 class="text-sm font-bold text-slate-700">File de triage</h2>
			<Button variant="secondary" size="sm" onclick={load}>Actualiser</Button>
		</div>

		<Table>
			<thead>
				<tr>
					{#each triageQueueColumns as column, i (column)}
						<th class:mc-actions={i === triageQueueColumns.length - 1}
							><span class="inline-flex items-center gap-1"
								>{column}{#if triageColumnHelp[column]}<HelpHint
										helpKey={triageColumnHelp[column]}
									/>{/if}</span
							></th
						>
					{/each}
				</tr>
			</thead>
			<tbody
				>{#if loading}<TableState
						state="loading"
						colspan={triageQueueColumns.length}
					/>{:else if tickets.length === 0}<TableState
						state="empty"
						colspan={triageQueueColumns.length}
						title="Aucun patient en triage"
					/>{:else}
					{#each tickets as ticket (ticket.id)}
						<tr>
							<td>
								<a href={resolve(`/queue/${ticket.id}`)}>{ticket.reference}</a>
							</td>
							<td>{queuePatientLabel(ticket)}</td>
							<td>{queueServiceLabel(ticket)}</td>
							<td>
								<StatusBadge status={ticket.priority} label={priorityLabels[ticket.priority]} />
							</td>
							<td>{formatWaitMinutes(ticket.waitMinutes)}</td>
							<td>
								<StatusBadge status={ticket.stage} label={stageLabels[ticket.stage]} />
							</td>
							<td class="mc-actions">
								<div class="flex flex-wrap gap-2">
									{#if ticket.stage === 'WAITING_TRIAGE'}
										<Button
											size="sm"
											data-testid="queue-triage-take"
											loading={actingId === ticket.id}
											onclick={() => take(ticket.id)}>Prendre</Button
										>
									{:else if ticket.stage === 'TRIAGE_IN_PROGRESS'}
										<Button
											size="sm"
											variant="success"
											data-testid="queue-triage-complete"
											loading={actingId === ticket.id}
											onclick={() => complete(ticket.id)}>Terminer</Button
										>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				{/if}</tbody
			>
		</Table>
	</section>
</div>
