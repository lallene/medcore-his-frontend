<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { completeQueueTicket, listQueueTickets, takeDoctor } from '$lib/api/queue';
	import {
		doctorQueueColumns,
		formatWaitMinutes,
		priorityLabels,
		queueDoctorLabel,
		queuePatientLabel,
		queueServiceLabel,
		stageLabels
	} from '$lib/components/queue/state';
	import type { QueueTicketRow } from '$lib/types/queue';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';

	let tickets = $state<QueueTicketRow[]>([]);
	let loading = $state(true);
	let error = $state('');
	let actingId = $state<number | null>(null);

	async function load() {
		loading = true;
		error = '';
		try {
			const [waiting, inProgress] = await Promise.all([
				listQueueTickets({ stage: 'WAITING_DOCTOR', limit: 100 }),
				listQueueTickets({ stage: 'DOCTOR_IN_PROGRESS', limit: 100 })
			]);
			tickets = [...waiting.items, ...inProgress.items];
		} catch (e) {
			error = e instanceof Error ? e.message : 'Impossible de charger la file médecin';
		} finally {
			loading = false;
		}
	}

	async function take(id: number) {
		actingId = id;
		error = '';
		try {
			await takeDoctor(id, { createConsultation: true });
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
			await completeQueueTicket(id);
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Clôture consultation refusée';
		} finally {
			actingId = null;
		}
	}

	onMount(() => {
		void load();
	});
</script>

<div class="space-y-6" data-testid="queue-doctor">
	<PageHeader
		eyebrow="File patients"
		title="File médecin"
		description="Patients en attente ou en consultation médicale."
	/>

	{#if error}
		<Alert tone="danger">{error}</Alert>
	{/if}

	<section class="rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)]">
		<div class="flex items-center justify-between border-b border-border px-4 py-3">
			<h2 class="text-sm font-bold text-slate-700">File médicale</h2>
			<Button variant="secondary" size="sm" onclick={load}>Actualiser</Button>
		</div>

		{#if loading}
			<LoadingState />
		{:else if tickets.length === 0}
			<div class="p-4"><EmptyState title="Aucun patient en attente médecin" /></div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="bg-surface-muted text-xs uppercase text-slate-500">
						<tr>
							{#each doctorQueueColumns as column (column)}
								<th class="p-3">{column}</th>
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
								<td class="p-3">{queueDoctorLabel(ticket)}</td>
								<td class="p-3">
									<StatusBadge status={ticket.priority} label={priorityLabels[ticket.priority]} />
								</td>
								<td class="p-3">{formatWaitMinutes(ticket.waitMinutes)}</td>
								<td class="p-3">
									<StatusBadge status={ticket.stage} label={stageLabels[ticket.stage]} />
								</td>
								<td class="p-3">
									<div class="flex flex-wrap gap-2">
										{#if ticket.stage === 'WAITING_DOCTOR'}
											<Button
												size="sm"
												data-testid="queue-doctor-take"
												loading={actingId === ticket.id}
												onclick={() => take(ticket.id)}>Prendre</Button
											>
										{:else if ticket.stage === 'DOCTOR_IN_PROGRESS'}
											<Button
												size="sm"
												variant="success"
												loading={actingId === ticket.id}
												onclick={() => complete(ticket.id)}>Terminer</Button
											>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</div>
