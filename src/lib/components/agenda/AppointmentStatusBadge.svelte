<script lang="ts">
	import { cn } from '$lib/utils';
	import { toneBadgeClass } from '$lib/design/status';
	import { appointmentStatusLabels, appointmentStatusTone } from '$lib/components/agenda/state';
	import type { AppointmentStatus } from '$lib/types/scheduling';

	interface Props {
		status: AppointmentStatus;
		class?: string;
	}

	let { status, class: className = '' }: Props = $props();
</script>

<span
	class={cn(
		'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
		toneBadgeClass(appointmentStatusTone(status)),
		className
	)}
	data-testid={`agenda-status-${status}`}
>
	{appointmentStatusLabels[status]}
</span>
