<script lang="ts">
	import { cn } from '$lib/utils';
	import { statusBadgeClass } from '$lib/design/status';

	interface Props {
		status: string;
		label?: string;
		class?: string;
	}

	let { status, label = '', class: className = '' }: Props = $props();
</script>

<span
	class={cn(
		'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide',
		statusBadgeClass(status),
		className
	)}
	title={status}
>
	{label || status}
</span>
