<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	/**
	 * Barre de recherche/filtres associée à un tableau. `plain` lorsqu'elle vit déjà
	 * dans une carte (pas de double bordure).
	 */
	interface Props {
		variant?: 'card' | 'plain';
		class?: string;
		children: Snippet;
	}

	let { variant = 'card', class: className = '', children }: Props = $props();
</script>

<div
	class={cn(
		'flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end',
		variant === 'card' && 'rounded-xl border border-border bg-surface p-4 shadow-xs',
		className
	)}
	data-testid="filter-bar"
>
	{@render children()}
</div>
