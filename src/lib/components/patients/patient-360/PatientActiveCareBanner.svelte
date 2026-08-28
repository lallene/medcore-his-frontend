<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { getPatientActiveQueueTicket } from '$lib/api/queue';
	import { stageLabels } from '$lib/components/queue/state';
	import type { QueueTicketRow } from '$lib/types/queue';
	import { can, canAny, getStoredPermissions } from '$lib/rbac/permissions';
	import Alert from '$lib/components/ui/Alert.svelte';

	type Props = {
		patientId: number;
	};

	let { patientId }: Props = $props();

	let ticket = $state<QueueTicketRow | null>(null);
	let loading = $state(false);

	const permissions = getStoredPermissions();
	const canReadQueue = canAny(permissions, [
		'queue.doctor.read',
		'queue.read.service',
		'queue.read.all'
	]);
	const canOpenConsultation = can(permissions, 'consultations.read');

	onMount(async () => {
		if (!canReadQueue) return;
		loading = true;
		try {
			ticket = await getPatientActiveQueueTicket(patientId);
		} catch {
			ticket = null;
		} finally {
			loading = false;
		}
	});
</script>

{#if !loading && ticket}
	<div data-testid="patient-active-care-banner">
		<Alert tone="info" title="Prise en charge en cours">
			<p class="text-sm">
				Ticket <span class="font-mono">{ticket.reference}</span>
				· {stageLabels[ticket.stage]}
				· {ticket.serviceName}
				{#if ticket.doctorTakenByName}
					· {ticket.doctorTakenByName}
				{/if}
			</p>
			{#if canOpenConsultation && ticket.consultationId}
				<a
					href={resolve(`/consultations/${ticket.consultationId}`)}
					class="mt-2 inline-block text-sm font-semibold text-primary hover:underline"
					data-testid="patient-active-care-consultation-link"
				>
					Ouvrir la consultation
				</a>
			{/if}
		</Alert>
	</div>
{/if}
