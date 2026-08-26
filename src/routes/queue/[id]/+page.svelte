<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { getQueueTicket } from '$lib/api/queue';
	import {
		financeLabels,
		formatWaitMinutes,
		priorityLabels,
		queueDoctorLabel,
		queuePatientLabel,
		queueServiceLabel,
		sourceLabels,
		stageLabels
	} from '$lib/components/queue/state';
	import type { QueueHistory, QueueTicketRow } from '$lib/types/queue';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';

	let ticket = $state<QueueTicketRow | null>(null);
	let history = $state<QueueHistory[]>([]);
	let loading = $state(true);
	let error = $state('');

	function formatDate(value: string) {
		return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(
			new Date(value)
		);
	}

	function historyLabel(entry: QueueHistory) {
		const from = entry.fromStage ? stageLabels[entry.fromStage as keyof typeof stageLabels] : '';
		const to = entry.toStage ? stageLabels[entry.toStage as keyof typeof stageLabels] : '';
		if (from && to) return `${from} → ${to}`;
		return entry.eventType.replaceAll('_', ' ');
	}

	async function load() {
		loading = true;
		error = '';
		try {
			const detail = await getQueueTicket(Number(page.params.id));
			ticket = detail.ticket;
			history = detail.history;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Ticket introuvable';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void load();
	});
</script>

<div class="space-y-6" data-testid="queue-detail">
	{#if loading}
		<LoadingState />
	{:else if !ticket}
		<Alert tone="danger">{error || 'Ticket introuvable'}</Alert>
	{:else}
		<PageHeader
			eyebrow="File patients"
			title={ticket.reference}
			description={queuePatientLabel(ticket)}
		/>

		{#if error}
			<Alert tone="danger">{error}</Alert>
		{/if}

		<div class="flex flex-wrap gap-2">
			<StatusBadge status={ticket.stage} label={stageLabels[ticket.stage]} />
			<StatusBadge status={ticket.priority} label={priorityLabels[ticket.priority]} />
			<StatusBadge status={ticket.status} />
			<StatusBadge
				status={ticket.financeStatus}
				label={financeLabels[ticket.financeStatus] ?? ticket.financeStatus}
			/>
		</div>

		<div class="grid gap-6 xl:grid-cols-3">
			<section class="space-y-4 xl:col-span-2">
				<article
					class="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-card)]"
				>
					<h2 class="text-sm font-bold text-slate-700">Informations</h2>
					<dl class="mt-4 grid gap-3 text-sm md:grid-cols-2">
						<div>
							<dt class="text-slate-500">Service</dt>
							<dd class="font-medium">{queueServiceLabel(ticket)}</dd>
						</div>
						<div>
							<dt class="text-slate-500">Médecin attendu</dt>
							<dd class="font-medium">{queueDoctorLabel(ticket)}</dd>
						</div>
						<div>
							<dt class="text-slate-500">Source</dt>
							<dd class="font-medium">{sourceLabels[ticket.source]}</dd>
						</div>
						<div>
							<dt class="text-slate-500">Attente</dt>
							<dd class="font-medium">{formatWaitMinutes(ticket.waitMinutes)}</dd>
						</div>
						<div>
							<dt class="text-slate-500">Arrivée</dt>
							<dd class="font-medium">{formatDate(ticket.arrivedAt)}</dd>
						</div>
						<div>
							<dt class="text-slate-500">Enregistrement</dt>
							<dd class="font-medium">{formatDate(ticket.checkedInAt)}</dd>
						</div>
						{#if ticket.consultationId}
							<div>
								<dt class="text-slate-500">Consultation</dt>
								<dd class="font-medium">#{ticket.consultationId}</dd>
							</div>
						{/if}
						{#if ticket.financeOverride}
							<div class="md:col-span-2">
								<dt class="text-slate-500">Dérogation financière</dt>
								<dd class="font-medium">{ticket.financeOverrideNote || 'Oui'}</dd>
							</div>
						{/if}
					</dl>
				</article>

				<article
					class="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-card)]"
				>
					<h2 class="text-sm font-bold text-slate-700">Historique</h2>
					{#if history.length === 0}
						<p class="mt-4 text-sm text-slate-500">Aucun événement enregistré.</p>
					{:else}
						<ol class="mt-4 space-y-4">
							{#each history as entry (entry.id)}
								<li class="relative border-l-2 border-border pl-4">
									<p class="text-sm font-medium">{historyLabel(entry)}</p>
									<p class="text-xs text-slate-500">{formatDate(entry.createdAt)}</p>
									{#if entry.reason}
										<p class="mt-1 text-sm text-slate-600">{entry.reason}</p>
									{/if}
								</li>
							{/each}
						</ol>
					{/if}
				</article>
			</section>

			<aside class="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
				<h2 class="text-sm font-bold text-slate-700">Parcours</h2>
				<ul class="mt-4 space-y-2 text-sm">
					<li>
						<span class="text-slate-500">Identité confirmée :</span>
						{ticket.identityConfirmed ? 'Oui' : 'Non'}
					</li>
					<li>
						<span class="text-slate-500">Triage pris :</span>
						{ticket.triageTakenAt ? formatDate(ticket.triageTakenAt) : '—'}
					</li>
					<li>
						<span class="text-slate-500">Triage terminé :</span>
						{ticket.triageCompletedAt ? formatDate(ticket.triageCompletedAt) : '—'}
					</li>
					<li>
						<span class="text-slate-500">Médecin pris :</span>
						{ticket.doctorTakenAt ? formatDate(ticket.doctorTakenAt) : '—'}
					</li>
				</ul>
			</aside>
		</div>
	{/if}
</div>
