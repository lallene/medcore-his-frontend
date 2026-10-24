<script lang="ts">
	import { cn } from '$lib/utils';
	import { statusBadgeClass } from '$lib/design/status';

	interface Props {
		status: string;
		label?: string;
		class?: string;
		'data-testid'?: string;
	}

	let { status, label = '', class: className = '', 'data-testid': testId }: Props = $props();
</script>

<span
	class={cn(
		'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide whitespace-nowrap',
		statusBadgeClass(status),
		className
	)}
	title={status}
	data-testid={testId}
>
	{label || status}
</span>
