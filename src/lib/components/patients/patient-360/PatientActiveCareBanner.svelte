<script lang="ts">
	import { resolve } from '$app/paths';
	import { browser } from '$app/environment';
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

	let loadGeneration = 0;

	const permissions = getStoredPermissions();
	const canReadQueue = canAny(permissions, [
		'queue.doctor.read',
		'queue.read.service',
		'queue.read.all'
	]);
	const canReadMinimal = can(permissions, 'patients.360.read');
	const canOpenConsultation = can(permissions, 'consultations.read');

	function isCurrent(token: number): boolean {
		return token === loadGeneration;
	}

	$effect(() => {
		if (!browser) return;
		const pid = patientId;
		if (!canReadQueue && !canReadMinimal) {
			ticket = null;
			loading = false;
			return;
		}

		loadGeneration += 1;
		const token = loadGeneration;
		ticket = null;
		loading = true;

		void (async () => {
			try {
				const row = await getPatientActiveQueueTicket(pid);
				if (!isCurrent(token)) return;
				ticket = row;
			} catch {
				if (!isCurrent(token)) return;
				ticket = null;
			} finally {
				if (isCurrent(token)) loading = false;
			}
		})();
	});
</script>

{#if !loading && ticket}
	<div data-testid="patient-active-care-banner">
		<Alert tone="info" title="Prise en charge en cours">
			<p class="text-sm">
				Ticket <span class="font-mono">{ticket.reference}</span>
				· {stageLabels[ticket.stage] ?? ticket.stage}
				{#if ticket.serviceName}
					· {ticket.serviceName}
				{/if}
				{#if canReadQueue && ticket.doctorTakenByName}
					· {ticket.doctorTakenByName}
				{/if}
			</p>
			{#if canReadQueue && canOpenConsultation && ticket.consultationId}
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
