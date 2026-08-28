<script lang="ts">
	import { resolve } from '$app/paths';
	import { stageLabels, formatClock, formatWaitMinutes } from '$lib/components/queue/state';
	import type { QueueTicketRow } from '$lib/types/queue';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import { priorityLabels } from '$lib/components/queue/state';

	type Props = {
		ticket: QueueTicketRow | null;
		patientName?: string;
		consultationId?: number;
	};

	let { ticket, patientName = '', consultationId }: Props = $props();
</script>

{#if ticket}
	<section
		class="rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3"
		data-testid="clinical-flow-context-bar"
	>
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
				<span class="font-semibold text-slate-900">
					{patientName || ticket.patientName}
				</span>
				<span class="text-slate-500">Ticket {ticket.reference}</span>
				<span class="text-slate-600">{ticket.serviceName}</span>
				<StatusBadge status={ticket.priority} label={priorityLabels[ticket.priority]} />
				<span class="text-slate-600">{stageLabels[ticket.stage]}</span>
				<span class="tabular-nums text-slate-500">
					Arrivée {formatClock(ticket.arrivedAt)} · attente {formatWaitMinutes(ticket.waitMinutes)}
				</span>
			</div>
			<nav class="flex flex-wrap gap-2 text-sm font-medium">
				{#if consultationId}
					<a
						href={resolve(`/consultations/${consultationId}`)}
						class="text-primary hover:underline"
						data-testid="clinical-flow-back-consultation"
					>
						Retour consultation
					</a>
				{/if}
				<a
					href={resolve(`/patients/${ticket.patientId}`)}
					class="text-primary hover:underline"
					data-testid="clinical-flow-back-patient"
				>
					Retour Patient 360
				</a>
				<a
					href={resolve('/queue/doctor')}
					class="text-primary hover:underline"
					data-testid="clinical-flow-back-doctor-queue"
				>
					Retour file médecin
				</a>
			</nav>
		</div>
	</section>
{/if}
