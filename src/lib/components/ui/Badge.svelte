<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';
	import { toneBadgeClass, type StatusTone } from '$lib/design/status';

	type Variant = StatusTone | 'primary' | 'success' | 'warning' | 'danger' | 'secondary';

	interface Props {
		variant?: Variant;
		class?: string;
		children?: Snippet;
	}

	let { variant = 'primary', class: className = '', children }: Props = $props();

	const map: Record<string, StatusTone> = {
		primary: 'primary',
		success: 'success',
		warning: 'warning',
		danger: 'danger',
		secondary: 'neutral',
		neutral: 'neutral',
		info: 'info'
	};
</script>

<span
	class={cn(
		'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
		toneBadgeClass(map[variant] ?? 'neutral'),
		className
	)}
>
	{@render children?.()}
</span>
