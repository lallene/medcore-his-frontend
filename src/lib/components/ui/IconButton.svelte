<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	interface Props {
		type?: 'button' | 'submit';
		disabled?: boolean;
		loading?: boolean;
		label: string;
		/** Infobulle native ; par défaut le libellé accessible. */
		title?: string;
		size?: 'sm' | 'md';
		class?: string;
		onclick?: (e: MouseEvent) => void;
		children?: Snippet;
	}

	let {
		type = 'button',
		disabled = false,
		loading = false,
		label,
		title,
		size = 'md',
		class: className = '',
		onclick,
		children
	}: Props = $props();
</script>

<button
	{type}
	{onclick}
	disabled={disabled || loading}
	aria-label={label}
	title={title ?? label}
	aria-busy={loading || undefined}
	class={cn(
		size === 'sm' ? 'size-control-sm rounded-md' : 'size-control rounded-lg',
		'inline-flex shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground active:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
>
	{#if loading}
		<span
			class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
			aria-hidden="true"
		></span>
	{:else}
		{@render children?.()}
	{/if}
</button>
