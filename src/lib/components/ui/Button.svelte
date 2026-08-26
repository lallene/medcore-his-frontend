<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';
	import { buttonVariantClasses, type ButtonVariant } from '$lib/design/status';

	type Size = 'sm' | 'md' | 'lg';

	interface Props {
		type?: 'button' | 'submit' | 'reset';
		variant?: ButtonVariant;
		size?: Size;
		disabled?: boolean;
		loading?: boolean;
		fullWidth?: boolean;
		class?: string;
		onclick?: (e: MouseEvent) => void;
		children?: Snippet;
		'aria-label'?: string;
		'data-testid'?: string;
	}

	let {
		type = 'button',
		variant = 'primary',
		size = 'md',
		disabled = false,
		loading = false,
		fullWidth = false,
		class: className = '',
		onclick,
		children,
		'aria-label': ariaLabel,
		'data-testid': testId
	}: Props = $props();

	const sizes: Record<Size, string> = {
		sm: 'px-3 py-1.5 text-sm rounded-lg',
		md: 'px-4 py-2 text-sm rounded-xl',
		lg: 'px-5 py-3 text-base rounded-xl'
	};
</script>

<button
	{type}
	disabled={disabled || loading}
	{onclick}
	aria-label={ariaLabel}
	aria-busy={loading || undefined}
	data-testid={testId}
	class={cn(
		'inline-flex items-center justify-center gap-2 font-semibold transition focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60',
		buttonVariantClasses[variant],
		sizes[size],
		fullWidth && 'w-full',
		className
	)}
>
	{#if loading}
		<span
			class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
			aria-hidden="true"
		></span>
	{/if}
	{@render children?.()}
</button>
