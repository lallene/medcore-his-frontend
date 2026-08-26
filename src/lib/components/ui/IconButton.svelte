<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	interface Props {
		type?: 'button' | 'submit';
		disabled?: boolean;
		loading?: boolean;
		label: string;
		class?: string;
		onclick?: (e: MouseEvent) => void;
		children?: Snippet;
	}

	let {
		type = 'button',
		disabled = false,
		loading = false,
		label,
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
	aria-busy={loading || undefined}
	class={cn(
		'inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50',
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
