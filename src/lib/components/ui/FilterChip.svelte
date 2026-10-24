<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	/** Filtre rapide (bascule) associé à un tableau : état exposé via `aria-pressed`. */
	interface Props {
		selected?: boolean;
		onclick?: (e: MouseEvent) => void;
		class?: string;
		children?: Snippet;
		'data-testid'?: string;
	}

	let {
		selected = false,
		onclick,
		class: className = '',
		children,
		'data-testid': testId
	}: Props = $props();
</script>

<button
	type="button"
	aria-pressed={selected}
	{onclick}
	data-testid={testId}
	class={cn(
		'inline-flex min-h-control-sm shrink-0 items-center gap-1.5 rounded-md border px-3 text-small font-medium transition-colors',
		selected
			? 'border-primary-border bg-primary-soft text-primary'
			: 'border-border bg-surface text-foreground-secondary hover:border-border-strong hover:bg-surface-muted hover:text-foreground',
		className
	)}
>
	{@render children?.()}
</button>
