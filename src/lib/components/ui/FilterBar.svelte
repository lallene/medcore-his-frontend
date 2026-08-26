<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	interface Props {
		class?: string;
		children: Snippet;
	}

	let { class: className = '', children }: Props = $props();
</script>

<div
	class={cn(
		'flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)] md:flex-row md:flex-wrap md:items-end',
		className
	)}
	data-testid="filter-bar"
>
	{@render children()}
</div>
